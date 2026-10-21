# Backlog tổng hợp — Vấn đề cần quan tâm (2026-08-13)

> File tạm thời ghi nhận các vấn đề mở đang treo, chia theo chủ đề. Cập nhật khi có quyết định.
> Nguồn: docs/plans/*, Docs/*, git status, session làm việc gần đây.

---

## 1. Opensource / Launch

| # | Vấn đề | Trạng thái | Action cần |
|---|--------|-----------|------------|
| O1 | **URL chuyên nghiệp chưa chọn cấp** — Tailscale MagicDNS (`TS_HOSTNAME` mặc định) vs CNAME + tailscale cert | ⏳ Chờ user quyết | Chọn 1 trong 2; cấp 1 = không cần làm gì, cấp 2 = mua domain + CNAME + cert |
| O2 | **Launch posts** (3 draft trong `Docs/launch-post-drafts.md`): selfh.st / r/selfhosted / Show HN | ⏳ Draft sẵn, chưa submit | Submit theo thứ tự ưu tiên; kèm screenshot topology mới |
| O3 | **awesome-selfhosted PR** | ⛔ BLOCKED — rule "4 tháng sau release đầu" | Resubmit 2026-12-07 (cron đã đặt); file `software/hostdeck.yml` |
| O4 | **GitHub repo settings chưa đổi** (Task 1.3 launch plan): description vẫn "HomeLab DevOps Dashboard", homepage trống, Discussions chưa bật | ⏳ Cần token + API PATCH | Đổi description → HostDeck..., homepage → `https://hostdeck.thinkai.id.vn`, bật `has_discussions: true` |
| O5 | **README demo link có thể còn trỏ Pages cũ** (`bnhminh1010.github.io/hostdeck/`) — G3 launch plan | ⏳ Chưa verify | Grep + sửa nếu còn |
| O6 | **good first issues ×3-5** chưa tạo (Task 2.3) | ⏳ Chưa làm | Tạo từ `Docs/market-gaps-research.md` P1 items + label |
| O7 | **Rebrand "HomeLab Dashboard" → HostDeck** trong README/docs (G1) | ⏳ Chưa verify | `grep -rn "HomeLab Dashboard" README.md docs/` = 0 |
| O8 | **`docs/screenshots/` untracked** — 5 PNG (proto ×3, dagre, integrated) | ⏳ Chưa quyết public hay riêng | User quyết: giữ trong repo (public docs) hay bỏ khỏi git |
| O9 | **Topology vừa commit chưa deploy production** — SW cache đã bump v6 | ⏳ Chờ deploy | Deploy lên VPS live `hostdeck.thinkai.id.vn`; hard refresh 1 lần sau (cache-first) |

## 2. Marketing

| # | Vấn đề | Trạng thái | Action cần |
|---|--------|-----------|------------|
| M1 | **Số liệu Wedge 2** — đã sửa `Docs/marketing-gtm-strategy.md` (≈50MB RSS thật) | ✅ Xong | Verify không còn "30MB"/"6 containers 2GB" vô nguồn ở nơi khác |
| M2 | **Blog/YouTube evergreen** — strategy coi đây là growth thật (HN không phải engine) | ⏳ Chưa làm | Draft "How we replaced 6 monitoring containers with one static Go binary" |
| M3 | **Demo GIF verify IP leak** — G6 launch plan ghi đã xong nhưng cần re-check nếu quay lại | ✅/⚠️ | Nếu re-record: frame extract + mask (4f skill) |

## 3. Features (backlog chờ duyệt)

| # | Vấn đề | Trạng thái | Action cần |
|---|--------|-----------|------------|
| F1 | **5 features competitive gap** (`Docs/competitive-feature-expansion-plan.md`): WoL, container update indicator, generic JSON widgets, TLS cert expiry alerts, public status page | ⏳ Chờ user chọn | Khuyến nghị: TLS alerts + WoL (giá trị cao, effort thấp) |
| F2 | **5 widgets cao cấp** (`Docs/new-widgets-plan.md`): quick-launchpad, service-groups, top-containers, storage-pools, operator-notes | ⏳ Chờ user duyệt | Storage pools đã chồng với phase-b (SMART) — ưu tiên phần không trùng |
| F3 | **DNS probe** — `dns_probe_test.go` untracked + code trong batch dirty | 🚧 Đang dở | Verify test pass + commit riêng (không lẫn batch Go) |
| F4 | **Phase B: multi-mount collector + S.M.A.R.T. thật** (`Docs/phase-b-plan.md`) — smart-agent code dirty | 🚧 Đang dở | Hoàn tất, commit riêng |
| F5 | **In-app tutorial** (`Docs/2026-08-07-in-app-tutorial.md`) | ⏳ Chưa làm | Sau khi core ổn định |
| F6 | **UI/UX polish + visual customization** (`Docs/ui-ux-polishing-plan.md`, `visual-customization-plan.md`) | ⏳ Chưa làm | Sau v1.0 |

## 4. Code / Kỹ thuật

| # | Vấn đề | Trạng thái | Action cần |
|---|--------|-----------|------------|
| C1 | **Batch Go dirty chưa commit** — 12 file: `.env.example`, `AGENTS.md`, `compose.yml`, `cmd/*`, `internal/config`, `internal/metrics`, `internal/nodeagent`, `internal/services` (manager/probe), `internal/smartagent` | 🚧 Công việc user đang dở | KHÔNG đụng; tách commit theo chủ đề khi xong (probe/dns riêng, smart-agent riêng, config riêng) |
| C2 | **`internal/services/dns_probe_test.go`** untracked | 🚧 | Tách khỏi batch → commit kèm code probe |
| C3 | **`.claude/worktrees/` 2 worktree cũ** (agent-a18f4d7b, agent-a51a0f6a) treo ở commit cũ | ⚠️ Rác | Dọn nếu không dùng (`git worktree remove`) |
| C4 | **Branch workflow** — có `develop` (origin/develop) nhưng feature đang commit thẳng `main` | ⚠️ Cần chốt | Quyết: feature → develop → merge main, hay giữ main-thẳng (hiện tại) |
| C5 | **PR protection warning** — push main thành công nhưng remote nhắc "changes must be made through a PR" | ✅ Push vẫn OK | Theo dõi; nếu chuyển workflow PR thì điều chỉnh C4 |
| C6 | **SW cache-first** — mọi đổi `static/` phải bump `CACHE_NAME` | ✅ v6 đã bump | Ghi nhớ quy tắc, không bao giờ quên |

## 5. Tech / Hạ tầng

| # | Vấn đề | Trạng thái | Action cần |
|---|--------|-----------|------------|
| T1 | **Model active**: `ds/deepseek-v4-flash` qua provider local `127.0.0.1:20128` | ✅ Đang dùng | — |
| T2 | **Tailscale-only positioning** — Headscale client-side only (đã verify code, commit `bbfe03c`) | ✅ Xong | Cần test scratch node trước khi claim rộng rãi |
| T3 | **GHCR image `ghcr.io/.../homelab-dashboard` giữ nguyên** dù repo rename | ✅ Chốt | Không đổi tên image |
| T4 | **Production: 0 inbound ports, SOCKS5 probe path** | ✅ | — |

---

## Việc gấp (thứ tự đề xuất)

1. O9 — deploy topology lên VPS + hard refresh
2. O1 — user chốt cấp URL (chỉ mất 1 câu trả lời)
3. O4+O5+O6 — GitHub repo settings + good first issues (1 buổi)
4. O2 — submit launch posts
5. F3/F4 — tách commit probe + smart-agent khỏi batch Go
