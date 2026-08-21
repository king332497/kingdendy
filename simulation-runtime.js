(() => {
  "use strict";

  if (location.protocol === "file:") return;

  const ROUTES = Object.freeze({
    HOME: "/index.html",
    LOGIN: "/login.html",
    IDENTITAS: "/identitas.html",
    VERIFIKASI: "/verifikasi.html",
    PROFIL: "/profil-pengajuan.html?admin_stage=5#tahap-5",
    DETAIL_PINJAMAN: "/profil-pengajuan.html?admin_stage=6#tahap-6",
    RINGKASAN: "/profil-pengajuan.html?admin_stage=7#tahap-7",
    TAHAP_8: "/tahap8.html",
    PIN_DEMO: "/tahap8.html?admin_pin=1#pin-demo",
    TAHAP_9: "/tahap9.html",
    DASHBOARD: "/dashboard.html",
    HASIL_PENGAJUAN: "/hasil-pengajuan.html"
  });

  function pathMatches(file) {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    const bare = file.replace(/\.html$/, "");
    return path === `/${file}` || path === `/${bare}` || path.endsWith(`/${file}`) || path.endsWith(`/${bare}`);
  }

  function currentRouteCode() {
    // DOM-first detection keeps Tahap 5–7 and PIN Demo accurate even when an in-app browser
    // normalizes the URL or history state differently. No form value is inspected.
    const pinModal = document.getElementById("pinModal");
    if (pinModal && !pinModal.hidden) return "PIN_DEMO";
    if (document.querySelector("#stage7:not([hidden])")) return "RINGKASAN";
    if (document.querySelector("#stage6:not([hidden])")) return "DETAIL_PINJAMAN";
    if (document.querySelector("#stage5:not([hidden])")) return "PROFIL";

    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || pathMatches("index.html")) return "HOME";
    if (pathMatches("login.html")) return "LOGIN";
    if (pathMatches("identitas.html")) return "IDENTITAS";
    if (pathMatches("verifikasi.html")) return "VERIFIKASI";
    if (pathMatches("profil-pengajuan.html")) {
      const forced = new URLSearchParams(location.search).get("admin_stage");
      const match = (location.hash || "").match(/tahap-(5|6|7)/);
      const stage = forced || (match ? match[1] : "5");
      return stage === "7" ? "RINGKASAN" : stage === "6" ? "DETAIL_PINJAMAN" : "PROFIL";
    }
    if (pathMatches("tahap8.html")) {
      return location.hash === "#pin-demo" || new URLSearchParams(location.search).get("admin_pin") === "1" ? "PIN_DEMO" : "TAHAP_8";
    }
    if (pathMatches("tahap9.html")) return "TAHAP_9";
    if (pathMatches("dashboard.html")) return "DASHBOARD";
    if (pathMatches("hasil-pengajuan.html")) return "HASIL_PENGAJUAN";
    return null;
  }

  let lastReportedRoute = null;
  let lastPresenceAt = 0;
  let lastCommandId = null;
  let navigating = false;
  let commandPolling = false;
  let booted = false;

  function routeQuery(routeCode) {
    return routeCode ? `?routeCode=${encodeURIComponent(routeCode)}` : "";
  }

  function ensureToast() {
    let node = document.getElementById("simulation-navigation-toast");
    if (node) return node;
    node = document.createElement("div");
    node.id = "simulation-navigation-toast";
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    Object.assign(node.style, {
      position:"fixed",zIndex:"2147483646",left:"50%",bottom:"max(20px, env(safe-area-inset-bottom))",
      transform:"translate(-50%, 18px)",opacity:"0",pointerEvents:"none",maxWidth:"calc(100vw - 32px)",
      padding:"12px 16px",borderRadius:"14px",border:"1px solid rgba(246,205,84,.45)",
      background:"rgba(24,10,52,.96)",color:"#fff3a0",boxShadow:"0 16px 40px rgba(0,0,0,.34)",
      font:"700 13px/1.35 Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
      textAlign:"center",transition:"opacity .2s ease, transform .2s ease"
    });
    document.body.appendChild(node);
    return node;
  }

  function showNavigationToast() {
    const node = ensureToast();
    node.textContent = "Navigasi prototype diperbarui.";
    node.style.opacity = "1";
    node.style.transform = "translate(-50%, 0)";
  }

  async function reportPresence(force = false) {
    const routeCode = currentRouteCode();
    if (!routeCode) return;
    if (!force && routeCode === lastReportedRoute && Date.now() - lastPresenceAt < 4500) return;
    try {
      const res = await fetch("/api/session/presence", {
        method:"POST",
        credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({routeCode}),
        cache:"no-store",
        keepalive:true
      });
      if (res.ok) {
        lastReportedRoute = routeCode;
        lastPresenceAt = Date.now();
      }
    } catch (_) {}
  }

  async function pollCommand() {
    if (commandPolling || navigating) return;
    commandPolling = true;
    const routeCode = currentRouteCode();
    try {
      const res = await fetch(`/api/session/command${routeQuery(routeCode)}`, {credentials:"same-origin",cache:"no-store"});
      if (!res.ok) return;
      if (routeCode) {
        lastReportedRoute = routeCode;
        lastPresenceAt = Date.now();
      }
      const data = await res.json();
      const command = data && data.command;
      if (!command || typeof command.commandId !== "string" || typeof command.routeCode !== "string") return;
      if (command.commandId === lastCommandId || !Object.hasOwn(ROUTES, command.routeCode)) return;
      lastCommandId = command.commandId;
      navigating = true;
      showNavigationToast();
      window.setTimeout(() => { window.smoothNavigate ? window.smoothNavigate(ROUTES[command.routeCode]) : location.assign(ROUTES[command.routeCode]); }, 420);
    } catch (_) {
    } finally {
      commandPolling = false;
    }
  }

  async function syncNow() {
    await reportPresence(true);
    await pollCommand();
  }

  function installHistoryHooks() {
    for (const name of ["pushState", "replaceState"]) {
      const original = history[name].bind(history);
      history[name] = function(...args) {
        const result = original(...args);
        window.setTimeout(syncNow, 0);
        return result;
      };
    }
  }

  async function boot() {
    if (booted) return;
    booted = true;
    installHistoryHooks();
    const routeCode = currentRouteCode();
    try {
      const res = await fetch(`/api/session/bootstrap${routeQuery(routeCode)}`, {credentials:"same-origin",cache:"no-store"});
      if (!res.ok) return;
      if (routeCode) {
        lastReportedRoute = routeCode;
        lastPresenceAt = Date.now();
      }
      await pollCommand();
    } catch (_) {}
  }

  window.addEventListener("hashchange", syncNow);
  window.addEventListener("popstate", () => window.setTimeout(syncNow, 0));
  window.addEventListener("pageshow", syncNow);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncNow();
  });

  window.setInterval(() => reportPresence(false), 4000);
  window.setInterval(pollCommand, 2000);

  boot();
})();
