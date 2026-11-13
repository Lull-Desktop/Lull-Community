/* Lull Scene bridge v1. Pointer events are supplied by the host; desktop clicks pass through. */
(() => {
  const root = document.documentElement;
  const embedded = window.parent !== window;
  let initialized = false;
  let reduced = false;
  let interactive = true;
  let visible = true;

  function updateFrame(frame) {
    if (!frame || typeof frame !== "object") return;
    reduced = frame.reducedMotion === true;
    root.dataset.reduced = String(reduced);
    const params = frame.params || {};
    if (typeof params.intensity === "number" && Number.isFinite(params.intensity)) {
      root.style.setProperty("--strength", String(Math.max(0.2, Math.min(1.4, params.intensity))));
    }
    if (typeof params.interactive === "boolean") interactive = params.interactive;
    if (!interactive || reduced) root.style.setProperty("--halo", "0");
  }

  function updatePointer(pointer) {
    if (!pointer || typeof pointer.x !== "number" || !Number.isFinite(pointer.x) ||
        typeof pointer.y !== "number" || !Number.isFinite(pointer.y) ||
        typeof pointer.inside !== "boolean" || typeof pointer.moving !== "boolean") return;
    if (!visible || !interactive || reduced || !pointer.inside) {
      root.style.setProperty("--halo", "0");
      return;
    }
    root.style.setProperty("--x", `${Math.max(0, Math.min(innerWidth, pointer.x))}px`);
    root.style.setProperty("--y", `${Math.max(0, Math.min(innerHeight, pointer.y))}px`);
    root.style.setProperty("--halo", pointer.moving ? "0.9" : "0.45");
  }

  function updateVisibility(value) {
    visible = value;
    root.style.setProperty("--play", visible ? "running" : "paused");
    if (!visible) root.style.setProperty("--halo", "0");
  }

  if (embedded) {
    window.addEventListener("message", (event) => {
      if (event.source !== window.parent || !event.data || event.data.v !== 1) return;
      const message = event.data;
      if (message.type === "init" && message.protocol === 1) {
        initialized = true;
        updateFrame(message.frame);
        if (typeof message.visible === "boolean") updateVisibility(message.visible);
      } else if (initialized && message.type === "frame") {
        updateFrame(message.frame);
      } else if (initialized && message.type === "pointer") {
        updatePointer(message.pointer);
      } else if (initialized && message.type === "visibility" && typeof message.visible === "boolean") {
        updateVisibility(message.visible);
      }
    });
    // The host resets its handshake on iframe load; announce only after that event.
    window.addEventListener("load", () => setTimeout(() => {
      window.parent.postMessage({ v: 1, type: "ready", protocol: 1 }, "*");
    }, 0), { once: true });
  } else {
    // Standalone browser preview; an embedded wallpaper uses only host messages.
    window.addEventListener("pointermove", (event) => updatePointer({ x: event.clientX, y: event.clientY, inside: true, moving: true }), { passive: true });
    window.addEventListener("pointerleave", () => root.style.setProperty("--halo", "0"));
    document.addEventListener("visibilitychange", () => updateVisibility(!document.hidden));
  }
})();
