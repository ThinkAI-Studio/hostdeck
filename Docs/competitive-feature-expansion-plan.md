# Competitive Feature Expansion Plan

> **Goal Description**
> Following a deep research cycle into the 2026 homelab dashboard landscape (comparing with Dockge, Portainer, Homepage, Homarr, Uptime Kuma, and Beszel), I have identified 5 key areas where our dashboard is functionally lagging.
> 
> While we must maintain our "Simplicity First" and "Zero External Dependency" philosophy (as defined in `AGENTS.md`), these features provide immense value for homelab operators and can be implemented surgically without bloating the codebase.

---

## Proposed Features to Close the Gap

### 1. Wake-on-LAN (WoL) for Nodes
*   **The Gap**: Homelabbers often sleep power-hungry NAS/Compute nodes to save electricity. Homepage and Homarr both provide 1-click WoL widgets.
*   **The Solution**: Add a WoL capability to the Node manager. If a Node is marked `DOWN`, a "Wake" button appears. Clicking it sends a standard UDP Magic Packet to the node's MAC address directly from the dashboard's Go backend.
*   **Code Impact**: ~40 LOC in a new `internal/nodes/wol.go` file using standard `net.DialUDP`.

### 2. Container Image Update Indicator (Watchtower-lite)
*   **The Gap**: Portainer and Dockge excel at telling users when a container is outdated. Our dashboard only shows if it's running.
*   **The Solution**: We already query the Podman API. We can periodically check the container's image hash against the upstream registry (Docker Hub/GHCR) using standard HTTP requests. If a mismatch is found, display an "Update Available" badge next to the container in the UI. 
*   **Code Impact**: Add a background registry check in `internal/containers/updater.go` and a small UI badge in `containers.js`.

### 3. Generic JSON Custom Widgets
*   **The Gap**: The #1 reason users choose Homepage or Homarr is their rich ecosystem of App Integrations (e.g., seeing Pi-hole blocked queries, Proxmox VM counts, or torrent speeds directly on the dashboard).
*   **The Solution**: Instead of violating our "Simplicity" rule by maintaining 50+ app-specific API wrappers, we implement a **Generic JSON Widget**. The user configures a URL and a `JSONPath` expression. The dashboard fetches it and displays the value. Infinite extensibility, zero maintenance burden.
*   **Code Impact**: Extend `DashboardConfig` to allow custom widget definitions. Add a widget renderer in `overview.js`.

### 4. TLS Certificate Expiry Alerts
*   **The Gap**: Uptime Kuma alerts users *before* a certificate expires. We currently track the `NotAfter` date in our TLS probes, but we don't trigger alerts on it.
*   **The Solution**: Add a built-in alert rule: if an HTTPS service is `UP` but its `NotAfter` date is within 7 days, trigger a `WARNING` state in the Alert Center.
*   **Code Impact**: ~15 LOC in `internal/alerts/evaluator.go`.

### 5. Public Status Page (Unauthenticated)
*   **The Gap**: Homelabbers often want to share their uptime SLA with family/friends (like Uptime Kuma's status pages) without giving them access to the Ops Console (Terminal/Logs).
*   **The Solution**: Create a dedicated `/status` HTTP route that renders a read-only, sanitized HTML page showing only the Services list and their 90-day Uptime SLA.
*   **Code Impact**: A new `status.html` template and a single unauthenticated API endpoint in `internal/httpapi/status.go`.

---

## User Review Required

> **[IMPORTANT]**
> Please review the 5 features above. Do you want to implement **all** of them, or should we prioritize a specific one first?
> 
> My recommendation is to start with **Feature #4 (TLS Alerts)** and **Feature #1 (Wake-on-LAN)** as they offer the highest operational value for the lowest effort.

---

## Verification Plan

1. **WoL**: Verify packet transmission via `tcpdump`.
2. **Container Updates**: Mock a registry response to trigger the "Update Available" badge.
3. **JSON Widgets**: Configure a test widget to read a local mock JSON endpoint.
4. **TLS Alerts**: Probe an expiring badssl.com certificate and verify alert triggers.
5. **Status Page**: Access `/status` via Incognito mode and verify sensitive data is blocked.
