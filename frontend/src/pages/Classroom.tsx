import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
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

type CameraMode = "orbit" | "follow" | "top" | "free";

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
// Keep these values explicit instead of generating them so future dev-mode placement
// commits can replace coordinates cleanly without changing the rendering logic.
const CLASSROOM_ASSET_PLACEMENTS: ClassroomPropPlacement[] = [
  { id: "left-front-1", assetType: "academy-desk", position: [-5.05, 1.08, 0.65], rotation: [0, 3.1, 0], scale: 0.825 },
  { id: "left-front-2", assetType: "academy-desk", position: [-2.55, 1.08, 0.65], rotation: [0, 3.2, 0], scale: 0.825 },
  { id: "left-mid-1", assetType: "academy-desk", position: [-4.95, 1.08, 2.55], rotation: [0, 3.1, 0], scale: 0.825 },
  { id: "left-mid-2", assetType: "academy-desk", position: [-2.55, 1.08, 2.75], rotation: [0, 3.1, 0], scale: 0.825 },
  { id: "left-back-1", assetType: "academy-desk", position: [-4.95, 1.08, 4.45], rotation: [0, 3.1, 0], scale: 0.825 },
  { id: "left-back-2", assetType: "academy-desk", position: [-2.55, 1.08, 4.65], rotation: [0, 3.1, 0], scale: 0.825 },
  { id: "right-front-1", assetType: "academy-desk", position: [2.65, 1.08, 0.75], rotation: [0, 3.2, 0], scale: 0.825 },
  { id: "right-front-2", assetType: "academy-desk", position: [5.05, 1.08, 0.75], rotation: [0, 3.2, 0], scale: 0.825 },
  { id: "right-mid-1", assetType: "academy-desk", position: [2.65, 1.08, 2.75], rotation: [0, 3.3, 0], scale: 0.825 },
  { id: "right-mid-2", assetType: "academy-desk", position: [4.95, 1.08, 2.75], rotation: [0, 3.2, 0], scale: 0.825 },
  { id: "right-back-1", assetType: "academy-desk", position: [2.65, 1.08, 4.55], rotation: [0, 3.2, 0], scale: 0.825 },
  { id: "right-back-2", assetType: "academy-desk", position: [5.05, 1.08, 4.55], rotation: [0, 3.2, 0], scale: 0.825 },
  { id: "embercub-1", assetType: "embercub", label: "Embercub (Pet)", position: [7.65, 1.15, -5], rotation: [0, 5.95, 0], scale: 1.075 },
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

function useKeyboardMovement() {
  const keysRef = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const setKey = (event: KeyboardEvent, value: boolean) => {
      const key = event.key.toLowerCase();

      if (key === "w" || key === "arrowup") keysRef.current.forward = value;
      if (key === "s" || key === "arrowdown") keysRef.current.backward = value;
      if (key === "a" || key === "arrowleft") keysRef.current.left = value;
      if (key === "d" || key === "arrowright") keysRef.current.right = value;
    };

    const onDown = (event: KeyboardEvent) => setKey(event, true);
    const onUp = (event: KeyboardEvent) => setKey(event, false);

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  return keysRef;
}

function ClassroomModel() {
  const gltf = useGLTF(CLASSROOM_MODEL_PATH) as any;
  const classroomScene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);

    clonedScene.traverse((child: any) => {
      if (!child?.isMesh) return;

      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      const isBluePlaceholder = materials.some((material: any) => {
        const color = material?.color;
        if (!color) return false;

        return color.b > 0.55 && color.g > 0.35 && color.r < 0.35;
      });

      if (isBluePlaceholder) {
        child.visible = false;
      }
    });

    return clonedScene;
  }, [gltf.scene]);

  return (
    <primitive
      object={classroomScene}
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

function ClassroomPlacedAssetModel({
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

  const defaultScale =
    placement.assetType === "embercub"
      ? EMBERCUB_MODEL_SCALE
      : ACADEMY_DESK_MODEL_SCALE;

  const gltf = useGLTF(modelPath) as any;
  const assetScene = useMemo(() => {
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

  return (
    <group
      position={placement.position}
      rotation={placement.rotation || [0, 0, 0]}
      scale={placement.scale || defaultScale}
      onClick={handleClick}
    >
      <primitive object={assetScene} />

      {devMode && (
        <Html position={[0, placement.assetType === "embercub" ? 1.15 : 0.65, 0]} center>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(placement.id);
            }}
            style={{
              ...devAssetTagStyle,
              ...(isSelected ? devAssetTagActiveStyle : {}),
            }}
          >
            {placement.label || placement.id}
          </button>
        </Html>
      )}
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
        <ClassroomPlacedAssetModel
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
  controlsEnabled,
}: {
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  controlsEnabled: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const keysRef = useKeyboardMovement();

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!controlsEnabled) {
      playerPositionRef.current.copy(group.position);
      return;
    }

    const speed = 2.5;

    // World-space movement for the classroom blockout:
    // W moves toward the teacher/board wall, S moves toward the open camera side.
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

      if (movement.lengthSq() > 0) {
        group.rotation.y = Math.atan2(movement.x, movement.z) + Math.PI;
      }
    }

    playerPositionRef.current.copy(group.position);
  });

  return (
    <group ref={groupRef} position={PLAYER_START_POSITION.toArray()}>
      <PlayerAvatarModel />
      <Html position={[0, 1.45, 0]} center>
        <div style={floatingLabelStyle}>Student</div>
      </Html>
    </group>
  );
}

function HotspotMarker({
  hotspot,
  active,
  showDevZones,
  onSelect,
}: {
  hotspot: HotspotInfo;
  active: boolean;
  showDevZones: boolean;
  onSelect: (id: HotspotKey) => void;
}) {
  return (
    <group position={hotspot.position}>
      {showDevZones && (
        <mesh
          scale={hotspot.size}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(hotspot.id);
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={hotspot.color}
            transparent
            opacity={active ? 0.35 : 0.16}
            roughness={0.4}
          />
        </mesh>
      )}

      <Html position={[0, hotspot.size[1] + 0.25, 0]} center>
        <button
          type="button"
          onClick={() => onSelect(hotspot.id)}
          style={{
            ...hotspotButtonStyle,
            borderColor: active ? hotspot.color : "rgba(255,255,255,0.65)",
            boxShadow: active
              ? `0 14px 28px ${hotspot.color}44`
              : "0 10px 24px rgba(52, 41, 92, 0.18)",
          }}
        >
          <span style={{ fontSize: "1.15rem" }}>{hotspot.icon}</span>
          <span>{hotspot.label}</span>
        </button>
      </Html>
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
        <HotspotMarker
          key={hotspot.id}
          hotspot={hotspot}
          active={activeHotspot === hotspot.id}
          showDevZones={showDevZones}
          onSelect={onSelect}
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


function DevFreeCamera({
  cameraMode,
}: {
  cameraMode: CameraMode;
}) {
  const keysRef = useKeyboardMovement();
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (cameraMode !== "free") return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;

    if (forward.lengthSq() === 0) return;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    const moveForward =
      (keysRef.current.forward ? 1 : 0) - (keysRef.current.backward ? 1 : 0);
    const moveRight =
      (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);

    if (moveForward === 0 && moveRight === 0) return;

    const movement = new THREE.Vector3();
    movement.addScaledVector(forward, moveForward);
    movement.addScaledVector(right, moveRight);
    movement.normalize().multiplyScalar(7 * delta);

    camera.position.add(movement);
  });

  return null;
}

function CameraRig({
  cameraMode,
  playerPositionRef,
}: {
  cameraMode: CameraMode;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
}) {
  useFrame(({ camera }, delta) => {
    const player = playerPositionRef.current;

    let desiredPosition: THREE.Vector3;

    if (cameraMode === "top") {
      desiredPosition = new THREE.Vector3(player.x, player.y + 12, player.z + 0.1);
    } else if (cameraMode === "follow") {
      desiredPosition = new THREE.Vector3(player.x, player.y + 3.2, player.z + 5.5);
    } else {
      return;
    }

    camera.position.lerp(desiredPosition, Math.min(1, delta * 4.5));

    const lookTarget =
      cameraMode === "top"
        ? new THREE.Vector3(player.x, player.y, player.z)
        : new THREE.Vector3(player.x, player.y + 0.85, player.z);

    camera.lookAt(lookTarget);
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
  const orbitTarget = useMemo<[number, number, number]>(() => {
    if (devMode && selectedPropId) {
      const selectedPlacement = placements.find(
        (placement) => placement.id === selectedPropId,
      );

      if (selectedPlacement) {
        return [
          selectedPlacement.position[0],
          selectedPlacement.position[1] + 0.75,
          selectedPlacement.position[2],
        ];
      }
    }

    return [0, 1, 0];
  }, [devMode, placements, selectedPropId]);

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
        <PlayerMarker
          playerPositionRef={playerPositionRef}
          controlsEnabled={cameraMode !== "free"}
        />
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
      <DevFreeCamera cameraMode={cameraMode} />

      <OrbitControls
        makeDefault
        enabled={cameraMode === "orbit" || cameraMode === "free"}
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2.1}
        target={orbitTarget}
      />
    </>
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

  if (activeHotspot === "teacher") {
    return <TeacherPanel data={data} />;
  }

  return <DoorPanel />;
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
    reward?.title || reward?.name || reward?.rewardTitle,
    `Reward ${index + 1}`,
  );
}

function QuestBoardPanel({ data }: { data: ClassroomPanelData }) {
  const assignments = data.assignments;

  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderRowStyle}>
        <span style={sectionLabelStyle}>Active quests</span>
        <span style={countPillStyle}>{assignments.length}</span>
      </div>

      {assignments.length ? (
        <div style={listStackStyle}>
          {assignments.slice(0, 4).map((assignment, index) => (
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
        <span style={sectionLabelStyle}>Students</span>
        <span style={countPillStyle}>{data.members.length}</span>
      </div>

      {data.members.length ? (
        <div style={listStackStyle}>
          {data.members.slice(0, 5).map((member, index) => (
            <InfoCard key={member?.id || index}>
              <strong>{asLabel(member?.displayName || member?.name, `Student ${index + 1}`)}</strong>
              <p style={miniTextStyle}>
                {asLabel(member?.role || member?.status, "Class member")}
              </p>
            </InfoCard>
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
  showHelpPanel,
  setShowHelpPanel,
  showInfoPanel,
  setShowInfoPanel,
  showDevPanel,
  setShowDevPanel,
}: {
  showDevZones: boolean;
  setShowDevZones: (value: boolean) => void;
  devMode: boolean;
  setDevMode: (value: boolean) => void;
  resetHotspot: () => void;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  showHelpPanel: boolean;
  setShowHelpPanel: (value: boolean) => void;
  showInfoPanel: boolean;
  setShowInfoPanel: (value: boolean) => void;
  showDevPanel: boolean;
  setShowDevPanel: (value: boolean) => void;
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
        onClick={() => setShowHelpPanel(!showHelpPanel)}
        style={smallButtonStyle}
      >
        {showHelpPanel ? "Hide help" : "Show help"}
      </button>
      <button
        type="button"
        onClick={() => setShowInfoPanel(!showInfoPanel)}
        style={smallButtonStyle}
      >
        {showInfoPanel ? "Hide info" : "Show info"}
      </button>
      {devMode && (
        <button
          type="button"
          onClick={() => setShowDevPanel(!showDevPanel)}
          style={smallButtonStyle}
        >
          {showDevPanel ? "Hide editor" : "Show editor"}
        </button>
      )}
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
      <button
        type="button"
        onClick={() => setCameraMode("free")}
        style={{
          ...smallButtonStyle,
          ...(cameraMode === "free" ? activeSmallButtonStyle : {}),
        }}
      >
        Free cam
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
      normalizePlacement(
        savedById.get(defaultPlacement.id) || defaultPlacement,
        defaultPlacement,
      ),
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
          Select a desk or pet, nudge position, rotate, scale, then copy the placement
          code into the file when it looks right.
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
              <strong>Position</strong>
              <span>{selectedPlacement.position.map(formatNumber).join(", ")}</span>
            </div>
            <div>
              <strong>Rotation Y</strong>
              <span>{formatNumber((selectedPlacement.rotation || [0, 0, 0])[1])}</span>
            </div>
            <div>
              <strong>Scale</strong>
              <span>{formatNumber(selectedPlacement.scale || getDefaultScaleForAsset(selectedPlacement.assetType))}</span>
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


export default function Classroom() {
  const [showHelp, setShowHelp] = useState(true);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [showDevPanel, setShowDevPanel] = useState(true);
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
      const currentScale = placement.scale || getDefaultScaleForAsset(placement.assetType);
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
      {showHelpPanel && (
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
      )}

      {showInfoPanel && (
      <HotspotPanel
        activeHotspot={activeHotspot}
        onSelect={setActiveHotspot}
        data={panelData}
      />
      )}

      {devMode && showDevPanel && (
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
        showHelpPanel={showHelpPanel}
        setShowHelpPanel={setShowHelpPanel}
        showInfoPanel={showInfoPanel}
        setShowInfoPanel={setShowInfoPanel}
        showDevPanel={showDevPanel}
        setShowDevPanel={setShowDevPanel}
      />

      <Canvas
  camera={{ position: [5, 5, 7], fov: 45 }}
  shadows
  gl={{ antialias: true }}
  style={{
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  }}
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
  position: "relative",
  minHeight: "100vh",
  height: "100vh",
  overflow: "hidden",
  background: "linear-gradient(135deg, #c8f3ff 0%, #f5fff3 100%)",
  color: "#2b2352",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const helpCardShellStyle: React.CSSProperties = {
  position: "absolute",
  top: "18px",
  left: "18px",
  zIndex: 10,
  maxWidth: "390px",
  pointerEvents: "none",
};

const helpCardStyle: React.CSSProperties = {
  pointerEvents: "auto",
  background: "rgba(255, 255, 255, 0.86)",
  border: "1px solid rgba(255, 255, 255, 0.9)",
  borderRadius: "24px",
  padding: "18px 20px",
  boxShadow: "0 18px 50px rgba(66, 50, 122, 0.18)",
  backdropFilter: "blur(16px)",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 800,
  color: "#7c5cff",
};

const titleStyle: React.CSSProperties = {
  margin: "4px 0 8px",
  fontSize: "1.65rem",
  lineHeight: 1.1,
};

const helpTextStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: "0.92rem",
  lineHeight: 1.5,
  color: "rgba(43, 35, 82, 0.75)",
};

const helpButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: 800,
  color: "#fff",
  background: "linear-gradient(135deg, #7c5cff, #ff7ad9)",
  cursor: "pointer",
};

const panelShellStyle: React.CSSProperties = {
  position: "absolute",
  top: "18px",
  right: "18px",
  zIndex: 11,
  width: "340px",
  maxWidth: "calc(100vw - 36px)",
  maxHeight: "calc(100vh - 140px)",
};

const panelCardStyle: React.CSSProperties = {
  height: "100%",
  maxHeight: "calc(100vh - 140px)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "rgba(255, 255, 255, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.9)",
  borderRadius: "24px",
  boxShadow: "0 18px 50px rgba(66, 50, 122, 0.18)",
  backdropFilter: "blur(16px)",
};

const panelHeaderStyle: React.CSSProperties = {
  padding: "18px 18px 10px",
  borderBottom: "1px solid rgba(124, 92, 255, 0.1)",
};

const panelTitleStyle: React.CSSProperties = {
  margin: "4px 0 6px",
  fontSize: "1.25rem",
};

const panelSubtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.86rem",
  lineHeight: 1.4,
  color: "rgba(43, 35, 82, 0.68)",
};

const bodyTextStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: "0.9rem",
  lineHeight: 1.5,
  color: "rgba(43, 35, 82, 0.76)",
};

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
  margin: "12px 0 14px",
};

const sectionHeaderRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: "0.76rem",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(43, 35, 82, 0.62)",
};

const countPillStyle: React.CSSProperties = {
  minWidth: "26px",
  height: "26px",
  display: "grid",
  placeItems: "center",
  borderRadius: "999px",
  background: "rgba(124, 92, 255, 0.12)",
  color: "#7c5cff",
  fontSize: "0.75rem",
  fontWeight: 900,
};

const listStackStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
};

const infoCardStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "16px",
  background: "rgba(124, 92, 255, 0.07)",
  border: "1px solid rgba(124, 92, 255, 0.08)",
};

const emptyCardStyle: React.CSSProperties = {
  padding: "12px",
  borderRadius: "16px",
  background: "rgba(255, 255, 255, 0.68)",
  border: "1px dashed rgba(124, 92, 255, 0.24)",
};

const miniTextStyle: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: "0.8rem",
  lineHeight: 1.4,
  color: "rgba(43, 35, 82, 0.65)",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: "16px",
  padding: "11px 14px",
  fontWeight: 900,
  color: "#fff",
  background: "linear-gradient(135deg, #7c5cff, #ff7ad9)",
  cursor: "pointer",
};

const hotspotNavButtonStyle: React.CSSProperties = {
  borderRadius: "14px",
  padding: "9px 11px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: 800,
  color: "#2b2352",
  cursor: "pointer",
};

const bottomControlsStyle: React.CSSProperties = {
  position: "absolute",
  left: "18px",
  bottom: "18px",
  zIndex: 14,
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const smallButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(124, 92, 255, 0.18)",
  borderRadius: "999px",
  padding: "9px 12px",
  background: "rgba(255, 255, 255, 0.82)",
  color: "#2b2352",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 30px rgba(66, 50, 122, 0.12)",
  backdropFilter: "blur(12px)",
};

const activeSmallButtonStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #7c5cff, #ff7ad9)",
  color: "#fff",
};

const hotspotButtonStyle: React.CSSProperties = {
  border: "2px solid rgba(255,255,255,0.65)",
  borderRadius: "999px",
  padding: "7px 11px",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: "#2b2352",
  fontSize: "0.78rem",
  fontWeight: 900,
  background: "rgba(255,255,255,0.9)",
  cursor: "pointer",
};

const floatingLabelStyle: React.CSSProperties = {
  padding: "5px 8px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.86)",
  color: "#2b2352",
  fontSize: "0.72rem",
  fontWeight: 900,
  boxShadow: "0 8px 22px rgba(66, 50, 122, 0.16)",
  whiteSpace: "nowrap",
};

const loadingStyle: React.CSSProperties = {
  padding: "14px 18px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.92)",
  color: "#2b2352",
  fontWeight: 900,
  boxShadow: "0 12px 30px rgba(66, 50, 122, 0.16)",
};

const devPanelShellStyle: React.CSSProperties = {
  position: "absolute",
  left: "18px",
  top: "180px",
  zIndex: 13,
  width: "310px",
  maxWidth: "calc(100vw - 36px)",
};

const devPanelCardStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.91)",
  border: "1px solid rgba(255, 255, 255, 0.9)",
  borderRadius: "24px",
  padding: "16px",
  boxShadow: "0 18px 50px rgba(66, 50, 122, 0.18)",
  backdropFilter: "blur(16px)",
};

const devPanelTitleStyle: React.CSSProperties = {
  margin: "4px 0 8px",
  fontSize: "1.1rem",
};

const devLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  marginTop: "12px",
  fontSize: "0.76rem",
  fontWeight: 900,
  color: "rgba(43, 35, 82, 0.66)",
};

const devSelectStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(124, 92, 255, 0.18)",
  borderRadius: "14px",
  padding: "9px 10px",
  fontWeight: 800,
  color: "#2b2352",
  background: "rgba(255, 255, 255, 0.9)",
};

const devReadoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  marginTop: "12px",
};

const devControlGroupStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  marginTop: "14px",
};

const devControlLabelStyle: React.CSSProperties = {
  fontSize: "0.76rem",
  fontWeight: 900,
  color: "rgba(43, 35, 82, 0.66)",
};

const devButtonGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
};

const devButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(124, 92, 255, 0.16)",
  borderRadius: "14px",
  padding: "9px 10px",
  fontWeight: 900,
  color: "#2b2352",
  background: "rgba(255, 255, 255, 0.84)",
  cursor: "pointer",
};

const devActionRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "8px",
  marginTop: "14px",
};

const devPrimaryButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "14px",
  padding: "10px 8px",
  fontWeight: 900,
  color: "#fff",
  background: "linear-gradient(135deg, #7c5cff, #33c7ff)",
  cursor: "pointer",
};

const devDangerButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "14px",
  padding: "10px 8px",
  fontWeight: 900,
  color: "#fff",
  background: "linear-gradient(135deg, #ff5470, #ff9d5c)",
  cursor: "pointer",
};

const devAssetTagStyle: React.CSSProperties = {
  border: "1px solid rgba(124, 92, 255, 0.24)",
  borderRadius: "999px",
  padding: "5px 8px",
  background: "rgba(255,255,255,0.88)",
  color: "#2b2352",
  fontSize: "0.68rem",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(66, 50, 122, 0.12)",
  whiteSpace: "nowrap",
};

const devAssetTagActiveStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #7c5cff, #ff7ad9)",
  color: "#fff",
};

useGLTF.preload(CLASSROOM_MODEL_PATH);
useGLTF.preload(PLAYER_MODEL_PATH);
useGLTF.preload(EMBERCUB_MODEL_PATH);
useGLTF.preload(ACADEMY_DESK_MODEL_PATH);

