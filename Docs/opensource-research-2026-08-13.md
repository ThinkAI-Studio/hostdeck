# Research Opensource — Landscape, Demand, Migration (2026-08-13)

> Research qua 3 subagents song song (deleg_3e13abdf) + bổ sung demand mining thủ công.
> Nguồn: GitHub API live (2026-08-13), reddit Arctic Shift API (threads r/selfhosted + r/homelab 2025-2026), blog TechFuelHQ/DensHub, README + theme docs Glance/Beszel.
> ⚠️ Hạn chế: web_search backend lỗi (Firecrawl) cả phiên → xu hướng dựa GitHub data + reddit thật, không phải báo chí. Homarr repo mới `homarr-labs/dashboard` search API lỗi "Validation Failed" — dùng data gián tiếp.

---

## 1. Landscape — Bảng so sánh (GitHub live 2026-08-13)

| Repo | Stars | Lang | Mô tả ngắn | Last push | Open issues | Nhận xét |
|---|---|---|---|---|---|---|
| glanceapp/glance | 36,336 | Go | Dashboard mọi feed 1 nơi | 2026-05-30 | 345 | Tăng nhanh nhất (2 năm 36k⭐), Go single-binary |
| gethomepage/homepage | 31,975 | JS | Startpage + Docker/service integrations | 2026-08-13 | 3 | Active nhất, ecosystem widgets lớn nhất |
| Lissy93/dashy | 26,173 | Vue | Personal dashboard, widgets, themes | 2026-08-11 | 34 | Feature-rich, active đều |
| henrygd/beszel | 24,223 | Go | Lightweight monitoring, history, docker stats, alerts | 2026-08-11 | 359 | 2 năm 24k⭐, growth bậc nhất |
| louislam/dockge | 24,048 | TS | Docker compose stack manager | 2026-04-25 | 164 | Push 04/2026 — chững lại |
| cockpit-project/cockpit | 14,881 | JS | Web GUI Linux server | 2026-08-13 | 482 | Distro-first, khác target |
| amir20/dozzle | 14,050 | Go | Realtime log viewer | 2026-08-11 | 1 | Go binary, active |
| bastienwirtz/homer | 11,549 | Vue | Static homepage đơn giản | 2026-08-07 | 174 | Cũ kỹ, issues tồn đọng |
| homarr-labs/homarr | 4,529 | TS | Modern dashboard 40+ integrations | 2026-08-13 | 155 | Rewrite chia repo (cũ 7,214⭐) — đang rebuild |
| portainer/portainer | 38,225 | TS | Docker/K8s management | 2026-08-13 | 744 | Đối thủ "act" lớn nhất |
| louislam/uptime-kuma | 90,139 | JS | Fancy self-hosted monitoring | 2026-08-13 | 786 | Star cao nhất category |
| netdata/netdata | 80,161 | Go | AI full-stack observability | 2026-08-13 | 383 | Enterprise-ward, nặng |
| grafana/grafana | 76,279 | TS | Observability platform | 2026-08-13 | 3,377 | Quá nặng cho homelab 1-5 nodes |

### Khoảng trống thị trường (quadrant)
- **Read-only host/app**: Glance, Homepage, Dashy, Homer, Homarr, Beszel, Uptime Kuma, Netdata, Dozzle
- **Read-write container/app**: Portainer, Dockge, Cockpit
- **Read-write + host + container + NHẸ + zero inbound port + <100MB**: **TRỐNG** ← HostDeck
- Không ai kết hợp monitor + act (exec shell, restart, logs) + topology + PWA + zero inbound port ở footprint <100MB

### 3 insight actionable
1. **Go + single-binary + lightweight = công thức tăng trưởng đã chứng minh** (Glance 36k, Beszel 24k trong 2 năm). HostDeck đúng tech stack — messaging phải đóng khung "Glance/Beszel cho monitor + Portainer cho act, gộp 1 binary".
2. **Quadrant read-write nhẹ zero-inbound trống — kể chuyện bảo mật làm moat.** Beszel/Glance chết ở monitor; Portainer/Cockpit yêu cầu mở port/agent nặng. Tailscale-only + WSS dial-out là moat kể được ngay.
3. **Homarr đang yếu (rewrite, 4.5k⭐) → cửa sổ hút user dashboard thất vọng** muốn auth + integrations + quản lý containers. Nhắm content vào "Homarr users cần monitor + act thật".

---

## 2. Demand mining — Validated user demand (reactions thật từ API)

| Repo | Top request | 👍/💬 | Trạng thái | HostDeck có sẵn? |
|---|---|---|---|---|
| uptime-kuma | API functionality (#118) | 768👍 | open 5y | ⚠️ partial (có API nội bộ, chưa public) |
| uptime-kuma | Remote Executors (#84) | 526👍 | open | ✅ node agent WSS dial-out |
| uptime-kuma | User management không permissions (#128) | 375👍 | open | ✅ Tailscale identity admin |
| uptime-kuma | Configurable heartbeat range (#1888) | 328👍 | open | ⚠️ history 3-tier đã có |
| uptime-kuma | Postgres support (#959) | 233👍 | open | ❌ SQLite chủ đích |
| beszel | PVE stats VMs/LXCs (#281) | 83👍 | open | ❌ chưa |
| beszel | Monitor ZFS pools (#1541) | 66👍 | open | ❌ chưa |
| beszel | Public facing dashboard (#613) | 35👍 | open | ⚠️ demo ?demo=1 (không phải status page) |
| beszel | Alerting failed systemd services (#1813) | 30👍 | open | ⚠️ alerts có, systemd cụ thể chưa |
| beszel | Tagging/grouping systems (#87) | 30👍 | open | ❌ chưa |
| dashy | Calendar widget (#1201) | 10👍 | open | ❌ |
| dashy | qBittorrent widget (#1122) | 5👍 | open | ❌ |
| glance | Auto dark/light theo OS (#...) | 30👍 | open | ✅ light/dark theme có |
| glance | OIDC support | 29👍 | open | ❌ (Tailscale identity là chủ đích) |
| glance | Autorefresh interval | 25👍 | open | ✅ live updates có |
| dockge | Docker socket exposure security (#...) | 20👍 | open | ✅ không expose socket — mạnh |
| dockge | "Project còn phát triển?" (#...) | 20👍 | open | — tín hiệu maintainer fatigue |

### Demand đáng capture (HostDeck nên ưu tiên)
1. **Remote executors 526👍 (Uptime Kuma #84)** — HostDeck ĐÃ CÓ (node agent WSS dial-out, chỉ hướng ra ngoài). Đây là wedge lớn nhất chưa kể đúng cách.
2. **API functionality 768👍** — issue được vote cao nhất toàn category. HostDeck có API nội bộ; công bố API public (read-only + action) = capture trực tiếp.
3. **Public status page 35👍 (Beszel #613) + uptime history 328👍** — status page là tính năng mới trong backlog (competitive-expansion F1 #5). Demand đã validated xuyên repo.
4. **ZFS/PVE stats (Beszel 83+66👍)** — homelab Proxmox crowd; HostDeck target 1-5 nodes Podman — cân nhắc sau.
5. **Alerting systemd services 30👍** — dễ làm (systemd unit state), phù hợp positioning "act".

### Demand nên né (positioning conflict)
- **Postgres support** (233👍) — SQLite là identity, không đổi.
- **OIDC** (29👍 Glance) — Tailscale identity là moat, đừng pha loãng.
- **90+ notification providers** — giữ ntfy + webhook HMAC.
- **Calendar/random background widgets** (Dashy) — startpage feature, không phải ops console.

---

## 3. Migration & Visual — Evidence reddit thật (2025-2026)

| Yếu tố | Xu hướng | Bằng chứng | Hàm ý HostDeck |
|---|---|---|---|
| Lightweight | **Quyết định #1 khi chuyển đổi** | "Beszel agent+app ~50MB, dễ setup, không crash trên R-Pi 5 8GB" (7pts); "lightweight nhất, chạy trên Synology Celeron" | ≈50MB RSS là USP đo được — đưa lên mọi messaging |
| Grafana fatigue | User tự nói "staunch disliker of grafana", "Grafana complexity is a pain point we hear constantly" | Thread monitoring 2026 | Nhắm người muốn bỏ stack Prometheus+Grafana |
| Config-as-file | Gatus thắng vì "config là file, store được git, distribute nhiều nodes" (9pts) — Uptime Kuma bị chê vì config UI | Thread "Henceforth I win" 144pts | ⚠️ Cân nhắc: HostDeck config qua UI/SQLite — đối thủ khác biệt |
| Security | Docker socket exposure = lo ngại thật | Dockge issue 20👍 security | Zero inbound port + không expose socket = wedge mạnh |
| Mobile UX | "Mobile interface trên homarr là lý do tôi bỏ nó" (3pts) | Thread favorite dashboard 93pts | PWA mobile-first là điểm cộng — giữ và kể |
| Widgets/startpage | 1259pts thread chia sẻ dashboard Glance — cộng đồng mê custom widgets | "Sharing my Glance dashboard" | Launchpad/service-groups/operator-notes = đủ, đừng đuổi theo vô hạn |
| Visual trend | Glance themes: Catppuccin Frappe, Teal City (dark trội); cộng đồng khen "clean and minimalist", chê "so clean" | Glance theme docs; "what dashboard" thread | Dark-mode chuẩn Catppuccin-ish + clean typography là an toàn |
| Beszel growth | Không phải HN (3pts launch) — từ blog/YouTube/word-of-mouth "deceptively easy to setup" | Skill reality check | Cài đặt 1 lệnh + demo không cần auth = điều kiện để người khác viết về mình |
| Tool chết | Homer "updates stopped 2023", Dockge chững (push 04/2026), Homarr rewrite | GitHub data + reddit | Cửa sổ capture user 3 tool này |

---

## 4. Kế hoạch đề xuất (ưu tiên theo validated demand × adoption impact)

### A. Thắng ngay — kể lại những gì ĐÃ có (0 effort code, tuần này)
1. **Reposition messaging**: "Remote executors (526👍 demand chưa ai trả lời đúng) + API + act" — sửa README hero + comparison table + launch drafts
2. **Github description + homepage + Discussions** (O4 backlog) — 10 phút
3. **good first issues** từ gap thật (test coverage, node --check CI gate)
4. **Status page** — public read-only uptime (demand 35👍 Beszel + 328👍 heartbeat + 768👍 API) — feature nhỏ, capture lớn

### B. Feature roadmap theo demand (P1)
| Feature | Demand bằng chứng | Effort |
|---|---|---|
| **Status page public** (read-only, 90d uptime) | 35👍 Beszel + 328👍 UK | thấp (competitive F1 #5) |
| **Công bố API** (read-only + action, token) | 768👍 UK #118 | trung bình — đã có nền |
| **Alert systemd services** | 30👍 Beszel #1813 | thấp |
| **Tag/group services** | 30👍 Beszel #87 + service groups widget đã có | thấp-trung bình |
| **TLS cert expiry alert** | thread Grafana alerting 8pts | thấp (F1 #4) |
| **PVE/ZFS stats** | 83+66👍 Beszel | cao — sau v1.0 |

### C. Visual upgrade (giữ anti-slop, học Glance/Beszel)
- Dark theme chuẩn + Catppuccin-compatible palette (đã có tokens)
- **Clean typography + khoảng trắng** — "clean and minimalist" là chuẩn được khen
- Mobile PWA tiếp tục là điểm nhấn (Homarr bị chê mobile)
- KHÔNG glassmorphism/gradient AI-slop (skill anti-slop)

### D. Timing
- Tuần này: reposition + GitHub settings + issues
- Sau khi ổn: status page + API public
- 2026-12-07: awesome-selfhosted PR (cron đã đặt)

---

## 5. Rủi ro / cần verify thêm
- **Config-as-file trend**: Gatus thắng vì git-friendly config — cần research xem có nên thêm export/import config CLI không (đã có export/import JSON trong Settings)
- **Homarr rewrite**: theo dõi nó ra gì — nếu thành công sẽ cạnh tranh trực tiếp (auth + integrations)
- **web_search backend hỏng** cả phiên — một số claim blog (TechFuelHQ, DensHub) chưa deep-read
- Task 2 timeout — 5 repo (homepage, homarr, dockge, dozzle, glance) mới lấy được 2 (dockge, glance); homepage/homarr vẫn thiếu demand data
