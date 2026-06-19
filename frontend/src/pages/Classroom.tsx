import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const CLASSROOM_MODEL_PATH = "/assets/3d/classroom-blockout/classroom-blockout.glb";

type KeyState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
};

type HotspotKey =
  | "quest-board"
  | "student-desks"
  | "pet-corner"
  | "rewards"
  | "door"
  | "teacher";

type HotspotInfo = {
  id: HotspotKey;
  title: string;
  label: string;
  subtitle: string;
  body: string;
  cta: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
};

const HOTSPOTS: HotspotInfo[] = [
  {
    id: "quest-board",
    title: "Quest Board",
    label: "Assignments",
    subtitle: "Class quests and active learning tasks.",
    body:
      "This will connect to teacher-created assignments. Students should be able to walk up, open the board, and see what needs to be completed next.",
    cta: "Open Quest Board",
    position: [0, 0.65, -3.35],
    size: [4.6, 1.45, 0.28],
    color: "#79d96b",
  },
  {
    id: "student-desks",
    title: "Student Desks",
    label: "Roster",
    subtitle: "Safe classroom presence for students.",
    body:
      "This area represents student seats, roster presence, and future classmate avatars. Keep it async and safe: no free chat, no open social layer.",
    cta: "View Student Roster",
    position: [-0.8, 0.12, 0.85],
    size: [5.0, 0.22, 2.5],
    color: "#7ee7ff",
  },
  {
    id: "pet-corner",
    title: "Pet Corner",
    label: "Class Pet",
    subtitle: "The pet's daily classroom home.",
    body:
      "This is a small emotional anchor in the classroom. Full pet progression still belongs in the Pet Sanctuary, but the class pet should feel present here every day.",
    cta: "Visit Class Pet",
    position: [-4.0, 0.45, 2.25],
    size: [1.25, 0.9, 1.25],
    color: "#84e66a",
  },
  {
    id: "rewards",
    title: "Rewards & Trophy Wall",
    label: "Milestones",
    subtitle: "Class wins, rewards, badges, and celebrations.",
    body:
      "This wall should show progress history: completed class goals, unlocked rewards, weekly achievements, and trophies earned through learning.",
    cta: "View Rewards",
    position: [-4.35, 1.05, -0.7],
    size: [0.3, 2.4, 3.4],
    color: "#b457ff",
  },
  {
    id: "door",
    title: "Door to Courtyard",
    label: "Exit",
    subtitle: "Future route to the Academy Courtyard.",
    body:
      "This will eventually transition the player from the classroom to the academy courtyard or hallway hub. For now it proves routing intent.",
    cta: "Exit Coming Soon",
    position: [4.35, 0.8, 0.75],
    size: [0.35, 1.7, 1.25],
    color: "#ffb347",
  },
  {
    id: "teacher",
    title: "Teacher Area",
    label: "Teacher",
    subtitle: "Teacher avatar and instruction anchor.",
    body:
      "This spot can hold the teacher avatar, class message, daily prompt, or a safe announcement from the teacher.",
    cta: "View Teacher Area",
    position: [0, 0.45, -2.1],
    size: [1.2, 0.9, 1.2],
    color: "#7c5cff",
  },
];

const HOTSPOT_LOOKUP = HOTSPOTS.reduce<Record<HotspotKey, HotspotInfo>>(
  (lookup, hotspot) => {
    lookup[hotspot.id] = hotspot;
    return lookup;
  },
  {} as Record<HotspotKey, HotspotInfo>
);

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

function ClassroomHotspot({
  hotspot,
  isActive,
  onSelect,
}: {
  hotspot: HotspotInfo;
  isActive: boolean;
  onSelect: (id: HotspotKey) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const opacity = isActive ? 0.34 : isHovered ? 0.24 : 0.1;

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsHovered(false);
    document.body.style.cursor = "default";
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(hotspot.id);
  };

  return (
    <group position={hotspot.position}>
      <mesh
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={hotspot.size} />
        <meshStandardMaterial
          color={hotspot.color}
          transparent
          opacity={opacity}
          roughness={0.55}
          depthWrite={false}
        />
      </mesh>

      {(isActive || isHovered) && (
        <Html position={[0, hotspot.size[1] / 2 + 0.22, 0]} center>
          <button
            type="button"
            onClick={() => onSelect(hotspot.id)}
            style={{
              background: "rgba(255,255,255,0.96)",
              border: `2px solid ${hotspot.color}`,
              borderRadius: "999px",
              boxShadow: "0 8px 24px rgba(35, 24, 63, 0.16)",
              color: "#2a1f4f",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 900,
              padding: "6px 10px",
              whiteSpace: "nowrap",
            }}
          >
            {hotspot.label}
          </button>
        </Html>
      )}
    </group>
  );
}

function ClassroomHotspots({
  activeHotspot,
  onSelect,
}: {
  activeHotspot: HotspotKey;
  onSelect: (id: HotspotKey) => void;
}) {
  return (
    <>
      {HOTSPOTS.map((hotspot) => (
        <ClassroomHotspot
          key={hotspot.id}
          hotspot={hotspot}
          isActive={activeHotspot === hotspot.id}
          onSelect={onSelect}
        />
      ))}
    </>
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

function Scene({
  activeHotspot,
  onSelectHotspot,
}: {
  activeHotspot: HotspotKey;
  onSelectHotspot: (id: HotspotKey) => void;
}) {
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
        <ClassroomHotspots
          activeHotspot={activeHotspot}
          onSelect={onSelectHotspot}
        />
      </Suspense>

      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.25, 0]}
      >
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

function HotspotPanel({
  activeHotspot,
  onSelect,
}: {
  activeHotspot: HotspotKey;
  onSelect: (id: HotspotKey) => void;
}) {
  const active = HOTSPOT_LOOKUP[activeHotspot];

  return (
    <aside
      style={{
        bottom: 18,
        position: "absolute",
        right: 18,
        top: 18,
        width: "min(360px, calc(100vw - 36px))",
        zIndex: 10,
      }}
    >
      <div
        style={{
          backdropFilter: "blur(12px)",
          background: "rgba(255,255,255,0.9)",
          border: "2px solid rgba(124,92,255,0.2)",
          borderRadius: "26px",
          boxShadow: "0 18px 45px rgba(38,31,72,0.16)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(124,92,255,0.16), rgba(126,231,255,0.18))",
            borderBottom: "1px solid rgba(124,92,255,0.16)",
            padding: "16px",
          }}
        >
          <div
            style={{
              color: "#7c5cff",
              fontSize: "11px",
              fontWeight: 950,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            TEA-166 Hotspot
          </div>
          <h2
            style={{
              color: "#24183f",
              fontSize: "26px",
              lineHeight: 1,
              margin: "7px 0 0",
            }}
          >
            {active.title}
          </h2>
          <p
            style={{
              color: "#6f6687",
              fontSize: "13px",
              fontWeight: 800,
              margin: "8px 0 0",
            }}
          >
            {active.subtitle}
          </p>
        </div>

        <div style={{ overflow: "auto", padding: "14px 16px 16px" }}>
          <p
            style={{
              color: "#3a315c",
              fontSize: "14px",
              fontWeight: 700,
              lineHeight: 1.45,
              margin: 0,
            }}
          >
            {active.body}
          </p>

          <button
            type="button"
            style={{
              background: "#7c5cff",
              border: "0",
              borderRadius: "999px",
              color: "white",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 950,
              marginTop: "14px",
              padding: "10px 14px",
              width: "100%",
            }}
          >
            {active.cta}
          </button>

          <div
            style={{
              display: "grid",
              gap: "8px",
              marginTop: "16px",
            }}
          >
            {HOTSPOTS.map((hotspot) => (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => onSelect(hotspot.id)}
                style={{
                  alignItems: "center",
                  background:
                    activeHotspot === hotspot.id
                      ? "rgba(124,92,255,0.13)"
                      : "rgba(255,255,255,0.72)",
                  border:
                    activeHotspot === hotspot.id
                      ? "2px solid rgba(124,92,255,0.55)"
                      : "2px solid rgba(124,92,255,0.12)",
                  borderRadius: "16px",
                  color: "#24183f",
                  cursor: "pointer",
                  display: "flex",
                  fontSize: "12px",
                  fontWeight: 900,
                  justifyContent: "space-between",
                  padding: "10px 11px",
                  textAlign: "left",
                }}
              >
                <span>{hotspot.label}</span>
                <span style={{ color: hotspot.color }}>●</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function ViewModeControls({
  showHotspots,
  setShowHotspots,
  resetHotspot,
}: {
  showHotspots: boolean;
  setShowHotspots: (value: boolean) => void;
  resetHotspot: () => void;
}) {
  return (
    <div
      style={{
        bottom: 18,
        display: "flex",
        gap: "8px",
        left: 18,
        position: "absolute",
        zIndex: 10,
      }}
    >
      <button
        type="button"
        onClick={() => setShowHotspots(!showHotspots)}
        style={smallButtonStyle}
      >
        {showHotspots ? "Hide hotspots" : "Show hotspots"}
      </button>
      <button type="button" onClick={resetHotspot} style={smallButtonStyle}>
        Reset panel
      </button>
    </div>
  );
}

const smallButtonStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "2px solid rgba(124,92,255,0.2)",
  borderRadius: "999px",
  color: "#2a1f4f",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 900,
  padding: "9px 12px",
};

export default function Classroom() {
  const [showHelp, setShowHelp] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState<HotspotKey>("quest-board");

  const helpText = useMemo(() => {
    if (showHotspots) {
      return "WASD / arrow keys move the placeholder player. Drag to orbit. Click a glowing zone to open its classroom panel.";
    }

    return "WASD / arrow keys move the placeholder player. Drag to orbit the camera.";
  }, [showHotspots]);

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
            TEA-166 Interactable 3D Classroom
          </div>
          <h1
            style={{
              color: "#24183f",
              fontSize: "24px",
              lineHeight: 1,
              margin: "5px 0 0",
            }}
          >
            Classroom Hub Prototype
          </h1>
          {showHelp && (
            <p
              style={{
                color: "#6f6687",
                fontSize: "12px",
                fontWeight: 700,
                margin: "8px 0 0",
                maxWidth: "300px",
              }}
            >
              {helpText}
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

      <HotspotPanel activeHotspot={activeHotspot} onSelect={setActiveHotspot} />

      <ViewModeControls
        showHotspots={showHotspots}
        setShowHotspots={setShowHotspots}
        resetHotspot={() => setActiveHotspot("quest-board")}
      />

      <Canvas
        camera={{ position: [5, 5, 7], fov: 45 }}
        shadows
        gl={{ antialias: true }}
      >
        <Scene
          activeHotspot={showHotspots ? activeHotspot : "quest-board"}
          onSelectHotspot={setActiveHotspot}
        />
      </Canvas>
    </main>
  );
}

useGLTF.preload(CLASSROOM_MODEL_PATH);
