# Báo cáo: Tính độc nhất của HomeLab Dashboard trên thị trường (2026)

> Cập nhật: 2026-08-03
> So sánh 14 tính năng cốt lõi với 16 sản phẩm cạnh tranh.

## Kết quả: 7 UNIQUE · 5 RARE · 0 COMMON

### 🟢 UNIQUE — Không sản phẩm nào có

| # | Tính năng | Đối thủ gần nhất |
|---|---|---|
| 1 | Combined Observe + Act (metrics + logs + shell + probes = 6-in-1) | Portainer + Cockpit (cần ghép 2 tool) |
| 2 | Outbound-only agents qua Tailscale WSS (zero inbound port) | Beszel (outbound WS, không Tailscale native) |
| 3 | Tailscale identity = sole auth plane (không fallback) | Dashy (trust headers nhưng có fallback auth) |
| 4 | 3-tier SQLite rollup (10s→1m→15m, 90d, configurable quota) | Beszel (SQLite, basic aggregation, ~30d) |
| 5 | SLO error budgets tích hợp sẵn | Grafana (cần Prometheus + plugin Sloth) |
| 6 | Demo mode mô phỏng edge-cases (restart loop, stale, partial) | Dashy/Homarr (static happy-path demo) |
| 7 | PARTIAL snapshot degradation (transport budget + explicit chip) | Không ai |

### 🟡 RARE — 1–2 đối thủ có tính năng tương tự

| # | Tính năng | Đối thủ tương tự |
|---|---|---|
| 8 | Backup freshness monitoring | Uptime Kuma (heartbeat mechanism khác) |
| 9 | Operations timeline with change markers | Grafana (annotations) |
| 10 | Manual service topology map | Grafana (Node Graph plugin) |
| 11 | Host Bash shell via Unix-socket agent | Cockpit (cockpit-bridge, nhưng là full sysadmin tool) |
| 12 | Static Go binaries, zero external deps | Beszel (single Go binary) |
| 13 | Alert lifecycle + ack/silence + ntfy | Grafana Alertmanager (mạnh hơn nhưng cần stack) |

### Bổ sung: Config export/import with If-Match revision guard — 🟢 UNIQUE

## Kết luận

Không sản phẩm nào trên thị trường kết hợp được toàn bộ bộ tính năng này.
Để đạt tương đương, người dùng cần ghép ≥5 tool:
Beszel + Dozzle + Portainer + Uptime Kuma + Grafana.

Thế mạnh cạnh tranh lớn nhất: **integration depth** — tất cả trong 1 giao diện,
zero dependencies, zero inbound ports.

Xem chi tiết tại artifact report hoặc liên hệ maintainer.
