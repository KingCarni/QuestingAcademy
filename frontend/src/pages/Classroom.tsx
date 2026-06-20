import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useClassroomWorldStore } from "../lib/classroomWorldStore";

const CLASSROOM_MODEL_PATH =
  "/assets/3d/classroom-blockout/classroom-blockout.glb";
const PLAYER_MODEL_PATH = "/assets/3d/avatar/avatar.glb";
const EMBERCUB_MODEL_PATH = "/assets/3d/pets/embercub.glb";

// First-pass tuning knobs. These will likely need tiny adjustments per exported model.
const PLAYER_MODEL_SCALE = 1;
const EMBERCUB_MODEL_SCALE = 1;

// Tuning knobs for the current classroom blockout.
// Keep these near the top so we can quickly adjust them as the UE room changes.
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
    subtitle: "Teacher avatar and instruction anchor.",
    body: "This spot can hold the teacher avatar, class message, daily prompt, or a safe announcement from the teacher.",
    cta: "View Teacher Area",
    icon: "⭐",
    position: [0, 0.42, -2.12],
    size: [0.9, 0.78, 0.9],
    color: "#7c5cff",
  },
];

const HOTSPOT_LOOKUP = HOTSPOTS.reduce<Record<HotspotKey, HotspotInfo>>(
  (lookup, hotspot) => {
    lookup[hotspot.id] = hotspot;
    return lookup;
  },
  {} as Record<HotspotKey, HotspotInfo>,
);

function asLabel(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function getAssignmentTitle(assignment: any, index: number): string {
  return asLabel(
    assignment?.title ||
      assignment?.assignmentTitle ||
      assignment?.name ||
      assignment?.assignmentId,
    `Quest ${index + 1}`,
  );
}

function getGoalTitle(goal: any, index: number): string {
  return asLabel(
    goal?.title || goal?.goalTitle || goal?.name || goal?.id,
    `Class goal ${index + 1}`,
  );
}

function getRewardTitle(reward: any, index: number): string {
  return asLabel(
    reward?.title ||
      reward?.rewardTitle ||
      reward?.description ||
      reward?.type ||
      reward?.id,
    `Reward ${index + 1}`,
  );
}

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

function EmbercubModel() {
  const gltf = useGLTF(EMBERCUB_MODEL_PATH) as any;
  const embercubScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  return (
    <group position={[-4.05, 1.25, 2.35]} rotation={[0, 0.7, 0]}>
      <primitive object={embercubScene} scale={EMBERCUB_MODEL_SCALE} />
      <Html position={[0, 1.15, 0]} center>
        <div style={floatingLabelStyle}>Embercub</div>
      </Html>
    </group>
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

      // The avatar GLB faces opposite the movement vector after its model-level rotation.
      // Add PI so the visible character points toward travel direction instead of away from it.
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
            onClick={() => onSelect(hotspot.id)}
            style={{
              ...(showDevZone ? floatingLabelStyle : compactHotspotLabelStyle),
              border: `2px solid ${hotspot.color}`,
              boxShadow: isActive
                ? `0 0 0 4px ${hotspot.color}24, 0 10px 26px rgba(35, 24, 63, 0.18)`
                : "0 8px 24px rgba(35, 24, 63, 0.13)",
              cursor: "pointer",
            }}
          >
            <span aria-hidden="true" style={{ marginRight: showDevZone ? 5 : 0 }}>
              {hotspot.icon}
            </span>
            {showDevZone ? hotspot.label : null}
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
      <div style={loadingStyle}>
        Loading classroom...
        <div style={{ color: "#6f6687", fontSize: "12px", marginTop: "4px" }}>
          Large GLB files can take a moment.
        </div>
      </div>
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
  useFrame(({ camera }, delta) => {
    if (cameraMode === "orbit") return;

    const player = playerPositionRef.current;
    const desiredPosition =
      cameraMode === "top"
        ? new THREE.Vector3(player.x, player.y + 9.5, player.z + 0.05)
        : new THREE.Vector3(player.x + 3.4, player.y + 3.2, player.z + 4.2);

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
}: {
  activeHotspot: HotspotKey;
  onSelectHotspot: (id: HotspotKey) => void;
  showDevZones: boolean;
  cameraMode: CameraMode;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
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
        <EmbercubModel />
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
                    activeHotspot === hotspot.id
                      ? "rgba(124,92,255,0.13)"
                      : "rgba(255,255,255,0.72)",
                  border:
                    activeHotspot === hotspot.id
                      ? "2px solid rgba(124,92,255,0.55)"
                      : "2px solid rgba(124,92,255,0.12)",
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
          {assignments.slice(0, 5).map((assignment, index) => (
            <InfoCard key={assignment?.id || assignment?.assignmentId || index}>
              <div style={cardTitleRowStyle}>
                <strong>{getAssignmentTitle(assignment, index)}</strong>
                <span style={statusPillStyle}>
                  {asLabel(assignment?.status, "active")}
                </span>
              </div>
              <p style={miniTextStyle}>
                {asLabel(
                  assignment?.subject ||
                    assignment?.subjectFocus ||
                    assignment?.type,
                  "Learning quest",
                )}
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
  const pet = data.classroom?.pet;
  const petName = asLabel(pet?.petName || pet?.name, "Class pet");
  const petEmoji = asLabel(pet?.petEmoji || pet?.emoji, "🐾");
  const level = asLabel(pet?.level, "1");
  const xp = Number(pet?.xp || 0);
  const xpGoal = Number(pet?.xpGoal || 100);
  const percent = Math.max(
    0,
    Math.min(100, xpGoal ? Math.round((xp / xpGoal) * 100) : 0),
  );

  return (
    <section style={sectionStyle}>
      <div style={petHeroStyle}>
        <div style={petEmojiStyle}>{petEmoji}</div>
        <div>
          <strong
            style={{ color: "#24183f", display: "block", fontSize: "16px" }}
          >
            {petName}
          </strong>
          <span style={miniTextStyle}>Level {level} class companion</span>
        </div>
      </div>

      <div style={{ marginTop: "12px" }}>
        <div style={sectionHeaderRowStyle}>
          <span style={sectionLabelStyle}>Pet XP</span>
          <span style={miniTextStyle}>
            {xp}/{xpGoal}
          </span>
        </div>
        <div style={progressTrackStyle}>
          <div style={{ ...progressFillStyle, width: `${percent}%` }} />
        </div>
      </div>

      <InfoCard>
        <strong>Classroom role</strong>
        <p style={miniTextStyle}>
          The pet corner keeps the class pet visible during normal classroom
          work. The Pet Sanctuary can handle deeper feeding, habitats, upgrades,
          and collection systems later.
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
                {asLabel(
                  goal?.description || goal?.status,
                  "Class milestone in progress",
                )}
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
  resetHotspot,
  cameraMode,
  setCameraMode,
}: {
  showDevZones: boolean;
  setShowDevZones: (value: boolean) => void;
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
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [activeHotspot, setActiveHotspot] = useState<HotspotKey>("quest-board");
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
    if (showDevZones) {
      return "Developer zones are visible. Click a zone or icon to inspect the classroom panel.";
    }

    return "WASD / arrow keys move the player. Drag to orbit. Click the floating icons to open classroom panels.";
  }, [showDevZones]);

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

      <ViewModeControls
        showDevZones={showDevZones}
        setShowDevZones={setShowDevZones}
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
  letterSpacing: "0.07em",
  textTransform: "uppercase",
};

const countPillStyle: React.CSSProperties = {
  background: "rgba(124,92,255,0.12)",
  borderRadius: "999px",
  color: "#7c5cff",
  fontSize: "11px",
  fontWeight: 950,
  padding: "4px 8px",
};

const listStackStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
};

const infoCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.78)",
  border: "2px solid rgba(124,92,255,0.11)",
  borderRadius: "18px",
  color: "#24183f",
  padding: "10px 11px",
};

const emptyCardStyle: React.CSSProperties = {
  ...infoCardStyle,
  background: "rgba(255,248,222,0.85)",
};

const cardTitleRowStyle: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  gap: "8px",
  justifyContent: "space-between",
};

const statusPillStyle: React.CSSProperties = {
  background: "rgba(132,230,106,0.16)",
  borderRadius: "999px",
  color: "#287a36",
  fontSize: "10px",
  fontWeight: 950,
  padding: "3px 7px",
  textTransform: "uppercase",
};

const miniTextStyle: React.CSSProperties = {
  color: "#6f6687",
  display: "block",
  fontSize: "12px",
  fontWeight: 800,
  lineHeight: 1.35,
  margin: "5px 0 0",
};

const petHeroStyle: React.CSSProperties = {
  alignItems: "center",
  background: "rgba(132,230,106,0.13)",
  border: "2px solid rgba(132,230,106,0.2)",
  borderRadius: "20px",
  display: "flex",
  gap: "12px",
  padding: "12px",
};

const petEmojiStyle: React.CSSProperties = {
  alignItems: "center",
  background: "white",
  border: "2px solid rgba(132,230,106,0.32)",
  borderRadius: "18px",
  display: "flex",
  fontSize: "30px",
  height: "56px",
  justifyContent: "center",
  width: "56px",
};

const progressTrackStyle: React.CSSProperties = {
  background: "rgba(124,92,255,0.12)",
  borderRadius: "999px",
  height: "10px",
  marginTop: "6px",
  overflow: "hidden",
};

const progressFillStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #7c5cff, #84e66a)",
  borderRadius: "999px",
  height: "100%",
};

const rosterGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
};

const rosterCardStyle: React.CSSProperties = {
  alignItems: "center",
  background: "rgba(255,255,255,0.78)",
  border: "2px solid rgba(124,92,255,0.11)",
  borderRadius: "16px",
  color: "#24183f",
  display: "flex",
  fontSize: "12px",
  fontWeight: 900,
  gap: "8px",
  padding: "8px",
};

const avatarBubbleStyle: React.CSSProperties = {
  alignItems: "center",
  background: "rgba(124,92,255,0.14)",
  borderRadius: "999px",
  color: "#7c5cff",
  display: "flex",
  flex: "0 0 auto",
  fontSize: "12px",
  fontWeight: 950,
  height: "28px",
  justifyContent: "center",
  width: "28px",
};

const bottomControlsStyle: React.CSSProperties = {
  bottom: 18,
  display: "flex",
  gap: "8px",
  left: 18,
  position: "absolute",
  zIndex: 10,
};

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

const activeSmallButtonStyle: React.CSSProperties = {
  background: "rgba(124,92,255,0.16)",
  border: "2px solid rgba(124,92,255,0.55)",
  color: "#4b32bd",
};

useGLTF.preload(CLASSROOM_MODEL_PATH);
useGLTF.preload(PLAYER_MODEL_PATH);
useGLTF.preload(EMBERCUB_MODEL_PATH);
