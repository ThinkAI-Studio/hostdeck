# Launch Post Drafts — HostDeck v0.1.0

> Số liệu trong draft lấy từ `docs/benchmarks.md` (đo thật 2026-08-06, Debian 13, 9 containers, 6 services, 10 alerts):
> dashboard 40.9MB RSS + host-agent 8.6MB ≈ 50MB total · CPU 2.4% avg 13h · SQLite 29.7MB · 0 inbound ports · 3 binaries
> Demo: https://hostdeck.thinkai.id.vn/app/?demo=1 · Repo: https://github.com/bnhminh1010/hostdeck

---

## 3.1 — selfh.st (ưu tiên #1)

**URL submit:** https://selfh.st/submit/

**Title:**
```
HostDeck — Tailscale-only operations console for rootless Podman homelabs (Go, zero inbound ports)
```

**Description (form field):**
```
HostDeck is a self-hosted operations console for small Podman homelabs (1–5 nodes). The whole control plane runs over your existing Tailscale mesh: the dashboard exposes no inbound ports at all, and remote nodes connect out via WebSocket. Everything is one static Go binary + SQLite — no Node, no npm, no CDN, no monitoring stack. ~50 MB RSS total, ~2.4% CPU, 29.7 MB SQLite after 13 h on a single node.

Highlights:
- Live demo without an account: https://hostdeck.thinkai.id.vn/app/?demo=1
- Historical multi-node monitoring: 3-tier SQLite rollups (10s × 48h, 1m × 30d, 15m × 90d)
- Container exec shells + confirmed host Bash, gated by Tailscale identity
- Loki/Vector log search with regex navigation
- Alerts with HMAC webhook delivery
- One-command installer: curl -fsSL https://github.com/bnhminh1010/hostdeck/releases/latest/download/install.sh | bash

Works over Tailscale — or Headscale if you prefer a self-hosted control plane (client-side only, no dependency on Tailscale's cloud).
```

---

## 3.2 — r/selfhosted (+ r/homelab crosspost sau 1-2 ngày)

**Title:**
```
I built HostDeck — a Tailscale-only ops console for Podman homelabs. Zero inbound ports, one Go binary + SQLite (~50 MB RSS)
```

**Body:**
```
I run a small homelab on rootless Podman and got tired of the monitoring-stack tax: Grafana + Prometheus + exporters + Node.js apps eating RAM and needing ports opened everywhere. So I wrote HostDeck — an operations console that assumes you already have Tailscale (which most of us do), and exploits it for security instead of fighting it.

How it works:
- The dashboard exposes ZERO inbound ports. No 3000, no 9090. You reach it at the Tailscale IP/name of the host.
- Remote nodes dial OUT over WebSocket only — they never listen. A node can't be scanned, port-probed, or attacked from the internet.
- All state lives in one SQLite file with 3-tier rollups: 10s samples kept 48h, 1m kept 30d, 15m kept 90d. Configurable quota (2 GiB default), UI warns at 80%.

Measured on my box (Debian 13, 9 containers, 6 services, 10 alerts):
- ~50 MB RSS total (40.9 MB dashboard + 8.6 MB agent)
- 2.4% CPU average over 13 h (event-driven, ~0 idle)
- 29.7 MB SQLite after 13 h

What you get:
- Live dashboard + historical trends across up to 5 nodes
- Container exec shell + confirmed host Bash, both gated by Tailscale identity
- Log search (Loki/Vector) with regex and result navigation
- Alerts with HMAC webhook delivery
- One command install: curl -fsSL https://github.com/bnhminh1010/hostdeck/releases/latest/download/install.sh | bash

Try the live demo without installing anything: https://hostdeck.thinkai.id.vn/app/?demo=1
Repo (Apache-2.0): https://github.com/bnhminh1010/hostdeck

v0.1.0 just shipped with a full storefront — screenshots, comparison matrix vs. the usual stacks, benchmarks, and 4 good-first-issues if you want to poke at the code. Happy to answer questions!
```

**Tip:** kèm 1 screenshot (topology hoặc overview) khi post. KHÔNG chê bai Grafana/Prometheus trực tiếp — nhấn "different tradeoff" thay vì "better".

---

## 3.3 — Show HN

**Title:**
```
Show HN: HostDeck – Tailscale-only homelab console in Go, zero inbound ports, one binary + SQLite
```

**Body:**
```
I built HostDeck for small Podman homelabs (1–5 nodes) that already run Tailscale. Instead of a monitoring stack (Grafana+Prometheus+exporters+Node.js), it's one static Go binary + SQLite.

The security trick: the dashboard listens on nothing. You open it over your Tailscale network; remote nodes dial out via WSS and never expose a port, so they can't be probed from the internet at all.

Numbers from my box (Debian 13, 9 containers, 6 services, 10 alerts, 13 h uptime):
- ~50 MB RSS total, 2.4% CPU avg, 29.7 MB SQLite
- 3-tier SQLite rollups: 10s × 48h, 1m × 30d, 15m × 90d, 2 GiB quota

Features: historical multi-node monitoring, container exec + host Bash gated by Tailscale identity, Loki/Vector log search with regex, HMAC webhook alerts, multi-workspace UI, light/dark themes.

No-account live demo: https://hostdeck.thinkai.id.vn/app/?demo=1
One-command installer: curl -fsSL https://github.com/bnhminh1010/hostdeck/releases/latest/download/install.sh | bash
Repo: https://github.com/bnhminh1010/hostdeck

v0.1.0 is out (Apache-2.0) with docs, benchmarks, and a comparison matrix. Honest caveat: single operator use-case, not a fleet platform — 5 nodes max. Feedback welcome.
```

**Reality check:** Beszel 24k★ launch trên HN chỉ được 3 điểm — HN không phải engine tăng trưởng. Post để có mặt trên radar + feedback, đừng kỳ vọng trending. Growth thật sẽ từ blog/YouTube tự phát (chi tiết trong `Docs/opensource-growth-strategy.md`).
