# Kế hoạch triển khai: Cải tiến UI/UX & Tương tác Trực tiếp (P4 UI Polish)

Tài liệu này chi tiết hóa 6 hạng mục nâng cấp giao diện người dùng và trải nghiệm tương tác (UI/UX) cuối cùng dành cho **Homelab Dashboard**, hướng tới chuẩn mực thiết kế DevTools chuyên nghiệp, phản xạ phím nhanh và tương tác trực tiếp.

---

## Danh sách Hạng mục Kỹ thuật

### 1. Widget Contextual Menu (`···`) — *Tương tác ngữ cảnh trực tiếp*
*   **Mục tiêu**: Cho phép Admin tùy chỉnh kích thước hoặc ẩn khối Overview trực tiếp ngay tại trang chủ mà không cần mở Settings dialog.
*   **Thiết kế & Giao diện**:
    *   Thêm nút icon 3 chấm `···` (`.panel-widget-menu`) ở góc phải thanh `.panel-header` của cả 5 block Overview (`overview-attention`, `overview-trend`, `overview-recent-changes`, `system-card`, `overview-service-pulse`).
    *   Khi click `···`, hiển thị một menu dropdown nhỏ (`.widget-menu-dropdown`):
        *   📐 **Kích thước**: `Small (1/3)`, `Medium (2/3)`, `Full Width (1/1)` (có dấu Check đánh dấu kích thước hiện tại).
        *   👁️ **Ẩn khối này** (`Hide widget`).
        *   🔄 **Khôi phục tất cả khối** (`Reset overview layout`).
    *   **Logic**: Khi người dùng chọn, gán lập tức `data-widget-size` hoặc thuộc tính `hidden` trên DOM, đồng thời gọi `api.updatePreferences` chạy ngầm để lưu bền vững vào SQLite.

### 2. Global Search Focus via `/` Key — *Phim tắt tìm kiếm nhanh*
*   **Mục tiêu**: Tăng tốc độ làm việc cho SRE/Operator khi muốn tra cứu log, lọc container hoặc service.
*   **Thiết kế & Giao diện**:
    *   Lắng nghe sự kiện `keydown` trên toàn trang đối với phím `/` (Slash).
    *   Bỏ qua nếu người dùng đang gõ trong `input`, `textarea`, đang ở `terminal` hoặc đang mở `dialog`.
    *   Khi phím `/` được ấn: Tự động `preventDefault()`, kích hoạt switch tab phù hợp nếu cần, và `.focus()` vào ô input tìm kiếm của workspace tương ứng:
        *   Trang Logs: `#logs-search`
        *   Trang Containers: `#container-filter`
        *   Trang Services: `#service-filter`
    *   Bổ sung ký hiệu phím tắt `<kbd>/</kbd>` chìm ở bên phải các ô input tìm kiếm khi chưa có nội dung.

### 3. Copy-to-Clipboard & Toast Progress Bar — *Micro-interactions*
*   **Mục tiêu**: Tăng tính tinh tế trong phản hồi hệ thống.
*   **Thiết kế & Giao diện**:
    *   **Log & Network Copy**: Bổ sung icon Copy ẩn khi rê chuột (hover) trên dòng Historical Log và các Badge Port/IP của Container. Khi click, thực hiện `navigator.clipboard.writeText(...)` và hiển thị toast thông báo nhanh.
    *   **Toast Bar Progress**: Thêm thanh đếm ngược đếm thời gian tự ẩn (3 giây) ở phía dưới cùng của thẻ Toast thông báo.

### 4. Interactive Topology Map (Drag Node & Pan/Zoom)
*   **Mục tiêu**: Cho phép tự do bố trí vị trí các Node dịch vụ trên sơ đồ phụ thuộc.
*   **Thiết kế & Giao diện**:
    *   Bổ sung sự kiện `mousedown`/`mousemove`/`mouseup` (hoặc Touch events) cho các thẻ nhóm SVG node trong trang Topology.
    *   Lưu tọa độ `x, y` điều chỉnh của từng Node vào `localStorage` (`homelab.topology.positions`).
    *   Thêm bộ điều khiển Zoom In (`+`), Zoom Out (`-`), và Reset View ở góc dưới sơ đồ SVG.

### 5. Skeleton Loading Shimmer
*   **Mục tiêu**: Tránh nhấp nháy giao diện khi chuyển đổi Node giám sát hoặc tải dữ liệu.
*   **Thiết kế & Giao diện**:
    *   Tạo hiệu ứng CSS animation `@keyframes shimmer` lướt qua dải biến màu `--skeleton-shine`.
    *   Hiển thị các khối Skeleton Shimmer giả lập dòng text/biểu đồ khi state là `connecting` hoặc `loading`.

### 6. History Metric CSV Export
*   **Mục tiêu**: Cho phép xuất dữ liệu lịch sử để lập báo cáo hoặc phân tích sự cố ngoại tuyến.
*   **Thiết kế & Giao diện**:
    *   Bổ sung nút **EXPORT CSV** trên thanh công cụ của trang `History`.
    *   Khi click, chuyển đổi mảng dữ liệu `points` (Timestamp, CPU%, RAM%, MemoryBytes, UpSeconds...) thành chuỗi định dạng CSV và cho phép trình duyệt tải về file `homelab-metrics-history-<range>.csv`.

---

## Kế hoạch Triển khai theo từng Giai đoạn

### Giai đoạn 1 (Ưu tiên P1 - Trải nghiệm lõi):
1. Cập nhật `static/index.html` và `static/js/overview.js` để tích hợp nút 3 chấm `···` & Popover Menu trực tiếp cho Overview Widgets.
2. Cập nhật `static/js/app.js` lắng nghe phím `/` để auto-focus vào ô Search.
3. Bổ sung nhãn phím tắt `<kbd>/</kbd>` vào CSS và HTML.

### Giai đoạn 2 (Ưu tiên P2 - Micro-interactions):
1. Tích hợp Copy-to-clipboard cho Logs và Container Ports.
2. Thêm thanh Progress Bar đếm ngược cho Toast Notifications.
3. Thêm tính năng kéo thả Node SVG trong sơ đồ `Topology`.

### Giai đoạn 3 (Ưu tiên P3 - Bổ trợ & Xuất dữ liệu):
1. Thêm hiệu ứng Skeleton Shimmer khi load dữ liệu.
2. Thêm tính năng **Export CSV** cho History workspace.
