import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useClassroomWorldStore } from "../lib/classroomWorldStore";

const CLASSROOM_MODEL_PATH =
  "/assets/3d/classroom-blockout/classroom-blockout.glb";
const PLAYER_MODEL_PATH = "/assets/3d/avatar/avatar.glb";
const EMBERCUB_MODEL_PATH = "/assets/3d/pets/embercub.glb";
const ACADEMY_DESK_MODEL_PATH = "/assets/3d/classroom/academy-desk.glb";

const PLAYER_MODEL_SCALE = 1;
const ACADEMY_DESK_MODEL_SCALE = 0.25;
const EMBERCUB_MODEL_SCALE = 1;

const DEV_PLACEMENT_STORAGE_KEY = "eduMatesClassroomAssetPlacements.v3";

const PLAYER_START_POSITION = new THREE.Vector3(0, 1.5, 2.5);
const PLAYER_BOUNDS = {
  minX: -9.2,
  maxX: 9.2,
  minZ: -7,
  maxZ: 7,
};

type KeyState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
};

type CameraMode = "orbit" | "follow" | "top";

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
  icon: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
};

type ClassroomPanelData = {
  classroom: any | null;
  assignments: any[];
  completedAssignments: any[];
  goals: any[];
  rewardLogs: any[];
  events: any[];
  members: any[];
};

type ClassroomAssetType = "academy-desk" | "embercub";

type ClassroomPropPlacement = {
  id: string;
  assetType: ClassroomAssetType;
  label?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

// Student desk/chair placements.
// These are the first saved table/chair values from Dev Mode.
const ACADEMY_DESK_PLACEMENTS: ClassroomPropPlacement[] = [
  { id: "left-front-1", assetType: "academy-desk", position: [-4.95, 0.93, 0.65], rotation: [0, 3.1, 0], scale: 0.85 },
  { id: "left-front-2", assetType: "academy-desk", position: [-2.55, 0.83, 0.65], rotation: [0, 3.2, 0], scale: 0.825 },
  { id: "left-mid-1", assetType: "academy-desk", position: [-4.95, 0.93, 2.55], rotation: [0, 3.1, 0], scale: 0.85 },
  { id: "left-mid-2", assetType: "academy-desk", position: [-2.55, 0.98, 2.75], rotation: [0, 3.1, 0], scale: 0.8 },
  { id: "left-back-1", assetType: "academy-desk", position: [-4.95, 0.88, 4.45], rotation: [0, 3.1, 0], scale: 0.775 },
  { id: "left-back-2", assetType: "academy-desk", position: [-2.55, 0.88, 4.65], rotation: [0, 3.1, 0], scale: 0.725 },

  { id: "right-front-1", assetType: "academy-desk", position: [2.45, 0.33, 1.05], rotation: [0, 0, 0], scale: 0.25 },
  { id: "right-front-2", assetType: "academy-desk", position: [3.85, 0.33, 1.05], rotation: [0, 0, 0], scale: 0.25 },
  { id: "right-mid-1", assetType: "academy-desk", position: [2.45, 0.33, 2.05], rotation: [0, 0, 0], scale: 0.25 },
  { id: "right-mid-2", assetType: "academy-desk", position: [3.85, 0.33, 2.05], rotation: [0, 0, 0], scale: 0.25 },
  { id: "right-back-1", assetType: "academy-desk", position: [2.45, 0.33, 3.05], rotation: [0, 0, 0], scale: 0.25 },
  { id: "right-back-2", assetType: "academy-desk", position: [3.85, 0.33, 3.05], rotation: [0, 0, 0], scale: 0.25 },
];

const EMBERCUB_PLACEMENTS: ClassroomPropPlacement[] = [
  {
    id: "embercub-1",
    assetType: "embercub",
    label: "Embercub (Pet)",
    position: [-0.55, 0, 2.0],
    rotation: [0, 3.75, 0],
    scale: 0.45,
  },
];

const CLASSROOM_ASSET_PLACEMENTS: ClassroomPropPlacement[] = [
  ...ACADEMY_DESK_PLACEMENTS,
  ...EMBERCUB_PLACEMENTS,
];

const HOTSPOTS: HotspotInfo[] = [
  {
    id: "quest-board",
    title: "Quest Board",
    label: "Assignments",
    subtitle: "Class quests and active learning tasks.",
    body: "Teacher-created assignments appear here as classroom quests. This is the main daily action loop for students.",
    cta: "Open Quest Board",
    icon: "📋",
    position: [0, 1.15, -3.05],
    size: [3.4, 1.15, 0.22],
    color: "#79d96b",
  },
  {
    id: "student-desks",
    title: "Student Desks",
    label: "Roster",
    subtitle: "Safe classroom presence for students.",
    body: "This area represents student seats, roster presence, and future classmate avatars. Keep it async and safe: no free chat, no open social layer.",
    cta: "View Student Roster",
    icon: "🎒",
    position: [-0.45, 0.08, 1.0],
    size: [4.7, 0.14, 2.35],
    color: "#7ee7ff",
  },
  {
    id: "pet-corner",
    title: "Pet Corner",
    label: "Class Pet",
    subtitle: "The pet's daily classroom home.",
    body: "This is a small emotional anchor in the classroom. Full pet progression belongs in the Pet Sanctuary, but the class pet should feel present here every day.",
    cta: "Visit Class Pet",
    icon: "🐾",
    position: [-4.1, 0.36, 2.35],
    size: [1.15, 0.75, 1.15],
    color: "#84e66a",
  },
  {
    id: "rewards",
    title: "Rewards & Trophy Wall",
    label: "Milestones",
    subtitle: "Class wins, rewards, badges, and celebrations.",
    body: "This wall shows progress history: completed class goals, unlocked rewards, weekly achievements, and trophies earned through learning.",
    cta: "View Rewards",
    icon: "🏆",
    position: [-4.35, 1.0, -0.7],
    size: [0.22, 2.05, 3.2],
    color: "#b457ff",
  },
  {
    id: "door",
    title: "Door to Courtyard",
    label: "Exit",
    subtitle: "Future route to the Academy Courtyard.",
    body: "This will transition the player from the classroom to the academy courtyard or hallway hub. For now it proves routing intent.",
    cta: "Exit Coming Soon",
    icon: "🚪",
    position: [4.25, 0.72, 0.75],
    size: [0.28, 1.45, 1.1],
    color: "#ffb347",
  },
  {
    id: "teacher",
    title: "Teacher Area",
    label: "Teacher",
    subtitle: "Teacher dashboard and daily class controls.",
    body: "This area will become the teacher's classroom command space: announcements, daily prompts, assignment creation, and class settings.",
    cta: "Open Teacher Tools",
    icon: "🧑‍🏫",
    position: [0.15, 0.8, -2.55],
    size: [1.3, 1.6, 0.45],
    color: "#7c5cff",
  },
];

const HOTSPOT_LOOKUP = HOTSPOTS.reduce(
  (lookup, hotspot) => {
    lookup[hotspot.id] = hotspot;
    return lookup;
  },
  {} as Record<HotspotKey, HotspotInfo>,
);

function getDefaultScaleForAsset(assetType: ClassroomAssetType) {
  return assetType === "embercub" ? EMBERCUB_MODEL_SCALE : ACADEMY_DESK_MODEL_SCALE;
}

function clonePlacement(placement: ClassroomPropPlacement): ClassroomPropPlacement {
  return {
    ...placement,
    position: [...placement.position] as [number, number, number],
    rotation: placement.rotation
      ? ([...placement.rotation] as [number, number, number])
      : ([0, 0, 0] as [number, number, number]),
    scale: placement.scale || getDefaultScaleForAsset(placement.assetType),
  };
}

function cloneDefaultPlacements() {
  return CLASSROOM_ASSET_PLACEMENTS.map(clonePlacement);
}

function normalizePlacement(
  placement: ClassroomPropPlacement,
  fallback?: ClassroomPropPlacement,
): ClassroomPropPlacement {
  const assetType = placement.assetType || fallback?.assetType || "academy-desk";

  return {
    ...(fallback || {}),
    ...placement,
    assetType,
    label: placement.label || fallback?.label,
    position: [...(placement.position || fallback?.position || [0, 0, 0])] as [
      number,
      number,
      number,
    ],
    rotation: placement.rotation
      ? ([...placement.rotation] as [number, number, number])
      : fallback?.rotation
        ? ([...fallback.rotation] as [number, number, number])
        : ([0, 0, 0] as [number, number, number]),
    scale:
      placement.scale ||
      fallback?.scale ||
      getDefaultScaleForAsset(assetType),
  };
}

function loadSavedPlacements() {
  if (typeof window === "undefined") return cloneDefaultPlacements();

  try {
    const saved = window.localStorage.getItem(DEV_PLACEMENT_STORAGE_KEY);
    if (!saved) return cloneDefaultPlacements();

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return cloneDefaultPlacements();

    const savedById = new Map<string, ClassroomPropPlacement>();
    parsed.forEach((placement: ClassroomPropPlacement) => {
      if (placement?.id) {
        savedById.set(placement.id, placement);
      }
    });

    return cloneDefaultPlacements().map((defaultPlacement) =>
      normalizePlacement(savedById.get(defaultPlacement.id) || defaultPlacement, defaultPlacement),
    );
  } catch {
    return cloneDefaultPlacements();
  }
}

function formatNumber(value: number) {
  return Number(value.toFixed(3));
}

function formatPlacementCode(placements: ClassroomPropPlacement[]) {
  const rows = placements
    .map((placement) => {
      const position = placement.position.map(formatNumber).join(", ");
      const rotation = (placement.rotation || [0, 0, 0])
        .map(formatNumber)
        .join(", ");
      const scale = formatNumber(
        placement.scale || getDefaultScaleForAsset(placement.assetType),
      );
      const label = placement.label ? `, label: "${placement.label}"` : "";

      return `  { id: "${placement.id}", assetType: "${placement.assetType}"${label}, position: [${position}], rotation: [${rotation}], scale: ${scale} },`;
    })
    .join("\n");

  return `const CLASSROOM_ASSET_PLACEMENTS: ClassroomPropPlacement[] = [\n${rows}\n];`;
}

function asLabel(value: any, fallback: string) {
  if (value === null || value === undefined || value === "") return fallback;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function getAssignmentTitle(assignment: any, index: number) {
  return asLabel(
    assignment?.title || assignment?.name || assignment?.assignmentTitle,
    `Quest ${index + 1}`,
  );
}

function getGoalTitle(goal: any, index: number) {
  return asLabel(goal?.title || goal?.name || goal?.goalTitle, `Goal ${index + 1}`);
}

function getRewardTitle(reward: any, index: number) {
  return asLabel(
    reward?.title || reward?.name || reward?.rewardName,
    `Reward ${index + 1}`,
  );
}

function useKeyboardMovement() {
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

function PlayerAvatarModel() {
  const gltf = useGLTF(PLAYER_MODEL_PATH) as any;
  const avatarScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  return (
    <primitive
      object={avatarScene}
      position={[0, -0.05, 0]}
      rotation={[0, Math.PI, 0]}
      scale={PLAYER_MODEL_SCALE}
    />
  );
}

function ModelAsset({
  placement,
  devMode,
  isSelected,
  onSelect,
}: {
  placement: ClassroomPropPlacement;
  devMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const modelPath =
    placement.assetType === "embercub"
      ? EMBERCUB_MODEL_PATH
      : ACADEMY_DESK_MODEL_PATH;
  const gltf = useGLTF(modelPath) as any;

  const scene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    clonedScene.traverse((child: any) => {
      if (child?.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return clonedScene;
  }, [gltf.scene]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!devMode) return;
    event.stopPropagation();
    onSelect(placement.id);
  };

  const label = placement.label || placement.id;
  const labelHeight = placement.assetType === "embercub" ? 1.15 : 0.65;

  return (
    <group
      position={placement.position}
      rotation={placement.rotation || [0, 0, 0]}
      scale={placement.scale || getDefaultScaleForAsset(placement.assetType)}
      onClick={handleClick}
    >
      <primitive object={scene} />

      {devMode || placement.assetType === "embercub" ? (
        <Html position={[0, labelHeight, 0]} center>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(placement.id);
            }}
            style={{
              ...(placement.assetType === "embercub"
                ? floatingLabelStyle
                : devAssetTagStyle),
              ...(devMode ? devAssetTagStyle : {}),
              ...(isSelected ? devAssetTagActiveStyle : {}),
            }}
          >
            {label}
          </button>
        </Html>
      ) : null}
    </group>
  );
}

function AssetLayout({
  placements,
  devMode,
  selectedPropId,
  onSelectProp,
}: {
  placements: ClassroomPropPlacement[];
  devMode: boolean;
  selectedPropId: string | null;
  onSelectProp: (id: string) => void;
}) {
  return (
    <>
      {placements.map((placement) => (
        <ModelAsset
          key={placement.id}
          placement={placement}
          devMode={devMode}
          isSelected={selectedPropId === placement.id}
          onSelect={onSelectProp}
        />
      ))}
    </>
  );
}

function PlayerMarker({
  playerPositionRef,
}: {
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const keysRef = useKeyboardMovement();

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const speed = 2.5;
    const moveX =
      (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
    const moveZ =
      (keysRef.current.backward ? 1 : 0) - (keysRef.current.forward ? 1 : 0);

    if (moveX !== 0 || moveZ !== 0) {
      const movement = new THREE.Vector3(moveX, 0, moveZ);
      movement.normalize().multiplyScalar(speed * delta);

      group.position.add(movement);
      group.position.x = THREE.MathUtils.clamp(
        group.position.x,
        PLAYER_BOUNDS.minX,
        PLAYER_BOUNDS.maxX,
      );
      group.position.z = THREE.MathUtils.clamp(
        group.position.z,
        PLAYER_BOUNDS.minZ,
        PLAYER_BOUNDS.maxZ,
      );

      group.rotation.y = Math.atan2(moveX, moveZ) + Math.PI;
    }

    playerPositionRef.current.copy(group.position);
  });

  return (
    <group ref={groupRef} position={PLAYER_START_POSITION.toArray()}>
      <PlayerAvatarModel />
      <Html position={[0, 1.25, 0]} center>
        <div style={floatingLabelStyle}>Player</div>
      </Html>
    </group>
  );
}

function ClassroomHotspot({
  hotspot,
  isActive,
  onSelect,
  showDevZone,
}: {
  hotspot: HotspotInfo;
  isActive: boolean;
  onSelect: (id: HotspotKey) => void;
  showDevZone: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const opacity = showDevZone ? (isActive ? 0.22 : isHovered ? 0.16 : 0.05) : 0;
  const showLabel = isActive || isHovered || !showDevZone;

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

      {showLabel && (
        <Html position={[0, hotspot.size[1] / 2 + 0.22, 0]} center>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(hotspot.id);
            }}
            style={{
              ...compactHotspotLabelStyle,
              borderColor: isActive
                ? "rgba(124,92,255,0.75)"
                : "rgba(124,92,255,0.35)",
              boxShadow: isActive
                ? `0 0 0 4px ${hotspot.color}33`
                : "0 8px 18px rgba(38,31,72,0.16)",
            }}
            aria-label={hotspot.title}
            title={hotspot.title}
          >
            {hotspot.icon}
          </button>
        </Html>
      )}
    </group>
  );
}

function ClassroomHotspots({
  activeHotspot,
  onSelect,
  showDevZones,
}: {
  activeHotspot: HotspotKey;
  onSelect: (id: HotspotKey) => void;
  showDevZones: boolean;
}) {
  return (
    <>
      {HOTSPOTS.map((hotspot) => (
        <ClassroomHotspot
          key={hotspot.id}
          hotspot={hotspot}
          isActive={activeHotspot === hotspot.id}
          onSelect={onSelect}
          showDevZone={showDevZones}
        />
      ))}
    </>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div style={loadingStyle}>Loading classroom...</div>
    </Html>
  );
}

function CameraRig({
  cameraMode,
  playerPositionRef,
}: {
  cameraMode: CameraMode;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
}) {
  useFrame(({ camera }) => {
    if (cameraMode === "orbit") return;

    const playerPosition = playerPositionRef.current;

    if (cameraMode === "follow") {
      const targetPosition = new THREE.Vector3(
        playerPosition.x + 2.4,
        playerPosition.y + 3.2,
        playerPosition.z + 4.8,
      );
      camera.position.lerp(targetPosition, 0.08);
      camera.lookAt(playerPosition.x, playerPosition.y + 0.8, playerPosition.z);
    }

    if (cameraMode === "top") {
      const targetPosition = new THREE.Vector3(
        playerPosition.x,
        playerPosition.y + 9.5,
        playerPosition.z + 0.01,
      );
      camera.position.lerp(targetPosition, 0.1);
      camera.lookAt(playerPosition.x, playerPosition.y, playerPosition.z);
    }
  });

  return null;
}

function Scene({
  activeHotspot,
  onSelectHotspot,
  showDevZones,
  cameraMode,
  playerPositionRef,
  placements,
  devMode,
  selectedPropId,
  onSelectProp,
}: {
  activeHotspot: HotspotKey;
  onSelectHotspot: (id: HotspotKey) => void;
  showDevZones: boolean;
  cameraMode: CameraMode;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  placements: ClassroomPropPlacement[];
  devMode: boolean;
  selectedPropId: string | null;
  onSelectProp: (id: string) => void;
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
        <AssetLayout
          placements={placements}
          devMode={devMode}
          selectedPropId={selectedPropId}
          onSelectProp={onSelectProp}
        />
        <PlayerMarker playerPositionRef={playerPositionRef} />
        <ClassroomHotspots
          activeHotspot={activeHotspot}
          onSelect={onSelectHotspot}
          showDevZones={showDevZones}
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

      <CameraRig cameraMode={cameraMode} playerPositionRef={playerPositionRef} />

      <OrbitControls
        makeDefault
        enabled={cameraMode === "orbit"}
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

function DevPlacementPanel({
  placements,
  selectedPropId,
  onSelectProp,
  onNudge,
  onRotate,
  onScale,
  onSaveLocal,
  onReset,
  onCopyCode,
}: {
  placements: ClassroomPropPlacement[];
  selectedPropId: string | null;
  onSelectProp: (id: string) => void;
  onNudge: (axis: "x" | "y" | "z", amount: number) => void;
  onRotate: (amount: number) => void;
  onScale: (amount: number) => void;
  onSaveLocal: () => void;
  onReset: () => void;
  onCopyCode: () => void;
}) {
  const selectedPlacement =
    placements.find((placement) => placement.id === selectedPropId) ||
    placements[0] ||
    null;

  return (
    <aside style={devPanelShellStyle}>
      <div style={devPanelCardStyle}>
        <div style={eyebrowStyle}>Dev Mode</div>
        <h2 style={devPanelTitleStyle}>Asset Placement</h2>
        <p style={miniTextStyle}>
          Select a desk or pet, nudge position, rotate, scale, then copy the
          placement code into the file when it looks right.
        </p>

        <label style={devLabelStyle}>
          Selected asset
          <select
            value={selectedPlacement?.id || ""}
            onChange={(event) => onSelectProp(event.target.value)}
            style={devSelectStyle}
          >
            {placements.map((placement) => (
              <option key={placement.id} value={placement.id}>
                {placement.label || placement.id}
              </option>
            ))}
          </select>
        </label>

        {selectedPlacement && (
          <div style={devReadoutStyle}>
            <div>
              <strong>Asset</strong>
              <span>{selectedPlacement.label || selectedPlacement.id}</span>
            </div>
            <div>
              <strong>Type</strong>
              <span>{selectedPlacement.assetType}</span>
            </div>
            <div>
              <strong>Position</strong>
              <span>{selectedPlacement.position.map(formatNumber).join(", ")}</span>
            </div>
            <div>
              <strong>Rotation Y</strong>
              <span>{formatNumber((selectedPlacement.rotation || [0, 0, 0])[1])}</span>
            </div>
            <div>
              <strong>Scale</strong>
              <span>
                {formatNumber(
                  selectedPlacement.scale ||
                    getDefaultScaleForAsset(selectedPlacement.assetType),
                )}
              </span>
            </div>
          </div>
        )}

        <div style={devControlGroupStyle}>
          <span style={devControlLabelStyle}>Nudge position</span>
          <div style={devButtonGridStyle}>
            <button type="button" onClick={() => onNudge("x", -0.1)} style={devButtonStyle}>
              X -
            </button>
            <button type="button" onClick={() => onNudge("x", 0.1)} style={devButtonStyle}>
              X +
            </button>
            <button type="button" onClick={() => onNudge("z", -0.1)} style={devButtonStyle}>
              Z -
            </button>
            <button type="button" onClick={() => onNudge("z", 0.1)} style={devButtonStyle}>
              Z +
            </button>
            <button type="button" onClick={() => onNudge("y", -0.05)} style={devButtonStyle}>
              Y -
            </button>
            <button type="button" onClick={() => onNudge("y", 0.05)} style={devButtonStyle}>
              Y +
            </button>
          </div>
        </div>

        <div style={devControlGroupStyle}>
          <span style={devControlLabelStyle}>Rotate / scale</span>
          <div style={devButtonGridStyle}>
            <button type="button" onClick={() => onRotate(-0.1)} style={devButtonStyle}>
              Rot -
            </button>
            <button type="button" onClick={() => onRotate(0.1)} style={devButtonStyle}>
              Rot +
            </button>
            <button type="button" onClick={() => onScale(-0.025)} style={devButtonStyle}>
              Scale -
            </button>
            <button type="button" onClick={() => onScale(0.025)} style={devButtonStyle}>
              Scale +
            </button>
          </div>
        </div>

        <div style={devActionRowStyle}>
          <button type="button" onClick={onSaveLocal} style={devPrimaryButtonStyle}>
            Save browser
          </button>
          <button type="button" onClick={onCopyCode} style={devPrimaryButtonStyle}>
            Copy code
          </button>
          <button type="button" onClick={onReset} style={devDangerButtonStyle}>
            Reset
          </button>
        </div>
      </div>
    </aside>
  );
}

function HotspotPanel({
  activeHotspot,
  onSelect,
  data,
}: {
  activeHotspot: HotspotKey;
  onSelect: (id: HotspotKey) => void;
  data: ClassroomPanelData;
}) {
  const active = HOTSPOT_LOOKUP[activeHotspot];

  return (
    <aside style={panelShellStyle}>
      <div style={panelCardStyle}>
        <div style={panelHeaderStyle}>
          <div style={eyebrowStyle}>TEA-166 Hotspot</div>
          <h2 style={panelTitleStyle}>{active.title}</h2>
          <p style={panelSubtitleStyle}>{active.subtitle}</p>
        </div>

        <div style={{ overflow: "auto", padding: "14px 16px 16px" }}>
          <p style={bodyTextStyle}>{active.body}</p>

          <PanelContent activeHotspot={activeHotspot} data={data} />

          <button type="button" style={primaryButtonStyle}>
            {active.cta}
          </button>

          <div style={{ display: "grid", gap: "8px", marginTop: "16px" }}>
            {HOTSPOTS.map((hotspot) => (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => onSelect(hotspot.id)}
                style={{
                  ...hotspotNavButtonStyle,
                  background:
                    hotspot.id === activeHotspot
                      ? "rgba(124,92,255,0.12)"
                      : "rgba(255,255,255,0.72)",
                  border:
                    hotspot.id === activeHotspot
                      ? "2px solid rgba(124,92,255,0.35)"
                      : "2px solid rgba(124,92,255,0.08)",
                }}
              >
                <span>{hotspot.label}</span>
                <span style={{ color: hotspot.color }}>•</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function PanelContent({
  activeHotspot,
  data,
}: {
  activeHotspot: HotspotKey;
  data: ClassroomPanelData;
}) {
  if (activeHotspot === "quest-board") {
    return <QuestBoardPanel data={data} />;
  }

  if (activeHotspot === "pet-corner") {
    return <PetCornerPanel data={data} />;
  }

  if (activeHotspot === "rewards") {
    return <RewardsPanel data={data} />;
  }

  if (activeHotspot === "student-desks") {
    return <StudentRosterPanel data={data} />;
  }

  if (activeHotspot === "door") {
    return <DoorPanel />;
  }

  return <TeacherPanel data={data} />;
}

function QuestBoardPanel({ data }: { data: ClassroomPanelData }) {
  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderRowStyle}>
        <span style={sectionLabelStyle}>Active quests</span>
        <span style={countPillStyle}>{data.assignments.length}</span>
      </div>

      {data.assignments.length ? (
        <div style={listStackStyle}>
          {data.assignments.slice(0, 4).map((assignment, index) => (
            <InfoCard key={assignment?.id || index}>
              <strong>{getAssignmentTitle(assignment, index)}</strong>
              <p style={miniTextStyle}>
                {asLabel(assignment?.subject || assignment?.type, "Learning quest")}
              </p>
            </InfoCard>
          ))}
        </div>
      ) : (
        <EmptyCard
          title="No active quests yet"
          body="Teacher assignments will appear here when a classroom has active work."
        />
      )}
    </section>
  );
}

function PetCornerPanel({ data }: { data: ClassroomPanelData }) {
  const pet = data.classroom?.pet || data.classroom?.classPet || null;

  return (
    <section style={sectionStyle}>
      <InfoCard>
        <strong>{asLabel(pet?.name || pet?.petName, "Embercub")}</strong>
        <p style={miniTextStyle}>
          {asLabel(
            pet?.description || pet?.status,
            "Class pet is present and ready for future feeding, bonding, and daily care loops.",
          )}
        </p>
      </InfoCard>
      <InfoCard>
        <strong>Future loop</strong>
        <p style={miniTextStyle}>
          Feed, care, classroom streaks, and class-wide pet progression.
        </p>
      </InfoCard>
    </section>
  );
}

function RewardsPanel({ data }: { data: ClassroomPanelData }) {
  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderRowStyle}>
        <span style={sectionLabelStyle}>Goals</span>
        <span style={countPillStyle}>{data.goals.length}</span>
      </div>

      {data.goals.length ? (
        <div style={listStackStyle}>
          {data.goals.slice(0, 3).map((goal, index) => (
            <InfoCard key={goal?.id || index}>
              <strong>{getGoalTitle(goal, index)}</strong>
              <p style={miniTextStyle}>
                {asLabel(goal?.description || goal?.status, "Class milestone in progress")}
              </p>
            </InfoCard>
          ))}
        </div>
      ) : (
        <EmptyCard
          title="No trophy goals yet"
          body="Class goals and completed assignment milestones will light up this wall."
        />
      )}

      <div style={{ ...sectionHeaderRowStyle, marginTop: "12px" }}>
        <span style={sectionLabelStyle}>Reward log</span>
        <span style={countPillStyle}>{data.rewardLogs.length}</span>
      </div>

      {data.rewardLogs.length ? (
        <div style={listStackStyle}>
          {data.rewardLogs.slice(0, 3).map((reward, index) => (
            <InfoCard key={reward?.id || index}>
              <strong>{getRewardTitle(reward, index)}</strong>
              <p style={miniTextStyle}>
                {asLabel(reward?.createdAt || reward?.date, "Recently earned")}
              </p>
            </InfoCard>
          ))}
        </div>
      ) : (
        <EmptyCard
          title="Reward chest is empty"
          body="Teacher-issued rewards and earned gifts will show here."
        />
      )}
    </section>
  );
}

function StudentRosterPanel({ data }: { data: ClassroomPanelData }) {
  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderRowStyle}>
        <span style={sectionLabelStyle}>Class roster</span>
        <span style={countPillStyle}>{data.members.length}</span>
      </div>

      {data.members.length ? (
        <div style={rosterGridStyle}>
          {data.members.slice(0, 8).map((member, index) => (
            <div key={member?.id || index} style={rosterCardStyle}>
              <div style={avatarBubbleStyle}>
                {asLabel(member?.displayName || member?.name, "?")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
              <span>
                {asLabel(member?.displayName || member?.name, "Student")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyCard
          title="No students seated yet"
          body="Joined students will eventually appear as safe presence markers around this area."
        />
      )}
    </section>
  );
}

function TeacherPanel({ data }: { data: ClassroomPanelData }) {
  return (
    <section style={sectionStyle}>
      <InfoCard>
        <strong>{asLabel(data.classroom?.teacherName, "Teacher")}</strong>
        <p style={miniTextStyle}>
          Daily prompt, class announcement, and teacher avatar will live here.
        </p>
      </InfoCard>
      <InfoCard>
        <strong>
          {asLabel(
            data.classroom?.room?.roomName || data.classroom?.roomName,
            "Classroom",
          )}
        </strong>
        <p style={miniTextStyle}>
          {data.classroom?.subjectFocus?.length
            ? `Focus: ${data.classroom.subjectFocus.join(", ")}`
            : "Subject focus will appear here."}
        </p>
      </InfoCard>
    </section>
  );
}

function DoorPanel() {
  return (
    <section style={sectionStyle}>
      <InfoCard>
        <strong>Courtyard transition placeholder</strong>
        <p style={miniTextStyle}>
          Next step: click this door to fade out and load the Academy Courtyard
          route or scene.
        </p>
      </InfoCard>
    </section>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={emptyCardStyle}>
      <strong>{title}</strong>
      <p style={miniTextStyle}>{body}</p>
    </div>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return <div style={infoCardStyle}>{children}</div>;
}

function ViewModeControls({
  showDevZones,
  setShowDevZones,
  devMode,
  setDevMode,
  resetHotspot,
  cameraMode,
  setCameraMode,
}: {
  showDevZones: boolean;
  setShowDevZones: (value: boolean) => void;
  devMode: boolean;
  setDevMode: (value: boolean) => void;
  resetHotspot: () => void;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
}) {
  const goBackToDashboard = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div style={bottomControlsStyle}>
      <button
        type="button"
        onClick={() => setDevMode(!devMode)}
        style={{
          ...smallButtonStyle,
          ...(devMode ? activeSmallButtonStyle : {}),
        }}
      >
        {devMode ? "Dev mode on" : "Dev mode"}
      </button>
      <button
        type="button"
        onClick={() => setShowDevZones(!showDevZones)}
        style={smallButtonStyle}
      >
        {showDevZones ? "Student mode" : "Dev zones"}
      </button>
      <button
        type="button"
        onClick={() => setCameraMode("orbit")}
        style={{
          ...smallButtonStyle,
          ...(cameraMode === "orbit" ? activeSmallButtonStyle : {}),
        }}
      >
        Orbit
      </button>
      <button
        type="button"
        onClick={() => setCameraMode("follow")}
        style={{
          ...smallButtonStyle,
          ...(cameraMode === "follow" ? activeSmallButtonStyle : {}),
        }}
      >
        Follow
      </button>
      <button
        type="button"
        onClick={() => setCameraMode("top")}
        style={{
          ...smallButtonStyle,
          ...(cameraMode === "top" ? activeSmallButtonStyle : {}),
        }}
      >
        Top
      </button>
      <button type="button" onClick={resetHotspot} style={smallButtonStyle}>
        Reset panel
      </button>
      <button type="button" onClick={goBackToDashboard} style={smallButtonStyle}>
        Back to Dashboard
      </button>
    </div>
  );
}

export default function Classroom() {
  const [showHelp, setShowHelp] = useState(true);
  const [showDevZones, setShowDevZones] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [activeHotspot, setActiveHotspot] = useState<HotspotKey>("quest-board");
  const [placements, setPlacements] = useState<ClassroomPropPlacement[]>(
    loadSavedPlacements,
  );
  const [selectedPropId, setSelectedPropId] = useState<string | null>(
    CLASSROOM_ASSET_PLACEMENTS[0]?.id || null,
  );
  const playerPositionRef = useRef(PLAYER_START_POSITION.clone());

  const classrooms = useClassroomWorldStore(
    (state: any) => state.classrooms || [],
  );
  const selectedClassroomId = useClassroomWorldStore(
    (state: any) => state.selectedClassroomId,
  );
  const goals = useClassroomWorldStore((state: any) => state.goals || []);
  const rewardLogs = useClassroomWorldStore(
    (state: any) => state.rewardLogs || [],
  );
  const events = useClassroomWorldStore((state: any) => state.events || []);

  const selectedClassroom = useMemo(() => {
    return (
      classrooms.find(
        (classroom: any) => classroom.id === selectedClassroomId,
      ) ||
      classrooms[0] ||
      null
    );
  }, [classrooms, selectedClassroomId]);

  const panelData = useMemo<ClassroomPanelData>(() => {
    const classroomId = selectedClassroom?.id;
    const assignmentRefs = selectedClassroom?.assignmentRefs || [];

    return {
      classroom: selectedClassroom,
      assignments: assignmentRefs.filter(
        (assignment: any) => assignment?.status !== "completed",
      ),
      completedAssignments: assignmentRefs.filter(
        (assignment: any) => assignment?.status === "completed",
      ),
      goals: classroomId
        ? goals.filter((goal: any) => goal?.classroomId === classroomId)
        : [],
      rewardLogs: classroomId
        ? rewardLogs.filter(
            (reward: any) => reward?.classroomId === classroomId,
          )
        : [],
      events: classroomId
        ? events.filter((event: any) => event?.classroomId === classroomId)
        : [],
      members: selectedClassroom?.members || [],
    };
  }, [events, goals, rewardLogs, selectedClassroom]);

  const helpText = useMemo(() => {
    if (devMode) {
      return "Dev Mode is on. Select desk or pet assets in the scene or panel, then nudge position, rotation, and scale.";
    }

    if (showDevZones) {
      return "Developer zones are visible. Click a zone or icon to inspect the classroom panel.";
    }

    return "WASD / arrow keys move the player. Drag to orbit. Click the floating icons to open classroom panels.";
  }, [devMode, showDevZones]);

  const updateSelectedPlacement = (
    updater: (placement: ClassroomPropPlacement) => ClassroomPropPlacement,
  ) => {
    const targetId = selectedPropId || placements[0]?.id;
    if (!targetId) return;

    setPlacements((currentPlacements) =>
      currentPlacements.map((placement) =>
        placement.id === targetId ? updater(placement) : placement,
      ),
    );
  };

  const nudgeSelectedPlacement = (axis: "x" | "y" | "z", amount: number) => {
    const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;

    updateSelectedPlacement((placement) => {
      const nextPosition = [...placement.position] as [number, number, number];
      nextPosition[axisIndex] = formatNumber(nextPosition[axisIndex] + amount);

      return { ...placement, position: nextPosition };
    });
  };

  const rotateSelectedPlacement = (amount: number) => {
    updateSelectedPlacement((placement) => {
      const nextRotation = (placement.rotation
        ? [...placement.rotation]
        : [0, 0, 0]) as [number, number, number];

      nextRotation[1] = formatNumber(nextRotation[1] + amount);

      return { ...placement, rotation: nextRotation };
    });
  };

  const scaleSelectedPlacement = (amount: number) => {
    updateSelectedPlacement((placement) => {
      const currentScale =
        placement.scale || getDefaultScaleForAsset(placement.assetType);
      const nextScale = Math.max(0.025, formatNumber(currentScale + amount));

      return { ...placement, scale: nextScale };
    });
  };

  const savePlacementsToBrowser = () => {
    window.localStorage.setItem(
      DEV_PLACEMENT_STORAGE_KEY,
      JSON.stringify(placements),
    );
  };

  const resetPlacements = () => {
    const reset = cloneDefaultPlacements();
    setPlacements(reset);
    setSelectedPropId(reset[0]?.id || null);
    window.localStorage.removeItem(DEV_PLACEMENT_STORAGE_KEY);
  };

  const copyPlacementCode = () => {
    const code = formatPlacementCode(placements);

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(code);
    }

    console.info(code);
  };

  return (
    <main style={pageStyle}>
      <div style={helpCardShellStyle}>
        <div style={helpCardStyle}>
          <div style={eyebrowStyle}>TEA-166 Interactable 3D Classroom</div>
          <h1 style={titleStyle}>Classroom Hub Prototype</h1>
          {showHelp && <p style={helpTextStyle}>{helpText}</p>}
          <button
            type="button"
            onClick={() => setShowHelp((value) => !value)}
            style={helpButtonStyle}
          >
            {showHelp ? "Hide help" : "Show help"}
          </button>
        </div>
      </div>

      <HotspotPanel
        activeHotspot={activeHotspot}
        onSelect={setActiveHotspot}
        data={panelData}
      />

      {devMode && (
        <DevPlacementPanel
          placements={placements}
          selectedPropId={selectedPropId}
          onSelectProp={setSelectedPropId}
          onNudge={nudgeSelectedPlacement}
          onRotate={rotateSelectedPlacement}
          onScale={scaleSelectedPlacement}
          onSaveLocal={savePlacementsToBrowser}
          onReset={resetPlacements}
          onCopyCode={copyPlacementCode}
        />
      )}

      <ViewModeControls
        showDevZones={showDevZones}
        setShowDevZones={setShowDevZones}
        devMode={devMode}
        setDevMode={setDevMode}
        resetHotspot={() => setActiveHotspot("quest-board")}
        cameraMode={cameraMode}
        setCameraMode={setCameraMode}
      />

      <Canvas
        camera={{ position: [5, 5, 7], fov: 45 }}
        shadows
        gl={{ antialias: true }}
      >
        <Scene
          activeHotspot={activeHotspot}
          onSelectHotspot={setActiveHotspot}
          showDevZones={showDevZones}
          cameraMode={cameraMode}
          playerPositionRef={playerPositionRef}
          placements={placements}
          devMode={devMode}
          selectedPropId={selectedPropId}
          onSelectProp={setSelectedPropId}
        />
      </Canvas>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #fff8de 0%, #e8f7ff 45%, #f4e9ff 100%)",
  height: "100vh",
  overflow: "hidden",
  position: "relative",
  width: "100vw",
};

const helpCardShellStyle: React.CSSProperties = {
  left: 18,
  position: "absolute",
  top: 18,
  zIndex: 10,
};

const helpCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "2px solid rgba(124,92,255,0.2)",
  borderRadius: "22px",
  boxShadow: "0 14px 35px rgba(38,31,72,0.12)",
  padding: "14px 16px",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#7c5cff",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  color: "#24183f",
  fontSize: "24px",
  lineHeight: 1,
  margin: "5px 0 0",
};

const helpTextStyle: React.CSSProperties = {
  color: "#6f6687",
  fontSize: "12px",
  fontWeight: 700,
  margin: "8px 0 0",
  maxWidth: "300px",
};

const helpButtonStyle: React.CSSProperties = {
  background: "#7c5cff",
  border: "0",
  borderRadius: "999px",
  color: "white",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 900,
  marginTop: "10px",
  padding: "7px 11px",
};

const floatingLabelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.96)",
  border: "2px solid rgba(124,92,255,0.35)",
  borderRadius: "999px",
  color: "#2a1f4f",
  fontSize: "11px",
  fontWeight: 900,
  padding: "6px 10px",
  whiteSpace: "nowrap",
};

const compactHotspotLabelStyle: React.CSSProperties = {
  alignItems: "center",
  background: "rgba(255,255,255,0.94)",
  border: "2px solid rgba(124,92,255,0.35)",
  borderRadius: "999px",
  color: "#2a1f4f",
  display: "inline-flex",
  fontSize: "16px",
  fontWeight: 900,
  height: "34px",
  justifyContent: "center",
  padding: 0,
  width: "34px",
  whiteSpace: "nowrap",
};

const loadingStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.95)",
  border: "2px solid rgba(124,92,255,0.25)",
  borderRadius: "18px",
  color: "#2a1f4f",
  fontWeight: 800,
  minWidth: "220px",
  padding: "14px 18px",
  textAlign: "center",
};

const panelShellStyle: React.CSSProperties = {
  bottom: 18,
  position: "absolute",
  right: 18,
  top: 18,
  width: "min(380px, calc(100vw - 36px))",
  zIndex: 10,
};

const panelCardStyle: React.CSSProperties = {
  backdropFilter: "blur(12px)",
  background: "rgba(255,255,255,0.92)",
  border: "2px solid rgba(124,92,255,0.2)",
  borderRadius: "26px",
  boxShadow: "0 18px 45px rgba(38,31,72,0.16)",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
};

const panelHeaderStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(124,92,255,0.16), rgba(126,231,255,0.18))",
  borderBottom: "1px solid rgba(124,92,255,0.16)",
  padding: "16px",
};

const panelTitleStyle: React.CSSProperties = {
  color: "#24183f",
  fontSize: "26px",
  lineHeight: 1,
  margin: "7px 0 0",
};

const panelSubtitleStyle: React.CSSProperties = {
  color: "#6f6687",
  fontSize: "13px",
  fontWeight: 800,
  margin: "8px 0 0",
};

const bodyTextStyle: React.CSSProperties = {
  color: "#3a315c",
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: 1.45,
  margin: 0,
};

const primaryButtonStyle: React.CSSProperties = {
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
};

const hotspotNavButtonStyle: React.CSSProperties = {
  alignItems: "center",
  borderRadius: "16px",
  color: "#24183f",
  cursor: "pointer",
  display: "flex",
  fontSize: "12px",
  fontWeight: 900,
  justifyContent: "space-between",
  padding: "10px 11px",
  textAlign: "left",
};

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
  marginTop: "14px",
};

const sectionHeaderRowStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
};

const sectionLabelStyle: React.CSSProperties = {
  color: "#7c5cff",
  fontSize: "11px",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const countPillStyle: React.CSSProperties = {
  background: "rgba(124,92,255,0.12)",
  borderRadius: "999px",
  color: "#7c5cff",
  fontSize: "11px",
  fontWeight: 950,
  padding: "5px 9px",
};

const listStackStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
};

const infoCardStyle: React.CSSProperties = {
  background: "rgba(255,248,222,0.75)",
  border: "1px solid rgba(255,198,77,0.28)",
  borderRadius: "16px",
  color: "#2a1f4f",
  display: "grid",
  gap: "4px",
  padding: "12px",
};

const emptyCardStyle: React.CSSProperties = {
  ...infoCardStyle,
  background: "rgba(255,248,222,0.82)",
};

const miniTextStyle: React.CSSProperties = {
  color: "#6f6687",
  fontSize: "12px",
  fontWeight: 750,
  lineHeight: 1.35,
  margin: 0,
};

const rosterGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  gridTemplateColumns: "1fr 1fr",
};

const rosterCardStyle: React.CSSProperties = {
  alignItems: "center",
  background: "rgba(255,255,255,0.78)",
  border: "1px solid rgba(124,92,255,0.12)",
  borderRadius: "14px",
  color: "#2a1f4f",
  display: "flex",
  fontSize: "12px",
  fontWeight: 900,
  gap: "8px",
  padding: "8px",
};

const avatarBubbleStyle: React.CSSProperties = {
  alignItems: "center",
  background: "linear-gradient(135deg, #7c5cff, #7ee7ff)",
  borderRadius: "50%",
  color: "white",
  display: "flex",
  flex: "0 0 auto",
  fontSize: "12px",
  fontWeight: 950,
  height: "26px",
  justifyContent: "center",
  width: "26px",
};

const bottomControlsStyle: React.CSSProperties = {
  alignItems: "center",
  bottom: 16,
  display: "flex",
  gap: "8px",
  left: 16,
  position: "absolute",
  zIndex: 20,
};

const smallButtonStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "2px solid rgba(124,92,255,0.18)",
  borderRadius: "999px",
  color: "#2a1f4f",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 900,
  padding: "9px 14px",
};

const activeSmallButtonStyle: React.CSSProperties = {
  background: "rgba(124,92,255,0.16)",
  border: "2px solid rgba(124,92,255,0.55)",
  color: "#4b32bd",
};

const devPanelShellStyle: React.CSSProperties = {
  left: 18,
  position: "absolute",
  top: 148,
  width: "min(330px, calc(100vw - 36px))",
  zIndex: 15,
};

const devPanelCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.94)",
  border: "2px solid rgba(124,92,255,0.22)",
  borderRadius: "22px",
  boxShadow: "0 18px 45px rgba(38,31,72,0.16)",
  display: "grid",
  gap: "12px",
  padding: "14px 16px",
};

const devPanelTitleStyle: React.CSSProperties = {
  color: "#24183f",
  fontSize: "22px",
  lineHeight: 1,
  margin: "2px 0 0",
};

const devLabelStyle: React.CSSProperties = {
  color: "#6f6687",
  display: "grid",
  fontSize: "11px",
  fontWeight: 950,
  gap: "6px",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const devSelectStyle: React.CSSProperties = {
  background: "white",
  border: "2px solid rgba(124,92,255,0.22)",
  borderRadius: "14px",
  color: "#2a1f4f",
  fontSize: "13px",
  fontWeight: 900,
  outline: "none",
  padding: "10px 11px",
};

const devReadoutStyle: React.CSSProperties = {
  background: "rgba(124,92,255,0.09)",
  borderRadius: "16px",
  color: "#2a1f4f",
  display: "grid",
  fontSize: "12px",
  fontWeight: 850,
  gap: "6px",
  padding: "11px",
};

const devControlGroupStyle: React.CSSProperties = {
  display: "grid",
  gap: "7px",
};

const devControlLabelStyle: React.CSSProperties = {
  color: "#7c5cff",
  fontSize: "11px",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const devButtonGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "7px",
  gridTemplateColumns: "1fr 1fr",
};

const devButtonStyle: React.CSSProperties = {
  background: "white",
  border: "2px solid rgba(124,92,255,0.18)",
  borderRadius: "12px",
  color: "#2a1f4f",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 950,
  padding: "9px 10px",
};

const devActionRowStyle: React.CSSProperties = {
  display: "grid",
  gap: "7px",
  gridTemplateColumns: "1fr 1fr 1fr",
};

const devPrimaryButtonStyle: React.CSSProperties = {
  ...devButtonStyle,
  background: "#7c5cff",
  borderColor: "#7c5cff",
  color: "white",
};

const devDangerButtonStyle: React.CSSProperties = {
  ...devButtonStyle,
  background: "#fff8de",
  borderColor: "rgba(255,179,71,0.55)",
};

const devAssetTagStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.96)",
  border: "2px solid rgba(124,92,255,0.35)",
  borderRadius: "999px",
  color: "#2a1f4f",
  cursor: "pointer",
  fontSize: "10px",
  fontWeight: 950,
  padding: "5px 8px",
  whiteSpace: "nowrap",
};

const devAssetTagActiveStyle: React.CSSProperties = {
  background: "#7c5cff",
  borderColor: "#7c5cff",
  color: "white",
};

useGLTF.preload(CLASSROOM_MODEL_PATH);
useGLTF.preload(PLAYER_MODEL_PATH);
useGLTF.preload(EMBERCUB_MODEL_PATH);
useGLTF.preload(ACADEMY_DESK_MODEL_PATH);
