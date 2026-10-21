# Carousel Transform-Based Rewrite — Plan v2 (2026-08-09)

> **Trạng thái:** chờ duyệt. Bản v1 (cùng tên) đã bị rollback — bài học lớn nhất
> của v1 được nhúng vào plan này (xem §Nguyên tắc).

**Goal:** Chữa 3 lỗi carousel trên máy thật (AMD iGPU + Brave) mà không đổi hành vi
sản phẩm: (1) nút ◀▶ không center chính xác, (2) auto-loop giật, (3) hover cạnh
đổi focus liên tục.

**Architecture:** Bỏ scroll container (nguồn gốc #2 — main-thread scroll damage +
layer 15.408px) → track `translateX` compositor-pure (đã đo: Paint giảm ~13×,
Layout ≈ 0 ở bản v1). Thay `scrollTo({behavior:"smooth"})` (nguồn #1 — rớt frame
trên iGPU) bằng rAF tween tự viết. Hover (#3) thêm ngưỡng di chuyển 8px + không
interrupt tween.

**Tech Stack:** vanilla JS + CSS, zero framework (không đổi triết lý repo).
Verify: puppeteer (headless regression) + **máy thật của user (chuẩn cuối)**.

---

## Nguyên tắc (học từ v1 — KHÔNG lặp lại)

1. **Headless ≠ máy thật.** Headless không tái hiện: pointerup bị nuốt, layout
   1-card, jank iGPU. → Mọi milestone bắt buộc có bước verify trên máy thật:
   user hard-refresh (Ctrl+Shift+R) → test 3 triệu chứng → screenshot → vision.
2. **Không sửa vụn** — một lần viết đủ 3 fix + mọi pitfall đã biết, rồi mới test.
3. **Nếu 1 fix-loop vượt ~5 vòng mà không chốt → dừng, báo user** (không tự lặp).
4. Không đụng 12 files Go + untracked của user. Stage đúng file.

## Pitfalls đã biết phải né (từ v1 — `css-animation-performance` skill)

- IO phải observe **carousel**, không observe track (track translate ra ngoài
  viewport → IO báo off-screen → hủy tick → auto + tween chết đồng loạt).
- `centerOffset(i) = trackLeft + i*step + cardW/2 − viewCenter()` — KHÔNG dùng
  `(i+0.5)*step` (sai 11px hệ thống với gap 22px).
- clickStep: snap card gần center TRƯỚC, rồi tween `centerOffset((nearest+dir)%24)`
  — startTween tự chọn mirror gần nhất → wrap (23→0) nhìn như 1 bước thường.
- Drag: hủy tween trong `pointerdown` (tick sẽ đè offset), lắng nghe
  pointerup/pointermove ở **document** (capture không đáng tin).
- Hover: ngưỡng 8px từ điểm chấp nhận cuối + card-identity guard (đã có).
- `elementFromPoint` là chuẩn hit-test khi nghi pointer chết.
- Test harness: snapshot trước, sample sau — không bao giờ so giá trị với chính
  nó đọc lại cùng tick.
- Vấn đề "chỉ 1 card visible" trên máy user: **chưa từng tái hiện được headless**
  (1920×1200 cũng không). Bản mới loại đồng loạt 3 nghi phạm: (a) measure lúc
  layout chưa settle → measure double-rAF + lại sau `window.load`; (b) sẽ-change
  trên cards (nghi AMD layer bug) → bỏ, 3D rotateY tự promote layer; (c) offset
  init sai → centerOffset chuẩn + clamp. Nếu user test vẫn 1 card → debug với
  dữ liệu DOM thật của máy user (paste `offset`, card rects), không đoán.

---

## Task 1: Đọc + khóa baseline

**Objective:** Xác nhận trạng thái gốc, không vỡ gì trước khi đụng.

**Files:**
- Read: `site/css/style.css` block `.shots-carousel`/`.shots-track`/`.shot-card`
  (xác nhận: overlay gradient `::before/::after` đang dùng hay mask trên track;
  sẽ-change đang đặt ở đâu — 14 matches)
- Read: `site/index.html` block carousel (8 `<figure class="shot-card">` + nav)

**Step 1:** `git status --short` → chỉ còn 12 files Go + 1 untracked (không đụng).
**Step 2:** server `python3 -m http.server 8400` (background) nếu chưa chạy;
`curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8400/` → 200.
**Step 3:** `node --check site/js/reveal.js` → exit 0.

**Verify:** cả 3 bước xanh. → **User test baseline trên máy thật (tùy chọn):**
hard-refresh, xác nhận 3 lỗi đúng như mô tả (có screenshot).

---

## Task 2: CSS — track thành viewport compositor-pure

**Objective:** Bỏ scroll container; track chỉ còn là layer translateX.

**Files:**
- Modify: `site/css/style.css`

**Step 1:** `.shots-track`:
```css
.shots-track {
  display: flex; gap: 22px;
  /* hết: overflow-x, scroll-snap-type, scroll-padding-inline,
     scrollbar-width, mask-image (nếu còn) */
  will-change: transform;   /* layer cho translateX */
}
```
- `.shots-carousel` giữ `overflow: hidden` + `perspective: 1600px` + overlay
  gradient `::before/::after` (`pointer-events: none` — ĐÃ CÓ ✓, giữ).
- `.shot-card`: **bỏ `will-change: transform, opacity` nếu có** (nghi phạm AMD
  layer bug + layer explosion). rotateY + perspective là 3D transform → Chrome
  TỰ promote layer — không cần hint.
- Giữ: `flex: 0 0 min(620px, 76vw)`, media queries ≤900/≤480, glow `::after`,
  nav z20.

**Step 2:** `node --check` không áp dụng CSS — verify bằng browser (Task 4).

---

## Task 3: JS — thay block carousel bằng transform-based (1 lần, đủ 3 fix)

**Objective:** Thay dòng 172–358 `site/js/reveal.js` (block filmstrip) bằng bản
transform-based. GIỮ NGUYÊN: nav/drawer/KPI/typer/copy/demo-iframe (dòng 1–171,
359–386). Chỉ thêm vào typer: off-screen gate (dòng ~100–137).

**Files:**
- Modify: `site/js/reveal.js` (block carousel)

**Cấu trúc block mới (kèm các hằng số — giữ nguyên hành vi đã chốt):**

```js
// hằng số (giữ): SPEED=70px/s, HOLD_MS=3500, TWEEN_MS≈250, gap=22
let offset = 0, raf = null, last = 0, lastOffset = NaN;
let paused = false, holdUntil = 0, tween = null, drag = null;

function measure() {
  // cardW = track.children[0].offsetWidth (layout width — KHÔNG rect width)
  // trackLeft = track.offsetLeft + padL(4)
  // step = cardW + gap; SET = step*8
  // trackW = track.scrollWidth; maxOffset = trackW - carousel.clientWidth
}
function render() {  // mỗi frame
  track.style.transform = "translate3d(" + (-offset).toFixed(2) + "px,0,0)";
}
function centerOffset(i) { return trackLeft + i*step + cardW/2 - viewCenter(); }
function startTween(target, ms) {
  const from = offset;
  // mirror-pick: chọn target' ∈ {target ± k*SET} gần from nhất (wrap vô hình)
  let best = target, bd = Infinity;
  for (let k = -1; k <= 1; k++) { const c = target + k*SET; const d = Math.abs(c - from); if (d < bd) { bd = d; best = c; } }
  // clamp [0, maxOffset]
  tween = { from, to: best, t0: performance.now(), dur: reduced ? 0 : ms };
  paused = true; holdUntil = performance.now() + HOLD_MS;
}
function tick(ts) {
  const dt = last ? Math.min((ts - last)/1000, 0.05) : 0; last = ts;
  if (tween) {
    const p = Math.min(1, (ts - tween.t0) / tween.dur);
    const e = 1 - Math.pow(1 - p, 3);           // easeOutCubic
    offset = tween.from + (tween.to - tween.from) * e;
    if (p >= 1) tween = null;
    else { render(); applyDepth(); raf = requestAnimationFrame(tick); return; }
  }
  if (!reduced && !paused && ts >= holdUntil && document.visibilityState === "visible") {
    offset = Math.min(offset + SPEED*dt, maxOffset);
    if (offset >= SET*1.5) offset -= SET;       // wrap vô hình (mirror)
  }
  render();
  if (offset !== lastOffset) { lastOffset = offset; applyDepth(); }  // skip-stable
  raf = requestAnimationFrame(tick);
}
```

**3 fix chính:**

1. **Nút ◀▶ (lỗi #1):**
```js
const clickStep = (dir) => {
  const nearest = nearestCardIndex();           // card gần viewCenter nhất
  const next = (nearest + dir + 24) % 24;       // wrap tròn
  startTween(centerOffset(next));
};
```
2. **Hover (lỗi #3):**
```js
let hoverCard = null, hx = 0, hy = 0;
carousel.addEventListener("mousemove", (e) => {
  if (!paused) return;
  if (Math.abs(e.clientX - hx) + Math.abs(e.clientY - hy) < 8) return; // jitter guard
  hx = e.clientX; hy = e.clientY;
  const card = e.target.closest ? e.target.closest(".shot-card") : null;
  if (card && card !== hoverCard) { hoverCard = card; startTween(centerOffset(cardIndex(card))); }
});
```
3. **Drag (đủ cả bấm-chuột-giữ-kéo):** `pointerdown` trên track:
`pause(); tween = null; drag = {x: e.clientX, from: offset};` — `pointermove`/
`pointerup` trên **document** (gated `if (!drag) return`): move → `offset = from - (x0-x)`; up → `drag=null` + `startTween(centerOffset(nearestCardIndex()))`.

**Pause/resume/IO (giữ + sửa):**
```js
const io = new IntersectionObserver((es) => {
  for (const e of es) { if (!e.isIntersecting) { paused = true; raf = null; }
    else if (!reduced && !raf) raf = requestAnimationFrame(tick); }
}, { threshold: 0.1 });
io.observe(carousel);            // ← observe CAROUSEL, KHÔNG track
// mouseenter→pause / mouseleave→resume / focusin→pause+align / focusout→resume
// touchstart→pause+align / touchend→resume / visibilitychange giữ nguyên
```

**applyDepth (giữ nguyên bản 7fe454c — đã quantize + cache-compare):** chỉ sửa
đầu hàm nhận `offset` làm nguồn tính dist thay vì đọc rect của từng card —
tính `dist(i) = (i*step + cardW/2 − offset) / (cardW/2)` trực tiếp (rẻ hơn,
không đọc layout). z-index + `--glow` giữ nguyên. Bỏ hoàn toàn sẽ-change writes.

**Typer off-screen gate (thêm, dòng ~100–137):**
```js
let typerVisible = false;
const typeIo = new IntersectionObserver((es) => {
  for (const e of es) typerVisible = e.isIntersecting;
}, { threshold: 0.1 });
typeIo.observe(typer);
tick();                          // gate: if (!typerVisible) { setTimeout(tick, 250); return; }
```
(Giảm ~60 style-recalc/s khi typer ngoài viewport.)

**Init:**
```js
// measure double-rAF (đợi layout settle) + lại sau window.load + resize
const boot = () => { measure(); wrapOffset(); render(); applyDepth(); };
requestAnimationFrame(() => requestAnimationFrame(boot));
window.addEventListener("load", boot);
window.addEventListener("resize", () => { measure(); wrapOffset(); render(); applyDepth(); });
```

**Step 1:** `node --check site/js/reveal.js` → exit 0.
**Step 2:** Regression headless (chỉ kiểm tra không vỡ — KHÔNG kết luận jank):
`node scripts/verify-filmstrip-loop.js` (nếu script còn hợp) HOẶC test nhanh:
auto advance, nút next×9 wrap, hover center, mobile 375, 0 JS errors.
**Step 3:** `git diff --stat` — chỉ 2 file (reveal.js + style.css).

---

## Task 4: Verify trên máy thật — CHUẨN CUỐI (user tham gia)

**Objective:** 3 triệu chứng phải hết trên Brave/iGPU thật, không phải headless.

**Step 1 (user):** hard-refresh `127.0.0.1:8400` (Ctrl+Shift+R).
**Step 2 (user, 3 test):**
1. Đứng nhìn auto-loop ~10s → khung ảnh có giật không? (cần 30fps+ mượt)
2. Bấm ◀▶ liên tục ~10 lần → ảnh có center chính xác từng lần? bấm tới khi
   wrap tròn có dừng/hụt không?
3. Hover vào card 2 bên cạnh + để yên chuột → focus có đổi liên tục không?
4. Kéo chuột giữ (drag) → thả → card có tự về center không?
**Step 3 (user):** chụp screenshot toàn trang đang scroll tới carousel → gửi.
**Step 4 (agent):** vision-check screenshot: ≥3 cards visible (không còn "1 card +
đen trống"), ảnh sắc nét, nút không chồng ảnh.
**Step 5:** Nếu có triệu chứng còn → ghi nhận + quay Task 5 (KHÔNG tự sửa vụn).

**Verify:** cả 4 test xanh + vision xanh.

---

## Task 5: Fix theo phản hồi thật (chỉ khi Task 4 chưa xanh)

**Objective:** Xử lý đúng triệu chứng còn lại trên máy thật, có dữ liệu DOM
thật làm chứng cứ (không đoán).

- "1 card + đen": yêu cầu user paste từ DevTools console:
  `JSON.stringify({offset, cardW, trackLeft, step, maxOffset, transform, cards: [...track.children].map(c => {const r=c.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width)]})})`
  → đối chiếu công thức centerOffset với rect thật → fix 1 điểm.
- Jank còn: trace CDP trên máy user nếu có thể (user chạy script), hoặc giảm
  chi phí applyDepth tiếp (chỉ style ±2 cards, tăng bước quantize).

**Verify:** user test lại 4 mục Task 4. Tối đa 5 vòng fix → dừng báo user.

---

## Task 6: Commit + push + deploy

**Objective:** Giao bản đã verify máy thật.

**Step 1:** `git status --short` — chỉ `site/js/reveal.js` + `site/css/style.css`.
**Step 2:** `git add site/js/reveal.js site/css/style.css` → `git diff --cached --stat`.
**Step 3:** Commit chuẩn (chi tiết + từng fix + rationale):
```
fix(site): transform-based filmstrip — compositor-pure loop, exact centering, hover guard
```
**Step 4:** push → Pages deploy tự động (site/**). Verify live sau deploy
(`curl -s https://hostdeck.thinkai.id.vn/js/reveal.js | grep -c translate3d`).
**Step 5:** Cập nhật `site/changelog.html` Unreleased (cùng commit).

**Verify:** live serve bản mới + changelog đồng bộ.

---

## Ngoài phạm vi (KHÔNG làm trong plan này)

- Phím tắt ←/→/Space (plan riêng, chờ duyệt sau).
- Đổi màu DISK `#d7ad45` (giữ).
- Chụp screenshot marketing mới + post launch (sau khi carousel chốt).
- Chỉnh opacity floor cards xa (giữ thiết kế hiện tại).
