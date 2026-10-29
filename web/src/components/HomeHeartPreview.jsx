import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import s from "./HomeHeartPreview.module.css";

const AnatomyCanvas = lazy(() => import("./AnatomyCanvas"));

export default function HomeHeartPreview({ styles, modelRef }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer;
    if ("requestIdleCallback" in window) {
      const idle = window.requestIdleCallback(() => setReady(true), {
        timeout: 1200,
      });
      return () => window.cancelIdleCallback(idle);
    }
    timer = window.setTimeout(() => setReady(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={`${styles.heroAtlas} ${s.stage}`}>
      <div className={styles.atlasPreviewCopy}>
        <p className={styles.overline}>SCHEMATIC 3D STUDY MODEL</p>
        <h2>The human heart</h2>
      </div>
      <button
        className={s.reset}
        type="button"
        aria-label="Reset heart view"
        title="Reset view"
        onClick={() => modelRef.current?.reset()}
      >
        <ArrowCounterClockwise size={16} />
        <span>Reset view</span>
      </button>
      <span className={styles.atlasDragHint} aria-hidden="true">
        DRAG TO ROTATE
      </span>
      <div className={styles.atlasModel}>
        {ready ? (
          <Suspense
            fallback={<p className={s.loading}>Preparing the model…</p>}
          >
            <AnatomyCanvas
              compact
              modelId="heart"
              autoRotate
              controlsRef={modelRef}
            />
          </Suspense>
        ) : (
          <div className={s.loading} role="status">
            <span className={s.loadingOrb} aria-hidden="true" />
            <span>Warming up the study model…</span>
          </div>
        )}
      </div>
    </div>
  );
}
