# Operations & Usage Guide

> This is the **only** directory under `Docs/` that is version-controlled.
> Every other folder (`systems/`, `product/`, `marketing/`, `design/`,
> `optimization/`) holds internal notes and is excluded by `.gitignore`.

## 1. Official documentation

| Topic | Document |
| --- | --- |
| Install, configure, upgrade, uninstall | [`docs/operations.md`](../../docs/operations.md) |
| Architecture and design decisions | [`docs/adr.md`](../../docs/adr.md) |
| Migrating from the previous dashboard | [`docs/migration.md`](../../docs/migration.md) |
| Comparison with other tools | [`docs/comparison.md`](../../docs/comparison.md) |
| RSS/CPU measurements and benchmarks | [`docs/benchmarks.md`](../../docs/benchmarks.md) |
| Quick start and environment variables | [`README.md`](../../README.md), [`.env.example`](../../.env.example) |
| Remote node installation | [`deploy/node-agent/README.md`](../../deploy/node-agent/README.md) |
| Host agent installation (host Bash) | [`deploy/host-agent/install.sh`](../../deploy/host-agent/install.sh) |
| Security policy | [`SECURITY.md`](../../SECURITY.md) |

## 2. Common runbooks

| Symptom | What to check |
| --- | --- |
| Dashboard does not start | `podman compose ps`, `podman compose logs -f dashboard`, healthcheck at `/health/live` |
| Host Shell returns `host_agent_unavailable` | Check `HOST_SHELL_ENABLED`, `HOST_SHELL_USERS` + `ADMIN_USERS`, `systemctl --user status homelab-host-agent`, and the socket under `$XDG_RUNTIME_DIR/homelab-dashboard/` |
| Remote node is offline | `systemctl --user status homelab-node-agent`, `journalctl --user -u homelab-node-agent -f`, verify Tailscale, DNS and clock |
| History shows `RAW PAUSED` | Increase `HISTORY_QUOTA_BYTES` or wait for retention to age out old data |
| Alerts are not delivered | Verify `NTFY_*` and `WEBHOOK_*`, the notification settings for Telegram/Discord, and the related audit events |

Per-item detail lives in the *Common failure modes* section of
[`docs/operations.md`](../../docs/operations.md).

## 3. Where to put a new document

- Installation guides, runbooks, incident notes, UI usage guides → **this folder**.
- Architecture notes, technical comparisons, research, plans, marketing →
  the matching folder under `Docs/` (not committed).

Naming: `<topic>.md` for living documents, `YYYY-MM-DD-<topic>.md` for one-off
records and decisions.
