# Kế hoạch triển khai: Regex Log Search (P3.8)

## Goal Description
Hiện tại, tính năng tìm kiếm log trong panel Logs chỉ hỗ trợ đối khớp chuỗi thô (substring match). Điều này gây khó khăn khi người vận hành cần lọc các pattern phức tạp (như mã lỗi, địa chỉ IP, hoặc cấu trúc stack trace nhất định).
Mục tiêu là tích hợp tìm kiếm biểu thức chính quy (Regular Expression) trên cả frontend và backend Loki thông qua cú pháp LogQL `|~`.

---

## User Review Required
> [!IMPORTANT]
> **1. Giới hạn độ dài Regex và CPU tiêu thụ trên backend:**
> Để tránh các cuộc tấn công Regex Denial of Service (ReDoS) hoặc truy vấn quá nặng làm treo container Loki/Dashboard, backend sẽ tự động biên dịch (`regexp.Compile`) kiểm tra trước khi gửi sang Loki, và giới hạn độ dài chuỗi regex tối đa là 160 ký tự (bằng giới hạn search hiện tại).
>
> **2. Nút toggle `.*` trên giao diện:**
> Giao diện sẽ bổ sung nút toggle `.*` nhỏ gọn nằm thụt vào bên trong cạnh phải của ô tìm kiếm log, tương tự cách hiển thị trong Chrome DevTools.

---

## Proposed Changes

### Component: Logs Engine (Backend)

#### [MODIFY] `internal/logs/logs.go`
Thêm trường `IsRegex` vào struct `Query`:
```go
type Query struct {
	NodeID    string
	From      time.Time
	To        time.Time
	Service   string
	Container string
	Level     string
	Text      string
	IsRegex   bool  // <--- Thêm trường này
	Limit     int
}
```

#### [MODIFY] `internal/logs/loki.go`
* Biên dịch thử Regex trong `validateQuery` để tránh gửi query sai cú pháp sang Loki:
```go
	query.Text = strings.TrimSpace(query.Text)
	if len(query.Text) > 160 || strings.ContainsAny(query.Text, "\x00\r\n") {
		return ErrInvalid
	}
	if query.IsRegex && query.Text != "" {
		if _, err := regexp.Compile(query.Text); err != nil {
			return ErrInvalid
		}
	}
```
* Cập nhật hàm tạo LogQL `logQL` để sử dụng toán tử `|~` thay vì `|=` khi `IsRegex` là `true`:
```go
	if query.Text != "" {
		if query.IsRegex {
			expression += ` |~ ` + strconv.Quote(query.Text)
		} else {
			expression += ` |= ` + strconv.Quote(query.Text)
		}
	}
```

---

### Component: HTTP API (Backend)

#### [MODIFY] `internal/httpapi/logs.go`
Đọc tham số query `regex` từ URL và truyền vào struct `Query`:
```go
func logQuery(c *gin.Context) (logs.Query, bool) {
	now := time.Now().UTC()
	query := logs.Query{
		NodeID:    strings.TrimSpace(c.DefaultQuery("node", logs.LocalNodeID)),
		From:      now.Add(-time.Hour), To: now,
		Service:   strings.TrimSpace(c.Query("service")),
		Container: strings.TrimSpace(c.Query("container")),
		Level:     strings.TrimSpace(c.Query("level")),
		Text:      strings.TrimSpace(c.Query("q")),
		IsRegex:   c.Query("regex") == "true", // <--- Nhận tham số từ frontend
		Limit:     logs.DefaultLimit,
	}
    // ...
```

---

### Component: Frontend UI

#### [MODIFY] `static/index.html`
Thay thế thẻ `<label class="logs-search">` bằng cấu trúc có nút toggle regex:
```html
            <div class="logs-search">
              <span class="visually-hidden">Search log text</span>
              <input id="logs-search" type="search" maxlength="160" placeholder="Search text; press Enter" autocomplete="off">
              <button id="logs-regex-toggle" class="logs-regex-toggle" type="button" aria-pressed="false" title="Use Regular Expression (.*)">.*</button>
            </div>
```

#### [MODIFY] `static/css/style.css`
Cập nhật CSS của ô tìm kiếm và định dạng nút regex:
```css
.logs-search { position: relative; min-width: 160px; flex: 1 1 220px; }
.logs-search input { width: 100%; padding-right: 32px; } /* Padding bên phải để không che text */

.logs-regex-toggle {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  height: 24px;
  width: 24px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-dim);
  background: transparent;
  font: bold 10px/1.2 var(--font-mono);
  cursor: pointer;
  transition: all var(--duration);
}
.logs-regex-toggle:hover {
  color: var(--text-secondary);
  background: var(--surface-muted);
}
.logs-regex-toggle[aria-pressed="true"] {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
}
```

#### [MODIFY] `static/js/api.js`
Truyền cờ `isRegex` qua URL query parameters:
```javascript
  queryLogs({ node, from, to, service, container, level, q, regex, limit, signal }) {
    const params = new URLSearchParams({ from, to });
    if (node) params.set("node", node);
    if (service) params.set("service", service);
    if (container) params.set("container", container);
    if (level) params.set("level", level);
    if (q) params.set("q", q);
    if (regex) params.set("regex", "true"); // <--- Thêm dòng này
    if (limit) params.set("limit", String(limit));
    return this._fetch(`/api/v1/logs/query?${params}`, { signal });
  }
```

#### [MODIFY] `static/js/logs.js`
Lưu trạng thái regex active và gửi kèm theo API `queryLogs`:
* Thêm biến `let isRegex = false;` trong `createLogsController`.
* Khai báo sự kiện click của nút `#logs-regex-toggle`:
```javascript
  const regexToggle = document.getElementById("logs-regex-toggle");
  regexToggle?.addEventListener("click", () => {
    isRegex = !isRegex;
    regexToggle.setAttribute("aria-pressed", String(isRegex));
    void load(); // Tự động load lại danh sách khi bật/tắt regex
  });
```
* Gửi `regex: isRegex` trong hàm `load()` khi gọi `api.queryLogs(...)`.

---

## Verification Plan

### Automated Tests
* Bổ sung unit test trong `internal/logs/loki_test.go` để verify query LogQL khi `IsRegex` là `true` và `false`.
* Chạy:
```bash
go test -v ./internal/logs
```

### Manual Verification
1. Mở workspace **Logs**.
2. Nhập biểu thức chính quy vào ô search (ví dụ: `(error|fail)` hoặc `HTTP/1\.[01] \d{3}`).
3. Click nút `.*` để bật chế độ Regex → Danh sách tự động refresh.
4. Kiểm tra các dòng log khớp đúng mẫu regex mong muốn.
5. Tắt nút `.*` và bấm Enter → Logs lọc theo từ khóa thô.
6. Thử nhập một biểu thức regex lỗi cú pháp (ví dụ: `[a-z`) và bật regex → API trả về HTTP 400 Bad Request, và giao diện hiện thông báo thích hợp thay vì bị treo.
