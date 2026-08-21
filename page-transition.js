(() => {
  "use strict";

  const PAGE_DURATION = 320;
  const STAGE_DURATION = 180;
  const root = document.documentElement;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  let navigating = false;

  const style = document.createElement("style");
  style.textContent = `
    html.kb-page-transition body {
      transition:
        opacity ${PAGE_DURATION}ms cubic-bezier(.22,.61,.36,1),
        transform ${PAGE_DURATION}ms cubic-bezier(.22,.61,.36,1),
        filter 220ms ease;
      transform-origin: 50% 44%;
      will-change: opacity, transform, filter;
    }

    html.kb-page-transition.kb-page-enter body {
      opacity: .06;
      transform: translate3d(0, 6px, 0) scale(.998);
      filter: blur(.7px);
    }

    html.kb-page-transition.kb-page-leave body {
      opacity: .12;
      transform: translate3d(0, -2px, 0) scale(.997);
      filter: blur(1.2px);
      pointer-events: none;
    }

    html.kb-page-transition.kb-stage-leave body {
      opacity: .18;
      transform: translate3d(0, 3px, 0) scale(.999);
      filter: blur(.5px);
      pointer-events: none;
    }

    html.kb-page-transition::before,
    html.kb-page-transition::after {
      content: "";
      position: fixed;
      pointer-events: none;
      opacity: 0;
    }

    html.kb-page-transition::before {
      inset: 0;
      z-index: 2147483646;
      background: rgba(20, 10, 31, .44);
      -webkit-backdrop-filter: blur(5px);
      backdrop-filter: blur(5px);
      transition: opacity 220ms ease;
    }

    html.kb-page-transition::after {
      left: 50%;
      top: 50%;
      z-index: 2147483647;
      width: 30px;
      height: 30px;
      margin: -15px 0 0 -15px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, .22);
      border-top-color: #ffe47b;
      border-right-color: rgba(255, 228, 123, .62);
      box-shadow: 0 8px 30px rgba(0, 0, 0, .22);
      transition: opacity 160ms ease 55ms;
    }

    html.kb-page-transition.kb-page-loading::before,
    html.kb-page-transition.kb-page-loading::after {
      opacity: 1;
    }

    html.kb-page-transition.kb-page-loading::after {
      animation: kb-soft-spin .82s linear infinite;
    }

    @keyframes kb-soft-spin {
      to { transform: rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      html.kb-page-transition body {
        transition: none !important;
        transform: none !important;
        filter: none !important;
      }
      html.kb-page-transition::before,
      html.kb-page-transition::after {
        display: none !important;
        animation: none !important;
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  function clearTransitionState() {
    root.classList.remove(
      "kb-page-enter",
      "kb-page-leave",
      "kb-page-loading",
      "kb-stage-leave"
    );
    root.removeAttribute("aria-busy");
  }

  function enterSoftly() {
    if (reduceMotion) return;
    clearTransitionState();
    root.classList.add("kb-page-transition", "kb-page-enter");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.remove("kb-page-enter");
    }));
  }

  function normalizeInternalUrl(target) {
    try {
      const url = new URL(target, window.location.href);
      if (url.origin !== window.location.origin) return null;
      return url;
    } catch {
      return null;
    }
  }

  window.smoothNavigate = (target, duration = PAGE_DURATION) => {
    const url = normalizeInternalUrl(target);
    if (!url) {
      window.location.href = target;
      return;
    }

    if (reduceMotion) {
      window.location.href = url.href;
      return;
    }

    if (navigating) return;
    navigating = true;
    root.setAttribute("aria-busy", "true");
    root.classList.remove("kb-page-enter", "kb-stage-leave");
    root.classList.add("kb-page-transition", "kb-page-leave", "kb-page-loading");

    window.setTimeout(() => {
      window.location.href = url.href;
    }, Math.max(0, Number(duration) || PAGE_DURATION));
  };

  window.smoothStageSwap = (callback, duration = STAGE_DURATION) => {
    if (typeof callback !== "function") return;
    if (reduceMotion) {
      callback();
      return;
    }
    if (navigating) return;

    navigating = true;
    root.setAttribute("aria-busy", "true");
    root.classList.remove("kb-page-enter", "kb-page-leave", "kb-page-loading");
    root.classList.add("kb-page-transition", "kb-stage-leave");

    window.setTimeout(() => {
      callback();
      root.classList.remove("kb-stage-leave");
      root.classList.add("kb-page-enter");
      requestAnimationFrame(() => requestAnimationFrame(() => {
        root.classList.remove("kb-page-enter");
        root.removeAttribute("aria-busy");
        navigating = false;
      }));
    }, Math.max(0, Number(duration) || STAGE_DURATION));
  };

  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const link = event.target.closest?.("a[href]");
    if (!link || link.hasAttribute("download") || link.target === "_blank") return;

    const rawHref = link.getAttribute("href") || "";
    if (
      !rawHref ||
      rawHref.startsWith("#") ||
      rawHref.startsWith("javascript:") ||
      rawHref.startsWith("mailto:") ||
      rawHref.startsWith("tel:")
    ) return;

    const url = normalizeInternalUrl(rawHref);
    if (!url) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;

    event.preventDefault();
    window.smoothNavigate(url.href);
  }, true);

  window.addEventListener("pageshow", () => {
    navigating = false;
    enterSoftly();
  });

  window.addEventListener("pagehide", () => {
    navigating = false;
  });

  enterSoftly();
})();
