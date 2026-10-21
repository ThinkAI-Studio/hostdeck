# In-App Tutorial (Help Drawer) Implementation Plan

> **For Hermes:** Implement this plan task-by-task. This is a dashboard UI feature; keep zero-CDN, vanilla JS, token-based styling.

**Goal:** Give every dashboard user an in-app help dialog that explains each workspace, how data gets in (containers automatic vs services manual), and how to use the terminal (Host Shell / Container Shell / Log Viewer) — so a first-time user never gets stuck.

**Architecture:** A `?` icon-button in the header opens a `<dialog>` help panel. The panel is context-aware: it shows the guide for the currently active workspace, with a workspace list to jump between guides. Content is static HTML in `index.html` (no data fetching), driven by a small `help.js` module. Empty states in the overview get one-line "how to populate" hints per taste-skill §4.5.

**Tech Stack:** Vanilla JS (ES modules, same as existing `app.js`/`terminal.js`), native `<dialog>`, existing CSS tokens (`--bg-overlay`, `--border-strong`, `--text-*`). No new dependencies. No CDN.

**Anti-slop constraints (loaded from taste-skill + hallmark):**
- No forced tour / no auto-open onboarding on first visit (interruptive = AI tell). Help is on-demand only.
- No em-dashes in any visible string (hallmark gate 9.G — zero tolerance). Use hyphens/colons.
- No decorative-without-purpose elements (gate 45): every element in the dialog has a function.
- Honest copy (gate 46): every claim about data flow matches the real code (Podman socket, SnapshotEnvelope, Loki + Vector overlay optional, SQLite internal storage).
- Empty states must indicate how to populate (§4.5) — one short hint line each, not a wall of text.
- No fake chrome, no fake terminal windows inside the dialog (gate 47).
- Contrast: all help text passes WCAG AA on `--bg-overlay` (use `--text-primary`/`--text-secondary` tokens only).
- Typography: font tokens only (`--font-sans`/`--font-mono`), sizes 12.5px+ (post font-bump baseline).

---

## Task 1: Add help button + dialog skeleton to index.html

**Objective:** Header gets a `?` button; a `<dialog id="help-dialog">` with one guide section per workspace is added near the other dialogs.

**Files:**
- Modify: `static/index.html` (header block ~line 62; dialog block near `settings-dialog` ~line 734)

**Step 1: Add the header button** right after `#theme-toggle` (before `#session-identity`):

```html
<button id="help-open" class="icon-button" type="button" title="How to use HostDeck" aria-label="How to use HostDeck" aria-haspopup="dialog" aria-controls="help-dialog">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.4c-.6.25-1.4.6-1.4 1.6v.5"/><path d="M12 17h.01"/></svg>
</button>
```

**Step 2: Add the dialog** after `settings-dialog` (before `</body>` area where other dialogs end). Structure — one `<section class="help-guide" data-help-workspace="...">` per workspace, plus a `data-help-workspace="data"` section for the data-flow explanation:

```html
<dialog id="help-dialog" class="modal help-dialog" aria-labelledby="help-title">
  <div class="modal-form help-layout">
    <header class="help-header">
      <div><h2 id="help-title">How to use HostDeck</h2><p class="help-sub">What you're looking at and what it needs from you.</p></div>
      <button class="icon-button" type="button" data-help-close aria-label="Close help">×</button>
    </header>
    <nav class="help-nav" aria-label="Help topics">
      <button type="button" class="help-nav-item" data-help-target="overview">Overview</button>
      <button type="button" class="help-nav-item" data-help-target="services">Services</button>
      <button type="button" class="help-nav-item" data-help-target="containers">Containers</button>
      <button type="button" class="help-nav-item" data-help-target="nodes">Nodes</button>
      <button type="button" class="help-nav-item" data-help-target="history">History</button>
      <button type="button" class="help-nav-item" data-help-target="logs">Logs</button>
      <button type="button" class="help-nav-item" data-help-target="alerts">Alerts</button>
      <button type="button" class="help-nav-item" data-help-target="topology">Topology</button>
      <button type="button" class="help-nav-item" data-help-target="data">How data gets in</button>
    </nav>
    <div class="help-body">
      <!-- 9 sections, one per data-help-target; exact copy in Task 4 -->
      <section class="help-guide" data-help-workspace="overview" hidden>…</section>
      <section class="help-guide" data-help-workspace="data" hidden>…</section>
    </div>
  </div>
</dialog>
```

**Step 3: Verify**
- `grep -c 'data-help-workspace' static/index.html` returns 9.
- Open `http://127.0.0.1:8200/?demo=1`, `document.querySelector('#help-dialog')` exists, dialog closed by default.

**Step 4: Commit**
```bash
git add static/index.html
git commit -m "feat(ui): add help dialog skeleton with workspace guide sections"
```

---

## Task 2: Help dialog CSS

**Objective:** The dialog renders as a two-column layout on desktop (nav left, guide right), single column on mobile, using existing tokens. No new color values.

**Files:**
- Modify: `static/css/style.css` (append a `/* Help dialog */` block near the modal rules ~line 478)

**Step 1: Layout rules**

```css
/* Help dialog */
.help-dialog { width: min(880px, calc(100vw - 24px)); }
.help-layout { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 0; }
.help-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 13px; border-bottom: 1px solid var(--border); grid-column: 1 / -1; }
.help-header h2 { margin: 0; font-size: 17px; }
.help-sub { margin: 3px 0 0; color: var(--text-dim); font-size: 12.5px; }
.help-nav { display: flex; flex-direction: column; gap: 2px; padding: 13px 0 0; border-right: 1px solid var(--border-subtle); }
.help-nav-item { padding: 6px 10px; border: 0; border-radius: var(--radius-sm); color: var(--text-secondary); background: transparent; cursor: pointer; text-align: left; font: 12.5px/1.3 var(--font-sans); }
.help-nav-item:hover { color: var(--text-primary); background: var(--bg-card-hover); }
.help-nav-item.is-active { color: var(--accent-hover); background: var(--accent-soft); }
.help-body { padding: 13px 0 0 16px; min-width: 0; }
.help-guide { max-width: 62ch; }
.help-guide h3 { margin: 0 0 8px; font-size: 14.5px; }
.help-guide p { margin: 0 0 8px; color: var(--text-secondary); font-size: 12.5px; line-height: 1.5; }
.help-guide .help-list { margin: 0 0 8px; padding-left: 18px; color: var(--text-secondary); font-size: 12.5px; line-height: 1.5; }
.help-guide code { font-family: var(--font-mono); font-size: 12px; color: var(--text-primary); background: var(--bg-recess); border-radius: 3px; padding: 1px 4px; }
.help-guide .help-note { margin-top: 10px; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-dim); font-size: 12.5px; line-height: 1.5; }
@media (max-width: 899px) {
  .help-layout { grid-template-columns: minmax(0, 1fr); }
  .help-nav { flex-direction: row; flex-wrap: wrap; gap: 4px; padding: 11px 0; border-right: 0; border-bottom: 1px solid var(--border-subtle); }
  .help-body { padding: 12px 0 0; }
}
```

**Step 2: Verify**
- Dark and light: no inline hex, every rule uses a token. `grep -c '#[0-9a-f]'` on the new block returns 0.
- 320px: dialog `width: calc(100vw - 24px)`, nav wraps, no horizontal scroll.

**Step 3: Commit**
```bash
git add static/css/style.css
git commit -m "feat(ui): style help dialog with token-based two-column layout"
```

---

## Task 3: help.js controller

**Objective:** A new module wires open/close, workspace context sync, focus management, Escape/backdrop close.

**Files:**
- Create: `static/js/help.js`

**Step 1: Write the module**

```js
// Help dialog controller. Context-aware: opens on the currently active workspace.
const dialog = document.getElementById("help-dialog");
const openButton = document.getElementById("help-open");
const guides = [...document.querySelectorAll("[data-help-workspace]")];
const navItems = [...document.querySelectorAll("[data-help-target]")];
const closeButtons = [...document.querySelectorAll("[data-help-close]")];
const focusableFallback = dialog?.querySelector(".help-nav-item");

function activeWorkspace() {
  const current = document.querySelector("[data-workspace].is-active");
  if (!current) return "overview";
  return current.dataset.workspace;
}

function showGuide(target) {
  const valid = guides.some((section) => section.dataset.helpWorkspace === target);
  const resolved = valid ? target : "overview";
  for (const section of guides) section.hidden = section.dataset.helpWorkspace !== resolved;
  for (const item of navItems) item.classList.toggle("is-active", item.dataset.helpTarget === resolved);
  return resolved;
}

export function openHelp({ focus = false } = {}) {
  if (!dialog || dialog.open) return;
  showGuide(activeWorkspace());
  dialog.showModal();
  if (focus) (dialog.querySelector(".help-nav-item.is-active") || focusableFallback)?.focus({ preventScroll: true });
}

export function closeHelp() {
  if (dialog?.open) dialog.close();
}

export function initHelp() {
  if (!dialog || !openButton) return;
  openButton.addEventListener("click", () => openHelp({ focus: true }));
  for (const button of closeButtons) button.addEventListener("click", closeHelp);
  for (const item of navItems) {
    item.addEventListener("click", () => showGuide(item.dataset.helpTarget));
  }
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeHelp(); });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeHelp(); // backdrop click
  });
  // Keep active-workspace sync when the dialog is reopened after workspace changes.
  openButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") openHelp({ focus: true });
  });
}

if (typeof window !== "undefined") window.__help = { openHelp, closeHelp };
```

**Step 2: Wire into app.js** — in `static/js/app.js`, import and init (near the other controller inits, ~line 96):

```js
import { initHelp } from "./help.js";
// ...after terminal controller init:
initHelp();
```

**Step 3: Verify (DOM-level, no screenshots)**
```js
// in browser console at http://127.0.0.1:8200/?demo=1
document.querySelector('#help-open').click();
document.querySelector('#help-dialog').open            // true
[...document.querySelectorAll('[data-help-workspace]')].filter(s => !s.hidden).length  // 1
document.querySelector('.help-nav-item.is-active').dataset.helpTarget  // 'overview'
document.querySelector('[data-workspace="services"]').click();
document.querySelector('#help-open').click();
document.querySelector('.help-nav-item.is-active').dataset.helpTarget  // 'services'
```

**Step 4: Commit**
```bash
git add static/js/help.js static/js/app.js
git commit -m "feat(ui): add context-aware help dialog controller"
```

---

## Task 4: Guide copy for all 9 sections

**Objective:** Write the actual guide content. Every claim must match the real code (see Evidence below). English copy (the UI is English). Zero em-dashes.

**Files:**
- Modify: `static/index.html` (the 9 `<section class="help-guide">` blocks)

**Evidence from code (verified 2026-08-07):**
- Containers: node-agent talks to Podman via Unix socket REST (`GET /containers/json`), wraps data in `SnapshotEnvelope`, streams over WebSocket. Automatic, no user action.
- Services: manual registration via `+ ADD SERVICE` dialog (fields: NAME, CATEGORY, TAGS, DISPLAY URL OR PORT, PROBE TYPE `none|http|tcp|dns`, PROBE ENDPOINT). Stored in SQLite; probe transitions in `history_service_transitions`.
- Nodes: `#nodes-open` header button (admin only), node switcher in header.
- History: charts from SQLite rollups (`history_host_rollup_1m/15m`, `history_container_rollup_5m/1h`).
- Logs workspace: optional central logs via Loki (`LOGS_BACKEND=loki`, `LOKI_URL`); Vector is the external shipper. Not configured shows "Central logs are optional. Enable the Loki + Vector overlay...".
- Terminal Log Viewer: direct Podman `GET /containers/{id}/logs`, real-time, no setup.
- Alerts: alert center dialog, `alert_rules`/`alert_states` tables, maintenance windows.
- Topology: `topology_dependencies` table.
- SQLite: internal storage (18 migrations, auto-run at startup, one file, pure-Go `modernc.org/sqlite`). Users never touch it directly.

**Suggested copy per section (each 3-6 short lines, use `.help-list` for steps):**

- **Overview:** "The first screen. Health status, resource trends, recent changes, service pulse, launchpad shortcuts, top containers, and storage pools. Everything here is read-only; use the workspace tabs on the left to act."
- **Services:** "Services are endpoints you register so HostDeck can watch their health. Click + ADD SERVICE in the panel header. Choose a probe type: HTTP, TCP, or DNS, and give a display URL or port. Services are not containers; containers appear automatically."
- **Containers:** "Containers are discovered automatically from the host's Podman daemon. No registration needed. From the actions on a container row you can open its Logs or a Container Shell."
- **Nodes:** "If the host agent is enrolled on more than one machine, switch the monitoring node from the selector in the header. The admin manages nodes from the header icon."
- **History:** "Long-term metrics for the selected node: host CPU, RAM, disk, and container stats. Data is stored locally in the dashboard's SQLite database and rolled up over time."
- **Logs:** "The Logs workspace searches retained central logs. It is optional: it needs a Loki backend (LOGS_BACKEND=loki with LOKI_URL) fed by a log shipper such as Vector. Without it, the workspace stays disabled. For live per-container logs without any setup, use the terminal's Log Viewer instead."
- **Alerts:** "Alert rules watch service probes and metrics, then notify when a condition fires. Open the alert center from the bell icon in the header. Maintenance windows pause rules during planned work."
- **Topology:** "Shows how your services depend on each other and on containers, based on recorded dependency data."
- **How data gets in (data):** "Containers and their live logs are pulled automatically from the Podman socket by the node agent. Services are the only thing you register by hand, through + ADD SERVICE. Historical metrics and alert state are kept in the dashboard's own SQLite file; you never query or edit it. Central log search is an optional Loki + Vector overlay."

**Step 1: Verify copy rules**
- `grep -c '—' static/index.html` on the new blocks returns 0 (em-dash ban).
- Every workspace name in the copy matches the actual nav labels (Overview, Services, Containers, Nodes, History, Logs, Alerts, Topology).
- No invented metrics or features (honest-copy gate).

**Step 2: Commit**
```bash
git add static/index.html
git commit -m "feat(ui): write help guide copy for all workspaces and data flow"
```

---

## Task 5: Empty-state hints (how to populate)

**Objective:** The three main empty states tell the user what to do, per taste-skill §4.5.

**Files:**
- Modify: `static/index.html` lines ~275 (service pulse), ~293 (containers), ~162 (attention)

**Step 1: Edit copy** (wrap hint in a span so CSS can style it smaller):

- Service pulse empty (`#overview-service-pulse-empty`):
  `No services have a configured health probe. <span class="empty-hint">Use + ADD SERVICE in the panel header to register an endpoint.</span>`
- Containers empty (`#overview-top-containers-empty`):
  `No containers reported. <span class="empty-hint">The node agent on the host reports them automatically; check that it is running.</span>`
- Overview attention empty (`#overview-attention-empty`): keep the dot + add:
  `<span class="empty-hint">No issues right now. Read the guides via ? in the header.</span>`

**Step 2: CSS** (append to the help block in style.css):

```css
.empty-hint { display: block; margin-top: 3px; color: var(--text-dim); font-size: 11.5px; line-height: 1.4; }
```

**Step 3: Verify**
- Demo mode: open Services workspace in demo with no services (if demo seeds services, verify hint still renders in the empty state markup even when hidden).
- Contrast: `--text-dim` on card background passes AA (already measured: dark 5.3:1, light 5.1:1 after contrast fix).

**Step 4: Commit**
```bash
git add static/index.html static/css/style.css
git commit -m "feat(ui): add how-to-populate hints to main empty states"
```

---

## Task 6: Browser test for help dialog

**Objective:** Extend the existing Playwright-based browser test to cover the help dialog (open, context sync, close).

**Files:**
- Modify: `tests/browser/dashboard_test.go` (follow existing patterns; the file already has theme/brand checks)

**Step 1: Add test case** (match existing style — check how the file asserts DOM):

- Navigate to `/?demo=1`.
- `#help-open` is visible; click it; `#help-dialog` has `open` attribute.
- Exactly one `[data-help-workspace]` section is visible; its id matches the active workspace.
- Click a nav item (`[data-help-target="services"]`); the corresponding section becomes visible, others hidden.
- Press Escape or click `[data-help-close]`; dialog closes.
- No `brand-mark` class regression (existing assertion must still pass).

**Step 2: Run the full browser suite**

```bash
go test -tags=browser ./tests/browser -count=1 -timeout=180s
```

Expected: `ok` (same as current 66.923s baseline).

**Step 3: Commit**
```bash
git add tests/browser/dashboard_test.go
git commit -m "test(browser): cover help dialog open, context sync, and close"
```

---

## Task 7: Responsive + theme verification

**Objective:** Prove the dialog renders at 320px without horizontal scroll, in both themes, using the existing Playwright setup (not screenshots-as-proof).

**Files:**
- None (verification only). Reuse `/tmp/shotwork/verify.py` pattern or a one-off script.

**Step 1: DOM-level checks at 320x800 and 1440x900, dark and light**
- Open help dialog; assert `document.documentElement.scrollWidth <= window.innerWidth` (no page h-scroll).
- Assert `.help-layout` computed `grid-template-columns` differs between widths (2 cols desktop, 1 col mobile).
- Assert `code` elements inside guides use `--font-mono` family (computed style) and `font-size >= 12px`.
- Assert text colors resolve to tokens (computed color of `.help-guide p` equals `--text-secondary`).

**Step 2: Capture one screenshot pair for the user** (dark + light, help dialog open, Services guide) into `/tmp/shotwork/help-{dark,light}.png`.

**Step 3: Commit (none — verification only).** Report results.

---

## Task 8: Re-capture screenshots + demo.gif (required after any UI change)

**Objective:** Update the 11 files in `site/screenshots/` because the UI changed (help button now visible in header, empty-state hints).

**Files:**
- Modify: `site/screenshots/*` (11 files: alerts, containers, demo.gif, history, logs-regex, nodes, overview-light, overview, services, terminal, topology)
- Use existing scripts: `record-demo-gif.js` (mask IP) + `capture-dashboard-shots.js` from the open-source-product-strategy skill.

**Step 1: Run capture scripts** against `http://127.0.0.1:8200/?demo=1` (demo data already masks identity: `admin@tailnet`, `homelab-01`, etc.).

**Step 2: Verify each file exists, non-empty, and the help button is visible in header shots** (overview, services).

**Step 3: Commit**
```bash
git add site/screenshots/
git commit -m "chore(site): re-capture screenshots and demo after help dialog UI"
```

---

## Task 9: Commit full feature + push (deploy)

**Objective:** Land the feature; the Pages deploy workflow runs automatically on push touching `site/**` and `static/**`.

**Step 1: Final gate check**
- `go test ./... -tags=browser` passes (browser suite).
- `go vet ./...` passes.
- Zero em-dashes in new UI copy.
- Help dialog opens/closes in demo, both themes, 320px.

**Step 2: Push**
```bash
git push origin main
```

**Step 3: Verify deploy** — after workflow completes, check `https://bnhminh1010.github.io/hostdeck/` serves the updated `static/js/help.js` (HTTP 200 on the asset).

---

## Out of scope (YAGNI)
- No guided tour / spotlight overlay on first visit (anti-slop: interruptive onboarding is a tell; help stays on-demand).
- No search inside help, no per-field tooltips, no i18n.
- No help content fetched from the server; it is static HTML (works offline, zero API surface).
- No change to the Loki/Vector feature itself; the Logs guide only explains what exists.

## Acceptance criteria
1. Header shows a `?` button; clicking opens the help dialog.
2. The dialog opens on the currently active workspace's guide (context-aware), with 9 navigable topics.
3. Every claim in the copy matches real code behavior (verified evidence list in Task 4).
4. Empty states for service pulse, containers, and attention hint at the next action.
5. Browser test suite passes including the new help case.
6. No em-dashes; all colors token-based; WCAG AA in both themes; no h-scroll at 320px.
7. Screenshots + demo.gif re-captured and committed.
8. Deploy verified on GitHub Pages.
