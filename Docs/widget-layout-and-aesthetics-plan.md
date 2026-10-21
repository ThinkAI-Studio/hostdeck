# Kế hoạch triển khai: Auto-flow Widgets (P3.9+) và Cải tiến Giao diện (P3.10+)

Kế hoạch này thực hiện nâng cấp giao diện của Homelab Dashboard dựa trên các phản hồi của người vận hành để đạt độ thẩm mỹ cao nhất và hỗ trợ tùy biến các khối thông tin (Widgets) trong trang Overview một cách linh hoạt.

---

## Các mục tiêu cải tiến

### 1. Nâng cấp Thẩm mỹ UI/UX (Aesthetics & Borders)
*   **Bo góc mềm mại (Radius)**: Nâng `--radius-md` lên `10px` hoặc `12px` (dành cho panels/cards) và `--radius-sm` lên `6px` hoặc `8px` (dành cho nút bấm, input, select) để tăng tính hiện đại, thân thiện giống giao diện macOS/iOS.
*   **Đổ bóng mịn (Soft Shadows)**: Thay thế viền mỏng thô bằng viền mờ kết hợp hiệu ứng `box-shadow` nhẹ nhàng để tạo cảm giác các widget nổi tự nhiên trên nền.
*   **Hạ độ chói của Light Mode**: Cải tiến Light theme sang tông màu **Warm Paper (Giấy ngả kem)** giống các ứng dụng Notion/GitBook để không bị lóa mắt khi sử dụng ban đêm.

### 2. Auto-flow Widgets trên trang Overview
*   **Tái cấu trúc HTML**: Xóa bỏ hai thẻ div bao bọc cột `.overview-primary` và `.overview-secondary` để đưa cả 5 khối bên trong Overview thành các thẻ anh em trực tiếp dưới `.overview-layout` (một CSS Grid 12 cột tự động sắp xếp):
    1.  `overview-attention` (Khối sự cố cần chú ý)
    2.  `overview-trend` (Khối đồ thị xu hướng tài nguyên 24h)
    3.  `overview-recent-changes` (Khối dòng thời gian thay đổi gần đây)
    4.  `system-card` (Khối thông tin hệ thống Host Metrics)
    5.  `overview-service-pulse` (Khối Probe Coverage)
*   **Tùy biến Kích thước (Widget Sizes)**:
    Mỗi widget sẽ hỗ trợ thuộc tính `data-size` để điều khiển kích thước chiếm cột:
    *   `small` (chiếm `span 4` cột - tương đương 1/3 hàng trên màn hình lớn)
    *   `medium` (chiếm `span 8` cột - tương đương 2/3 hàng)
    *   `full` (chiếm `span 12` cột - tương đương toàn bộ hàng)
    *   *Trên màn hình di động (<900px)*: Toàn bộ widget tự động co về `span 12` dọc.
*   **Lưu trữ cấu hình**:
    Bổ sung các trường ẩn/hiện và cấu hình size của từng widget Overview vào bảng `dashboard_ui_preferences` ở backend SQLite:
    ```go
    type UIPreferences struct {
        // ... các trường cũ ...
        HiddenOverviewWidgets []string          `json:"hiddenOverviewWidgets"`
        OverviewWidgetSizes   map[string]string `json:"overviewWidgetSizes"`
    }
    ```

---

## Chi tiết các thay đổi mã nguồn

### Component 1: Cơ sở dữ liệu & Cấu hình Go

#### [MODIFY] `internal/store/migrations/017_overview_widgets.sql` [NEW]
Tạo file migration mới để thêm 2 cột cấu hình widget:
```sql
ALTER TABLE dashboard_ui_preferences
    ADD COLUMN hidden_overview_widgets_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE dashboard_ui_preferences
    ADD COLUMN overview_widget_sizes_json TEXT NOT NULL DEFAULT '{"overview-attention":"medium","overview-trend":"medium","overview-recent-changes":"small","system-card":"small","overview-service-pulse":"small"}';
```

#### [MODIFY] `internal/dashboardconfig/types.go`
Bổ sung cấu hình vào struct `UIPreferences` và định nghĩa kích thước mặc định:
```go
type UIPreferences struct {
	// ... các trường cũ ...
	HiddenOverviewWidgets []string          `json:"hiddenOverviewWidgets"`
	OverviewWidgetSizes   map[string]string `json:"overviewWidgetSizes"`
}

func DefaultUIPreferences() UIPreferences {
	return UIPreferences{
		// ...
		HiddenOverviewWidgets: []string{},
		OverviewWidgetSizes: map[string]string{
			"overview-attention":      "medium",
			"overview-trend":          "medium",
			"overview-recent-changes": "small",
			"system-card":             "small",
			"overview-service-pulse":  "small",
		},
	}
}
```

#### [MODIFY] `internal/dashboardconfig/validation.go`
Kiểm tra tính hợp lệ của widget ID và kích thước (chỉ chấp nhận `small`, `medium`, `full`):
```go
func validateUIPreferences(preferences UIPreferences) error {
	// ... (validate cũ) ...
	validWidgets := map[string]bool{
		"overview-attention": true, "overview-trend": true, "overview-recent-changes": true,
		"system-card": true, "overview-service-pulse": true,
	}
	validSizes := map[string]bool{"small": true, "medium": true, "full": true}
	for _, w := range preferences.HiddenOverviewWidgets {
		if !validWidgets[w] {
			return invalid("uiPreferences.hiddenOverviewWidgets", "contains invalid widget")
		}
	}
	for w, size := range preferences.OverviewWidgetSizes {
		if !validWidgets[w] {
			return invalid("uiPreferences.overviewWidgetSizes", "contains invalid widget key")
		}
		if !validSizes[size] {
			return invalid("uiPreferences.overviewWidgetSizes", "contains invalid size option")
		}
	}
	return nil
}
```

#### [MODIFY] `internal/store/config.go`
Cập nhật các hàm `GetDashboardUIPreferences`, `UpdateDashboardUIPreferences`, và `ApplyDashboardConfig` để scan/insert thêm các cột JSON mới.

---

### Component 2: CSS Stylesheets

#### [MODIFY] `static/css/tokens.css`
*   Thay đổi bán kính bo góc:
    ```css
    --radius-sm: 6px;
    --radius-md: 10px;
    ```
*   Bổ sung biến bóng đổ (`box-shadow`):
    *   Dark: `--shadow-card: 0 4px 20px rgba(0, 0, 0, 0.45);`
    *   Light: `--shadow-card: 0 4px 16px rgba(142, 137, 126, 0.08);`
*   Cập nhật Light mode tông **Warm Paper**:
    ```css
    .theme-light {
      --bg-base: #f6f5f1;          /* Vàng kem dịu nhạt */
      --bg-deep: #edebe4;          /* Lớp sâu ấm */
      --bg-surface: #fdfdfa;       /* Trắng sữa ấm */
      --bg-card: #f9f8f4;          /* Màu nền panel */
      --bg-card-hover: #f1efe6;
      --border: #dfdad0;           /* Đường viền ấm nhạt */
      --border-subtle: #eae5db;
      --text-primary: #2d2b27;     /* Chữ dịu, giảm chói */
      --text-secondary: #635f55;
      --text-dim: #8e887a;
    }
    ```

#### [MODIFY] `static/css/style.css`
*   Cập nhật đổ bóng cho `.panel`:
    ```css
    .panel { 
      min-width: 0; 
      border: 1px solid var(--border); 
      border-radius: var(--radius-md); 
      background: var(--bg-card); 
      box-shadow: var(--shadow-card); /* <--- Thêm shadow */
      transition: box-shadow 0.15s ease, border-color 0.15s ease;
    }
    ```
*   Định nghĩa lưới Grid 12 cột cho Overview và thuộc tính size:
    ```css
    .overview-layout {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 16px;
      align-items: start;
    }
    .overview-widget[data-size="small"] { grid-column: span 4; }
    .overview-widget[data-size="medium"] { grid-column: span 8; }
    .overview-widget[data-size="full"] { grid-column: span 12; }
    
    @media (max-width: 899px) {
      .overview-layout { grid-template-columns: 1fr; gap: 12px; }
      .overview-widget { grid-column: span 1 !important; }
    }
    ```

---

### Component 3: Frontend HTML & JS

#### [MODIFY] `static/index.html`
*   Làm phẳng cấu trúc của thẻ `<div class="overview-layout">` bằng cách xóa thẻ bao `.overview-primary` và `.overview-secondary`. 
*   Gán class `.overview-widget` cho 5 panel con để nhận các quy tắc CSS Grid Span.

#### [MODIFY] `static/js/settings.js`
*   Thêm section **OVERVIEW WIDGETS** trong Settings dialog bên dưới danh sách Workspace.
*   Hiển thị danh sách 5 widget với checkbox Ẩn/Hiện và nút chọn size: **Small (1/3)**, **Medium (2/3)**, **Full Width (1/1)**.
*   Cung cấp cấu hình tạm thời, nút CANCEL và APPLY giống như quản lý Workspace.

#### [MODIFY] `static/js/app.js`
*   Đọc cấu hình `HiddenOverviewWidgets` và `OverviewWidgetSizes` từ preferences.
*   Khi hydrate preferences, duyệt qua danh sách 5 widget HTML trong DOM:
    *   Ẩn các widget nằm trong danh sách `HiddenOverviewWidgets` bằng cách gán thuộc tính `.hidden = true`.
    *   Set thuộc tính `dataset.size` dựa trên `OverviewWidgetSizes` để cập nhật CSS Grid Span.
*   Cập nhật hàm lưu trữ preferences lên backend.

---

## Kế hoạch kiểm thử (Verification)
1.  **Kiểm tra Thẩm mỹ (Theme & Border)**: Xem thử giao diện đổi màu sang ấm hơn, không bị lóa trắng; các cạnh của panel được bo góc mịn màng và có shadow đổ bóng hiện đại.
2.  **Kiểm tra Widgets**:
    *   Vào Settings -> Ẩn khối `Recent Changes` -> Bấm Apply -> Khối biến mất và các khối còn lại tự động dịch chuyển khít vị trí trống.
    *   Đổi size của `Resource Trend` từ Medium sang Full Width -> Biểu đồ chiếm trọn toàn bộ chiều ngang màn hình.
    *   Đổi sang màn hình điện thoại (co nhỏ trình duyệt) -> Tất cả widget chuyển dọc thẳng hàng khít màn hình.
