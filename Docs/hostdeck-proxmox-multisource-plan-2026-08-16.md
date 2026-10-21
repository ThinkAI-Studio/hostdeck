# HostDeck — Plan: Proxmox support + Multi-source data

**Ngày:** 2026-08-16
**Trạng thái:** Chờ duyệt (plan nghiên cứu, chưa code)
**Nguồn:** 3 research threads (Proxmox API / Multi-source landscape / Product strategy) + selfh.st survey 2024-2025 + GitHub issues + r/Proxmox + r/selfhosted

---

## 1. Bối cảnh

HostDeck hiện chỉ thu thập từ: host metrics (`/proc`), Podman containers (libpod API v5), backups, SMART, service probes (HTTP/TCP/TLS). Extension point: `internal/metrics/hub.go` `Sources` struct (Host, Services, Containers, Alerts, Backups) — thêm source mới = thêm field + func-type adapter.

**Vấn đề:** Podman chỉ ~10% thị trường homelab (selfh.st 2025: 446/4081). Proxmox là hypervisor #1 (45%). Docker 89%. Để adoption, HostDeck phải đọc Proxmox + Docker + nhiều nguồn.

## 2. Phát hiện chính

### 2.1 Proxmox VE API — GET-only đủ cho monitoring ✅

- **Base:** `https://<host>:8006/api2/json/`, mọi response bọc `{"data": ...}`
- **Auth:** API token — header `Authorization: PVEAPIToken=USER@REALM!TOKENID=UUID`, stateless, không hết hạn, không CSRF. Role `PVEAuditor` trên path `/` = đủ read-only toàn bộ. Tạo qua UI: Datacenter → Permissions → API Tokens
- **Không có unix socket** — chỉ TCP 8006 HTTPS (pveproxy). Cert tự ký → InsecureSkipVerify hoặc pin CA
- **Endpoints chính:**
  - `GET /cluster/resources?type=vm` — **1 call lấy toàn bộ VMs + LXC cả cluster** (kèm cpu/mem/disk/net/uptime/tags/status) → killer endpoint
  - `GET /nodes/{node}/tasks?typefilter=vzdump&limit=20` — backup freshness (status OK/error + endtime)
  - `GET /nodes/{node}/status` — node health (cpu, loadavg, memory, rootfs, swap, pveversion)
  - `GET /nodes/{node}/storage` — storage usage (`used_fraction`)
  - `GET /nodes/{node}/rrddata?timeframe=hour` — time-series CPU/RAM/net (node vs guest khác field names — parse `map` thủ công)
  - `GET /nodes/{node}/qemu/{vmid}/agent/*` — guest agent: IP, hostname, OS, fsinfo (cần VM có `agent:1` + qemu-guest-agent)
- **Go client:** tự viết ~150-200 dòng `net/http` + `json.Number` (zero dep, khớp style "3 static binaries"). `luthermonson/go-proxmox` (280★, active) typed sẵn nhưng drop field node rrddata. `bpg/proxmox-go` + `honky-tonk/proxmox-api-go` **không tồn tại** (tên đúng: `Telmate/proxmox-api-go`)
- **Poll:** cluster/resources 30-60s, node status 30s, rrddata 1-5min, tasks 5min

### 2.2 Nguồn dữ liệu khác (độ khó)

| Nguồn | Truy cập | Độ khó | Ghi chú |
|---|---|---|---|
| **Docker** | Docker Engine API 1.41-1.44 (socket root/rootless) | **1** | **Reuse client**: Podman docker-compat socket chạy cùng API → 1 client dùng cho cả Docker + Podman (Portainer/Glance/Beszel làm vậy). Pin version 1.41-1.44 (Docker CLI 29 bump 1.44 làm vỡ compat Podman 5.7) |
| **systemd** | D-Bus `org.freedesktop.systemd1` hoặc parse CLI | 1-2 | unit state, MainPID, MemoryCurrent, CPUUsageNSec, failed units — **điểm trống thị trường** |
| **libvirt/KVM** | `virsh` socket (cần root), libvirt-go (cgo) | 3 | VM state, domstats |
| **k3s** | kubeconfig local → REST 6443, client-go | 3-4 | minority (~23-25%) nhưng chuẩn cluster |
| **Proxmox** | REST 8006 + token | 2 | chi tiết 2.1 |
| **qemu-guest-agent** | qua hypervisor API | 2-3 | IP trong guest, exec lệnh |

### 2.3 Demand (số liệu thật)

- Proxmox **45%** (#1 hypervisor, gấp ~4x TrueNAS, ~8x Unraid); LXC 31% — **Proxmox+LXC là pattern chính** (~68% user Proxmox dùng LXC)
- Docker 89% vs Podman 10% → **Docker support tăng TAM ~9x**
- **Stack thống trị:** Proxmox host → LXC CT → Docker bên trong CT (helper-scripts 29.3k★, r/Proxmox 198-209K members)
- **Điểm trống thị trường:** không đối thủ nào cover systemd services / libvirt / k3s làm nguồn gốc
- Proxmox integration = **table stakes** (Glance ❌ chưa có #412 👍26, Homarr ✅, Dashy ✅) — HostDeck thiếu là lỗ hổng rõ

### 2.4 Proxmox user cần gì (xếp hạng có evidence)

| Ưu tiên | Nhu cầu | Evidence |
|---|---|---|
| **P0** | Backup monitoring vzdump success/fail | r/Proxmox 1cqi54w, 166dx9y (user tự viết script poll API); PVE notification hay hỏng (forum 136783) |
| **P0** | VM/LXC status + per-guest resource usage | Beszel #539 👍92, #281 👍83 mở lâu; forum 138730 |
| **P1** | Storage usage | Beszel #1541 ZFS 👍66 |
| **P2** | Guest agent info, cluster health | — |
| **Pain** | Không có solution lightweight ("How do y'all monitor Proxmox?" score 123 — toàn Zabbix/Grafana/Netdata nặng) | r/Proxmox 1goqvks |

### 2.5 Strategy đối thủ

- **Glance/Homarr/Dashy:** widget/plugin-based, dashboard *pull* từ nguồn → cần dashboard reachable tới mọi nguồn + không act được
- **Beszel:** agent-based (hub+agent) giống HostDeck nodeagent nhất, Podman-aware + SMART — đối thủ trực diện. **Beszel #176 👍11:** agent trong LXC báo RAM host thay vì RAM LXC → **LXC chia sẻ kernel, `/proc` phản ánh host** → hypervisor stats bắt buộc qua API PVE hoặc agent trên host

## 3. Quyết định kiến trúc (đề xuất — cần duyệt)

### 3.1 Proxmox: (c) cả hai — v1 remote connector, v2 agent-on-host

| | (b) Remote API connector (v1) | (a) Agent trên PVE host (v2) |
|---|---|---|
| Cách | Dashboard/central dial-out qua tailnet tới `8006` (vốn đã listen — **không mở port mới**, zero-inbound giữ nguyên) | nodeagent chạy trên PVE host |
| Friction | **≈0** — không cài gì trên host production, chỉ tạo API token | Cần cài agent trên host |
| Dữ liệu | Toàn bộ GET monitoring (VM/LXC/storage/backup/rrd) | + host metrics sâu + act (`pct enter`/`qm guest exec` = wow factor đúng identity "observe→act") |
| Token | Giữ ở central, an toàn hơn | Trên host |

→ **v1 bán được ngay, read-only đủ.** v2 sau cho act + host metrics.

### 3.2 Multi-source: thêm `Sources` mới trong hub, từng nguồn optional

- Thêm field vào `internal/metrics/hub.go` `Sources`: `Proxmox ProxmoxSource`, `Docker ContainerSource` (reuse), `Systemd SystemdSource`...
- Config env-based, **mặc định không set = không chạy** → user Podman cũ **không đổi gì** (kể trong docs: "no config change for existing users" — lợi thế so Glance YAML schema)
- `omitempty` trên `SnapshotData.ProxmoxNodes`, UI render conditional, alert rules mặc định tắt
- **Gọi PVE là "node"** (node agent ảo) — cùng ngôn ngữ UI đã có, giữ identity

### 3.3 Model mới

```go
// model.ProxmoxNode (node agent ảo)
type ProxmoxNode struct {
    Name      string          // node PVE
    Version   string          // pveversion
    Status    string          // online/offline
    CPU       float64         // fraction 0-1
    Memory    MemoryStats
    Storage   []ProxmoxStorage // name, type, total, used, used_fraction
    Guests    []ProxmoxGuest   // từ cluster/resources?type=vm
    Backups   []model.BackupStatus // từ tasks?typefilter=vzdump → map struct sẵn có
}

type ProxmoxGuest struct {
    VMID     int
    Type     string // qemu | lxc
    Name     string
    Status   string // running | stopped
    CPU      float64
    MaxCPU   int
    Mem      int64  // bytes
    MaxMem   int64
    Disk     int64
    MaxDisk  int64
    NetIn/Out int64
    Uptime   int64
    Tags     string
    Agent    *ProxmoxGuestAgent // IP, hostname, OS (nếu agent:1)
}
```

## 4. Roadmap

| Phase | Nội dung | Effort | Giá trị |
|---|---|---|---|
| **P1 (v1.1)** | Proxmox remote connector (REST token, cluster/resources, node status, storage, vzdump tasks → backup freshness trên tab Backups sẵn có; VM/LXC list trên tab Nodes/Topology) | ~1 tuần (client 200 dòng + model + config + UI) | Mở TAM 45% |
| **P2 (v1.2)** | Docker Engine API client (compat 1.41-1.44) — reuse với Podman | ~3-5 ngày | TAM 89% container |
| **P3 (v1.3)** | systemd services source (failed units, active states) — điểm trống thị trường | ~2-3 ngày | Differentiation |
| **P4 (v1.4)** | Agent trên PVE host (host metrics sâu, `pct enter`, `qm guest exec` act) | ~1 tuần | Wow + act identity |
| **P5** | qemu-guest-agent IP display, rrddata charts trên History | ~3 ngày | UX Proxmox |
| **P6 (backlog)** | k3s, libvirt | — | — |

## 5. Config mới (draft)

```
PROXMOX_URL=https://pve.tailnet.ts.net:8006   # hoặc http://100.x.x.x:8006
PROXMOX_TOKEN=root@pam!monitoring=UUID       # PVEAPIToken
PROXMOX_INSECURE_SKIP_VERIFY=true            # cert tự ký (mặc định true? — cân nhắc)
PROXMOX_POLL_INTERVAL=30s
PROXMOX_INCLUDE_TEMPLATES=false
# Docker: PODMAN_SOCKET trỏ docker.sock (đã hỗ trợ) + DOCKER_SOCKET riêng nếu cần cả 2
# systemd: SYSTEMD_ENABLED=true
```

## 6. Backward compatibility

- Không đổi default nào; config mới 100% optional
- `SnapshotData` thêm field `omitempty` — JSON cũ vẫn parse
- UI conditional: không có Proxmox → tab Nodes/Topology như cũ
- Không đụng `PODMAN_SOCKET` hiện tại

## 7. Positioning mới (đề xuất)

> *"Tailscale-only operations console — Proxmox nodes, Docker/Podman containers, bare-metal services. Không mở port, không monitoring stack."*

## 8. Việc cần duyệt ✅ ĐÃ DUYỆT

1. Chọn hướng Proxmox: **(b) remote connector v1** (khuyên dùng) — **DUYỆT**
2. `PROXMOX_INSECURE_SKIP_VERIFY` default: `true` — **DUYỆT**
3. Thứ tự roadmap: P1 Proxmox → P2 Docker → P3 systemd — **DUYỆT**
4. Gọi PVE là "node" trong UI — **DUYỆT**
5. Bổ sung: cần mock Proxmox API server để test end-to-end trước khi code thật — **SẼ LÀM TRONG P1**

---

## 9. Tiến độ implement (live)

| Task | Trạng thái | Ghi chú |
|---|---|---|
| P1.1: Model types (ProxmoxNode, ProxmoxGuest, ProxmoxStorage, ProxmoxGuestAgent) | ✅ Hoàn thành | go build PASS |
| P1.2: Config fields (PROXMOX_URL, TOKEN, POLL_INTERVAL, INSECURE_SKIP_VERIFY) | ✅ Hoàn thành | go build PASS |
| P1.3: Proxmox client (HTTP, token auth, json.Number, parse cluster/resources, node status, storage, tasks) | ✅ Hoàn thành | go build PASS |
| P1.4: ProxmoxSource adapter + hub.Sources extension | ✅ Hoàn thành | go build PASS |
| P1.5: Integrate vào nodeagent.LocalCollector (optional, conditional run) | ✅ Hoàn thành | go build PASS |
| P1.6: Mock Proxmox API server (httptest) cho test | ✅ Hoàn thành | tests PASS |
| P1.7: Unit test collector + client | ✅ Hoàn thành | tests PASS (8/8) |
| P1.8: Verify build + headless test | ✅ Hoàn thành | all tests PASS, binary runs with/without Proxmox config |

## 9. Ghi chú research

- `luthermonson/go-proxmox` (280★, Apache-2.0, active 2026-08) — nếu muốn typed sẵn; node rrddata bị drop field → parse map thủ công
- Podman client hiện tại gọi libpod API v5 — **không nói chuyện được Docker daemon**; cần client Docker Engine API riêng (hoặc chuyển hẳn sang docker-compat socket)
- Beszel đổi tên repo → `henrygd/beszel`
- rrddata field names khác nhau node vs guest — không dùng chung struct
