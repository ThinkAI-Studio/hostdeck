# Hướng dẫn: Landing page GitHub Pages với demo không-cần-auth

> File này giải thích **cách làm** và **tại sao làm như vậy** cho Task 4 —
> website 1 trang cho homelab-dashboard, deploy qua GitHub Pages, demo chạy
> ngay không cần đăng nhập. Đọc trước khi thực hiện.

---

## 1. Mục tiêu

Khi hoàn thành, ai cũng mở được:

```
https://bnhminh1010.github.io/homelab-dashboard/
```

- **Landing page**: hero + demo nhúng + quickstart 3 bước + bảng so sánh
- **Demo không-cần-auth**: bấm vào là thấy dashboard chạy (dữ liệu mẫu)
- Không cần đăng nhập, không cần Tailscale, không cần server nào

## 2. Vì sao không cần tên miền

GitHub Pages cấp sẵn URL miễn phí dạng `bnhminh1010.github.io/<tên-repo>/`.
HTTPS có sẵn (chứng chỉ Let's Encrypt tự gia hạn). Tên miền riêng là tùy chọn
sau này — chỉ là 1 CNAME record trên Cloudflare, không ảnh hưởng code.

## 3. Kiến trúc tổng thể

```
Repo homelab-dashboard
│
├── static/                  ← UI gốc (dashboard thật, go:embed)
│   ├── index.html
│   ├── css/ js/ lib/ ...
│   └── js/demo.js           ← DemoApi: dữ liệu mẫu 100% client-side
│
├── site/                    ← Landing page (thêm mới)
│   ├── index.html           ← hero + demo iframe + quickstart
│   └── assets/              ← ảnh screenshot, logo
│
└── .github/workflows/pages.yml   ← CI build + deploy lên Pages
```

**Điểm mấu chốt — demo chạy được mà không cần backend:**

Khi mở `static/index.html?demo=1`:
- `app.js` dòng 18: `const api = demo ? new DemoApi() : new DashboardApi();`
- `DemoApi` (trong `demo.js`) trả dữ liệu mẫu thuần — **không fetch, không
  WebSocket, không gọi API thật**
- → Toàn bộ `static/` có thể phục vụ như trang tĩnh, không cần Go backend

## 4. Vấn đề kỹ thuật phải xử lý: asset path bị vỡ

`static/index.html` hiện dùng **absolute paths**:

```html
<link rel="stylesheet" href="/css/tokens.css">   <!-- gốc domain -->
<script type="module" src="/js/app.js"></script>
<a class="brand" href="/">
```

Trên dashboard thật (chạy ở `https://debian-server.tail615ea5.ts.net/`) các
path này trỏ đúng vì dashboard nằm ở gốc domain.

Nhưng GitHub Pages project site nằm ở **sub-path**:
`https://bnhminh1010.github.io/homelab-dashboard/`

→ `/css/tokens.css` sẽ trỏ tới `bnhminh1010.github.io/css/tokens.css`
→ **404, UI vỡ trắng.**

**Giải pháp (không sửa static/ gốc):** trong workflow deploy, copy `static/`
sang một thư mục build rồi rewrite các absolute path thành relative:

```bash
# build-site.sh (chạy trong CI, không đụng static/ gốc)
mkdir -p _site
cp -r static/* _site/
cd _site
sed -i 's|href="/lib/|href="./lib/|g; s|href="/css/|href="./css/|g; s|src="/lib/|src="./lib/|g; s|src="/js/|src="./js/|g' index.html
sed -i 's|href="/"|href="./"|g' index.html
```

Rewrite xong: `/css/tokens.css` → `./css/tokens.css` (resolve tương đối từ
sub-path, đúng). Bảng chi tiết các path cần rewrite:

| Path gốc | Thành | Vị trí |
|---|---|---|
| `/css/*` | `./css/*` | 2 link stylesheet |
| `/lib/*` | `./lib/*` | xterm.css + chart.umd.min.js |
| `/js/*` | `./js/*` | app.js (module) |
| `href="/"` | `href="./"` | brand link |

> ⚠️ **Quy tắc**: chỉ sed trong bản copy (`_site`), **không bao giờ sed
> `static/` gốc** — nó được `go:embed` vào binary, đổi là hỏng dashboard thật.

## 5. Landing page — nội dung

`site/index.html` (tự viết, không dùng framework — giữ triết lý zero-dependency):

```
Hero:     "Your homelab, one Tailscale-only console."
          + demo GIF (assets/screenshots/demo.gif)

Demo:     <iframe src="./index.html?demo=1">  ← chính là static/ đã rewrite
          (đặt trong tab riêng hoặc iframe — chạy ngay không cần login)

How:      3 bước quickstart:
          1. git clone + cp .env.example .env
          2. podman compose up -d
          3. mở qua Tailscale Serve

Compare:  Bảng so sánh vs Beszel / Uptime Kuma / Grafana (✅/❌, fact-only)

Footer:   GitHub · Docs · Apache-2.0
```

Lưu ý iframe: nếu nhúng demo trong iframe, cần `src="./index.html?demo=1"`
(relative — chính là bản static đã rewrite ở bước 4). Có thể để nguyên demo
GIF làm hero + link "Try the live demo" mở full-window cũng được — đơn giản
hơn, tránh vấn đề iframe height.

## 6. Workflow deploy — `.github/workflows/pages.yml`

```yaml
name: pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build site
        run: |
          mkdir -p _site
          cp -r static/* _site/
          cp -r site/* _site/          # landing page đè lên index.html gốc
          cd _site
          sed -i 's|href="/lib/|href="./lib/|g; ...' index.html   # rewrite paths
      - uses: actions/upload-pages-artifact@v3
        with: { path: _site }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

> ⚠️ Thứ tự copy: `site/index.html` (landing) phải copy **sau** `static/` để
> đè lên — landing là trang chủ, dashboard demo nằm ở đường dẫn con
> (`index.html?demo=1` là cùng file... cần tách: landing ở gốc, demo nằm ở
> `demo/index.html`). Chi tiết bước 7.

## 7. Bố trí file — tránh đè nhau

`index.html` vừa là landing vừa là dashboard → **phải tách đường dẫn**:

```
_site/
├── index.html          ← landing page (từ site/)
├── demo.html           ← dashboard demo (bản static đã rewrite, đổi tên)
├── css/ js/ lib/       ← assets của static
└── assets/screenshots/ ← ảnh landing
```

Trong CI: copy `static/` → `_site/`, **rename `index.html` thành `demo.html`**,
rồi copy landing `site/index.html` vào `_site/index.html`.

Landing link demo: `<a href="./demo.html?demo=1">Try the live demo</a>`.

## 8. Bật GitHub Pages (anh tự làm, 1 phút)

1. Repo → **Settings** → **Pages**
2. **Source**: `GitHub Actions` (không phải branch)
3. Deploy xong → URL hiện ở mục Pages + comment trong workflow run

Sau đó (Task 3 còn dở): set homepage URL = `https://bnhminh1010.github.io/homelab-dashboard/`
trong repo **About** section (nút bút chì cạnh tên repo).

## 9. Verify — checklist cuối

- [ ] Mở `https://bnhminh1010.github.io/homelab-dashboard/` → landing render
- [ ] Click "Try the live demo" → `demo.html?demo=1` render đầy đủ (7 workspace)
- [ ] **Không login, không cookie** → vẫn chạy (mở ở tab ẩn danh để chắc chắn)
- [ ] DevTools console: **0 JS errors**
- [ ] Mobile (iPhone/Android viewport) không vỡ layout
- [ ] Charts render (canvas không trống) — demo dữ liệu mẫu có đồ thị

## 10. Tổng kết

| Câu hỏi | Trả lời |
|---|---|
| Cần tên miền không? | ❌ GitHub Pages miễn phí, HTTPS sẵn |
| Demo có cần backend? | ❌ `DemoApi` mock client-side thuần |
| Có sửa code dashboard? | ❌ Chỉ thêm `site/` + workflow, sed trong CI copy |
| Anh phải tự làm gì? | Bật Pages trong Settings (mục 8) + set homepage |
| Rủi ro lớn nhất? | Absolute paths vỡ trên sub-path → đã có giải pháp sed (mục 4) |
