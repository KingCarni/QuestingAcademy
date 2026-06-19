import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const CLASSROOM_MODEL_PATH = "/assets/3d/classroom-blockout/classroom-blockout.glb";

type KeyState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
};

function useKeyboardMovement(): React.MutableRefObject<KeyState> {
  const keysRef = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (key === "w" || key === "arrowup") keysRef.current.forward = true;
      if (key === "s" || key === "arrowdown") keysRef.current.backward = true;
      if (key === "a" || key === "arrowleft") keysRef.current.left = true;
      if (key === "d" || key === "arrowright") keysRef.current.right = true;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (key === "w" || key === "arrowup") keysRef.current.forward = false;
      if (key === "s" || key === "arrowdown") keysRef.current.backward = false;
      if (key === "a" || key === "arrowleft") keysRef.current.left = false;
      if (key === "d" || key === "arrowright") keysRef.current.right = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return keysRef;
}

function ClassroomModel() {
  const gltf = useGLTF(CLASSROOM_MODEL_PATH) as any;

  return (
   <primitive
  object={gltf.scene}
  position={[0, 0.25, 0]}
  rotation={[0, Math.PI, 0]}
  scale={2.5}
/>
  );
}

function PlayerMarker() {
  const groupRef = useRef<THREE.Group>(null);
  const keysRef = useKeyboardMovement();

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const speed = 2.5;
    const moveX =
    (keysRef.current.left ? 1 : 0) - (keysRef.current.right ? 1 : 0);
    const moveZ =
    (keysRef.current.forward ? 1 : 0) - (keysRef.current.backward ? 1 : 0);

    if (moveX !== 0 || moveZ !== 0) {
      const movement = new THREE.Vector3(moveX, 0, moveZ);
      movement.normalize().multiplyScalar(speed * delta);

      group.position.add(movement);
      group.position.x = THREE.MathUtils.clamp(group.position.x, -6, 6);
      group.position.z = THREE.MathUtils.clamp(group.position.z, -6, 6);

      group.rotation.y = Math.atan2(moveX, moveZ);
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.45, 2.5]} scale={0.35}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial color="#f7c97f" roughness={0.55} />
      </mesh>

      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.23, 0.28, 0.55, 24]} />
        <meshStandardMaterial color="#7c5cff" roughness={0.55} />
      </mesh>

      <Html position={[0, 1.05, 0]} center>
        <div
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "2px solid rgba(124,92,255,0.35)",
            borderRadius: "999px",
            color: "#2a1f4f",
            fontSize: "11px",
            fontWeight: 800,
            padding: "4px 9px",
            whiteSpace: "nowrap",
          }}
        >
          Player
        </div>
      </Html>
    </group>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          border: "2px solid rgba(124,92,255,0.25)",
          borderRadius: "18px",
          color: "#2a1f4f",
          fontWeight: 800,
          padding: "14px 18px",
          textAlign: "center",
          minWidth: "220px",
        }}
      >
        Loading classroom...
        <div style={{ color: "#6f6687", fontSize: "12px", marginTop: "4px" }}>
          Large GLB files can take a moment.
        </div>
      </div>
    </Html>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#dff3ff"]} />

      <ambientLight intensity={0.8} />
      <directionalLight
        castShadow
        intensity={1.2}
        position={[6, 8, 6]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <Suspense fallback={<LoadingFallback />}>
        <ClassroomModel />
        <PlayerMarker />
      </Suspense>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#e8f7d6" roughness={0.8} />
      </mesh>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 1, 0]}
      />
    </>
  );
}

export default function Classroom() {
  const [showHelp, setShowHelp] = useState(true);

  return (
    <main
      style={{
        background:
          "linear-gradient(135deg, #fff8de 0%, #e8f7ff 45%, #f4e9ff 100%)",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        width: "100vw",
      }}
    >
      <div
        style={{
          left: 18,
          position: "absolute",
          top: 18,
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "2px solid rgba(124,92,255,0.2)",
            borderRadius: "22px",
            boxShadow: "0 14px 35px rgba(38,31,72,0.12)",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              color: "#7c5cff",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            TEA-164 3D Spike
          </div>
          <h1
            style={{
              color: "#24183f",
              fontSize: "24px",
              lineHeight: 1,
              margin: "5px 0 0",
            }}
          >
            Classroom 3D Prototype
          </h1>
          {showHelp && (
            <p
              style={{
                color: "#6f6687",
                fontSize: "12px",
                fontWeight: 700,
                margin: "8px 0 0",
                maxWidth: "280px",
              }}
            >
              WASD / arrow keys move the placeholder player. Drag to orbit the camera.
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowHelp((value) => !value)}
            style={{
              background: "#7c5cff",
              border: "0",
              borderRadius: "999px",
              color: "white",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 900,
              marginTop: "10px",
              padding: "7px 11px",
            }}
          >
            {showHelp ? "Hide help" : "Show help"}
          </button>
        </div>
      </div>

      <Canvas
        camera={{ position: [5, 5, 7], fov: 45 }}
        shadows
        gl={{ antialias: true }}
      >
        <Scene />
      </Canvas>
    </main>
  );
}

useGLTF.preload(CLASSROOM_MODEL_PATH);
