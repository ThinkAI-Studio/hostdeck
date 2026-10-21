# HostDeck → Proxmox + Multi-Source: Product & Positioning Research

**Ngày:** 2026-08-16 · **Trạng thái:** Research bổ sung cho `proxmox-multisource-plan-2026-08-16.md` (plan đó lo phần *kỹ thuật*; doc này lo phần *product/positioning*)
**Nguồn:** r/Proxmox + r/selfhosted + r/homelab (Arctic Shift API, thread thật), Proxmox Support Forum, GitHub issues (reactions thật), repo Glance/Homarr/Beszel/Uptime Kuma

---

## 1. Proxmox users cần gì từ một operations console (xếp theo độ quan trọng)

Xếp hạng dựa trên: tần suất + cảm xúc demand trong community, số reaction trên GitHub issues, và mức độ "đau" (khi fail thì hậu quả nặng).

| # | Nhu cầu | Bằng chứng community | Mức độ |
|---|---|---|---|
| 1 | **Backup monitoring (vzdump success/fail)** | r/Proxmox "Backup Status via API" (1cqi54w): user tự viết script poll `/nodes/{node}/tasks -typefilter vzdump` để lấy `exitstatus` OK/failed; thread "Proxmox - Backup notification using NTFY if failed" (166dx9y) — muốn alert khi backup fail. Proxmox forum: "vzdump ignores notification setting" (136783), "Can't get notifications to work for backup" (139081) — notification system của PVE **thường fail hoặc khó cấu hình** → user đi tìm tool ngoài. r/homeassistant "proxmox backup notification" (1eix6yt) | 🔴 P0 — đau nhất, fail thì mất data, và PVE built-in notification không đáng tin |
| 2 | **VM/LXC status (running/stopped) + per-guest view** | r/selfhosted "Remote Web Monitoring Software Recommendations (Proxmox host, VMs & Docker containers)" (ubvqrs): muốn **1 tool nhìn cả 3 lớp** host + VMs + Docker. Beszel **#539 👍92** + **#281 👍83** "Add Proxmox VE stats for VMs and LXCs" — demand cao nhất chưa được trả lời trong lightweight segment | 🔴 P0 |
| 3 | **Resource usage per VM/LXC (CPU/RAM/disk)** | Cùng Beszel #539/#281. Proxmox forum "How to export all hard disk sizes and usage rates" (138730): user dùng `pvesh get /cluster/resources` nhưng **chỉ lấy được max disk của disk đầu tiên, thiếu disk usage thật** — gap API biết trước, tool tốt phải gọi thêm per-VM + `rrddata` | 🔴 P0 — kèm #2, cùng 1 feature |
| 4 | **Storage usage (host + shared/Ceph/ZFS)** | Proxmox forum: "Ceph storage usage confusion" (94673), "How to precisely check actual disk usage of Ceph RBD" (181343) — user không biết VM nào đang ăn storage. Beszel **#1541 👍66 "Monitor ZFS Pools"** | 🟠 P1 — quan trọng với cluster, ít hơn với single node |
| 5 | **Guest agent info (IP, OS, fsfreeze status)** | pve.wiki qemu-guest-agent; forum "What needs to be configured to see IP address of windows vm" (177234) — guest IP là thứ user phải cấu hình thủ công mới thấy, tool expose được là cộng điểm. Nhưng đây là *nice-to-have*: guest agent đã chết là guest đang chết | 🟡 P2 — hỗ trợ nhưng không phải wedge |
| 6 | **Cluster health (nodes online, HA, quorum)** | Proxmox forum "Proxmox VE monitoring" (82700): "cluster of 10 nodes with ceph, monitoring network and usage it's important". Nhưng đa số homelab Proxmox là **1-3 node** → đúng nhóm 1-5 nodes mà HostDeck nhắm | 🟡 P2 — đúng với target, không phải với cả Proxmox population |

**Đọc kèm:** thread r/Proxmox "How do y'all monitor your Proxmox server?" (1goqvks, score 123) — câu trả lời phổ biến: Zabbix, Netdata, Prometheus+Grafana, Checkmk. Tức là: **nhu cầu thật, nhưng solution hiện tại đều nặng (enterprise-grade, cần stack riêng)**. Không ai đề xuất tool lightweight — đó là khoảng trống HostDeck.

**Kết luận cho positioning:** Proxmox user đau nhất ở **backup + per-guest visibility**, và đang phải tự script (thread 1cqi54w, 166dx9y) hoặc kéo cả Zabbix/Grafana về. HostDeck bán được: *"biết backup fail trước khi cần restore, thấy VM nào chết từ điện thoại"* — đúng phong cách "Git blame cho homelab" đã có.

---

## 2. Pattern "Docker/Podman-in-Proxmox LXC" — ý nghĩa với thiết kế agent

### Pattern này phổ biến cỡ nào
Rất phổ biến trong homelab Proxmox:
- r/Proxmox "Why run Docker in an LXC?" (1rm4epm, score 83): *"I use docker inside lxc... one lxc with 20+ docker containers running for testing with Tailscale installed in the lxc"* (score 6) — Tailscale trong LXC + Docker = **chính xác topology HostDeck đã hỗ trợ**.
- r/Proxmox "Docker in LXC" (1krvi48), "Proxmox: LXC or Docker?" (1qyc4b9, score 80), "Docker in LXC is bad. Now what?" (1q0zgdw, score 58) — pattern phổ biến nhưng có vấn đề (helper scripts chưa ready cho PVE 9.x, AppArmor break Docker restart).
- Lý do chọn LXC thay VM: RAM rẻ hơn nhiều, GPU passthrough `/dev/dri`, snapshot/clone là first-class (thread 1rm4epm, 1ohi5ym).
- XDA từng đăng bài hẳn hoi: *"if you're running Docker on bare-metal Proxmox, LXC containers are lighter"*.

### Agent chạy TRONG LXC sẽ thấy gì (bằng chứng cứng: Beszel)
Beszel (agent-based, cùng kiến trúc HostDeck) có 2 issue mở do đúng vấn đề này:
- **#176 👍11 "Agents on LXC Containers show RAM Usage of Proxmox Host"**: agent trong LXC báo 32GB (RAM host) thay vì RAM của LXC. User thử cả unprivileged/privileged, bật/tắt Nesting — **vẫn sai**.
- **#1948 "LXC Containers show uptime of host"**: agent báo uptime host thay vì uptime container.

**Cơ chế:** LXC chia sẻ kernel với host. `/proc/meminfo`, `/proc/cpuinfo`, `/proc/loadavg`, `/proc/uptime` bên trong LXC phản ánh **HOST**, không phải container. Số thật chỉ có qua cgroups v2 (`/sys/fs/cgroup/.../memory.current`, `cpu.stat`) — nhiều collector đọc `/proc` trực tiếp nên sai. LXC unprivileged có thể mount đúng cgroup để khắc phục, nhưng không phải default.

### Ý nghĩa thiết kế cho HostDeck node agent

| Agent chạy ở đâu | Thấy gì | Không thấy gì |
|---|---|---|
| **Trong LXC** (chạy Docker/Podman) | ✅ Docker/Podman containers (socket trong LXC), service probes nội bộ LXC, host metrics **SAI** (RAM/CPU/uptime của PVE host) | ❌ Các VM/LXC khác, ❌ storage/cluster, ❌ vzdump backup tasks |
| **Trên PVE host** (cài binary + tailscale) | ✅ Host metrics đúng, ✅ (nếu đọc API local) toàn bộ inventory, backup tasks, storage | ❌ Per-guest metrics sâu (API có giới hạn — xem §4) |
| **Remote API connector** (dashboard kéo từ PVE API qua tailnet) | ✅ Inventory, status, resource usage, backup tasks, storage — **đủ cho monitoring read-only** | ❌ Shell/act vào guest, host metrics dạng `/proc` sâu |

**Hệ quả chiến lược:** Proxmox user chạy Docker-in-LXC có 2 nguồn dữ liệu khác nhau — *containers* (agent trong LXC) và *hypervisor* (API PVE). **Không một agent nào chạy ở một chỗ nhìn được cả hai đúng cách.** Multi-source không phải luxury — nó là *bắt buộc* để phục vụ đúng pattern phổ biến nhất của Proxmox homelab.

---

## 3. Đối thủ xử lý multi-source thế nào: plugin/widget vs agent-based

| | Glance (36.4k⭐, Go) | Homarr (4.5k⭐ rewrite, TS) | Uptime Kuma (90k⭐, JS) | Beszel (24.3k⭐, Go) |
|---|---|---|---|---|
| Kiến trúc | **Widget-based** — YAML config, mỗi widget pull từ 1 nguồn (RSS, weather, docker-containers, server-stats, custom-api, monitor, ...). Chạy 1 binary, pull từ máy dashboard | **Integration-based** — 40+ integrations, mỗi cái 1 class (adguard, jellyfin, **proxmox**, truenas, unraid, **beszel**, **uptime-kuma**...). Dashboard pull API | **Monitor-based** — user định nghĩa monitor (HTTP/TCP/ping/Docker/K8s) + status page + notification. Docker monitor cần mount socket vào container Kuma | **Agent-based** — hub + agent trên mỗi host, agent push metrics về hub (pull-based interval, không WebSocket push) |
| Proxmox support | ❌ Chưa có — **#412 👍26 "add proxmox widget"**, #349 👍12, #375 👍15 (prototype) đang mở | ✅ Có — integration `proxmox` dùng `proxmox-api` npm + API token, `/cluster/resources`, role PVEAuditor; expose 1 widget "health monitoring" | ❌ Không — Kuma monitor HTTP 8006 được nhưng không parse dữ liệu; không có integration | ❌ Không đọc Proxmox API — chỉ host metrics qua agent; **#539 👍92 + #281 👍83** mở từ lâu |
| Nhiều nguồn 1 màn hình | ✅ Widgets tùy biến layout | ✅ Boards + integrations | ⚠️ Status pages gộp monitors | ⚠️ Chỉ agent metrics, không tích hợp nguồn khác |
| Act (start/stop/shell) | ❌ Read-only | ❌ Read-only (chỉ launch app links) | ⚠️ Restart monitor, exec qua Docker API | ❌ Read-only |
| Zero-inbound | ✅ (nhưng cần port cho web UI + pull ra ngoài) | ✅ | ✅ | ✅ (agent dial-out) |

### Ưu/nhược 2 trường phái

**Plugin/widget (Glance, Homarr, Uptime Kuma):**
- ✅ Ưu: 1 deployment duy nhất; thêm nguồn = thêm config/class, không cài gì trên host; cộng đồng đóng góp widget dễ (Homarr có cả integration `beszel` + `uptime-kuma` — "aggregator of aggregators").
- ❌ Nhược: dashboard phải **reachable tới mọi nguồn** (mở port, hoặc mọi nguồn phải trong cùng mạng); dữ liệu pull từ dashboard = dashboard là single point of failure + điểm kéo vào; **không làm được act** (shell vào container/host) vì không có agent ở nơi cần hành động; mỗi widget = 1 bộ logic auth/poll riêng (Glance #412 vẫn mở sau bao lâu vì proxmox widget phức tạp).

**Agent-based (Beszel, HostDeck):**
- ✅ Ưu: zero-inbound thật sự (agent dial-out); đo được từ bên trong (host metrics, container stats, act); mỗi node = 1 agent = scale ngang; dữ liệu push đều đặn, không phụ thuộc dashboard online.
- ❌ Nhược: **mỗi nguồn cần 1 agent** — mà agent không chạy được "bên trong" Proxmox API (PVE host không phải nơi bạn muốn cài binary linh tinh); agent trong LXC cho số liệu sai (Beszel #176 — xem §2); update agent trên N host là vận hành.

**Kết luận:** Hai trường phái bổ sung chứ không loại trừ. **HostDeck nên giữ agent-based làm identity, và thêm remote-connector như 1 "agent ảo"** — cùng kiến trúc push, nhưng nguồn là Proxmox API thay vì binary trên host. Glance #412 👍26 + Beszel #539 👍92 chứng minh: người ta ĐANG xin chính xác cái này ở cả 2 phía.

---

## 4. Strategy đề xuất: Proxmox nên là (a) source trong node agent, (b) remote API connector, hay (c) cả hai?

### Phân tích từng phương án

| | (a) Source trong node agent (chạy trên PVE host) | (b) Remote API connector (dashboard kéo PVE API qua tailnet) |
|---|---|---|
| Cài đặt | Cài agent binary + tailscale trên PVE host | Chỉ cần PVE node trong tailnet + API token (PVEAuditor) — **không cài gì trên host** |
| Zero-inbound | ✅ Agent dial-out WSS, không mở port mới | ✅ Dashboard dial-out tới `https://<pve-node>:8006` (tailnet). **Lưu ý:** PVE host phải *accept* connection từ dashboard — nhưng port 8006 PVE đã listen sẵn và traffic đi trong tailnet, không phải port mới mở ra internet. Identity "zero inbound" của HostDeck giữ nguyên |
| Dữ liệu lấy được | Host metrics sâu (`/proc`, SMART), inventory, **act** (shell) | Inventory + status + resource usage + backup tasks + storage (đủ monitoring read-only); **không** host `/proc` sâu, **không** act |
| Bảo mật | Token lưu trên PVE host; agent chạy root trên hypervisor = bề mặt lớn | Token giữ ở central; PVE chỉ expose API token read-only; **sạch hơn về mặt security** |
| Vận hành | Update agent = update từng PVE host (user Proxmox ngại đụng host production) | Update 1 chỗ (dashboard); PVE host không đổi gì |
| Rủi ro kỹ thuật | Agent trong LXC sai số liệu (Beszel #176) nếu cài nhầm chỗ; agent trên host cần đối phó `/proc` của PVE | API có giới hạn thật: `/cluster/resources` chỉ trả max disk của disk đầu (forum 138730), disk usage per-guest cần thêm call `rrddata`/per-VM endpoint |

### Khuyến nghị: **(c) cả hai, nhưng (b) remote connector là v1, (a) agent-optional là v2**

Lý do thực dụng:

1. **Zero-inbound constraint không phá vỡ ở (b).** Dashboard giữ nguyên "không mở port": nó *dial-out* qua tailnet tới PVE API. Tailnet là private mesh; PVE port 8006 vốn đã listen. Đây không phải inbound vào dashboard — identity được giữ. (Điều duy nhất thay đổi: dashboard giờ *gọi ra* nhiều nơi hơn, nhưng nó vốn đã gọi ra để probe TCP/HTTP/DNS.)
2. **Nhóm target của HostDeck (1-5 nodes, homelab) chủ yếu cần monitoring, không cần act lên hypervisor.** Start/stop VM qua dashboard = scope creep + rủi ro (user Proxmox không muốn tool bên ngoài control hypervisor). Phase 1 read-only qua API là đủ bán.
3. **Cài agent trên PVE host là rào cản adoption.** Homelab user sợ đụng host production ("I'm not touching my PVE host" là tâm lý phổ biến); connector không cài gì = friction gần bằng 0, đúng phong cách "1 phút tới value".
4. **(a) vẫn cần về sau cho 2 thứ API không cho:** host metrics dạng `/proc` sâu (nếu muốn cạnh tranh Beszel ở phần host) và **act** (shell vào guest — nhưng shell từ PVE host vào LXC rất dễ: `pct enter`/`qm guest exec` — đây là tính năng "wow" đúng identity HostDeck "observe→act"). Làm v2 khi có demand.
5. **Docker-in-LXC pattern (§2) buộc phải có 2 nguồn đồng thời:** agent trong LXC cho containers + connector cho hypervisor. (c) không phải tham lam — nó là cấu hình *cần thiết* cho đúng target user.

### Gợi ý tên gọi để giữ identity
Đừng gọi "Proxmox integration" kiểu widget; hãy gọi nó **"Proxmox node" — 1 node agent ảo, cùng ngôn ngữ "node" đã có** trong UI (Nodes view, topology). Identity "operations console cho N nodes" giữ nguyên: PVE host chỉ là 1 loại node mới, containers/VM là entities con. Người dùng Podman cũ không thấy gì lạ: vẫn là nodes + services, chỉ thêm loại node mới.

---

## 5. Migration path cho Podman users sẵn có — backward compatible từng lớp

Nguyên tắc: **mọi thứ mới đều opt-in; default = hành vi Podman-only hiện tại.**

| Lớp | Thay đổi | Backward compatible? |
|---|---|---|
| **Config (env)** | Thêm `PROXMOX_URL` + `PROXMOX_TOKEN_ID`/`PROXMOX_TOKEN` + `PROXMOX_INSECURE_TLS` (optional). **Không đổi** `PODMAN_SOCKET` (giữ tên, dù giờ có thể trỏ Docker socket — rename sẽ phá config cũ, plan kỹ thuật đã xác nhận) | ✅ Không set → collector không chạy, snapshot không có field Proxmox |
| **Wire format (snapshot)** | `SnapshotData.ProxmoxNodes []ProxmoxNode` với `omitempty` — node agent cũ không cần update, dashboard cũ bỏ qua field lạ | ✅ JSON thêm field optional = backward compatible cả 2 chiều |
| **Frontend** | Nodes view render section Proxmox **chỉ khi** snapshot có `proxmoxNodes`; thẻ VM/LXC là entity con của node | ✅ Podman-only install: UI y hệt trước đây |
| **Alerts/history** | Alert engine nhận thêm event type (guest stopped, node offline, backup failed) — rule mặc định **tắt** cho Proxmox events | ✅ Không có nguồn mới → không có event mới |
| **Docker support** | Phase 2 chỉ là *verify* `PODMAN_SOCKET=/var/run/docker.sock` + version negotiation trong client; config không đổi | ✅ Podman user không biết có gì thay đổi |
| **systemd probe** | Collector mới trong node agent, chạy khi bật (env hoặc auto-detect) | ✅ Opt-in |
| **SW cache / version** | `CACHE_NAME` bump v7→v8 (đã có quy trình) | ✅ Cơ chế sẵn có |

**Điểm mấu chốt:** vì HostDeck config là **env-based** (không phải file YAML schema cứng), việc thêm env optional không đụng gì config hiện tại. Khác với Glance (YAML schema thêm widget = user phải sửa config), HostDeck user cũ **không cần đổi gì** — đó là lợi thế migration tự nhiên cần giữ và kể trong docs ("no config change for existing users").

**Identity check (theo methodology open-source-product-strategy):** "Tailscale-only operations console" giữ nguyên; bổ nghĩa từ "Podman homelab nodes" → **"Proxmox + Docker + Podman + bare-metal homelab nodes"**. "1-5 nodes" vẫn đúng (PVE cluster 1-5 node là target chuẩn). Không đổi tên, không đổi giá trị (zero-inbound, 1 binary, PWA, observe→act).

---

## Tóm tắt khuyến nghị

1. **Làm Proxmox = remote API connector trước (v1), agent-on-PVE-host sau (v2).** Zero-inbound giữ nguyên; friction cài đặt ≈ 0; đúng nhu cầu #1-4 của Proxmox user.
2. **Wedge bán hàng:** "Backup monitoring + per-VM/LXC visibility trong 1 binary nhẹ, Tailscale-only" — demand đã được chứng minh ở cả Beszel (#539 👍92, #281 👍83) lẫn Glance (#412 👍26), chưa ai trả lời.
3. **Multi-source là bắt buộc cho pattern Docker-in-LXC**, không phải feature thừa: agent trong LXC (containers) + API PVE (hypervisor) là 2 nguồn bổ sung, agent đơn lẻ không làm được cả hai đúng.
4. **Backward compatible toàn phần:** env optional + `omitempty` + UI conditional render = Podman user hiện tại không thấy gì thay đổi, không cần đổi config.
5. **Positioning mới:** *"Tailscale-only operations console cho homelab của bạn — Proxmox nodes, Docker/Podman containers, bare-metal services. Không mở port, không monitoring stack."*

*Nguồn dữ liệu thô: thread IDs Arctic Shift (1goqvks, 1cqi54w, 166dx9y, 1rm4epm, 1krvi48, 1q0zgdw, 1qyc4b9, 1ohi5ym, ubvqrs, 1eix6yt, 11kh0vq), Proxmox forum threads (136783, 139081, 82700, 138730, 94673, 181343, 177234), GitHub (henrygd/beszel #539/#281/#176/#1948/#1541, glanceapp/glance #412/#349/#375, homarr-labs/homarr integrations/src/proxmox).*
