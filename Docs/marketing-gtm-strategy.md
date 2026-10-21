# Go-To-Market (GTM) Strategy & Migration Friction

> **Goal:** Address the switching cost for established homelabbers. Why would a user abandon a reputable, established tool (like Homepage, Portainer, or Grafana) to migrate to HomeLab Dashboard?

## 1. The Core Problem: Dashboard Fatigue

Research from `r/homelab` and `r/selfhosted` indicates three major friction points with existing ecosystems:

- **YAML Fatigue (Start Pages):** Managing complex YAML configurations for dashboards like Homepage or Dashy is tedious and error-prone. One wrong indentation can break the entire dashboard.
- **Overkill Fatigue (Monitoring):** The Prometheus + Grafana stack is the industry gold standard, but it is massive. Managing AlertManager, PromQL, scrape configs, and multiple exporters for a 1-5 node homelab is unnecessary overhead that burns out operators.
- **Security Anxiety (Admin):** Users are increasingly nervous about opening inbound ports (like Portainer's 9001 or Docker APIs) across VLANs or to the internet. Securing these requires complex reverse proxies or VPN routing.

## 2. The Migration Barrier

Users are reluctant to switch because of the **"Sunk Cost Fallacy"**. They have already spent weekends building their current Grafana dashboards or tuning their YAML files. Furthermore, they fear losing historical data and undertaking a complex migration process. 

If we market HomeLab Dashboard as "just another dashboard," we will fail to overcome this barrier. The switching cost is too high for incremental improvements.

## 3. The "Wedge" Strategy

To break the barrier, we must position the dashboard not as a competitor, but as the **"Anti-Dashboard"** or an **"Operations Console for the paranoid and minimalist"**. We will attack the market using three distinct wedges that existing tools fundamentally cannot match due to their architecture:

### Wedge 1: Security (Zero Inbound Ports)
- **Message:** "The only console that dials out to Tailscale. Zero ports to open."
- **Why it works:** Attacks security anxiety directly. Existing tools require inbound listeners (opening ports); we use an outbound WSS tunnel. This is a fundamental architectural advantage.

### Wedge 2: Resource Efficiency (The Stack Diet)
- **Message:** "Replace a monitoring stack with 1 Go binary + SQLite (≈50 MB RSS total)."
- **Why it works:** Homelabbers love optimization and hate bloat. Combining metrics, logs, terminal, and alerts into a single SQLite file is highly attractive to minimalists.
- **Số liệu thật (nguồn `docs/benchmarks.md`, 2026-08-06):** dashboard 40.9 MB RSS + host agent 8.6 MB ≈ 50 MB steady-state; 2.4% CPU trung bình 13h; SQLite 29.7 MB sau 13h, quota 2 GiB mặc định. Không dùng con số "30MB" hay "6 containers 2GB" — không có nguồn trong docs thật (anti-slop).

### Wedge 3: Workflow (Close the Loop)
- **Message:** "See the alert → click the log → open the shell. All in one tab."
- **Why it works:** Fixes the fragmented "Observe vs. Act" gap. Currently, users observe issues in Grafana, then switch to Portainer to act. We close this loop, providing an enterprise-like operational experience.

## 4. Actionable Steps to Lower Friction

To get users to actually try the product, we must make the onboarding risk-free:

1. **The "Run Alongside" Message:** Explicitly state that installation takes one command and runs perfectly *alongside* their existing Grafana or Homepage setup. Do not ask for an immediate hard cutover. Once they experience the workflow, they will naturally decommission the old stack.
2. **Bait Features:** Use features that are hard to get in other stacks (e.g., First-party Backup Freshness and SLO Error Budgets) as the primary hook.
3. **Frictionless Demo:** Push the `?demo=1` PWA heavily. Allowing users to feel the speed and workflow without running a single `docker run` command drastically lowers the top-of-funnel friction.
