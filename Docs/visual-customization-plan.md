# Kế hoạch triển khai: Tùy chỉnh Workspace (P3.9) và Theme Sáng/Tối (P3.10)

> **Trạng thái: ĐÃ TRIỂN KHAI (2026-08-04).** Scope cuối cùng bao gồm cả Logs workspace; chỉ Overview là workspace được bảo vệ. Sidebar dùng nút lên/xuống, không dùng drag-and-drop; preference sidebar lưu SQLite ở live mode, còn theme lưu cục bộ trong trình duyệt.

## Goal Description
Kế hoạch này triển khai hai tính năng tùy chỉnh giao diện người dùng lớn cuối cùng trong nhóm P3:
1. **P3.9: Ẩn/Hiện & Sắp xếp Workspace (Sidebar Reorder & Toggle)**: Cho phép người vận hành tùy chọn ẩn các workspace ít dùng (ví dụ: ẩn Topology, Nodes) và thay đổi thứ tự hiển thị của chúng trên thanh sidebar. Cấu hình này được lưu bền vững vào bảng preferences trong SQLite của backend.
2. **P3.10: Chuyển đổi Theme Sáng/Tối (Dark/Light Theme Toggle)**: Bổ sung bộ biến màu light theme, cung cấp nút toggle trực quan trên Header, đồng thời cập nhật runtime màu sắc đồ thị (Chart.js) và bộ gõ lệnh terminal (xterm.js).

---

## User Review Required

> [!IMPORTANT]
> **1. Lưu trữ cấu hình sắp xếp sidebar:**
> * Cấu hình ẩn/hiện và thứ tự của workspace sẽ được thêm trực tiếp vào cấu trúc `UIPreferences` sẵn có trong cơ sở dữ liệu SQLite (`HiddenWorkspaces []string` và `WorkspaceOrder []string`).
> * Các tab cốt lõi là **Overview** và **Settings** sẽ được khóa cố định (không cho phép ẩn) để tránh tình trạng người dùng ẩn toàn bộ các trang gây lỗi điều hướng.
>
> **2. Cơ chế làm mới giao diện khi chuyển theme:**
> * Vì Chart.js và xterm.js đọc giá trị màu từ hàm JS `getComputedStyle` khi khởi tạo, khi người dùng click đổi theme, chúng ta sẽ cần:
>   1. Đổi class `.theme-light` trên thẻ `<html>`.
>   2. Gọi hàm `.themeChanged()` trên Chart instances để cập nhật lại màu sắc tick/grid/accent và render lại đồ thị.
>   3. Gọi `terminal.options.theme = getXtermTheme()` để xterm.js đổi màu nền/chữ tức thời.

---

## Proposed Changes

### Component: Backend (SQLite & Config Engine)

#### [MODIFY] `internal/dashboardconfig/types.go`
Bổ sung thêm 2 trường cấu hình vào struct `UIPreferences`:
```go
type UIPreferences struct {
	TerminalHeight    int      `json:"terminalHeight"`
	TerminalCollapsed bool     `json:"terminalCollapsed"`
	HistoryRange      string   `json:"historyRange"`
	DefaultNodeID     string   `json:"defaultNodeId"`
	HiddenWorkspaces  []string `json:"hiddenWorkspaces"` // <--- Mới
	WorkspaceOrder    []string `json:"workspaceOrder"`    // <--- Mới
}
```
Cập nhật giá trị mặc định trong `DefaultUIPreferences()`:
```go
func DefaultUIPreferences() UIPreferences {
	return UIPreferences{
		TerminalHeight: 200,
		HistoryRange:   "24h",
		DefaultNodeID:  "local",
		HiddenWorkspaces: []string{},
		WorkspaceOrder: []string{"overview", "services", "containers", "nodes", "history", "alerts", "topology"},
	}
}
```

#### [MODIFY] `internal/dashboardconfig/validation.go`
Thêm hàm validate cho hai trường mới trong `validateUIPreferences`:
```go
func validateUIPreferences(preferences UIPreferences) error {
	// ... (validate cũ) ...
	validWorkspaces := map[string]bool{
		"overview": true, "services": true, "containers": true,
		"nodes": true, "history": true, "alerts": true, "topology": true,
	}
	for _, ws := range preferences.HiddenWorkspaces {
		if !validWorkspaces[ws] || ws == "overview" {
			return invalid("uiPreferences.hiddenWorkspaces", "contains invalid or protected workspace")
		}
	}
	if len(preferences.WorkspaceOrder) > 0 {
		seen := make(map[string]bool)
		for _, ws := range preferences.WorkspaceOrder {
			if !validWorkspaces[ws] {
				return invalid("uiPreferences.workspaceOrder", "contains invalid workspace")
			}
			if seen[ws] {
				return invalid("uiPreferences.workspaceOrder", "contains duplicate workspaces")
			}
			seen[ws] = true
		}
	}
	return nil
}
```

---

### Component: Design System (CSS)

#### [MODIFY] `static/css/tokens.css`
Tách biệt bộ biến màu mặc định (Dark) và thêm bộ biến màu Light theme. Sử dụng CSS class `.theme-light` thay vì `@media` để kiểm soát trạng thái chủ động:
```css
:root {
  /* Giữ nguyên các biến kích thước, font và các màu sắc chung */
  --accent: #d99a3d;
  --accent-hover: #efb35a;
  /* ... */
}

/* Theme mặc định (Dark) */
:root, .theme-dark {
  --bg-base: #101010;
  --bg-deep: #090909;
  --bg-surface: #151515;
  --bg-card: #191919;
  --bg-card-hover: #202020;
  --bg-overlay: #111111;
  --bg-recess: #0d0d0d;
  --surface-muted: #1d1d1d;
  --surface-selected: #2a2115;
  --border: #303030;
  --border-subtle: #252525;
  --border-hover: #5a482b;
  --border-strong: #4a4a4a;
  --text-primary: #e5e1d9;
  --text-secondary: #b3afa7;
  --text-dim: #7e7a73;
  --text-inverse: #15120d;
  --accent-soft: #2e2416;
  --green-soft: #172a1e;
  --yellow-soft: #302715;
  --red-soft: #351c1b;
  --track: #292929;
  --skeleton: #242424;
  --skeleton-shine: #303030;
  --terminal-background: #0b0b0b;
  --terminal-foreground: #ddd8ce;
  --terminal-selection: #49391f;
}

/* Theme sáng (Light) */
.theme-light {
  --bg-base: #f6f5f3;
  --bg-deep: #ebeae6;
  --bg-surface: #ffffff;
  --bg-card: #faf9f6;
  --bg-card-hover: #f0eee8;
  --bg-overlay: #ffffff;
  --bg-recess: #e6e4df;
  --surface-muted: #e6e4df;
  --surface-selected: #fbf5e6;
  --border: #d5d1c9;
  --border-subtle: #e2ded6;
  --border-hover: #af8d58;
  --border-strong: #b3afa7;
  --text-primary: #1c1c1b;
  --text-secondary: #565047;
  --text-dim: #8a8479;
  --text-inverse: #ffffff;
  --accent-soft: #fdf5ea;
  --green-soft: #eaf7ed;
  --yellow-soft: #fbf5e6;
  --red-soft: #fdf0ef;
  --track: #e2ded6;
  --skeleton: #eae7e0;
  --skeleton-shine: #f6f5f3;
  --terminal-background: #1c1c1b;
  --terminal-foreground: #f6f5f3;
  --terminal-selection: #5b421d;
}
```

#### [MODIFY] `static/css/style.css`
* Sửa thẻ meta dark mode mặc định hoặc điều chỉnh CSS để tương thích hoàn toàn.
* Thêm CSS định dạng cho phần quản lý Workspace trong Settings dialog:
```css
.sidebar-workspaces-list { display: grid; gap: 8px; margin-top: 10px; }
.workspace-config-item { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-sm); }
.workspace-config-label { display: flex; align-items: center; gap: 8px; font-weight: 500; }
.workspace-config-actions { display: flex; gap: 4px; }
.workspace-config-actions button { min-height: 24px; min-width: 24px; padding: 0; }
```

---

### Component: Frontend UI & Logic

#### [MODIFY] `static/index.html`
* Thêm nút chuyển đổi Theme lên Header (cạnh nút Settings):
```html
      <button id="theme-toggle" class="icon-button" type="button" title="Toggle color theme" aria-label="Toggle color theme">
        <!-- Sun icon (shows in dark mode) -->
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="theme-icon-dark"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
        <!-- Moon icon (shows in light mode) -->
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" class="theme-icon-light" style="display:none;"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      </button>
```
* Bổ sung mục quản lý Workspace và điều chỉnh Theme vào `settings-dialog`:
```html
      <section class="settings-section" aria-labelledby="sidebar-config-title">
        <h3 id="sidebar-config-title">WORKSPACE SIDEBAR</h3>
        <p>Choose which workspaces to display and in what order.</p>
        <div id="sidebar-workspaces-list" class="sidebar-workspaces-list">
          <!-- Populated dynamically via settings.js -->
        </div>
      </section>
```

#### [MODIFY] `static/js/settings.js`
* Render danh sách các workspace động trong Settings dialog.
* Trả về callback `onPreferencesChanged(prefs)` để báo hiệu cho `app.js` khi người dùng thay đổi ẩn/hiện hoặc di chuyển thứ tự (▲/▼).
* Hỗ trợ lưu trữ/kiểm tra cờ `admin` để chỉ admin mới được đổi cấu hình sidebar.

#### [MODIFY] `static/js/history.js` VÀ `static/js/metrics.js`
Thêm hàm `.updateTheme()` hoặc cải tiến để vẽ lại Chart.js khi theme thay đổi:
```javascript
export function updateChartTheme() {
  const colors = {
    accent: colorToken("--accent"),
    accentSoft: colorToken("--accent-soft"),
    // ... lấy các biến màu mới
  };
  // Cập nhật cấu hình chart hiện có
  chart.options.scales.x.ticks.color = colors.dim;
  chart.options.scales.y.ticks.color = colors.dim;
  chart.options.scales.y.grid.color = colors.grid;
  chart.update();
}
```

#### [MODIFY] `static/js/app.js`
Đóng vai trò trung tâm điều phối:
* **Theme**: Đọc trạng thái từ `localStorage` khi khởi tạo để set class `theme-light` nếu có. Đăng ký sự kiện nút `#theme-toggle`, cập nhật xterm theme bằng cách gán `terminal.options.theme = getXtermTheme()`, và gọi hàm vẽ lại Chart.
* **Workspace Sidebar**: Khi nhận preferences từ API hoặc settings:
  1. Thay đổi thứ tự các nút Workspace DOM trong sidebar dựa trên `WorkspaceOrder`.
  2. Ẩn/hiện các nút Workspace dựa trên danh sách `HiddenWorkspaces`.
  3. Xử lý logic fallback: nếu workspace đang hoạt động bị ẩn đi, chuyển hướng người dùng về trang **Overview**.

---

## Verification Plan

### Automated Tests
* Đã bổ sung unit/API/store coverage cho validation, persistence và PATCH response; browser regression kiểm tra toggle, persistence, reorder/hide và route fallback.
* Đã chạy:
```bash
go test ./... -count=1
go vet ./...
go test -tags=browser ./tests/browser -count=1 -v -timeout=180s
```

### Manual Verification
1. **Kiểm tra Theme**:
   - Click nút chuyển theme ở Header → Giao diện đổi màu sáng/tối tức thời.
   - Kiểm tra các biểu đồ trong trang **History** và **Overview** đổi màu lưới grid/chữ sang màu tương ứng, hiển thị rõ ràng.
   - Mở terminal rộng ra → Màu nền và text của shell terminal đổi sang màu light/dark tương thích.
   - Refresh trang → Theme được giữ nguyên (từ localStorage).
2. **Kiểm tra Workspace Sidebar**:
   - Mở Dashboard Settings → Điều chỉnh ẩn trang **Topology** và di chuyển trang **Alerts** lên đầu.
   - Bấm lưu/Apply → Sidebar cập nhật ngay lập tức: tab Topology biến mất, Alerts nhảy lên trên.
   - Truy cập trực tiếp link `#topology` khi tab này bị ẩn → Dashboard tự động chuyển về trang `#overview`.
