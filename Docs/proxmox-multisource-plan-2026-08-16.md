# HostDeck Multi-Source Monitoring — Proxmox + Docker + systemd

**Ngày:** 2026-08-16
**Trạng thái:** DRAFT — chờ user duyệt
**Repo:** bnhminh1010/hostdeck (local: HomeLab-Minh)
**Phạm vi:** HostDeck đọc thêm nhiều nguồn dữ liệu, không chỉ container Podman — ưu tiên nhóm user Proxmox (211k r/Proxmox, 43.1% hypervisor adoption)

---

## 1. Goal

HostDeck từ "Podman container dashboard" → **"homelab operations console đa nguồn"**:

1. **Proxmox VE support** (ưu tiên #1): đọc nodes, VMs (KVM), LXC containers, storage qua Proxmox API token — hiển thị trong Nodes view + topology + alerts
2. **Docker socket support**: verify + cho phép trỏ `PODMAN_SOCKET` sang `/var/run/docker.sock`
3. **Mở rộng nguồn dữ liệu**: systemd units probe (bare-metal services)
4. **Messaging/marketing**: reposition "hypervisor-agnostic: Proxmox, Docker, Podman, bare metal"

## 2. Current Context (verified từ code)

### Kiến trúc hiện tại
- **SnapshotData** (`internal/model/model.go`): System, Disks, Network, Services, Containers, Backups, Alerts — 1 struct trung tâm cho mọi nguồn
- **Pipeline** (`internal/monitoring/pipeline.go`): nhận snapshot → history + alerts + operations
- **NodeRegistry** (`internal/nodes/registry.go`): node agent WSS kết nối → snapshot
- **Config env** (`internal/config/config.go`): `PODMAN_SOCKET` default `/run/podman/podman.sock`, probe CIDR Tailscale-only
- **Container collector** (`internal/containers/collector.go` + `internal/podman/client.go`): Podman API qua Unix socket, alert restart-loop, stats

### Giới hạn hiện tại (đã xác nhận)
| Nguồn | Status |
|---|---|
| Podman containers | ✅ Có |
| Host metrics (/proc, SMART) | ✅ Có |
| HTTP/TCP/DNS probes (Tailscale CIDR) | ✅ Có |
| Backups (healthchecks.io-style) | ✅ Có |
| Node agent WSS (multi-host) | ✅ Có |
| **Docker** | ❌ Chưa verify — API shape giống nhưng chưa test |
| **VM / LXC (Proxmox, KVM)** | ❌ Không có |
| **systemd units** | ❌ Không có |

## 3. Research Findings (nguồn thật)

### 3.1 Proxmox API (proxmoxr.com guide + pve.wiki)
- **Auth chuẩn**: API token `PVEAPIToken=<user>@pve!<tokenid>=<secret>` trong `Authorization` header — persistent, không expire (ticket auth expire 2h, không nên dùng)
- **Role tối thiểu**: `PVEAuditor` (read-only) — đủ cho monitoring
- **Endpoints cần**:
  - `GET /api2/json/nodes` — list cluster nodes
  - `GET /api2/json/nodes/{node}/status` — CPU/RAM/uptime node
  - `GET /api2/json/nodes/{node}/qemu` — list VMs
  - `GET /api2/json/nodes/{node}/qemu/{vmid}/status/current` — VM status
  - `GET /api2/json/nodes/{node}/lxc` — list LXC containers
  - `GET /api2/json/nodes/{node}/lxc/{vmid}/status/current` — LXC status
  - `GET /api2/json/nodes/{node}/storage` — storage list
  - `GET /api2/json/cluster/resources` — toàn bộ resource 1 lần (nodes+VMs+CTs+storage) — **tối ưu nhất**
- **Rate limit**: không cứng, poll 5-10s OK
- **TLS**: self-signed default → cần `insecure-skip-verify` option hoặc trust cert (config toggle)
- **Port**: 8006 HTTPS

### 3.2 Beszel (đối thủ cùng niche, 22k⭐)
- Agent chạy trên PVE host = chỉ host metrics, **KHÔNG đọc Proxmox API** → không có per-VM/LXC breakdown (issue #633 closed dup, #176 open — LXC agent báo RAM host sai)
- **Gap thị trường rõ**: "per-VM/per-LXC visibility qua Proxmox API" chưa ai làm tốt trong lightweight segment
- Lesson: hub KHÔNG nên chạy trên node bị monitor (failure domain) — HostDeck central + agent trên node là đúng pattern

### 3.3 Docker/Podman compat (oneuptime + podman docs)
- Podman Docker-compat API: field names shadow (Id vs ID) cho đúng Docker client — wire format tương thích
- `internal/podman/client.go` dùng `defaultAPIVersion = "v5.0.0"` — **cần verify**: Docker socket trả version khác (v1.4x), có thể cần version negotiation (kiểm tra `GET /_ping` hoặc version endpoint)
- **Kết luận**: có khả năng chạy nhưng PHẢI test thật trên Docker socket trước khi claim

## 4. Proposed Approach — 3 Phase

### Phase 1: Proxmox VE data source (ưu tiên cao nhất)

**Thiết kế:**
```
internal/proxmox/
  client.go      — HTTP client: token auth, TLS skip-verify toggle, base URL
  types.go       — wire types (NodeStatus, QemuVM, LxcCT, ClusterResource)
  collector.go   — Collect(ctx) → model.ProxmoxNode{...}, model.Guest{...}
```

**Model mới** (thêm vào `internal/model/model.go`):
```go
type Guest struct {
    VMID       int    `json:"vmid"`
    Type       string `json:"type"`        // "qemu" | "lxc"
    Name       string `json:"name"`
    Status     string `json:"status"`      // running | stopped | ...
    Node       string `json:"node"`
    CPUCores   int    `json:"cpuCores,omitempty"`
    MemoryMB   uint64 `json:"memoryMB,omitempty"`
    DiskGB     uint64 `json:"diskGB,omitempty"`
    UptimeSec  uint64 `json:"uptimeSeconds,omitempty"`
}

type ProxmoxNode struct {
    Name       string     `json:"name"`
    Status     string     `json:"status"`   // online | offline
    CPULoad    float64    `json:"cpuLoad,omitempty"`
    MemoryUsed uint64     `json:"memoryUsedBytes,omitempty"`
    MemoryTotal uint64    `json:"memoryTotalBytes,omitempty"`
    UptimeSec  uint64     `json:"uptimeSeconds,omitempty"`
    Guests     []Guest    `json:"guests"`
}
```

**SnapshotData mở rộng:**
```go
type SnapshotData struct {
    // ...existing fields
    ProxmoxNodes []ProxmoxNode `json:"proxmoxNodes,omitempty"`
}
```
`omitempty` — backward compatible, node agent cũ không cần update.

**Config env mới:**
```
PROXMOX_URL            (vd https://100.x.x.x:8006)
PROXMOX_TOKEN          (PVEAPIToken value)
PROXMOX_TOKEN_ID       (vd root@pve!hostdeck — hoặc gộp vào token)
PROXMOX_INSECURE_TLS   (default false — vì self-signed)
PROXMOX_POLL_INTERVAL  (default 15s)
```

**Tích hợp:**
1. `internal/config/config.go` — parse 5 env mới
2. `internal/proxmox/` — client + collector mới (poll `/cluster/resources` + `/nodes`)
3. `cmd/dashboard/main.go` — wire collector vào snapshot flow (nếu config có token)
4. `internal/httpapi/snapshot.go` — expose qua snapshot (field mới tự nhiên theo)
5. `static/js/operations.js` + `static/index.html` — **Nodes view**: hiển thị Proxmox nodes + guests (thẻ VM/LXC riêng, filter, status badge)
6. Topology: guests → nodes dependency (guest chạy trên node nào)
7. Alerts: guest stopped / node offline → alert engine

**Verify:**
- Unit test: `internal/proxmox/collector_test.go` — mock HTTP server trả fixture JSON cluster/resources
- Integration test: chạy thật với token test
- Headless browser test: Nodes view render Proxmox data

---

### Phase 2: Docker socket support

**Cách làm (surgical):**
1. Verify version negotiation: `internal/podman/client.go` — thêm khả năng đọc version từ `GET /_ping` hoặc bỏ cứng `v5.0.0` (thử `v1.41+`)
2. Test thật trên Docker socket (`PODMAN_SOCKET=/var/run/docker.sock`)
3. Nếu khác biệt nhỏ (field names) → normalize trong `internal/podman/types.go`
4. Config: giữ nguyên `PODMAN_SOCKET` (rename sẽ phá config cũ — không làm)
5. Update messaging + docs: "Podman & Docker"

**Verify:**
- Unit test với fixture Docker API response
- Nếu không có Docker thật để test → **claim "Podman verified, Docker experimental"** — không bịa

---

### Phase 3: systemd units probe (bare-metal services)

**Thiết kế (nằm trong node agent, không phải central):**
- Agent đọc `systemctl list-units --type=service --no-pager --plain` (hoặc dbus) trên node
- Map active/failed units → services với status up/down
- Gửi qua snapshot như Services

**Verify:**
- Unit test parse systemctl output
- Test trên host thật có systemd

---

## 5. Files Likely to Change

| File | Phase | Mức độ |
|---|---|---|
| `internal/model/model.go` | 1,3 | Thêm ProxmoxNodes + Guests |
| `internal/config/config.go` | 1 | 5 env Proxmox |
| `internal/proxmox/client.go` (MỚI) | 1 | Client HTTP token auth |
| `internal/proxmox/collector.go` (MỚI) | 1 | Poll + map model |
| `internal/proxmox/types.go` (MỚI) | 1 | Wire types |
| `internal/proxmox/collector_test.go` (MỚI) | 1 | Mock HTTP test |
| `cmd/dashboard/main.go` | 1 | Wire collector |
| `internal/podman/client.go` | 2 | Version negotiation |
| `internal/podman/types.go` | 2 | Normalize fields |
| `internal/nodeagent/collector.go` | 3 | systemd probe |
| `static/js/operations.js` | 1,3 | Nodes view render |
| `static/index.html` | 1 | UI templates |
| `static/css/style.css` | 1 | Styles |
| `static/sw.js` | 1,3 | CACHE_NAME bump (v7→v8) |
| `site/` + README | 1,2,3 | Messaging "hypervisor-agnostic" |
| `.env.example` | 1 | PROXMOX_* docs |

## 6. Tests / Validation

- `go test ./...` — full suite pass
- `go vet ./...` — clean
- Unit: proxmox collector mock HTTP (fixture cluster/resources JSON từ docs thật)
- Integration: chạy dashboard + token thật → Nodes view hiển thị VM/LXC
- Headless browser test (puppeteer-core pattern đã có) — render verify
- Vision verify screenshot (chuẩn pixel tuyệt đối)
- SW cache bump + hard refresh test

## 7. Risks, Tradeoffs, Open Questions

| Rủi ro | Giảm thiểu |
|---|---|
| Proxmox API shape thay đổi theo version (8.x vs 7.x) | Dùng endpoint ổn định nhất (`/cluster/resources`), parse lenient |
| Docker wire format khác chi tiết | Phase 2 test thật trước khi claim; không bịa |
| SnapshotData mở rộng phá frontend cũ | `omitempty` + frontend check optional field |
| Token lộ trong config/env | Env + file permission; docs hướng dẫn token PVEAuditor riêng |
| Proxmox TLS self-signed chặn | `PROXMOX_INSECURE_TLS` toggle (default off, docs cảnh báo) |

**Open questions:**
1. Proxmox: chỉ đọc (monitoring) hay cả control (start/stop VM)? → Đề xuất: Phase 1 read-only, control sau (scope creep)
2. Node agent có nên chạy trên PVE host luôn không? → Đề xuất: agent trên host (metrics sâu) + API source (inventory) — 2 nguồn bổ sung
3. Topology: guests hiển thị node cha? → Đề xuất: có, guest → node edge

## 8. Order of Execution (khuyến nghị)

1. **Phase 1a**: model + config + proxmox collector + unit test (mock HTTP)
2. **Phase 1b**: wire vào main.go + snapshot API
3. **Phase 1c**: frontend Nodes view + topology + alerts
4. **Phase 1d**: screenshot + vision verify + SW bump → deploy
5. **Phase 2**: Docker socket verify + test
6. **Phase 3**: systemd probe
7. **Messaging**: README hero + landing "Proxmox, Docker, Podman, bare metal" + screenshot marketing

---

## 9. Marketing Angle (cho user Proxmox)

- **Positioning**: "The only lightweight homelab console that sees your VMs, containers and bare-metal services — Tailscale-only, zero inbound ports"
- **So với Beszel**: Beszel = host metrics only (không per-VM/LXC); HostDeck = API-driven inventory + topology
- **So với ProxMenux**: ProxMenux = 1 host, cần port 8008/reverse proxy; HostDeck = multi-node Tailscale-only + offline PWA + topology
- **Cộng đồng**: post r/Proxmox + r/homelab sau khi Phase 1 ship + screenshot thật
