import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis;
    const sync = () => {
      lenis?.destroy();
      lenis = undefined;
      if (root.dataset.calm === "true" || reduced.matches) return;
      const instance = new Lenis({ duration: 0.7, smoothWheel: true, syncTouch: false });
      lenis = instance;
      const frame = (time) => {
        if (lenis !== instance) return;
        instance.raf(time);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    const calmObserver = new MutationObserver(sync);
    calmObserver.observe(root, { attributes: true, attributeFilter: ["data-calm"] });
    reduced.addEventListener("change", sync);
    sync();
    return () => {
      calmObserver.disconnect();
      reduced.removeEventListener("change", sync);
      lenis?.destroy();
    };
  }, []);
  return null;
}
