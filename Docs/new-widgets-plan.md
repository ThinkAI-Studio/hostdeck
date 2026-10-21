# Kế hoạch Triển khai: Bổ sung 5 Widgets Cao cấp (Homer & Beszel Stack)

## Goal Description
Kế hoạch này mở rộng thư viện Widget trên trang **Overview** bằng cách tích hợp 5 Widgets cao cấp mới được chọn lọc từ sự kết hợp của **Homer Dashboard** (Launchpad, Service Groups & Tags) và **Beszel/Portainer** (Top Containers, Multi-Disk Pools, Operator Notes). Các Widgets mới này chạy trực tiếp trên hệ thống **Auto-flow Grid 12 cột** sẵn có, hỗ trợ tùy chỉnh kích thước (`small`, `medium`, `full`), ẩn/hiện trực tiếp qua nút 3 chấm `···` hoặc qua Settings.

---

## User Review Required

> [!IMPORTANT]
> **1. Các Widgets bổ sung mới (5 Widgets):**
> * 📌 **`overview-quick-launchpad`** (Homer Quick Bookmarks): Thanh icon + link 1-click mở các trang quản trị thiết bị phần cứng (Router, Proxmox, Unifi, NAS).
> * 🏷️ **`overview-service-groups`** (Homer Service Groups & Tags): Nhóm dịch vụ theo danh mục (`Media`, `Infrastructure`, `Apps`) kèm thẻ Tag (`PROD`, `VLAN10`) và chấm trạng thái online 🟢/offline 🔴.
> * 🚀 **`overview-top-containers`** (Beszel Top Containers): Top 5 container ngốn CPU/RAM nhiều nhất hoặc lặp lỗi `RestartLoop`.
> * 💾 **`overview-storage-pools`** (Beszel Multi-Disk Pools): Quản lý dung lượng, tốc độ đọc/ghi live và sức khỏe S.M.A.R.T của tất cả ổ đĩa mount trên host (`/`, `/mnt/data`, `/mnt/backups`).
> * 📝 **`overview-operator-notes`** (SRE Scratchpad): Ô ghi chú vận hành nhanh tự động lưu vào SQLite database.
>
> **2. Cấu trúc lưu trữ & Tùy biến:**
> * Danh sách Bookmarks và Nội dung Ghi chú sẽ được lưu trữ trực tiếp vào bảng SQLite `dashboard_ui_preferences`.
> * Mỗi Widget đều hỗ trợ nút 3 chấm `···` trên Header để Admin Resize (`1/3`, `2/3`, `Full`) hoặc Ẩn nhanh.

---

## Proposed Changes

### Component: Backend (SQLite & Config Engine)

#### [NEW] `internal/store/migrations/018_extended_widgets.sql`
```sql
ALTER TABLE dashboard_ui_preferences
    ADD COLUMN launchpad_bookmarks_json TEXT NOT NULL DEFAULT '[{"title":"Router","url":"http://192.168.1.1","icon":"router","tag":"NET"},{"title":"Proxmox VE","url":"https://192.168.1.2:8006","icon":"server","tag":"VMM"}]';

ALTER TABLE dashboard_ui_preferences
    ADD COLUMN operator_notes_text TEXT NOT NULL DEFAULT '';
```

#### [MODIFY] `internal/dashboardconfig/types.go`
Bổ sung struct `BookmarkItem` và cập nhật `UIPreferences`:
```go
type BookmarkItem struct {
	Title string `json:"title"`
	URL   string `json:"url"`
	Icon  string `json:"icon,omitempty"`
	Tag   string `json:"tag,omitempty"`
}

type UIPreferences struct {
	// ... các trường sẵn có ...
	LaunchpadBookmarks []BookmarkItem `json:"launchpadBookmarks"`
	OperatorNotes      string         `json:"operatorNotes"`
}
```
Đăng ký 5 Widget mới vào danh sách Widget hợp lệ và thiết lập kích thước mặc định:
* `overview-quick-launchpad`: `full`
* `overview-service-groups`: `medium`
* `overview-top-containers`: `medium`
* `overview-storage-pools`: `small`
* `overview-operator-notes`: `small`

#### [MODIFY] `internal/dashboardconfig/validation.go`
Thêm hàm validate cho `launchpadBookmarks` và `operatorNotes`.

#### [MODIFY] `internal/store/config.go`
Cập nhật các hàm `GetDashboardUIPreferences`, `UpdateDashboardUIPreferences`, và `ApplyDashboardConfig` để mã hóa/giải mã các trường mới.

---

### Component: Frontend HTML & CSS

#### [MODIFY] `static/index.html`
Bổ sung 5 phần tử HTML `<section>` dưới `.overview-layout`:
```html
<section id="overview-quick-launchpad" class="panel overview-widget" data-widget-size="full">...</section>
<section id="overview-service-groups" class="panel overview-widget" data-widget-size="medium">...</section>
<section id="overview-top-containers" class="panel overview-widget" data-widget-size="medium">...</section>
<section id="overview-storage-pools" class="panel overview-widget" data-widget-size="small">...</section>
<section id="overview-operator-notes" class="panel overview-widget" data-widget-size="small">...</section>
```

#### [MODIFY] `static/css/style.css`
* Style giao diện Launchpad Bookmarks (gồm icon, title, tag pill và hiệu ứng hover).
* Style ma trận nhóm Service Groups & Tag Pills.
* Style bảng danh sách Top Containers resource bars.
* Style tiến trình dung lượng Multi-Disk pools.
* Style cho ô Ghi chú Operator Notes (textarea tự co giãn, font mono).

---

### Component: Frontend Controllers

#### [MODIFY] `static/js/overview.js`
* Render dữ liệu Launchpad Bookmarks từ preferences.
* Render danh sách Services gom nhóm theo Category và hiển thị Tag Pills.
* Tính toán và render Top 5 Containers dựa trên snapshot CPU/RAM/Issue state.
* Render thông số Multi-Disk Storage pools từ snapshot host metrics.
* Render và xử lý sự kiện gõ ghi chú Operator Notes (gửi `api.updatePreferences` chạy ngầm sau 500ms dừng gõ).

#### [MODIFY] `static/js/settings.js`
* Bổ sung mục quản lý danh sách Launchpad Bookmarks (Thêm/Sửa/Xóa Bookmark Link).
* Bổ sung 5 Widget mới vào danh sách cấu hình Overview Widgets.

---

## Verification Plan

### Automated Tests
* Bổ sung unit test kiểm tra validate preferences mới trong `internal/dashboardconfig/validation_test.go` và `internal/store/config_test.go`.
* Cập nhật test trình duyệt `tests/browser/dashboard_test.go` để verify việc render và resize 5 Widget mới.
* Chạy kiểm thử:
```bash
go test -count=1 ./...
go test -tags=browser ./tests/browser
```

### Manual Verification
1. Truy cập `http://localhost:8080/?demo=1`.
2. Kiểm tra 5 Widget mới hiển thị ngăn nắp trên trang Overview.
3. Click thử nút 3 chấm `···` trên Launchpad hoặc Storage Pools để Resize / Hide.
4. Nhập thử nội dung ghi chú trong Operator Notes -> Tải lại trang xem ghi chú có được giữ nguyên không.
