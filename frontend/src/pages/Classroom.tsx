import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

const CLASSROOM_MODEL_PATH = "/assets/3d/classroom-blockout/classroom-blockout.glb";
const PLAYER_MODEL_PATH = "/assets/3d/avatar/avatar.glb";
const EMBERCUB_MODEL_PATH = "/assets/3d/pets/embercub.glb";
const ACADEMY_DESK_MODEL_PATH = "/assets/3d/classroom/academy-desk.glb";
const DEV_PLACEMENT_STORAGE_KEY = "eduMatesClassroomAssetPlacements.v3";

const PLAYER_START_POSITION = new THREE.Vector3(0, 1.5, 2.5);
const PLAYER_BOUNDS = { minX: -9.2, maxX: 9.2, minZ: -7, maxZ: 7 };

type CameraMode = "orbit" | "follow" | "top" | "free";
type AssetType = "academy-desk" | "embercub";
type Vec3 = [number, number, number];

type Placement = {
  id: string;
  assetType: AssetType;
  label?: string;
  position: Vec3;
  rotation?: Vec3;
  scale?: number;
};

type KeyState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

const DEFAULT_PLACEMENTS: Placement[] = [
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

const HOTSPOTS = [
  { id: "quest-board", title: "Quest Board", label: "Assignments", icon: "📋", position: [0, 1.15, -3.05] as Vec3, color: "#79d96b" },
  { id: "student-desks", title: "Student Desks", label: "Roster", icon: "🎒", position: [-0.45, 0.3, 1] as Vec3, color: "#7ee7ff" },
  { id: "pet-corner", title: "Pet Corner", label: "Class Pet", icon: "🐾", position: [-4.1, 0.7, 2.35] as Vec3, color: "#84e66a" },
  { id: "rewards", title: "Rewards & Trophy Wall", label: "Milestones", icon: "🏆", position: [-4.35, 1, -0.7] as Vec3, color: "#b457ff" },
  { id: "door", title: "Door to Courtyard", label: "Exit", icon: "🚪", position: [4.25, 0.72, 0.75] as Vec3, color: "#ffb347" },
  { id: "teacher", title: "Teacher Area", label: "Teacher", icon: "🧑‍🏫", position: [0.15, 0.8, -2.55] as Vec3, color: "#7c5cff" },
];

type HotspotId = typeof HOTSPOTS[number]["id"];

function clonePlacement(p: Placement): Placement {
  return { ...p, position: [...p.position] as Vec3, rotation: p.rotation ? ([...p.rotation] as Vec3) : [0, 0, 0] };
}

function defaultScale(assetType: AssetType) {
  return assetType === "embercub" ? 1 : 0.25;
}

function loadPlacements() {
  if (typeof window === "undefined") return DEFAULT_PLACEMENTS.map(clonePlacement);
  try {
    const saved = window.localStorage.getItem(DEV_PLACEMENT_STORAGE_KEY);
    if (!saved) return DEFAULT_PLACEMENTS.map(clonePlacement);
    const parsed = JSON.parse(saved) as Placement[];
    if (!Array.isArray(parsed)) return DEFAULT_PLACEMENTS.map(clonePlacement);
    const savedById = new Map(parsed.filter(Boolean).map((p) => [p.id, p]));
    return DEFAULT_PLACEMENTS.map((fallback) => {
      const savedPlacement = savedById.get(fallback.id);
      return clonePlacement({ ...fallback, ...(savedPlacement || {}), assetType: savedPlacement?.assetType || fallback.assetType });
    });
  } catch {
    return DEFAULT_PLACEMENTS.map(clonePlacement);
  }
}

function formatNumber(value: number) {
  return Number(value.toFixed(3));
}

function formatPlacementCode(placements: Placement[]) {
  const rows = placements.map((p) => {
    const label = p.label ? `, label: "${p.label}"` : "";
    const position = p.position.map(formatNumber).join(", ");
    const rotation = (p.rotation || [0, 0, 0]).map(formatNumber).join(", ");
    const scale = formatNumber(p.scale || defaultScale(p.assetType));
    return `  { id: "${p.id}", assetType: "${p.assetType}"${label}, position: [${position}], rotation: [${rotation}], scale: ${scale} },`;
  }).join("\n");
  return `const CLASSROOM_ASSET_PLACEMENTS: ClassroomPropPlacement[] = [\n${rows}\n];`;
}

function useKeys() {
  const keysRef = useRef<KeyState>({ forward: false, backward: false, left: false, right: false, up: false, down: false });
  useEffect(() => {
    const setKey = (event: KeyboardEvent, value: boolean) => {
      const key = event.key.toLowerCase();
      if (key === "w" || key === "arrowup") keysRef.current.forward = value;
      if (key === "s" || key === "arrowdown") keysRef.current.backward = value;
      if (key === "a" || key === "arrowleft") keysRef.current.left = value;
      if (key === "d" || key === "arrowright") keysRef.current.right = value;
      if (key === "e") keysRef.current.up = value;
      if (key === "q") keysRef.current.down = value;
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
  return <primitive object={gltf.scene} position={[0, 0.25, 0]} rotation={[0, 0, 0]} scale={2.5} />;
}

function PlayerAvatarModel() {
  const gltf = useGLTF(PLAYER_MODEL_PATH) as any;
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return <primitive object={scene} position={[0, -0.05, 0]} rotation={[0, 0, 0]} scale={1} />;
}

function PlacedAsset({ placement, devMode, selected, onSelect }: { placement: Placement; devMode: boolean; selected: boolean; onSelect: (id: string) => void }) {
  const modelPath = placement.assetType === "embercub" ? EMBERCUB_MODEL_PATH : ACADEMY_DESK_MODEL_PATH;
  const gltf = useGLTF(modelPath) as any;
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child: any) => {
      if (child?.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [gltf.scene]);
  const click = (event: ThreeEvent<MouseEvent>) => {
    if (!devMode) return;
    event.stopPropagation();
    onSelect(placement.id);
  };
  return (
    <group position={placement.position} rotation={placement.rotation || [0, 0, 0]} scale={placement.scale || defaultScale(placement.assetType)} onClick={click}>
      <primitive object={scene} />
      {devMode && (
        <Html position={[0, placement.assetType === "embercub" ? 1.15 : 0.65, 0]} center>
          <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(placement.id); }} style={{ ...tagStyle, ...(selected ? tagActiveStyle : {}) }}>
            {placement.label || placement.id}
          </button>
        </Html>
      )}
    </group>
  );
}

function Player({ playerPositionRef, cameraMode }: { playerPositionRef: React.MutableRefObject<THREE.Vector3>; cameraMode: CameraMode }) {
  const ref = useRef<THREE.Group>(null);
  const keysRef = useKeys();
  const { camera } = useThree();
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    if (cameraMode === "free") {
      playerPositionRef.current.copy(group.position);
      return;
    }
    const inputX = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
    const inputZ = (keysRef.current.forward ? 1 : 0) - (keysRef.current.backward ? 1 : 0);
    if (inputX !== 0 || inputZ !== 0) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const movement = new THREE.Vector3().addScaledVector(forward, inputZ).addScaledVector(right, inputX).normalize().multiplyScalar(2.5 * delta);
      group.position.add(movement);
      group.position.x = THREE.MathUtils.clamp(group.position.x, PLAYER_BOUNDS.minX, PLAYER_BOUNDS.maxX);
      group.position.z = THREE.MathUtils.clamp(group.position.z, PLAYER_BOUNDS.minZ, PLAYER_BOUNDS.maxZ);
      group.rotation.y = Math.atan2(movement.x, movement.z);
    }
    playerPositionRef.current.copy(group.position);
  });
  return <group ref={ref} position={PLAYER_START_POSITION.toArray()}><PlayerAvatarModel /><Html position={[0, 1.45, 0]} center><div style={labelStyle}>Student</div></Html></group>;
}

function HotspotMarker({ hotspot, active, onSelect, showDevZones }: { hotspot: typeof HOTSPOTS[number]; active: boolean; onSelect: (id: HotspotId) => void; showDevZones: boolean }) {
  return (
    <group position={hotspot.position}>
      {showDevZones && <mesh scale={[1.1, 0.5, 1.1]} onClick={(e) => { e.stopPropagation(); onSelect(hotspot.id); }}><boxGeometry /><meshStandardMaterial color={hotspot.color} transparent opacity={0.22} /></mesh>}
      <Html position={[0, 1, 0]} center><button type="button" onClick={() => onSelect(hotspot.id)} style={{ ...hotspotButtonStyle, borderColor: active ? hotspot.color : "rgba(255,255,255,0.7)" }}><span>{hotspot.icon}</span><span>{hotspot.label}</span></button></Html>
    </group>
  );
}

function FreeCameraControls({ enabled }: { enabled: boolean }) {
  const keysRef = useKeys();
  useFrame(({ camera }, delta) => {
    if (!enabled) return;
    const f = (keysRef.current.forward ? 1 : 0) - (keysRef.current.backward ? 1 : 0);
    const r = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
    const u = (keysRef.current.up ? 1 : 0) - (keysRef.current.down ? 1 : 0);
    if (f === 0 && r === 0 && u === 0) return;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const movement = new THREE.Vector3().addScaledVector(forward, f).addScaledVector(right, r).addScaledVector(camera.up, u).normalize().multiplyScalar(5.5 * delta);
    camera.position.add(movement);
  });
  return null;
}

function CameraRig({ cameraMode, playerPositionRef }: { cameraMode: CameraMode; playerPositionRef: React.MutableRefObject<THREE.Vector3> }) {
  useFrame(({ camera }, delta) => {
    const player = playerPositionRef.current;
    if (cameraMode === "top") {
      camera.position.lerp(new THREE.Vector3(player.x, player.y + 12, player.z + 0.1), Math.min(1, delta * 4.5));
      camera.lookAt(player.x, player.y, player.z);
    }
    if (cameraMode === "follow") {
      camera.position.lerp(new THREE.Vector3(player.x, player.y + 3.2, player.z + 5.5), Math.min(1, delta * 4.5));
      camera.lookAt(player.x, player.y + 0.85, player.z);
    }
  });
  return null;
}

function OrbitCamera({ enabled, target }: { enabled: boolean; target: Vec3 }) {
  const ref = useRef<any>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.target.set(target[0], target[1], target[2]);
    ref.current.update();
  }, [target]);
  return <OrbitControls ref={ref} makeDefault={enabled} enabled={enabled} enableDamping dampingFactor={0.08} minDistance={2} maxDistance={28} maxPolarAngle={Math.PI / 2.05} target={target} />;
}

function Scene(props: { placements: Placement[]; selectedId: string | null; setSelectedId: (id: string) => void; devMode: boolean; showDevZones: boolean; activeHotspot: HotspotId; setActiveHotspot: (id: HotspotId) => void; cameraMode: CameraMode; playerPositionRef: React.MutableRefObject<THREE.Vector3>; orbitTarget: Vec3 }) {
  return (
    <>
      <color attach="background" args={["#dff3ff"]} />
      <ambientLight intensity={0.8} />
      <directionalLight castShadow intensity={1.2} position={[6, 8, 6]} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Suspense fallback={<Html center><div style={loadingStyle}>Loading classroom...</div></Html>}>
        <ClassroomModel />
        {props.placements.map((placement) => <PlacedAsset key={placement.id} placement={placement} devMode={props.devMode} selected={props.selectedId === placement.id} onSelect={props.setSelectedId} />)}
        <Player playerPositionRef={props.playerPositionRef} cameraMode={props.cameraMode} />
        {HOTSPOTS.map((hotspot) => <HotspotMarker key={hotspot.id} hotspot={hotspot} active={props.activeHotspot === hotspot.id} onSelect={props.setActiveHotspot} showDevZones={props.showDevZones} />)}
      </Suspense>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#e8f7d6" roughness={0.8} /></mesh>
      <CameraRig cameraMode={props.cameraMode} playerPositionRef={props.playerPositionRef} />
      <FreeCameraControls enabled={props.cameraMode === "free"} />
      <OrbitCamera enabled={props.cameraMode === "orbit" || props.cameraMode === "free"} target={props.orbitTarget} />
    </>
  );
}

function DevPanel({ placements, selectedId, setSelectedId, updateSelected, saveLocal, reset, copyCode, onMinimize }: { placements: Placement[]; selectedId: string | null; setSelectedId: (id: string) => void; updateSelected: (fn: (p: Placement) => Placement) => void; saveLocal: () => void; reset: () => void; copyCode: () => void; onMinimize: () => void }) {
  const selected = placements.find((p) => p.id === selectedId) || placements[0];
  const nudge = (axis: "x" | "y" | "z", amount: number) => updateSelected((p) => {
    const idx = axis === "x" ? 0 : axis === "y" ? 1 : 2;
    const position = [...p.position] as Vec3;
    position[idx] = formatNumber(position[idx] + amount);
    return { ...p, position };
  });
  const rotate = (amount: number) => updateSelected((p) => {
    const rotation = [...(p.rotation || [0, 0, 0])] as Vec3;
    rotation[1] = formatNumber(rotation[1] + amount);
    return { ...p, rotation };
  });
  const scale = (amount: number) => updateSelected((p) => ({ ...p, scale: Math.max(0.025, formatNumber((p.scale || defaultScale(p.assetType)) + amount)) }));
  return (
    <aside style={devPanelStyle}>
      <div style={panelTopRowStyle}><div><div style={eyebrowStyle}>Dev Mode</div><h2 style={panelTitleStyle}>Asset Placement</h2></div><button type="button" style={iconButtonStyle} onClick={onMinimize}>–</button></div>
      <p style={smallTextStyle}>Select an asset, nudge position, rotate, scale, then copy the placement code.</p>
      <label style={fieldLabelStyle}>Selected asset<select value={selected?.id || ""} onChange={(e) => setSelectedId(e.target.value)} style={selectStyle}>{placements.map((p) => <option key={p.id} value={p.id}>{p.label || p.id}</option>)}</select></label>
      {selected && <div style={readoutStyle}><b>Asset</b><span>{selected.label || selected.id}</span><b>Type</b><span>{selected.assetType}</span><b>Position</b><span>{selected.position.map(formatNumber).join(", ")}</span><b>Rotation Y</b><span>{formatNumber((selected.rotation || [0, 0, 0])[1])}</span><b>Scale</b><span>{formatNumber(selected.scale || defaultScale(selected.assetType))}</span></div>}
      <div style={gridStyle}><button onClick={() => nudge("x", -0.1)} style={buttonStyle}>X -</button><button onClick={() => nudge("x", 0.1)} style={buttonStyle}>X +</button><button onClick={() => nudge("z", -0.1)} style={buttonStyle}>Z -</button><button onClick={() => nudge("z", 0.1)} style={buttonStyle}>Z +</button><button onClick={() => nudge("y", -0.05)} style={buttonStyle}>Y -</button><button onClick={() => nudge("y", 0.05)} style={buttonStyle}>Y +</button><button onClick={() => rotate(-0.1)} style={buttonStyle}>Rot -</button><button onClick={() => rotate(0.1)} style={buttonStyle}>Rot +</button><button onClick={() => scale(-0.025)} style={buttonStyle}>Scale -</button><button onClick={() => scale(0.025)} style={buttonStyle}>Scale +</button></div>
      <div style={actionsStyle}><button onClick={saveLocal} style={primaryButtonStyle}>Save browser</button><button onClick={copyCode} style={primaryButtonStyle}>Copy code</button><button onClick={reset} style={dangerButtonStyle}>Reset</button></div>
    </aside>
  );
}

function HelpPanel({ text, showText, setShowText, onMinimize }: { text: string; showText: boolean; setShowText: (fn: (value: boolean) => boolean) => void; onMinimize: () => void }) {
  return <div style={helpStyle}><div style={panelTopRowStyle}><div><div style={eyebrowStyle}>TEA-166 Interactable 3D Classroom</div><h1 style={titleStyle}>Classroom Hub Prototype</h1></div><button type="button" style={iconButtonStyle} onClick={onMinimize}>–</button></div>{showText && <p style={smallTextStyle}>{text}</p>}<button type="button" style={pillButtonStyle} onClick={() => setShowText((v) => !v)}>{showText ? "Hide help" : "Show help"}</button></div>;
}

function InfoPanel({ activeHotspot, setActiveHotspot, onMinimize }: { activeHotspot: HotspotId; setActiveHotspot: (id: HotspotId) => void; onMinimize: () => void }) {
  const active = HOTSPOTS.find((h) => h.id === activeHotspot) || HOTSPOTS[0];
  return <aside style={rightPanelStyle}><div style={panelTopRowStyle}><div><div style={eyebrowStyle}>TEA-166 Hotspot</div><h2 style={panelTitleStyle}>{active.title}</h2></div><button type="button" style={iconButtonStyle} onClick={onMinimize}>–</button></div><p style={smallTextStyle}>Class quests and active learning tasks.</p><button style={bigButtonStyle}>Open {active.title}</button><div style={{ display: "grid", gap: 8, marginTop: 14 }}>{HOTSPOTS.map((h) => <button key={h.id} onClick={() => setActiveHotspot(h.id)} style={{ ...navButtonStyle, borderColor: h.id === activeHotspot ? "#7c5cff" : "rgba(124,92,255,0.1)" }}><span>{h.label}</span><span style={{ color: h.color }}>•</span></button>)}</div></aside>;
}

export default function Classroom() {
  const [showHelp, setShowHelp] = useState(true);
  const [showHelpPanel, setShowHelpPanel] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [showDevPanel, setShowDevPanel] = useState(true);
  const [showDevZones, setShowDevZones] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [activeHotspot, setActiveHotspot] = useState<HotspotId>("quest-board");
  const [placements, setPlacements] = useState<Placement[]>(loadPlacements);
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_PLACEMENTS[0]?.id || null);
  const playerPositionRef = useRef(PLAYER_START_POSITION.clone());
  const selected = useMemo(() => placements.find((p) => p.id === selectedId) || null, [placements, selectedId]);
  const orbitTarget = useMemo<Vec3>(() => selected && devMode ? [selected.position[0], selected.position[1] + 0.7, selected.position[2]] : [playerPositionRef.current.x, playerPositionRef.current.y + 0.8, playerPositionRef.current.z], [devMode, selected]);
  const helpText = cameraMode === "free" ? "Free cam: WASD moves camera, Q/E down/up, drag to orbit around the selected asset." : devMode ? "Dev Mode is on. Select desk or pet assets, then nudge position, rotation, and scale." : "WASD moves the player relative to camera. Drag to orbit. Click icons for classroom panels.";

  const updateSelected = (fn: (p: Placement) => Placement) => {
    const id = selectedId || placements[0]?.id;
    if (!id) return;
    setPlacements((current) => current.map((p) => p.id === id ? fn(p) : p));
  };
  const saveLocal = () => window.localStorage.setItem(DEV_PLACEMENT_STORAGE_KEY, JSON.stringify(placements));
  const reset = () => { window.localStorage.removeItem(DEV_PLACEMENT_STORAGE_KEY); const next = DEFAULT_PLACEMENTS.map(clonePlacement); setPlacements(next); setSelectedId(next[0]?.id || null); };
  const copyCode = () => { const code = formatPlacementCode(placements); console.info(code); void navigator.clipboard?.writeText(code); };

  return (
    <main style={pageStyle}>
      {showHelpPanel ? <HelpPanel text={helpText} showText={showHelp} setShowText={setShowHelp} onMinimize={() => setShowHelpPanel(false)} /> : <button style={{ ...miniButtonStyle, top: 18, left: 18 }} onClick={() => setShowHelpPanel(true)}>Help</button>}
      {showInfoPanel ? <InfoPanel activeHotspot={activeHotspot} setActiveHotspot={setActiveHotspot} onMinimize={() => setShowInfoPanel(false)} /> : <button style={{ ...miniButtonStyle, top: 18, right: 18 }} onClick={() => setShowInfoPanel(true)}>Panel</button>}
      {devMode && showDevPanel ? <DevPanel placements={placements} selectedId={selectedId} setSelectedId={setSelectedId} updateSelected={updateSelected} saveLocal={saveLocal} reset={reset} copyCode={copyCode} onMinimize={() => setShowDevPanel(false)} /> : devMode && <button style={{ ...miniButtonStyle, top: 180, left: 18 }} onClick={() => setShowDevPanel(true)}>Dev tools</button>}
      <div style={bottomBarStyle}><button style={{ ...bottomButtonStyle, ...(devMode ? activeButtonStyle : {}) }} onClick={() => setDevMode((v) => !v)}>{devMode ? "Dev mode on" : "Dev mode"}</button><button style={bottomButtonStyle} onClick={() => setShowDevZones((v) => !v)}>{showDevZones ? "Student mode" : "Dev zones"}</button>{(["orbit", "follow", "free", "top"] as CameraMode[]).map((mode) => <button key={mode} style={{ ...bottomButtonStyle, ...(cameraMode === mode ? activeButtonStyle : {}) }} onClick={() => setCameraMode(mode)}>{mode === "free" ? "Free cam" : mode[0].toUpperCase() + mode.slice(1)}</button>)}<button style={bottomButtonStyle} onClick={() => setActiveHotspot("quest-board")}>Reset panel</button><button style={bottomButtonStyle} onClick={() => { window.location.href = "/dashboard"; }}>Back to Dashboard</button></div>
      <Canvas camera={{ position: [5, 5, 7], fov: 45 }} shadows gl={{ antialias: true }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <Scene placements={placements} selectedId={selectedId} setSelectedId={setSelectedId} devMode={devMode} showDevZones={showDevZones} activeHotspot={activeHotspot} setActiveHotspot={setActiveHotspot} cameraMode={cameraMode} playerPositionRef={playerPositionRef} orbitTarget={orbitTarget} />
      </Canvas>
    </main>
  );
}

const pageStyle: React.CSSProperties = { position: "relative", minHeight: "100vh", height: "100vh", overflow: "hidden", background: "linear-gradient(135deg, #c8f3ff 0%, #f5fff3 100%)", color: "#2b2352", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };
const cardBase: React.CSSProperties = { background: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 24, boxShadow: "0 18px 50px rgba(66,50,122,0.18)", backdropFilter: "blur(16px)" };
const helpStyle: React.CSSProperties = { ...cardBase, position: "absolute", top: 18, left: 18, zIndex: 10, width: 390, maxWidth: "calc(100vw - 36px)", padding: 18, pointerEvents: "auto" };
const rightPanelStyle: React.CSSProperties = { ...cardBase, position: "absolute", top: 18, right: 18, zIndex: 11, width: 340, maxWidth: "calc(100vw - 36px)", padding: 18 };
const devPanelStyle: React.CSSProperties = { ...cardBase, position: "absolute", left: 18, top: 180, zIndex: 13, width: 320, maxWidth: "calc(100vw - 36px)", padding: 16 };
const panelTopRowStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 };
const iconButtonStyle: React.CSSProperties = { width: 30, height: 30, borderRadius: 999, border: "1px solid rgba(124,92,255,0.16)", background: "rgba(255,255,255,0.8)", fontWeight: 900, cursor: "pointer" };
const miniButtonStyle: React.CSSProperties = { position: "absolute", zIndex: 18, border: "1px solid rgba(124,92,255,0.18)", borderRadius: 999, padding: "10px 14px", background: "rgba(255,255,255,0.9)", fontWeight: 900, cursor: "pointer", boxShadow: "0 10px 30px rgba(66,50,122,0.12)" };
const eyebrowStyle: React.CSSProperties = { fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 800, color: "#7c5cff" };
const titleStyle: React.CSSProperties = { margin: "4px 0 8px", fontSize: "1.65rem", lineHeight: 1.1 };
const panelTitleStyle: React.CSSProperties = { margin: "4px 0 6px", fontSize: "1.2rem" };
const smallTextStyle: React.CSSProperties = { margin: "6px 0 12px", fontSize: "0.86rem", lineHeight: 1.45, color: "rgba(43,35,82,0.7)" };
const pillButtonStyle: React.CSSProperties = { border: "none", borderRadius: 999, padding: "8px 12px", fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#7c5cff,#ff7ad9)", cursor: "pointer" };
const bigButtonStyle: React.CSSProperties = { width: "100%", border: "none", borderRadius: 16, padding: "11px 14px", fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#7c5cff,#ff7ad9)", cursor: "pointer" };
const navButtonStyle: React.CSSProperties = { borderRadius: 14, padding: "9px 11px", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800, color: "#2b2352", cursor: "pointer", background: "rgba(255,255,255,0.75)", border: "2px solid rgba(124,92,255,0.1)" };
const bottomBarStyle: React.CSSProperties = { position: "absolute", left: 18, bottom: 18, zIndex: 14, display: "flex", flexWrap: "wrap", gap: 8 };
const bottomButtonStyle: React.CSSProperties = { border: "1px solid rgba(124,92,255,0.18)", borderRadius: 999, padding: "9px 12px", background: "rgba(255,255,255,0.82)", color: "#2b2352", fontWeight: 900, cursor: "pointer", boxShadow: "0 10px 30px rgba(66,50,122,0.12)" };
const activeButtonStyle: React.CSSProperties = { background: "linear-gradient(135deg,#7c5cff,#ff7ad9)", color: "#fff" };
const fieldLabelStyle: React.CSSProperties = { display: "grid", gap: 6, marginTop: 12, fontSize: "0.76rem", fontWeight: 900, color: "rgba(43,35,82,0.66)" };
const selectStyle: React.CSSProperties = { width: "100%", border: "1px solid rgba(124,92,255,0.18)", borderRadius: 14, padding: "9px 10px", fontWeight: 800, color: "#2b2352", background: "rgba(255,255,255,0.9)" };
const readoutStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 10px", marginTop: 12, fontSize: "0.76rem" };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 14 };
const buttonStyle: React.CSSProperties = { border: "1px solid rgba(124,92,255,0.16)", borderRadius: 14, padding: "9px 10px", fontWeight: 900, color: "#2b2352", background: "rgba(255,255,255,0.84)", cursor: "pointer" };
const actionsStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 };
const primaryButtonStyle: React.CSSProperties = { border: "none", borderRadius: 14, padding: "10px 8px", fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#7c5cff,#33c7ff)", cursor: "pointer" };
const dangerButtonStyle: React.CSSProperties = { border: "none", borderRadius: 14, padding: "10px 8px", fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#ff5470,#ff9d5c)", cursor: "pointer" };
const tagStyle: React.CSSProperties = { border: "1px solid rgba(124,92,255,0.24)", borderRadius: 999, padding: "5px 8px", background: "rgba(255,255,255,0.88)", color: "#2b2352", fontSize: "0.68rem", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" };
const tagActiveStyle: React.CSSProperties = { background: "linear-gradient(135deg,#7c5cff,#ff7ad9)", color: "#fff" };
const labelStyle: React.CSSProperties = { padding: "5px 8px", borderRadius: 999, background: "rgba(255,255,255,0.86)", color: "#2b2352", fontSize: "0.72rem", fontWeight: 900, whiteSpace: "nowrap" };
const hotspotButtonStyle: React.CSSProperties = { border: "2px solid rgba(255,255,255,0.65)", borderRadius: 999, padding: "7px 11px", display: "inline-flex", alignItems: "center", gap: 6, color: "#2b2352", fontSize: "0.78rem", fontWeight: 900, background: "rgba(255,255,255,0.9)", cursor: "pointer" };
const loadingStyle: React.CSSProperties = { padding: "14px 18px", borderRadius: 18, background: "rgba(255,255,255,0.92)", color: "#2b2352", fontWeight: 900 };

useGLTF.preload(CLASSROOM_MODEL_PATH);
useGLTF.preload(PLAYER_MODEL_PATH);
useGLTF.preload(EMBERCUB_MODEL_PATH);
useGLTF.preload(ACADEMY_DESK_MODEL_PATH);
