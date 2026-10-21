# Landing Page — Implementation Plan (hoàn chỉnh)

> Nguồn: research 2026-08-04 (Beszel.dev, Netdata.cloud, gethomepage.dev, Uptime Kuma)
> + design prototype đã duyệt (`landing-design-prototype.md`).
> Mục tiêu: 1 trang tĩnh GitHub Pages, demo không-cần-auth, đồng bộ 100% tokens dashboard.
>
> **⚠️ TRẠNG THÁI (2026-08-04): DEFERRED —** User quyết định implement
> đầy đủ các mục trong `Docs/market-gaps-research.md` (P0–P1: demo không-auth,
> quick filter, restart/stop, TCP probe, PWA) **trước**, rồi mới quay lại
> triển khai landing page này. Plan giữ nguyên, chỉ chờ.

---

## 0. Research insights (từ 4 landing thật)

| Tool | Cấu trúc | Điểm học được |
|---|---|---|
| **Beszel** (24k⭐) | Hero (headline + sub + 2 CTA) → **slideshow screenshots** → feature grid (8 mục, icon + title + 1 dòng) → CTA | Feature grid mỗi mục **1 dòng duy nhất** — không đoạn văn dài; slideshow ảnh thật thay vì mô tả |
| **Netdata** (76k⭐) | Hero + **KPI strip số liệu thật** (5% CPU, 150MB RAM, 800+ integrations) → features theo nhóm → case studies | KPI số liệu cụ thể tạo tin cậy tức thì; dùng metric thật của sản phẩm |
| **Homepage** (31k⭐) | Banner → **demo clip ngay dưới hero** | Demo xem được ngay, không cần cuộn |
| **Uptime Kuma** (89k⭐) | README-driven, screenshot-first | Ảnh dashboard thật đặt đầu trang là đủ thuyết phục |

**Kết luận cho dashboard:**
1. Demo/screenshot phải **ngay dưới hero** (không chôn sâu)
2. **KPI strip** dùng số thật: 5 nodes · 7 workspaces · 3 binaries · 0 inbound ports
3. Feature grid **1 dòng/mục** (icon + title + line), asymmetric layout
4. CTA lặp lại **2 lần** (hero + cuối trang)

---

## 1. Cấu trúc trang (full-page scroll)

```
┌────────────────────────────────────────────────────┐
│ NAV — logo SVG + HOMELAB DASHBOARD + links         │  sticky, blur bg
│      (Features · Demo · Quick start · GitHub ↗)    │
├────────────────────────────────────────────────────┤
│ HERO — dot-wave canvas (full-viewport)             │  motion chính
│ badge → h1 → sub → terminal line → CTA×2           │  + scroll hint ↓
├────────────────────────────────────────────────────┤
│ KPI STRIP — 4 số đếm (count-up khi scroll vào)     │  1 motion duy nhất
│ 5 nodes · 7 workspaces · 3 binaries · 0 ports      │
├────────────────────────────────────────────────────┤
│ LIVE DEMO — iframe demo.html?demo=1                │  chạy thật, không auth
│ viền terminal + label "LIVE · no login"            │
├────────────────────────────────────────────────────┤
│ FEATURES — asymmetric grid (2 lớn + 1 nhỏ × 2)     │  6 mục, 1 dòng/mục
│ Observe/Act/Retain/Trust + SLO + Topology          │
├────────────────────────────────────────────────────┤
│ QUICKSTART — 3 bước + terminal typing animation    │  typing loop
│ podman compose up -d → tailscale serve → open      │
├────────────────────────────────────────────────────┤
│ CTA FINAL — "Your homelab, one console." + button  │  nhắc lại
├────────────────────────────────────────────────────┤
│ FOOTER — GitHub · Docs · Apache-2.0 · © 2026       │
└────────────────────────────────────────────────────┘
```

## 2. Copy (nội dung từng section)

### NAV
- Links: `Features` `Demo` `Quick start` — anchor scroll, `GitHub ↗` — external

### HERO
- Badge: `● Tailscale-only · Zero inbound ports` (pulse dot xanh)
- H1: `Your homelab, one console.` ("one console" amber)
- Sub: `Observe services, SLOs, backup freshness and container health across up to five nodes — then open the correct shell without exposing a single admin port.`
- Terminal line: `$ podman compose up -d` (blink cursor)
- CTA: `Try the live demo` (accent solid) + `Quick start` (ghost)
- Hint: `Move your cursor — the grid responds` (mono, dim)

### KPI STRIP (count-up, mono font)
| Số | Label |
|---|---|
| 5 | nodes monitored |
| 7 | workspaces |
| 3 | static binaries |
| 0 | inbound ports |

### FEATURES (6 mục, asymmetric: 2 lớn + 1 nhỏ mỗi hàng)
1. **Observe** — Services, containers, TLS certs, backup freshness, SLO history (icon: eye)
2. **Act** — Container shells + explicitly-confirmed host Bash, right from the UI (icon: terminal)
3. **Retain** — Tiered metrics: 5s live, 1m/24h, 1h/90d — compact SQLite, no TSDB (icon: database)
4. **Trust** — Tailscale-only: no inbound ports, no exposed admin panel (icon: shield)
5. **SLOs** — Track uptime targets per service, degraded states flagged (icon: gauge)
6. **Topology** — Map dependencies between services and containers (icon: network)

### QUICKSTART (3 bước, mỗi bước 1 dòng + code)
1. `git clone https://github.com/bnhminh1010/hostdeck && cd homelab-dashboard`
2. `cp .env.example .env && podman compose up -d`
3. `tailscale serve 8082` → open the printed `https://...ts.net` URL

### COMPARE (đưa vào v1.1 — xem mục 7, cần verify trước khi public)

### FOOTER
`GitHub ↗ · Docs ↗ · Apache-2.0 · Built with Go — no Node, no npm, no CDN`

---

## 3. Tech stack

| Thành phần | Giải pháp | Ghi chú |
|---|---|---|
| Layout | 1 file `site/index.html` | Semantic HTML, section riêng |
| Style | `site/css/style.css` | Copy tokens từ `static/css/tokens.css`, thêm tokens riêng (spacing, section) |
| Dot-wave | `site/js/wave.js` | Từ prototype, tách riêng; **đổi**: dot-wave chỉ đậm ở hero, mờ dần theo scroll |
| Scroll reveal | `site/js/reveal.js` (~40 dòng) | IntersectionObserver, fade + 8px translate, `prefers-reduced-motion` tôn trọng |
| Count-up | trong `reveal.js` | 1 lần duy nhất khi KPI vào viewport |
| Typing loop | trong `reveal.js` hoặc riêng | Terminal ở quickstart, type/delete lặp |
| Icons | Inline SVG | 6 icons feature, thủ công, stroke 1.5 |
| Font | Inter (Google Fonts) + JetBrains Mono (local hoặc Google) | Dashboard đang dùng Inter — thêm link Google Fonts |
| Demo | `demo.html` (bản static/ rewrite, từ workflow CI) | iframe `loading="lazy"` |

## 4. Files cần tạo

```
site/
├── index.html              ← landing (mới)
├── css/style.css           ← tokens + styles (mới)
└── js/
    ├── wave.js             ← dot-wave (từ prototype)
    └── reveal.js           ← scroll reveal + count-up + typing (mới)

.github/workflows/pages.yml ← CI build (mới — theo landing-page-github-pages-guide.md)
```

**KHÔNG sửa** `static/` (dashboard gốc, go:embed) — CI copy + sed rewrite.

## 5. Motion spec (anti-slop — tối đa 3 motion)

| Motion | Vị trí | Trigger | Chi tiết |
|---|---|---|---|
| Dot-wave | Hero | always | Magnetic repel 240px, ambient 2px, mờ dần 30% xuống hết hero |
| Scroll reveal | Mọi section | IntersectionObserver | fade 0→1 + translateY 8px→0, 160ms `--ease`, stagger 40ms |
| Count-up | KPI strip | vào viewport 1 lần | 600ms ease-out, mono tabular-nums |
| Typing loop | Quickstart terminal | vào viewport | type 3 lệnh tuần tự, pause, lặp (chậm, không gấp) |

**KHÔNG làm:** parallax chuột, hover scale phóng đại, animation lặp vô nghĩa, gradient chuyển động.

## 6. Responsive

| Breakpoint | Thay đổi |
|---|---|
| < 900px | Feature grid 1 cột (bỏ asymmetric), KPI 2×2, nav ẩn links giữ logo + GitHub |
| < 480px | H1 clamp xuống 2.2rem, demo iframe full-width, terminal line wrap |

Dot-wave: spacing 36px → 48px trên mobile (ít chấm hơn, giữ perf).

## 7. Lộ trình (chia nhỏ, verify từng bước)

| Bước | Nội dung | Verify |
|---|---|---|
| **1** | `site/css/style.css` — tokens + base + nav + footer | Mở local, không CSS lỗi |
| **2** | `site/index.html` — skeleton đủ sections, content thật | Scroll mượt, anchor hoạt động |
| **3** | `site/js/wave.js` — dot-wave nhúng vào hero | Chuột di → dot đẩy; scroll → mờ dần |
| **4** | `site/js/reveal.js` — scroll reveal + count-up + typing | Từng section reveal đúng, count-up 1 lần |
| **5** | `pages.yml` — CI build (copy static→_site, rename demo.html, sed paths) | Local chạy thử workflow script |
| **6** | Deploy thử + bật Pages + set homepage URL | Checklist mục 9 guide (tab ẩn danh, 0 JS error) |
| **7** | **COMPARE table** — bảng vs Beszel/Uptime Kuma/Grafana, **verify từng ô** từ research (fact-only, không nói bừa) | Mỗi claim có nguồn; nếu không chắc → bỏ ô đó |

## 8. Verify checklist (cuối cùng)

- [ ] `https://bnhminh1010.github.io/homelab-dashboard/` load, hero dot-wave chạy
- [ ] Demo iframe hoạt động **không login** (tab ẩn danh)
- [ ] Scroll: reveal mượt, count-up 1 lần, dot-wave mờ dần
- [ ] Typing loop quickstart chạy
- [ ] 0 JS errors (DevTools console)
- [ ] Mobile < 480px không vỡ
- [ ] `prefers-reduced-motion` → tĩnh, vẫn đọc được hết nội dung
- [ ] Lighthouse ≥ 90 (performance/accessibility)
- [ ] So sánh màu: tokens landing == tokens dashboard (không lệch 1px)

---

## 9. Câu hỏi mở (chốt trước khi implement)

1. **COMPARE table**: v1 luôn hay v1.1? (Đề xuất: v1.1 — research kỹ từng ô trước khi public, tránh bị soi lỗi)
2. **Ngôn ngữ**: landing tiếng Anh (dev-tool chuẩn) hay song ngữ? (Đề xuất: tiếng Anh — README đã tiếng Anh, audience quốc tế)
3. **Font**: load Inter/JetBrains Mono từ Google Fonts (CDN, nhanh) hay tự host (offline-first, đúng triết lý "no CDN")? (Đề xuất: **tự host 2 file woff2** — khớp triết lý repo, không phụ thuộc CDN)
