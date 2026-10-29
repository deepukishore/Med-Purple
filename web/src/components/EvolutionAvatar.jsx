import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import s from "./EvolutionAvatar.module.css";

const stages = [
  { through: 2, name: "Cell" },
  { through: 5, name: "Tissue" },
  { through: 10, name: "Organ" },
  { through: Infinity, name: "System" },
];

function Heart({ glow, speed, stage }) {
  const root = useRef();
  const heart = useRef();
  const shape = useMemo(() => {
    const outline = new THREE.Shape();
    outline.moveTo(0, -0.48);
    outline.bezierCurveTo(-0.9, 0.04, -0.78, 0.77, -0.3, 0.8);
    outline.bezierCurveTo(-0.05, 0.82, 0, 0.63, 0, 0.55);
    outline.bezierCurveTo(0, 0.63, 0.05, 0.82, 0.3, 0.8);
    outline.bezierCurveTo(0.78, 0.77, 0.9, 0.04, 0, -0.48);
    return new THREE.ExtrudeGeometry(outline, {
      depth: 0.26,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.07,
      bevelThickness: 0.07,
    });
  }, []);
  const reduced = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    root.current.rotation.y += reduced ? 0 : delta * 0.12;
    const pulse = reduced
      ? 1
      : 1 + Math.max(0, Math.sin(clock.elapsedTime * speed * 2.2)) * 0.055;
    heart.current?.scale.setScalar(0.86 * pulse);
  });
  return (
    <group ref={root}>
      <mesh
        ref={heart}
        geometry={shape}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={0.86}
      >
        <meshStandardMaterial
          color="#bb6d9d"
          roughness={0.3}
          metalness={0.08}
          emissive={glow ? "#9e4ac8" : "#43204e"}
          emissiveIntensity={glow ? 1.35 : 0.2}
        />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.65, 16]} />
        <meshStandardMaterial color="#a773bd" roughness={0.4} />
      </mesh>
      <mesh position={[-0.16, 0.94, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.44, 14]} />
        <meshStandardMaterial color="#8273c4" roughness={0.4} />
      </mesh>
      {stage === "System" &&
        [-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 0.82, 0, -0.1]}>
              <sphereGeometry args={[0.24, 20, 16]} />
              <meshStandardMaterial color="#8f80c9" roughness={0.38} />
            </mesh>
            <mesh position={[side * 0.82, -0.52, -0.1]}>
              <sphereGeometry args={[0.16, 18, 14]} />
              <meshStandardMaterial color="#d58ca3" roughness={0.4} />
            </mesh>
            <mesh
              position={[side * 0.43, 0.04, 0.05]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.06, 0.06, 0.82, 12]} />
              <meshStandardMaterial
                color={side < 0 ? "#8f80c9" : "#c77e9e"}
                roughness={0.34}
              />
            </mesh>
          </group>
        ))}
      <pointLight
        position={[0, 0.15, 1.2]}
        intensity={glow ? 2.1 : 0.4}
        color="#c485f2"
        distance={4}
      />
    </group>
  );
}

function Cell({ tissue = false }) {
  const root = useRef();
  const reduced = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useFrame((_, delta) => {
    if (root.current && !reduced) root.current.rotation.y += delta * 0.08;
  });
  const cells = tissue
    ? [
        [0, 0, 0],
        [-0.42, 0.2, 0.16],
        [0.42, 0.2, 0.16],
        [-0.22, -0.36, -0.12],
        [0.24, -0.36, -0.12],
      ]
    : [[0, 0, 0]];
  return (
    <group ref={root}>
      {cells.map((position, index) => (
        <group key={index} position={position}>
          <mesh>
            <sphereGeometry args={[tissue ? 0.42 : 0.73, 36, 28]} />
            <meshPhysicalMaterial
              color={index % 2 ? "#bba4e6" : "#a98bdd"}
              roughness={0.28}
              metalness={0.04}
              clearcoat={0.7}
              clearcoatRoughness={0.24}
            />
          </mesh>
          <mesh position={[0.12, -0.04, tissue ? 0.34 : 0.58]}>
            <sphereGeometry args={[tissue ? 0.13 : 0.22, 24, 20]} />
            <meshStandardMaterial
              color="#784da7"
              emissive="#734a9e"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}
      {!tissue && (
        <mesh rotation={[Math.PI / 2.3, 0, 0]}>
          <torusGeometry args={[0.94, 0.025, 8, 64]} />
          <meshStandardMaterial color="#d9c8f0" />
        </mesh>
      )}
    </group>
  );
}

function AvatarScene({ stage, streak, goalComplete }) {
  const speed = 1 + Math.min(streak, 20) * 0.045;
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[-3, 4, 5]} intensity={2.2} />
      <pointLight position={[2, 0, -3]} intensity={1.1} color="#9870cb" />
      {stage === "Cell" ? (
        <Cell />
      ) : stage === "Tissue" ? (
        <Cell tissue />
      ) : (
        <Heart glow={goalComplete} speed={speed} stage={stage} />
      )}
    </>
  );
}

export default function EvolutionAvatar({
  level,
  streak = 0,
  goalComplete = false,
  className = "",
}) {
  const stage = stages.find((item) => level <= item.through)?.name || "System";
  return (
    <div
      className={`${s.avatar} ${goalComplete ? s.goalComplete : ""} ${className}`}
      role="img"
      aria-label={`Level ${level} ${stage} avatar${streak ? `, ${streak} day streak` : ""}${goalComplete ? ", daily goals complete" : ""}`}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 34 }} dpr={[1, 1.5]}>
        <AvatarScene
          stage={stage}
          streak={streak}
          goalComplete={goalComplete}
        />
      </Canvas>
      <span>{stage}</span>
    </div>
  );
}
