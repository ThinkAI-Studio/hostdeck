# Điểm yếu & Tính năng thiếu so với thị trường

> Nghiên cứu 2026-08-02 → 2026-08-04
> So sánh với: Homer, Homepage, Homarr, Dashy, Portainer, Cockpit, Beszel,
> Uptime Kuma, Netdata, Grafana, Dozzle, CasaOS, Glances, Yacht, Organizr,
> Heimdall, Flame.
>
> **Cập nhật 2026-08-04:** đánh dấu tiến độ triển khai P3.8 Regex Log Search.
> Bản restructure theo mức ưu tiên adoption (P0–P3) vẫn được giữ nguyên.
> Nguyên tắc xếp hạng: mục nào giúp người mới dùng được / nhận giá trị nhanh
> nhất, và mục nào không phá vỡ positioning "intentionally small ops console".

---

## Tổng quan ưu tiên

| Mức | Mục | Lý do |
|---|---|---|
| **P0 — chặn adoption [ĐÃ TRIỂN KHAI]** | Demo không-cần-auth; Installer 1 lệnh | GitHub Pages demo client-side và installer release đã có |
| **P1 — thắng lớn, effort thấp [ĐÃ TRIỂN KHAI]** | #2 TCP/DNS probe · #4 PWA | Đã hoàn thiện TCP và DNS probe (bỏ ICMP); PWA đã có |
| **P2 — generic notifications [ĐÃ CHỐT]** | #5 Webhook HMAC + ntfy fan-out | Giữ provider surface nhỏ. Dùng Webhook nối với N8N/Zapier thay vì add native providers. |
| **P3 — đã triển khai** | #8 Regex search · #9 Workspace reorder · #10 Light theme | Regex search đã có ở Logs; workspace sidebar có hide/reorder lưu SQLite; graphite/amber light theme có persistence cục bộ |
| **Đã triển khai** | #1 Restart/Stop · #3 Quick filter | Đã có sẵn trong codebase hiện tại |

> Lưu ý: file này là roadmap thực thi — mục P3 **không bị xóa** vì có thể
> hữu ích sau này, chỉ là không nằm trong lộ trình hiện tại.

### Đối chiếu triển khai

Commit `b75b9a9` đã phủ toàn bộ P0 và phần TCP/PWA của P1. Các mục còn lại
được giữ rõ trạng thái bên dưới: notifications là P2; ICMP/DNS probe, panel
reorder và light theme chưa triển khai. Regex search P3.8 đã hoàn tất theo
`Docs/regex-log-search-plan.md`; match counter/navigation là follow-up UX riêng.

---

# P0 — Chặn adoption (làm trước mọi thứ khác)

## 0.1 Demo không-cần-auth [ĐÃ TRIỂN KHAI]

Demo public hiện chạy hoàn toàn client-side, không yêu cầu session hoặc
backend. Landing page GitHub Pages nhúng app dưới `/app/?demo=1`.

**Giải pháp** (đã xác minh demo UI là client-side mock thuần — `DemoApi` trong
`static/js/demo.js` không fetch/WebSocket):
- Copy `static/` sang GitHub Pages site → `index.html?demo=1` chạy được 100%
  không cần backend (Task 4 trong plan Giai đoạn 0)
- Nhúng demo vào landing page dưới dạng iframe

**Verify**: mở GitHub Pages project site trên browser sạch (không cookie, không
header) → landing page và iframe demo render không cần backend.

## 0.2 Installer 1 lệnh (curl | bash) [ĐÃ TRIỂN KHAI]

Installer hiện tải release bundle đã checksum, giữ `.env`, cài dependency host
theo APT/DNF/Pacman, bật rootless Podman socket và khởi động Compose.

**Giải pháp** (Task 5 trong plan):
- `install.sh` detect Linux package manager, pull image từ GitHub Release,
  `podman compose up -d`
- Hỗ trợ `--version`, `--dry-run`, `--non-interactive` và custom install dir

**Verify**: CI chạy `bash -n install.sh` và installer dry-run; production run
dùng asset `install.sh` của GitHub Release với một tag cụ thể.

---

# P1 — Thắng lớn, effort thấp

## 1. Container Restart / Stop [ĐÃ TRIỂN KHAI]

**Trạng thái**: Đã có sẵn trong codebase hiện tại.
- Nút restart/stop trên UI (chỉ admin mới bấm được)
- API endpoint `/api/v1/containers/:id/restart` và `/stop`
- Confirmation dialog trước khi thực hiện hành động
- Hỗ trợ đầy đủ cho cả các remote node thông qua giao thức WebSocket (WSS) của host agent.

---

## 2. DNS / TCP Probe Types [ĐÃ TRIỂN KHAI]

**Ai có**: Uptime Kuma (HTTP, TCP, Ping, DNS, MQTT, gRPC, game server)

Dashboard hỗ trợ HTTP/HTTPS và TCP. Nhiều service homelab phổ biến không có HTTP endpoint:

| Service | Port | Cần probe |
|---|---|---|
| Pi-hole / AdGuard | 53 | DNS query |
| PostgreSQL / Redis | 5432 / 6379 | TCP |

**Đã triển khai**:
- `tcp://host:port` — TCP dial with timeout — đã triển khai
- `dns://host/domain` — DNS resolution probe (thay thế cho Ping/ICMP vì ICMP đòi hỏi CAP_NET_RAW / quyền root) — đã triển khai
- UI cho phép chọn `NONE / HTTP / TCP / DNS` và tự động hiển thị placeholder.

---

## 3. Quick Filter / Search cho danh sách [ĐÃ TRIỂN KHAI]

**Trạng thái**: Đã có sẵn trong codebase hiện tại.
- Ô input filter/search cho cả mục Services và Containers.
- Instant client-side filter theo text (tên, image, status).
- Các nút filter nhanh theo trạng thái (running, stopped, attention, up, unknown).
- Counter hiển thị "Showing X / Y" (ví dụ: `8 / 9 SHOWN`).

---

## 4. PWA (Progressive Web App) [ĐÃ TRIỂN KHAI]

**Ai có**: Homepage, Homarr, Homer

Operator kiểm tra homelab từ điện thoại. PWA cho phép "install" dashboard lên
home screen như app native. Homer, Homepage, Homarr đều có PWA manifest.

Đây là tính năng effort **rất thấp** nhưng giá trị **rất cao**.

**Thiếu cụ thể**:
- `static/manifest.webmanifest` với `display: standalone`, theme `#101010`
- `<link rel="manifest">` trong `index.html`
- Icon SVG 192×192 và 512×512

**Effort ước lượng**: rất thấp (manifest + 2 icon, ~30 phút). Lưu ý: PWA cần
HTTPS — Tailscale Serve đã cung cấp sẵn.

---

# P2 — Nên làm sau

## 5. Multi-Provider Notifications [ĐÃ CHỐT HOÀN THIỆN]

**Ai có**: Uptime Kuma (90+ kênh), Grafana Alertmanager, Netdata

Dashboard hiện hỗ trợ ntfy và generic webhook. Phần lớn homelab operator dùng
Telegram, Discord, hoặc Email; các kênh này có thể nối qua webhook automation
mà không đưa thêm SDK/provider dependency vào dashboard.

> Quyết định thiết kế 2026-08-06: TUYỆT ĐỐI KHÔNG tích hợp 90+ kênh hay Telegram/Discord native. 
> Việc thêm các API provider làm tăng hàng trăm LOC và phá vỡ quy tắc "Simplicity First". 
> Người dùng sẽ dùng **Webhook generic (HTTP POST + HMAC-SHA256)** để bắn sang N8N, Zapier hoặc hệ thống tự động hoá riêng.

**Đã triển khai**:
- Webhook generic (HTTP POST + HMAC-SHA256)
- Fan-out ntfy + webhook với delivery queue/retry hiện tại
- Tính năng này đã đóng và được coi là Feature-Complete.

---

## 6. Log Level Highlighting [ĐÃ TRIỂN KHAI]

**Ai có**: Dozzle

Dozzle tô màu log theo severity: ERROR = đỏ, WARN = vàng, DEBUG = xám.
Dashboard hiện đã tô severity trong log viewer — ERROR/FATAL/CRITICAL màu đỏ,
WARN/WARNING màu vàng và DEBUG màu xám — để quét lỗi nhanh hơn.

**Thiếu cụ thể**:
- Wrap từ khóa severity bằng `<span>` có class tương ứng
- `ERROR`, `FATAL`, `CRITICAL` → màu `var(--red)`
- `WARN`, `WARNING` → màu `var(--yellow)`
- Chỉ áp dụng cho log viewer read-only, không ảnh hưởng xterm interactive

---

# P3 — Deferred (xung đột positioning, để sau)

> Lý do để sau: các mục này kéo sản phẩm về hướng "đầy đủ tính năng" — trái
> ngược vị thế "intentionally small ops console for 1–5 nodes" đang marketing.
> Beszel (24k⭐) dark-only, không light theme, vẫn dẫn đầu phân khúc. Chỉ làm
> khi có phản hồi thật từ người dùng yêu cầu.

## 7. Keyboard Shortcuts [ĐÃ TRIỂN KHAI]

**Ai có**: Cockpit, Grafana, Homer (fuzzy search + shortcuts)

Dashboard đã có bộ phím tắt vận hành cơ bản. k9s (Kubernetes TUI) nổi tiếng vì
shortcut system. Grafana có `?` mở help. Homer có fuzzy search tức thì.

**Thiếu cụ thể**:
- `?` — mở/đóng bảng phím tắt
- `g` → `o/s/c/n/h/a/t` — chuyển workspace
- `/` — focus filter/search hiện tại
- `Ctrl+~` — toggle terminal
- `Esc` — đóng modal/drawer
- Suppress khi focus trong input/textarea/xterm

---

## 8. Regex Log Search [ĐÃ TRIỂN KHAI — P3.8]

**Ai có**: Dozzle, Chrome DevTools

Dashboard chỉ có substring match cho log search. Operator cần tìm pattern
phức tạp: IP address, error code, stack trace regex.

Dozzle hỗ trợ regex + fuzzy search. Chrome DevTools console cũng có regex
filter.

**Đã triển khai**:
- [x] Toggle button `/.*/` bên cạnh ô search
- [x] Compile và giới hạn regex ở backend trước khi gửi sang Loki
- [x] LogQL dùng `|~` khi bật regex, `|=` ở chế độ thường
- [x] API trả lỗi 400 rõ ràng cho regex không hợp lệ; UI giữ kết quả hợp lệ trước đó
- [x] Demo mode, unit test, HTTP API test và browser regression test
- [x] Match counter theo dòng log, highlight kết quả và điều hướng Enter/Shift+Enter

**Phần còn lại**: chưa có fuzzy search hoặc tìm kiếm xuyên nhiều trang dữ liệu;
phạm vi hiện tại giới hạn 200 entries theo thiết kế Logs workspace.

---

## 9. Panel Show/Hide & Workspace Reorder [ĐÃ TRIỂN KHAI]

**Ai có**: Homer (YAML sections), Homarr (drag-and-drop), Dashy (GUI editor)

Dashboard có 7 workspace cố định. Không ẩn/hiện được panel không dùng (ví dụ:
Topology nếu không setup dependency map). Không sắp xếp lại thứ tự sidebar.

Homer cho phép tổ chức sections qua YAML. Homarr cho phép kéo thả widget.
Dashy cho phép chỉnh qua GUI hoặc YAML.

**Đã thực hiện**:
- Settings cho phép admin ẩn/hiện và di chuyển từng workspace bằng nút lên/xuống; Overview luôn hiển thị để giữ đường thoát điều hướng.
- Thứ tự và danh sách ẩn gồm cả Logs được validate, lưu bền vững trong SQLite và ghi audit event.
- Route trực tiếp đến workspace bị ẩn tự quay về `#overview`; viewer vẫn chỉ xem và không có quyền ghi preference.
- Không dùng drag-and-drop để giữ UI và dependency surface nhỏ.

---

## 10. Dark / Light Theme Toggle [ĐÃ TRIỂN KHAI]

**Ai có**: Beszel, Homarr, Uptime Kuma, Homer, Homepage, Dashy, Heimdall

Dashboard chỉ có dark mode. Hầu hết mọi sản phẩm trên thị trường đều có
toggle dark/light. Một số operator làm việc ban ngày ở nơi sáng cần light mode.

> Ghi chú 2026-08-03: Beszel dark-only vẫn đạt 24k⭐ — đây không phải yếu tố
> quyết định adoption. Nếu làm, chỉ thêm palette thứ hai trong `tokens.css`,
> không đổi kiến trúc.

**Đã thực hiện**:
- Có palette light graphite/amber riêng trong `tokens.css`, không khôi phục cyan/glass theme cũ.
- Toggle trên header ưu tiên preference đã lưu trong `localStorage`, sau đó `prefers-color-scheme`, và mặc định dark.
- Theme runtime cập nhật Chart.js và xterm.js; browser regression bao phủ persistence, route fallback và các breakpoint chính.
