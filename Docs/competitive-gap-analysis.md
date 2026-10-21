# Phân tích Gap: HomeLab Dashboard vs. Thị trường Homelab (2026)

> Cập nhật: 2026-08-02
> So sánh với 14 sản phẩm: Homepage, Homarr, Dashy, Portainer, Cockpit, Beszel,
> Uptime Kuma, Netdata, Grafana+Prometheus, Dozzle, Yacht, CasaOS, Glances, Organizr.

## Vị thế sản phẩm

HomeLab Dashboard là **Operator Workbench** cho homelab cá nhân (1–5 node). Không phải
bookmark grid, không phải monitoring stack, không phải container manager.

Vòng lặp cốt lõi: **Thấy vấn đề → Hiểu → Hành động an toàn.**

## Điểm mạnh độc nhất (giữ nguyên)

- Observe → Understand → Act trong cùng 1 tool
- No inbound agent port (Tailscale WSS outbound)
- Zero external dependencies (3 static Go binaries)
- Backup freshness + SLO error budgets built-in
- Config export/import with revision guard
- Demo mode chạy thử ngay

## Gap chính

### P0 — Cản trở trải nghiệm vận hành cốt lõi

1. **Keyboard shortcuts**: Thiếu hoàn toàn
2. **Quick filter (Services & Containers)**: Không lọc nhanh được
3. **Log level highlighting**: Log thô không tô màu ERROR/WARN
4. **Container restart/stop**: Chỉ có shell/logs, thiếu lifecycle action cơ bản

### P1 — Ảnh hưởng khả năng cạnh tranh

5. **Multi-provider notification**: Chỉ ntfy, cần thêm Webhook/Telegram/Discord/Slack/Email/Gotify/Pushover
6. **Ping / TCP probe types**: Chỉ HTTP, thiếu DNS/MQTT/game server/database
7. **Regex log search**: Chỉ substring match
8. **PWA manifest**: Không install được trên mobile

### P2 — Backlog tùy chọn

9. Command palette (Ctrl+K)
10. Dark/Light theme toggle
11. Per-container resource history
12. Log search match counter & navigation
13. Interactive topology hover

### P3 — Ngoài scope

14. Public status page
15. OIDC/LDAP auth
16. Docker Compose/Stack management
17. AI anomaly detection
18. Drag-and-drop layout
19. Service auto-discovery

## Quyết định đã xác nhận

- Container restart/stop: hỗ trợ **cả local và remote node** (qua WSS protocol)
- Notification: kế hoạch tích hợp **nhiều provider** (không chỉ webhook)

## Tham chiếu chi tiết

Xem [`Docs/ui-ux-improvement-plan.md`](./ui-ux-improvement-plan.md) cho kế hoạch triển khai
kỹ thuật chi tiết bao gồm code snippets, sơ đồ phụ thuộc, và verification checklist.
