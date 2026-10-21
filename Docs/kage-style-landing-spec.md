# Spec: Web Marketing theo phong cách Kage — cho HostDeck (2026-08-13)

> Mục đích: tài liệu kỳ vọng để **AI agent khác** (Claude Code / Gemini / Codex) thiết kế lại
> landing `site/` theo tinh thần [Kage](https://mengto.github.io/kage/) (repo: `MengTo/kage`),
> kèm palette mới cho dashboard `static/`.
> Kage = "editorial art book moving through a live 3D world" — 5 chapter night walk, Kyoto temple.
> HostDeck KHÔNG copy Kage 1:1 — **chuyển hóa tinh thần** sang homelab ops console.

---

## 0. Nguyên tắc bất biến (đọc trước tiên)

1. **Anti-slop tuyệt đối**: cấm neon/cyberpunk, cấm gradient AI, cấm glassmorphism, cấm pure black `#000`, cấm màu Tailwind default (cyan-400/teal-400/violet-500/blurple `#6366f1`).
2. **Không framework, không build step, không analytics, không remote font, không tracking** — 1 file HTML tự chứa, assets local, relative paths (chạy được dưới GitHub Pages subpath).
3. **Reduced-motion**: toàn bộ trải nghiệm đọc hoàn chỉnh khi tắt animation (giữ 100% nội dung, chỉ bỏ hiệu ứng).
4. **Tiếng Anh toàn bộ** (site quốc tế, launch trên r/selfhosted / Show HN).
5. Identity: không lộ IP/hostname thật — dùng mock demo (`?demo=1`).

---

## 1. Aesthetic — "đêm trong homelab" (chuyển hóa từ Kage)

Kage: night walk qua Kyoto mountain temple. HostDeck: **night walk qua homelab rack** — không cần literal 3D temple, nhưng giữ đúng công thức:

| Kage (gốc) | HostDeck (chuyển hóa) |
|---|---|
| Fixed full-viewport Three.js canvas | Fixed full-viewport WebGL canvas — **server rack phòng tối**, đèn LED nhấp nháy dịu, cable, nodes nối nhau |
| Temple, torii, stairs, lanterns | Rack units, switch, NAS, mini-PC, cable glow, một vài node lights |
| Moon, rain, fog, leaves, embers | Màn hình glow, fan blur, ambient dust, scanning light |
| Warm shoji light, cold moonlight | **Warm amber glow** (thiết bị hoạt động) vs **cold blue** (idle) |
| Vermilion moon | **Vermilion status ring** trên 1 node (alert) |

**Palette tokens (kế thừa Kage, giữ nguyên):**
```css
--ink:        #05070a;  /* nền chính — blue-charcoal gần đen */
--ink-2:      #0a0f14;  /* surface nâng */
--bone:       #dfe7e0;  /* text chính — bone white pha xanh */
--bone-dim:   #aab4ad;  /* text phụ */
--muted:      #78837c;  /* text mờ */
--line:       rgba(223,231,224,.13);   /* viền */
--line-soft:  rgba(223,231,224,.07);   /* viền mờ */
--vermilion:  #e0231c;  /* ACCENT chính — nút CTA, trạng thái alert */
--ember:      #ff5a3c;  /* hover accent, warning sáng */
--gold:       #c9a24a;  /* accent phụ — highlight, badge "pro" */
```

**Semantic status (bổ sung cho dashboard — giữ tương phản trên ink):**
```css
--green:  #4dbb6d;  /* up — đủ sáng trên #05070a */
--yellow: #d7ad45;  /* warn (KHÔNG đụng --gold #c9a24a — vàng hơi lệch) */
--red:    #e0231c;  /* down = vermilion (thống nhất accent) */
```
> Lưu ý thiết kế: vermilion làm accent CTA **và** trạng thái down/alert — đây là chủ ý
> ("seal red" = hành động quan trọng), phân biệt bằng context: nút = hành động, badge = trạng thái.
> Warning dùng ember `#ff5a3c` thay vì red để tách 3 cấp: ember (warn) → vermilion (down).

---

## 2. Typography

| Vai trò | Font | Ghi chú |
|---|---|---|
| Display/Heading | **Instrument Serif** (italic nghiêng cho từ khóa) | Kage dùng Instrument Serif display — giữ |
| Body/UI | **Onest** (weight 300–500) | Kage tự host Onest — self-host woff2 |
| Code/label | **JetBrains Mono** (nhỏ, tracking rộng) | Giữ từ HostDeck hiện tại |
| Kanji trang trí | KHÔNG dùng (HostDeck không phải Nhật) | Thay bằng oversized số chapter + EN caps |

**Quy tắc chữ:**
- Heading oversized, **left-aligned**, chữ nghiêng serif cho 1-2 từ khóa mỗi dòng (`The server room, *lit*`)
- Small technical labels: mono 11-12px, tracking `.12em`, uppercase — như "CH.01 — MONITOR"
- Chapter numbers lớn (serif 200px+, opacity 8%) làm background element
- Generous negative space — không nhồi

---

## 3. Layout — 5 chapter (cấu trúc trang)

```
CH.00 HERO       → "HostDeck" wordmark + 1 dòng manifesto + CTA [Try the live demo]
                   + 3D rack scene nền, chữ đè lên
CH.01 MONITOR    → metrics cards nổi (CPU/RAM/Disk/Net) + đoạn văn value prop
CH.02 ACT        → terminal panel: `hostdeck exec node-3` — "control from anywhere"
CH.03 SECURE     → "zero inbound ports" — Tailscale-only story, network diagram
CH.04 TOPOLOGY   → service dependency graph (dagre) nhúng + dependency tree
CH.05 AFTERLIGHT → installation (1 lệnh), stars/GitHub CTA, tech stack badges
FOOTER           → manifesto: tagline + links (GitHub, Docs) + copyright
```

**Quy tắc layout (từ Kage):**
- Oversized left-aligned EN headings + small technical labels + fine rules (1px `--line`)
- Chapter rail phải hoặc trái (fixed): `00 01 02 03 04 05` + active highlight
- Foreground layers: alpha WebP cutouts (rack front, cable, fan grille) đè đáy viewport, **pinned khi section active, fade+blur khi chuyển**
- Cinematic stills (generated, art-directed) trong editorial cards
- Navigation: anchor links, mobile menu, semantic landmarks (`<nav> <main> <footer>`)
- Custom cursor (chỉ fine pointer devices)

---

## 4. Motion language (từ Kage, giữ nguyên tinh thần)

- Reveal heading **word-by-word**, supporting elements individual
- Slow precise section transitions, subtle parallax, eased camera interpolation
- Section-active: nav + chapter rail + cards + foreground respond
- Bloom nhẹ, film grain, vignette, depth haze — restrained
- `prefers-reduced-motion` → tắt animation, giữ nguyên thứ tự đọc

---

## 5. Kỹ thuật (bắt buộc)

- 1 file `index.html`: document structure + CSS + scene construction + scroll choreography + interaction logic
- Vendored **three.js r149** (MIT, giữ license notice) — local, không CDN
- WebP scene plates + alpha foreground cutouts — local
- No build step, no package manager, no env, no runtime network dependency
- Chạy: `python3 -m http.server 4173` → works dưới subpath (basePath tương đối)
- Total budget: **< 1.5MB JS/CSS** (Kage: 1MB three.js + code)

---

## 6. Prompt đầy đủ cho agent (copy-paste)

```markdown
Create a single-page, cinematic WebGL experience called **HostDeck**: a five-chapter
night walk through a dim homelab server room rendered live in Three.js. It should feel
like an editorial art book moving through a live 3D world, not a conventional product
landing page.

## Experience
- Fixed full-viewport Three.js canvas as environmental layer
- Build the rack, switch, NAS, mini-PC nodes, cable glow, fans, ambient dust,
  scanning light procedurally
- One continuous camera path driven by page scroll; each section = new composed shot
- Restrained bloom, film grain, vignette, depth haze; warm amber glow (active devices)
  vs cold blue (idle); one vermilion status ring on an alerting node
- Palette: near-black blue-charcoal (#05070a), bone white (#dfe7e0), vermilion
  (#e0231c), ember (#ff5a3c), gold (#c9a24a). NO neon, NO gradients, NO glassmorphism

## Layout
- Sections: hero → monitor → act → secure → topology → afterlight → manifesto footer
- Oversized left-aligned English headings (Instrument Serif, italic keyword), small
  mono technical labels, chapter numbers, fine rules, generous negative space
- Layer generated cinematic stills into editorial cards; alpha WebP cutouts
  (rack front, cables, fan grille) at bottom of active viewport
- Foreground arrives full opacity, pinned while section active, fades+blurs on handoff
- Fixed chapter rail (00-05), anchor nav, mobile nav, semantic landmarks

## Motion
- Reveal headings word by word; slow precise transitions; subtle parallax
- prefers-reduced-motion preserves complete reading experience

## Interaction & quality
- Custom cursor only for fine pointer devices
- Working anchors, accessible labels, keyboard-reachable CTAs, visible focus rings
- Local assets, relative paths, GitHub Pages subpath safe
- No frameworks, no build tooling, no analytics, no remote fonts, no tracking
- Verify desktop + ~390×844, check asset 404s, parse scripts, inspect console,
  test full scroll + nav before shipping
```

---

## 7. Dashboard (`static/`) — palette mới tương ứng

Đổi `tokens.css` từ graphite/amber → Kage-ink family, **giữ nguyên cấu trúc token**:

```css
/* HIỆN TẠI (graphite/amber) → MỚI (ink/vermilion) */
--bg-base:       #101010  → #0a0f14   /* ink-2 surface */
--bg-deep:       #090909  → #05070a   /* ink */
--text-primary:  #e5e1d9  → #dfe7e0   /* bone */
--text-secondary:#b8b2a8  → #aab4ad   /* bone-dim */
--text-dim:      #8a857c  → #78837c   /* muted */
--accent:        #d99a3d  → #e0231c   /* vermilion — FIX lỗi trùng warning cũ */
--accent-hover:  #efb35a  → #ff5a3c   /* ember */
--green:         #55bf78  → #4dbb6d
--yellow:        #d7ad45  → #d7ad45   /* giữ — đã tách khỏi accent */
--red:           #e15f59  → #e0231c   /* vermilion */
--orange:        #da8737  → #ff5a3c   /* ember (warning) */
```

**Vì sao hợp lý:** đổi sang vermilion vừa FIX lỗi thiết kế hiện tại (accent trùng warning yellow),
vừa đồng bộ brand giữa landing Kage-style và dashboard. Cần kiểm tra contrast bằng code
(script WCAG) trước khi port — mọi token text phải ≥ 4.5:1.

---

## 8. Checklist trước khi ship

- [ ] Prototype độc lập → screenshot thật → **duyệt** → mới port vào `site/`
- [ ] Contrast từng token đo bằng code (WCAG 4.5:1)
- [ ] Vision-verify screenshot (không tin mắt thường)
- [ ] `site/og-image.png` chụp lại theo palette mới
- [ ] Dashboard: bump `CACHE_NAME` v6 → v7 sau khi đổi `tokens.css`
- [ ] Không lộ IP/hostname thật trong mọi screenshot
- [ ] Works trên `hostdeck.thinkai.id.vn` (CNAME/Pages subpath)
