export function emitStudyEvent(type, detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("mp:event", { detail: { type, ...detail } }),
  );
}
