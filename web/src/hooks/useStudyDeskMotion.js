import { useEffect, useRef } from "react";

export default function useStudyDeskMotion(styles, enabled) {
  const deskRef = useRef(null);
  const atlasCardRef = useRef(null);
  const atlasModelRef = useRef(null);
  const revealSelector = [
    `:scope > .${styles.welcome}`,
    `:scope > .${styles.columns} > .${styles.mainColumn} > *`,
    `:scope > .${styles.columns} > .${styles.rail} > *`,
  ].join(", ");

  useEffect(() => {
    if (!enabled) return undefined;
    const root = deskRef.current;
    const card = atlasCardRef.current;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;
    let updateScene;
    let revealObserver;

    if (!reducedMotion && card) {
      updateScene = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const maxScroll = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            1,
          );
          const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
          card.style.setProperty("--atlas-scroll-turn", `${progress * 110}deg`);
          card.style.setProperty(
            "--atlas-scroll-depth",
            `${(progress - 0.5) * 16}px`,
          );
          atlasModelRef.current?.pose(progress * 0.72);
        });
      };
      window.addEventListener("scroll", updateScene, { passive: true });
      window.addEventListener("resize", updateScene);
      updateScene();
    }

    if (!reducedMotion && root && "IntersectionObserver" in window) {
      const items = root.querySelectorAll(revealSelector);
      if (items.length) {
        revealObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              entry.target.dataset.homeMotion = "visible";
              revealObserver.unobserve(entry.target);
            }
          },
          { threshold: 0.12, rootMargin: "0px 0px -4% 0px" },
        );
        items.forEach((item, index) => {
          item.dataset.homeMotion = "waiting";
          item.style.setProperty(
            "--home-reveal-delay",
            `${Math.min(index % 5, 4) * 42}ms`,
          );
          revealObserver.observe(item);
        });
        root.dataset.homeMotionReady = "true";
      }
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (updateScene) {
        window.removeEventListener("scroll", updateScene);
        window.removeEventListener("resize", updateScene);
      }
      revealObserver?.disconnect();
      if (root) delete root.dataset.homeMotionReady;
      root?.querySelectorAll("[data-home-motion]").forEach((item) => {
        delete item.dataset.homeMotion;
        item.style.removeProperty("--home-reveal-delay");
      });
    };
  }, [enabled, revealSelector]);

  const handleAtlasPointerMove = (event) => {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    card.style.setProperty("--atlas-tilt-x", `${-y * 3}deg`);
    card.style.setProperty("--atlas-tilt-y", `${x * 3}deg`);
    card.style.setProperty("--atlas-parallax-x", `${x * 9}px`);
    card.style.setProperty("--atlas-parallax-y", `${y * 9}px`);
  };

  const resetAtlasPointer = (event) => {
    const card = event.currentTarget;
    card.style.setProperty("--atlas-tilt-x", "0deg");
    card.style.setProperty("--atlas-tilt-y", "0deg");
    card.style.setProperty("--atlas-parallax-x", "0px");
    card.style.setProperty("--atlas-parallax-y", "0px");
  };

  return {
    deskRef,
    atlasCardRef,
    atlasModelRef,
    handleAtlasPointerMove,
    resetAtlasPointer,
  };
}
