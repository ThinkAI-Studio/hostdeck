# Giai đoạn 0.5 — Documentation Gap Plan

> **TRẠNG THÁI:** Task 1 (ADR) ✅ · Task 2 (Comparison) ✅ · Task 3 (Migration) ✅ · Task 4 (Benchmarks) ✅ · Task 5 (Video) ⬜ — DEFERRED (chờ landing page + chốt nền tảng)

**Goal:** Lấp 7 documentation gap từ research (market-gaps + opensource-positioning) để repo public đủ "sâu" cho người đánh giá kỹ thuật: tại sao chọn Tailscale-only/SQLite/no-npm, so sánh với đối thủ, cách chuyển đổi, resource thật, và video demo.

**Kiến trúc:** Chỉ thêm file Markdown vào `docs/` (public, tracked trong git) + 1 video asset. KHÔNG đụng code Go/JS. Mọi claim phải có code tương ứng (quy tắc từ opensource-positioning.md §5: "Claims phải verify được").

**Nguồn dữ liệu (đã đọc, fact-check):**
- `Docs/feature-uniqueness-report.md` — 7 UNIQUE · 5 RARE · 0 COMMON (so 16 sản phẩm)
- `Docs/opensource-positioning.md` — positioning, weak claims cấm dùng, security credibility checklist
- `Docs/competitive-gap-analysis.md` — gap P0–P3 vs 14 sản phẩm
- `Docs/market-gaps-research.md` — khung P0–P3 đã restructure
- `docs/operations.md` — đã có troubleshooting (gap #1 ✅ đã đóng)

---

## Task 1: `docs/adr.md` — Architecture Decision Records

**Objective:** Giải thích "tại sao" các quyết định kiến trúc — thứ người đánh giá kỹ thuật tìm đầu tiên. 6 ADRs, mỗi cái theo format chuẩn: **Context → Decision → Consequences** (+ Status).

**Files:** Tạo `docs/adr.md` (~180 dòng). Update README nav: thêm link.

**Các ADR:**

| # | Quyết định | Context cốt lõi (ngắn) |
|---|---|---|
| ADR-001 | **Tailscale identity là auth plane duy nhất, không fallback** | Không muốn password/SSO/2 hệ thống; tailnet identity đã có mật khẩu riêng; header chỉ tin khi loopback |
| ADR-002 | **SQLite 3-tier rollup (10s→1m→15m, 90d) thay Prometheus** | 1–5 nodes ≈ vài trăm series; Prometheus+exporter+Grafana = stack sprawl; SQLite = 1 file, backup trọn vẹn |
| ADR-003 | **No npm / go:embed static assets** | Zero toolchain, build 1 lệnh, không supply-chain JS; xterm/Chart.js là versioned bundles |
| ADR-004 | **Outbound-only agents — zero inbound port** | CGNAT/VLAN/node xa; không SSH/reverse proxy để bảo vệ; Tailscale WSS dial-out |
| ADR-005 | **No public REST API by design** | API nằm sau Tailscale-only auth + loopback; integration path = webhook outbound (HMAC) + ntfy; không mở API vô điều kiện |
| ADR-006 | **3 static Go binaries thay 1 monolith** | Dashboard (API+UI+SQLite), node-agent (remote thu thập), smart-agent (SMART polling) — tách theo privilege boundary |

**Verify:** `grep -c "ADR-" docs/adr.md` ≥ 6; mỗi ADR có đủ 3 phần; không chứa claim marketing không có code.

---

## Task 2: `docs/comparison.md` — Comparison matrix chi tiết

**Objective:** Bản public tiếng Anh, fact-checked, so HomeLab Dashboard vs 5 nhóm đối thủ đại diện. Dùng đúng giọng "small ops console, not a replacement" (KHÔNG tự hạ thấp, KHÔNG claim sai).

**Files:** Tạo `docs/comparison.md` (~150 dòng). Update README nav.

**Cấu trúc:**
1. **Positioning table** (5 cột): HomeLab Dashboard vs Homepage/Homarr (start pages), Uptime Kuma (availability), Beszel/Netdata (monitoring), Portainer/Cockpit (admin), Grafana stack
2. **Feature matrix** (hàng = feature đã verify, cột = sản phẩm, ô = ✅/⚠️/—):
   - No inbound agent port
   - Tailscale identity as sole auth
   - SLO error budgets first-party
   - Backup freshness monitoring
   - 3-tier SQLite history 90d (no Prometheus)
   - Interactive container shell + host Bash (confirmed)
   - Demo mode with edge-case simulation
   - PARTIAL snapshot degradation
   - Config export/import + If-Match guard
   - Low footprint (single static binary)
3. **"When to use what"** — hướng dẫn chọn: ai nên dùng dashboard này, ai nên dùng Grafana/Portainer (thành thật, tăng trust)
4. **Ghi chú verify** — mỗi ô ✅ có link tới file code (`internal/...`) hoặc docs

**Verify:** Mỗi ✅ có nguồn; không dùng weak claims từ opensource-positioning §4 ("first web terminal" CẤM).

---

## Task 3: `docs/migration.md` — Migration guide

**Objective:** Người từ Homepage/Portainer/Uptime Kuma/Grafana stack chuyển sang. Thành thật: KHÔNG phải migrate dữ liệu 1-1 — đây là hướng dẫn cấu hình lại + import được gì.

**Files:** Tạo `docs/migration.md` (~100 dòng). Update README nav.

**Cấu trúc:**
1. **Từ start page (Homepage/Homarr/Dashy)** — services cấu hình lại trong Settings; bookmark grid không import được (khác bản chất) — liệt kê thao tác thay thế
2. **Từ availability monitor (Uptime Kuma/Gatus)** — probe HTTP/TCP cấu hình lại; alert rules thay uptime checks
3. **Từ monitoring stack (Prometheus+Grafana)** — metric nào dashboard có sẵn, metric nào KHÔNG có (thành thật); 3-tier SQLite thay Prometheus retention
4. **Từ admin console (Portainer/Cockpit)** — container management phạm vi khác; shell/log có, restart/stop chưa có (ghi rõ hiện trạng)
5. **Import/export** — config JSON export/import + If-Match guard; `.env` migrate thủ công
6. **Rollback** — upgrade về tag cũ, volume giữ nguyên

**Verify:** Không claim restart/stop nếu chưa implement; mọi bước có lệnh cụ thể.

---

## Task 4: `docs/benchmarks.md` — Performance benchmarks

**Objective:** Resource usage thật (RAM/CPU) của 3 binary trên 1–5 nodes — dữ liệu thật từ homelab, không ước lượng.

**Files:** Tạo `docs/benchmarks.md` (~80 dòng). Update README nav.

**Steps:**
1. Đo dashboard container: `podman stats` (RAM/CPU idle + active) + `ps` cho 3 binary
2. Đo SQLite size sau 24h/7d (nếu có số liệu hiện có) — cột lịch sử
3. Đo node-agent trên remote node (nếu có)
4. Điền bảng: binary | RAM idle | RAM active | CPU idle | CPU active | SQLite/day
5. Ghi rõ điều kiện đo (số nodes, số services, viewport) — để tái lập được

**CẦN USER DUYỆT:** chạy lệnh ĐỌC trên máy thật (`podman stats --no-stream`, `ps aux | grep homelab`, `du -sh` volume) — passive, không đổi state. Nếu anh không muốn đo máy thật → thay bằng ước lượng có chú thích "measured on..." + defer.

**Verify:** Số liệu có timestamp + điều kiện đo; không bịa số.

---

## Task 5: Video walkthrough (5–10 phút) — DEFERRED

**Objective:** Video demo key features cho người xem lười đọc.

**Trạng thái:** BLOCKED — cần chốt 2 thứ:
1. **Nền tảng**: YouTube (unlisted/public) vs file mp4 trong release vs Loom
2. **Kịch bản**: 4 phân đoạn (overview+triage → logs/regex → alerts+webhook → shell/host bash) — dùng demo public `?demo=1` (không lộ identity — đã fix)

**Đề xuất:** YouTube unlisted + link trong README (dễ share, không nặng repo). Quay bằng OBS/ffmpeg + demo public. Làm SAU landing page (Task 4 giai đoạn 0) — video cần nền demo public ổn định.

---

## Thứ tự thực hiện + ràng buộc

1. Task 1 → 2 → 3 (thuần viết, 0 rủi ro, làm ngay)
2. Task 4 — chờ duyệt đo máy
3. Task 5 — defer, chờ landing page

**Ràng buộc chung:**
- Ngôn ngữ: docs public = **tiếng Anh** (khớp README)
- Không tự hạ thấp, không claim không có code
- Commit riêng từng task, message chuẩn dev (context + constraint + confidence)
- Chỉ add file cần thiết — không kéo theo file modified khác
