import { useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { createHeartScene, createReferenceScene } from "@med-purple/anatomy";
import { motion as tokens } from "@med-purple/design-tokens";

function AnatomyReference({ motionEnabled, pointer, organ }) {
  const source = useMemo(
    () => (organ === "heart" ? createHeartScene() : createReferenceScene("brain")),
    [organ],
  );
  const root = organ === "heart" ? source.heart : source.scene.children.find((child) => child.type === "Group");
  useEffect(() => {
    if (organ === "heart" && root) root.scale.setScalar(0.62);
  }, [organ, root]);
  useEffect(() => () => source.scene.traverse((node) => {
    node.geometry?.dispose();
    if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.dispose();
  }), [source]);
  useFrame((state, delta) => {
    if (!motionEnabled || !root) return;
    const time = state.clock.elapsedTime;
    const targetX = -pointer.current.y * tokens.heroTiltDegrees * Math.PI / 180;
    const targetY = pointer.current.x * tokens.heroTiltDegrees * Math.PI / 180;
    const settle = 1 - Math.exp(-5.5 * delta);
    root.rotation.x += (targetX + Math.sin(time * 0.58) * tokens.heroFloatDistance * 0.35 - root.rotation.x) * settle;
    root.rotation.y += (targetY + Math.sin(time * 0.42) * 0.07 - root.rotation.y) * settle;
    root.position.y = Math.sin(time * 0.85) * tokens.heroFloatDistance;
    if (organ === "heart") {
      const beat = Math.max(0, Math.sin(time * 7.5)) ** 8;
      root.scale.setScalar(0.62 * (1 + beat * 0.035));
    }
  });
  return <>
    <primitive object={source.scene} />
  </>;
}

export default function HeroSceneCanvas({ active, motionEnabled, pointer, organ = "brain" }) {
  const frameloop = active ? motionEnabled ? "always" : "demand" : "never";
  return <Canvas camera={{ position: [0, 0, 8], fov: 39 }} dpr={[1, 2]} frameloop={frameloop} gl={{ alpha: true, antialias: true }}>
    <AnatomyReference motionEnabled={motionEnabled} pointer={pointer} organ={organ} />
  </Canvas>;
}
