# Phase B: Multi-mount collector và S.M.A.R.T. thật

## Tóm tắt

Nâng cấp collector để:

- Tự động phát hiện nhiều mount point từ host `/proc`.
- Thu thập dung lượng và tốc độ đọc/ghi cho từng mount.
- Lấy S.M.A.R.T. health/nhiệt độ qua một host-side helper riêng.
- Không cấp thêm quyền `/dev` hoặc `CAP_SYS_ADMIN` cho dashboard container.
- Widget Storage Pools hiển thị trạng thái PASSED, FAILED, STANDBY, UNAVAILABLE, TIMEOUT.

File thực tế trong repository là `Docs/phase-b-plan.md`.

## Thay đổi triển khai

### Collector và model

- Mở rộng `model.DiskStats` với:
    - `SmartStatus`
    - `TemperatureCelsius`

- Đổi `CollectorOptions.RootPath` thành hỗ trợ `MountPoints []string`.
- Mặc định tự đọc mount table của host:
    - Ưu tiên `/proc/1/mounts`, fallback `/proc/mounts`.
    - Giải mã escape path của `/proc/mounts`.
    - Bỏ qua `tmpfs`, `devtmpfs`, `proc`, `sysfs`, `overlay`, `aufs`, `squashfs` và các pseudo filesystem khác.
    - Chỉ thu thập filesystem thật như `ext4`, `xfs`, `btrfs`, `zfs`, `vfat`.

- Hỗ trợ `HOMELAB_MOUNT_POINTS` như allowlist tùy chọn:
    - Không cấu hình: tự động discovery.
    - Có cấu hình: chỉ thu thập các mount hợp lệ được chỉ định.

- Giữ fallback thu thập `/` nếu mount discovery thất bại.
- Chuẩn hóa mapping device partition/device-mapper để disk counters không bị mất khi mount dùng `/dev/mapper/*`.

### Host-side SMART helper

Tạo helper chạy trên host dưới systemd với nguyên tắc least privilege:

- Helper chạy ngoài dashboard container.
- Socket Unix riêng, owner/group giới hạn cho dashboard runtime user.
- Không nhận shell command tùy ý.
- Request chỉ chứa một device path hợp lệ.
- Chỉ thực thi dạng cố định:
  `smartctl --json --all -n standby <allowlisted-device>`
- Mỗi lệnh có timeout 3 giây.
- Có giới hạn concurrency.
- Nếu disk đang ngủ, trả `STANDBY` mà không đánh thức disk.
- Nếu không có smartctl, không đủ quyền hoặc device không hỗ trợ: trả `UNAVAILABLE`.
- Timeout trả `TIMEOUT`.
- JSON hợp lệ nhưng SMART fail vẫn trả `FAILED`, không coi exit code khác 0 là lỗi transport.
- Log lỗi được rate-limit để tránh spam mỗi snapshot.

Protocol helper tối thiểu:
```json
{
  "device": "/dev/sda"
}
```

Response:
```json
{
  "device": "/dev/sda",
  "smartStatus": "PASSED",
  "temperatureCelsius": 35
}
```

Các status hợp lệ: `PASSED`, `FAILED`, `STANDBY`, `UNAVAILABLE`, `TIMEOUT`.

Collector nhận `SmartClient` interface để test bằng mock; production dùng Unix-socket client. Nếu socket không cấu hình hoặc không kết nối được, collector vẫn chạy metrics bình thường và chỉ đánh dấu SMART là `UNAVAILABLE`.

### Cấu hình và deployment

- Thêm `SMART_AGENT_SOCKET` tùy chọn.
- Thêm `HOMELAB_MOUNT_POINTS` tùy chọn.
- Cập nhật dashboard và node-agent để truyền các cấu hình này vào collector.
- Compose chỉ bind-mount socket SMART read-only; không bind `/dev` vào dashboard.
- Bổ sung:
    - Binary/helper SMART.
    - systemd unit.
    - install/configuration instructions.
    - health/probe command cho socket.
- Không làm startup dashboard fail nếu SMART helper chưa được cài.

### Frontend Storage Pools

- Xóa placeholder `SMART NOT COLLECTED` khi đã có dữ liệu thật.
- Mỗi disk row hiển thị:
    - Mount point.
    - Usage bar.
    - Read/write rate.
    - SMART status.
    - Temperature nếu có.
- Mapping visual:
    - PASSED: trạng thái xanh.
    - FAILED: đỏ và cảnh báo rõ.
    - STANDBY: xanh/xám, nhãn disk đang ngủ.
    - UNAVAILABLE: xám, không coi là disk failure.
    - TIMEOUT: vàng/cảnh báo.
- Không dùng emoji; dùng text status và inline SVG/icon system hiện có.
- Giữ layout responsive, không để status hoặc nhiệt độ tràn trên mobile.
- Snapshot cũ không có field SMART vẫn render bình thường với `UNAVAILABLE`.

## Kiểm thử và acceptance criteria

### Go tests

- Parser SMART:
    - SMART passed + temperature.
    - SMART failed.
    - Standby response.
    - Missing temperature.
    - Malformed JSON.
    - Missing binary.
    - Timeout.
- Collector:
    - Nhiều mount point trả đúng số disk.
    - Pseudo filesystem bị loại bỏ.
    - Host PID 1 mount table được ưu tiên.
    - Fallback /proc/mounts.
    - Device partition và device-mapper.
    - SMART client failure không làm mất snapshot.
- Config:
    - Default auto-discovery.
    - Parse `HOMELAB_MOUNT_POINTS`.
    - Validate path tuyệt đối, duplicate và mount không hợp lệ.
- Helper:
    - Chỉ cho phép device đã allowlist.
    - Từ chối path traversal hoặc arbitrary command.
    - Unix socket permission.
    - Timeout/concurrency behavior.

### Browser tests

- Storage Pools hiển thị nhiều disk.
- Render đúng PASSED, FAILED, STANDBY, UNAVAILABLE, TIMEOUT.
- Temperature chỉ xuất hiện khi backend trả giá trị.
- Disk đang standby không bị hiển thị như lỗi.
- Mobile không overflow.
- Snapshot cũ không có SMART fields vẫn render được.

### Manual verification

1. Chạy dashboard không cài SMART helper:
    - Dashboard vẫn healthy.
    - Storage hiển thị `UNAVAILABLE`.
2. Cấu hình hai hoặc nhiều mount: `/` và `/boot` hoặc `/mnt/data`.
3. Cài helper và smartmontools:
    - Disk hoạt động trả PASSED và nhiệt độ.
    - Disk standby trả STANDBY mà không bị đánh thức.
4. Kiểm tra dashboard container không có thêm quyền `/dev`.
5. Chạy toàn bộ:
   `go test ./...`
   `go test -tags=browser ./tests/browser -count=1 -timeout=180s`

## Giả định và tương thích

- Host-side helper là lựa chọn chính thức cho SMART; không mở rộng quyền dashboard container.
- SMART là best-effort và optional; thiếu helper không chặn metrics.
- Multi-mount discovery tự động là mặc định; biến môi trường chỉ là allowlist tùy chọn.
- Không thay đổi wire format snapshot hiện tại ngoài việc thêm field mới có thể thiếu.
- Không cần migration SQLite vì Phase B chỉ mở rộng runtime metrics.
- Không đánh thức disk đang standby; bắt buộc dùng `-n standby`.

## Trạng thái triển khai

> Cập nhật: 2026-08-05 · Commit hiện tại: `d4a80e6`

### Đã triển khai

- [x] Collector hỗ trợ nhiều mount point và đọc mount table từ host PID 1, có fallback về `/proc/mounts`.
- [x] Thu thập usage cùng tốc độ đọc/ghi theo từng disk.
- [x] Có interface SMART để mock trong collector và model `SMARTInfo` mở rộng, không phá snapshot cũ.
- [x] Có host-side SMART helper riêng với Unix socket, allowlist device, từ chối path traversal và không nhận arbitrary command.
- [x] Helper thực thi lệnh cố định `smartctl --json --all -n standby`, timeout 3 giây và giới hạn concurrency.
- [x] Helper và demo UI xử lý các trạng thái `PASSED`, `FAILED`, `STANDBY`, `UNAVAILABLE`, `TIMEOUT`.
- [x] Có binary `cmd/smart-agent`, Containerfile target, systemd unit và script cài đặt rootless.
- [x] Storage Pools hiển thị mount point, usage, read/write rate, SMART status và nhiệt độ khi có dữ liệu.
- [x] Đã có unit tests cơ bản cho SMART parser, allowlist/socket round-trip và multi-mount discovery.

### Hoàn thiện & Checklist

- [x] Nối `SMART_AGENT_SOCKET` từ config/Compose vào collector production của `dashboard` và `node-agent`.
- [x] Chuẩn hóa biến allowlist theo `HOMELAB_MOUNT_POINTS`.
- [x] Hoàn thiện mapping partition/device-mapper để disk counters luôn khớp mount.
- [x] Bổ sung rate-limit cho log lỗi helper và health/probe command cho SMART socket.
- [x] Bổ sung browser tests cho nhiều disk, đủ năm trạng thái SMART, nhiệt độ và mobile overflow.
- [ ] Chạy manual verification với smartmontools thật, disk standby và xác nhận container dashboard không có `/dev`/capability mới.

### Coverage hiện tại

Ước tính theo phạm vi acceptance của Phase B:

| Nhóm | Coverage |
| --- | ---: |
| Multi-mount collector/model | ~65% |
| SMART host-helper | ~75% |
| Config và deployment wiring | ~35% |
| Storage Pools UI | ~70% |
| Test và acceptance | ~40% |
| **Tổng thể Phase B** | **~55–60%** |

`go test ./...` đã compile và chạy được các package Phase B, nhưng trong sandbox hiện tại một số test Unix socket của `internal/hostagent` và `internal/podman` thất bại với `setsockopt: operation not permitted`. Đây là giới hạn môi trường kiểm thử hiện tại; chưa được đánh dấu là pass production.
