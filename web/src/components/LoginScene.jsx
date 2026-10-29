import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Helix({ pointer }) {
  const group = useRef();
  const geometry = useMemo(() => {
    const strands = [-1, 1].map((sign) => {
      const points = Array.from({ length: 65 }, (_, index) => {
        const t = (index / 64) * Math.PI * 4;
        const y = (index / 64 - 0.5) * 6.2;
        return new THREE.Vector3(
          Math.sin(t) * 0.82 * sign,
          y,
          Math.cos(t) * 0.44 * sign,
        );
      });
      return new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        128,
        0.055,
        8,
        false,
      );
    });
    const rungs = Array.from({ length: 13 }, (_, index) => {
      const t = (index / 12) * Math.PI * 4;
      const y = (index / 12 - 0.5) * 6.2;
      const start = new THREE.Vector3(
        Math.sin(t) * 0.82,
        y,
        Math.cos(t) * 0.44,
      );
      const end = new THREE.Vector3(
        -Math.sin(t) * 0.82,
        y,
        -Math.cos(t) * 0.44,
      );
      const direction = end.clone().sub(start);
      return {
        position: start.clone().add(end).multiplyScalar(0.5),
        quaternion: new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.clone().normalize(),
        ),
        length: direction.length(),
      };
    });
    return { strands, rungs };
  }, []);
  const reduced = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useFrame((_, delta) => {
    if (!group.current) return;
    if (!reduced) {
      group.current.rotation.y += delta * 0.12;
      group.current.rotation.x +=
        (pointer.current.y * 0.14 - group.current.rotation.x) * delta * 2.2;
      group.current.rotation.z +=
        (pointer.current.x * 0.09 - group.current.rotation.z) * delta * 2.2;
    }
  });
  return (
    <group ref={group} position={[1.45, 0, 0]}>
      {geometry.strands.map((strand, index) => (
        <mesh geometry={strand} key={index}>
          <meshStandardMaterial
            color={index ? "#b894e6" : "#7542a5"}
            emissive={index ? "#7649a2" : "#48236c"}
            emissiveIntensity={0.45}
            roughness={0.26}
            metalness={0.22}
          />
        </mesh>
      ))}
      {geometry.rungs.map((rung, index) => (
        <mesh
          key={index}
          position={rung.position}
          quaternion={rung.quaternion}
          scale={[0.045, rung.length, 0.045]}
        >
          <cylinderGeometry args={[1, 1, 1, 10]} />
          <meshStandardMaterial
            color={index % 2 ? "#d4b8ef" : "#a780d1"}
            roughness={0.32}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function LoginScene() {
  const pointer = useRef({ x: 0, y: 0 });
  const host = useRef(null);
  useEffect(() => {
    const move = (event) => {
      const bounds = host.current?.getBoundingClientRect();
      if (!bounds) return;
      pointer.current = {
        x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
        y: (0.5 - (event.clientY - bounds.top) / bounds.height) * 2,
      };
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return (
    <div
      ref={host}
      aria-hidden="true"
      className="login-scene"
    >
      <Canvas camera={{ position: [0, 0, 10], fov: 44 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.6} />
        <directionalLight position={[-3, 5, 6]} intensity={3} color="#fff4ff" />
        <pointLight position={[3, 0, -2]} intensity={2} color="#a875e1" />
        <Helix pointer={pointer} />
      </Canvas>
    </div>
  );
}
