// Interactive step-by-step button tour for HostDeck operator workbench.

const TOUR_STORAGE_KEY = "homelab.tourCompleted";

const TOUR_STEPS = [
  {
    target: "#node-selector",
    fallback: ".node-switcher",
    workspace: "overview",
    title: "Node & Stream Switcher",
    desc: "Switch between your homelab nodes (local & remote agent instances). The green status indicator confirms real-time communication.",
    badge: "STEP 1 OF 8",
    hotkey: "Switch Nodes"
  },
  {
    target: "#freshness",
    fallback: ".header-status",
    workspace: "overview",
    title: "Real-time Telemetry Stream",
    desc: "Displays live Server-Sent Events (SSE) stream health and latency (CONNECTING, ONLINE, STALE, OFFLINE).",
    badge: "STEP 2 OF 8",
    hotkey: "Live SSE Stream"
  },
  {
    target: "#alerts-jump",
    fallback: ".header-status",
    workspace: "overview",
    title: "Central Alert Center",
    desc: "Jump straight to active incident rules, acknowledge firing issues, or silence notifications for 1h/6h/24h.",
    badge: "STEP 3 OF 8",
    hotkey: "Alerts & Alarms"
  },
  {
    target: "#workspace-sidebar",
    fallback: ".workspace-nav",
    workspace: "overview",
    title: "Workspace Navigation Rail",
    desc: "Seamlessly jump across 7 dedicated workspaces: Overview, Services, Containers, Multi-Nodes, 90-Day History, Live Logs, and Topology.",
    badge: "STEP 4 OF 8",
    hotkey: "Hotkeys: 1 – 8"
  },
  {
    target: "#system-card",
    fallback: ".overview-layout",
    workspace: "overview",
    title: "Host Health Telemetry KPIs",
    desc: "Monitor per-core CPU load, memory utilization, storage pool allocations, and thermal sensors in real-time.",
    badge: "STEP 5 OF 8",
    hotkey: "System Telemetry"
  },
  {
    target: "#workspace-containers, #containers-list, .container-item",
    fallback: ".dashboard-grid",
    workspace: "containers",
    title: "Container & Service Operations",
    desc: "Start, stop, restart containers or inspect streaming logs with 1-click execution without needing an interactive SSH session.",
    badge: "STEP 6 OF 8",
    hotkey: "1-Click Operations"
  },
  {
    target: "#terminal-panel",
    fallback: "#terminal-toggle",
    workspace: "overview",
    title: "Integrated PTY Terminal & Host Shell",
    desc: "Toggle the embedded container exec or host bash shell at any time with full PTY terminal emulation.",
    badge: "STEP 7 OF 8",
    hotkey: "Hotkey: ` (Backtick)"
  },
  {
    target: "#help-open",
    fallback: "#settings-open",
    workspace: "overview",
    title: "Shortcuts & Assistance",
    desc: "Press ? anytime to open keyboard shortcut references, adjust layout settings, export configs, or replay this tour.",
    badge: "STEP 8 OF 8",
    hotkey: "Hotkey: ?"
  }
];

let currentStep = 0;
let isTourActive = false;
let resizeHandler = null;

function getElements() {
  return {
    backdrop: document.getElementById("tour-backdrop"),
    highlight: document.getElementById("tour-highlight"),
    popover: document.getElementById("tour-popover"),
    badge: document.getElementById("tour-step-badge"),
    hotkey: document.getElementById("tour-hotkey-badge"),
    title: document.getElementById("tour-title"),
    desc: document.getElementById("tour-desc"),
    prevBtn: document.getElementById("tour-prev-btn"),
    nextBtn: document.getElementById("tour-next-btn"),
    skipBtn: document.getElementById("tour-skip-btn"),
    closeBtn: document.getElementById("tour-close-btn")
  };
}

function resolveTarget(step) {
  const selectors = (step.target + ", " + step.fallback).split(",").map((s) => s.trim());
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.offsetParent !== null) {
      return el;
    }
  }
  return document.querySelector(step.target) || document.querySelector(step.fallback) || document.body;
}

function positionPopover(targetEl, popoverEl, highlightEl) {
  if (!targetEl || !popoverEl) return;

  const rect = targetEl.getBoundingClientRect();
  const pad = 6;
  const hTop = Math.max(4, rect.top - pad);
  const hLeft = Math.max(4, rect.left - pad);
  const hWidth = Math.min(window.innerWidth - 8, rect.width + pad * 2);
  const hHeight = Math.min(window.innerHeight - 8, rect.height + pad * 2);

  if (highlightEl) {
    highlightEl.style.top = `${hTop}px`;
    highlightEl.style.left = `${hLeft}px`;
    highlightEl.style.width = `${hWidth}px`;
    highlightEl.style.height = `${hHeight}px`;
  }

  // Popover measurement
  popoverEl.style.visibility = "hidden";
  popoverEl.hidden = false;
  const pWidth = popoverEl.offsetWidth || 340;
  const pHeight = popoverEl.offsetHeight || 180;
  popoverEl.style.visibility = "visible";

  const margin = 12;
  let top = rect.bottom + margin;
  let left = rect.left + (rect.width - pWidth) / 2;

  // If bottom overflows, position above
  if (top + pHeight > window.innerHeight - margin) {
    top = Math.max(margin, rect.top - pHeight - margin);
  }

  // If top also overflows or overlaps, position on side or center
  if (top < margin) {
    top = Math.max(margin, (window.innerHeight - pHeight) / 2);
  }

  // Clamp horizontal position
  if (left < margin) {
    left = margin;
  } else if (left + pWidth > window.innerWidth - margin) {
    left = window.innerWidth - pWidth - margin;
  }

  popoverEl.style.top = `${Math.round(top)}px`;
  popoverEl.style.left = `${Math.round(left)}px`;
}

export function showStep(index) {
  if (!isTourActive) return;
  if (index < 0) index = 0;
  if (index >= TOUR_STEPS.length) {
    stopTour(true);
    return;
  }

  currentStep = index;
  const step = TOUR_STEPS[currentStep];
  const els = getElements();

  // Update text and buttons synchronously
  if (els.badge) els.badge.textContent = step.badge;
  if (els.hotkey) {
    els.hotkey.textContent = step.hotkey || "";
    els.hotkey.hidden = !step.hotkey;
  }
  if (els.title) els.title.textContent = step.title;
  if (els.desc) els.desc.textContent = step.desc;

  if (els.prevBtn) {
    els.prevBtn.disabled = currentStep === 0;
    els.prevBtn.style.opacity = currentStep === 0 ? "0.4" : "1";
  }
  if (els.nextBtn) {
    els.nextBtn.textContent = currentStep === TOUR_STEPS.length - 1 ? "Finish Tour" : "Next";
  }

  els.backdrop.hidden = false;
  els.highlight.hidden = false;
  els.popover.hidden = false;

  // If step requires a specific workspace, switch to it
  if (step.workspace) {
    const navBtn = document.querySelector(`[data-workspace="${step.workspace}"]`);
    if (navBtn && !navBtn.classList.contains("is-active")) {
      navBtn.click();
    }
  }

  const target = resolveTarget(step);
  if (target && typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }
  positionPopover(target, els.popover, els.highlight);
  els.nextBtn?.focus({ preventScroll: true });
}

export function nextStep() {
  showStep(currentStep + 1);
}

export function prevStep() {
  showStep(currentStep - 1);
}

let keydownHandler = null;

export function startTour(fromBeginning = true) {
  const els = getElements();
  if (!els.popover || !els.backdrop) return;

  // Close any open modals first
  const helpDialog = document.getElementById("help-dialog");
  if (helpDialog?.open) helpDialog.close();

  isTourActive = true;
  currentStep = fromBeginning ? 0 : currentStep;

  resizeHandler = () => {
    if (!isTourActive) return;
    const step = TOUR_STEPS[currentStep];
    const target = resolveTarget(step);
    positionPopover(target, els.popover, els.highlight);
  };
  window.addEventListener("resize", resizeHandler, { passive: true });
  window.addEventListener("scroll", resizeHandler, { passive: true });

  keydownHandler = (e) => {
    if (!isTourActive) return;
    if (e.key === "Escape") {
      e.preventDefault();
      stopTour(false);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextStep();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevStep();
    }
  };
  document.addEventListener("keydown", keydownHandler);

  showStep(currentStep);
}

export function stopTour(completed = false) {
  isTourActive = false;
  const els = getElements();

  if (els.backdrop) els.backdrop.hidden = true;
  if (els.highlight) els.highlight.hidden = true;
  if (els.popover) els.popover.hidden = true;

  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    window.removeEventListener("scroll", resizeHandler);
    resizeHandler = null;
  }

  if (keydownHandler) {
    document.removeEventListener("keydown", keydownHandler);
    keydownHandler = null;
  }

  if (completed) {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      // Ignore localStorage restrictions
    }
  }

  // Restore focus to help button
  const helpOpen = document.getElementById("help-open");
  helpOpen?.focus({ preventScroll: true });
}

export function initTour() {
  const els = getElements();
  if (!els.popover) return;

  els.nextBtn?.addEventListener("click", nextStep);
  els.prevBtn?.addEventListener("click", prevStep);
  els.skipBtn?.addEventListener("click", () => stopTour(true));
  els.closeBtn?.addEventListener("click", () => stopTour(false));
  els.backdrop?.addEventListener("click", () => stopTour(false));

  const tourTrigger = document.getElementById("tour-start-btn");
  tourTrigger?.addEventListener("click", () => startTour(true));
}
