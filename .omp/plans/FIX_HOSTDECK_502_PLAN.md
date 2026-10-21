# Plan: Khắc phục lỗi 502 Bad Gateway khi truy cập Hostdeck qua Tailscale

## Context
Người dùng truy cập `https://debian-server.tail615ea5.ts.net/#overview` gặp lỗi "This site isn't working" (mã HTTP 502 Bad Gateway).
Qua điều tra thực tế trên server `debian-server` (100.120.110.25):
- Tailscale Serve đang chuyển tiếp cổng 443 về `http://127.0.0.1:8081`.
- Dịch vụ backend `dashboard.service` (systemd user unit, PID 1034) bị treo cứng do cấu hình cgroup v2 quá khắt khe: `MemoryHigh=9M`, `MemoryMax=12M`, `MemorySwapMax=0`.
- Khi bộ nhớ ẩn (anonymous memory: Go heap, stack, SQLite) chạm mức 10.26 MB (> 9 MB), cgroup không thể giải phóng bộ nhớ và cấm swap, khiến Linux kernel đẩy các thread của tiến trình vào trạng thái `D (disk sleep)` với hàm chờ `mem_cgroup_handle_over_high` (ghi nhận hơn 3.73 triệu lượt throttle trong `memory.events`).
- Tiến trình không thể mở/lắng nghe socket HTTP trên cổng 8081, dẫn đến Tailscale Serve trả về HTTP 502.

Mục tiêu: Điều chỉnh ngưỡng cgroup và Go runtime trên `dashboard.service` về mức an toàn (ổn định ở ~15–25MB RAM, loại bỏ throttling vô hạn), khởi động lại dịch vụ và khôi phục truy cập Hostdeck bình thường qua Tailscale URL.

---

## Approach

### Bước 1: Cập nhật file cấu hình systemd user service trên `debian-server`
- Target: `/home/binhminh/.config/systemd/user/dashboard.service` trên `debian-server` (100.120.110.25).
- Thao tác: Thay thế các giới hạn bộ nhớ cực đoan bằng cấu hình ổn định nhưng vẫn tối ưu RAM:
  - Thay `Environment=GOMEMLIMIT=6MiB` thành `Environment=GOMEMLIMIT=18MiB`.
  - Thay `Environment=GOGC=15` thành `Environment=GOGC=30`.
  - Giữ nguyên `Environment=GOMAXPROCS=1` và `Environment=GODEBUG=madvdontneed=1`.
  - Thay `MemoryHigh=9M` thành `MemoryHigh=28M`.
  - Thay `MemoryMax=12M` thành `MemoryMax=45M`.
  - Xóa bỏ hoặc nâng `MemorySwapMax=0` thành `MemorySwapMax=64M` để tránh kernel deadlock khi có tải đột biến.

Nội dung phần `[Service]` hoàn chỉnh:
```ini
[Unit]
Description=HomeLab Dashboard
After=network.target podman.socket

[Service]
Type=simple
ExecStart=/home/binhminh/HomeLab-Minh/dashboard
Restart=always
RestartSec=5
Environment=DASHBOARD_ADDR=127.0.0.1:8081
Environment=DATA_PATH=/home/binhminh/HomeLab-Minh/data/dashboard.db
Environment=ADMIN_USERS=pata10102004@gmail.com
Environment=HOST_PROC_PATH=/proc
Environment=HOST_SYS_PATH=/sys
Environment=HOST_ROOT_PATH=/
Environment=PODMAN_SOCKET=/run/user/1000/podman/podman.sock
Environment=TRUST_TAILSCALE_HEADERS=true
Environment=HOST_SHELL_ENABLED=true
Environment=HOST_SHELL_USERS=pata10102004@gmail.com
Environment=HOST_AGENT_SOCKET=/run/user/1000/homelab-dashboard/agent.sock
Environment=PATH=/home/binhminh/go/go/bin:/usr/local/bin:/usr/bin:/bin

# Go runtime low-memory tuning
Environment=GOMEMLIMIT=18MiB
Environment=GOGC=30
Environment=GOMAXPROCS=1
Environment=GODEBUG=madvdontneed=1

# Linux cgroup hardware memory constraints
MemoryAccounting=yes
MemoryHigh=28M
MemoryMax=45M
MemorySwapMax=64M

[Install]
WantedBy=default.target
```

### Bước 2: Nạp lại cấu hình và khởi động lại `dashboard.service`
- Chạy lệnh trên `debian-server`:
  ```bash
  systemctl --user daemon-reload
  systemctl --user restart dashboard.service
  ```
- Kiểm tra trạng thái tiến trình mới:
  ```bash
  systemctl --user status dashboard.service
  ```
  Xác nhận trạng thái `active (running)`, có PID mới và log xuất hiện `"dashboard listening", "address": "127.0.0.1:8081"`.

### Bước 3: Xác minh Tailscale Serve và kết nối HTTP nội bộ
- Kiểm tra cổng 8081 nội bộ trên `debian-server`:
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8081/health/live
  ```
  Kỳ vọng: `200`.
- Kiểm tra Tailscale Serve trạng thái proxy:
  ```bash
  tailscale serve status
  ```
  Xác nhận định tuyến `https://debian-server.tail615ea5.ts.net` -> `http://127.0.0.1:8081`.

---

## Critical files & anchors
- `/home/binhminh/.config/systemd/user/dashboard.service` trên `debian-server`: file cấu hình user unit của systemd, điều khiển tiến trình Hostdeck dashboard và giới hạn cgroup v2.
- `/sys/fs/cgroup/user.slice/user-1000.slice/user@1000.service/app.slice/dashboard.service/memory.events`: vị trí đọc biến cố cgroup v2 (xác nhận `high` và `oom` không còn tăng đột biến).

---

## Verification
1. **Kiểm tra tiến trình và cổng lắng nghe trên debian-server:**
   - Lệnh: `ss -tulpn | grep 8081`
   - Kỳ vọng: socket `127.0.0.1:8081` ở trạng thái `LISTEN` bởi tiến trình `dashboard`.
2. **Kiểm tra API Healthcheck:**
   - Lệnh: `curl -I http://127.0.0.1:8081/health/live`
   - Kỳ vọng: `HTTP/1.1 200 OK`.
3. **Kiểm tra truy cập qua Tailscale HTTPS từ máy hiện tại (fedora-linux):**
   - Lệnh: `curl -Iv https://debian-server.tail615ea5.ts.net/`
   - Kỳ vọng: Trả về `HTTP/2 200` (hoặc redirect chuẩn của Hostdeck) thay vì `HTTP/2 502`.
4. **Kiểm tra cgroup memory throttling:**
   - Lệnh: `cat /sys/fs/cgroup/user.slice/user-1000.slice/user@1000.service/app.slice/dashboard.service/memory.current`
   - Kỳ vọng: RAM sử dụng thực tế dao động ổn định trong khoảng 12MB – 20MB, các luồng trong `/proc/<PID>/task/*/wchan` không bị treo ở `mem_cgroup_handle_over_high`.

---

## Assumptions & contingencies
- Mật khẩu sudo / SSH của user `binhminh` trên `debian-server` là `binh.minh@NBM2004` (đã đối chiếu từ session trước trong Orca terminal).
- Nếu sau khi khởi động lại, `dashboard.service` gặp lỗi khóa file SQLite (`database is locked`), kill tiến trình cũ PID 1034 đang bị treo cgroup (`kill -9 1034`) trước khi restart dịch vụ.
- Nếu người dùng vẫn muốn giữ mức RAM cực thấp dưới 15MB trong tương lai, cần giải pháp tối ưu code (bỏ Gin sang net/http, hợp nhất host-agent vào in-process) thay vì siết cgroup v2 cứng ở tầng kernel gây treo tiến trình.
