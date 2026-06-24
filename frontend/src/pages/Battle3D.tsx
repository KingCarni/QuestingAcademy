import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { ArrowLeft, Box, Camera, Copy, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { useGame } from "../lib/gameStore";
import { useStudio } from "../lib/studioStore";

const ARENA_MODEL_PATH = "/assets/3d/arenas/arena-meadowfall.glb";
const SKY_DOME_MODEL_PATH = "/assets/3d/backgrounds/sky-dome.glb";
const EMBERCUB_MODEL_PATH = "/assets/3d/pets/embercub.glb";
const BUBBLEFIN_MODEL_PATH = "/assets/3d/pets/bubblefin.glb";
const ROCK_MODEL_PATH = "/assets/3d/props/rock.glb";
const TREE_MODEL_PATH = "/assets/3d/props/tree.glb";
const TREE_2_MODEL_PATH = "/assets/3d/props/tree2.glb";
const PLAYER_MODEL_PATH = "/assets/3d/avatar/avatar.glb";
const BATTLE_DEV_STORAGE_KEY = "eduMatesBattle3DPlacements.v1";

const CORE_BATTLE_ASSET_IDS = new Set(["arena-base", "trainer", "embercub", "bubblefin"]);

type BattleParticipantCardProps = {
  eyebrow: string;
  name: string;
  subtitle: string;
  align?: "left" | "right";
};

type BattleAssetId = string;
type CameraPresetName = "isometric" | "front" | "trainer" | "enemy";

type BattleAssetPlacement = {
  id: BattleAssetId;
  label: string;
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

type CameraPreset = {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
};

const CAMERA_PRESETS: Record<CameraPresetName, CameraPreset> = {
  isometric: { label: "Isometric", position: [0, 4.7, 7.4], target: [0, 0.65, 0] },
  front: { label: "Front", position: [0, 2.35, 8.4], target: [0, 0.75, 0] },
  trainer: { label: "Trainer Side", position: [-6.3, 2.7, 4.5], target: [-0.75, 0.8, 0.2] },
  enemy: { label: "Enemy Side", position: [6.3, 2.7, 4.5], target: [0.75, 0.8, 0.2] },
};

const DEFAULT_BATTLE_3D_ASSET_PLACEMENTS: BattleAssetPlacement[] = [
  { id: "arena-base", label: "Meadowfall Arena", modelPath: "/assets/3d/arenas/arena-meadowfall.glb", position: [0, -0.05, 0.2], rotation: [0, 0, 0], scale: 5.2 },
  { id: "trainer", label: "Trainer", modelPath: "/assets/3d/avatar/avatar.glb", position: [-3.4, 1.3, 1.85], rotation: [0, 0.95, 0], scale: 1.15 },
  { id: "embercub", label: "Embercub", modelPath: "/assets/3d/pets/embercub.glb", position: [-2.3, 0.83, 0.4], rotation: [0, 1.6, 0], scale: 1.15 },
  { id: "bubblefin", label: "Bubblefin", modelPath: "/assets/3d/pets/bubblefin.glb", position: [2.35, 1.98, 1.35], rotation: [0, -1.25, 0], scale: 0.95 },
  { id: "rock-1", label: "Rock 1", modelPath: "/assets/3d/props/rock.glb", position: [3.65, 0.65, 2.75], rotation: [0, 0.45, 0], scale: 0.9 },
  { id: "rock-2", label: "Rock 2", modelPath: "/assets/3d/props/rock.glb", position: [-2.1, 0.55, 3.8], rotation: [0, 3.95, 0], scale: 0.75 },
  { id: "rock-3", label: "Rock 3", modelPath: "/assets/3d/props/rock.glb", position: [-1.95, 1.25, -3.35], rotation: [0, 3.95, 0], scale: 1.6 },
  { id: "tree-1", label: "Tree 1", modelPath: "/assets/3d/props/tree.glb", position: [-3.95, 2.45, -1.35], rotation: [0, 0.45, 0], scale: 2.3 },
  { id: "tree-2", label: "Tree 2", modelPath: "/assets/3d/props/tree2.glb", position: [1.15, 2.35, -3.35], rotation: [0, -0.45, 0], scale: 2.55 },
];

function LoadingCard() {
  return (
    <Html center>
      <div style={loadingStyle}>Loading 3D battle arena...</div>
    </Html>
  );
}

function cloneGlbScene(scene: THREE.Object3D) {
  const cloned = scene.clone(true);
  cloned.traverse((child: any) => {
    if (child?.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return cloned;
}

function cloneSkyDomeScene(scene: THREE.Object3D) {
  const cloned = scene.clone(true);
  cloned.traverse((child: any) => {
    if (child?.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material: THREE.Material | undefined) => {
        if (!material) return;
        material.side = THREE.DoubleSide;
        material.depthWrite = false;
      });
    }
  });
  return cloned;
}

function clonePlacement(placement: BattleAssetPlacement): BattleAssetPlacement {
  return {
    ...placement,
    position: [...placement.position] as [number, number, number],
    rotation: [...placement.rotation] as [number, number, number],
  };
}

function loadBattlePlacements(): BattleAssetPlacement[] {
  if (typeof window === "undefined") {
    return DEFAULT_BATTLE_3D_ASSET_PLACEMENTS.map(clonePlacement);
  }

  try {
    const raw = window.localStorage.getItem(BATTLE_DEV_STORAGE_KEY);
    if (!raw) return DEFAULT_BATTLE_3D_ASSET_PLACEMENTS.map(clonePlacement);

    const parsed = JSON.parse(raw) as Partial<BattleAssetPlacement>[];
    if (!Array.isArray(parsed)) return DEFAULT_BATTLE_3D_ASSET_PLACEMENTS.map(clonePlacement);

    const mergedDefaults = DEFAULT_BATTLE_3D_ASSET_PLACEMENTS.map((base) => {
      const saved = parsed.find((item) => item?.id === base.id);
      return {
        ...base,
        ...saved,
        id: base.id,
        label: saved?.label || base.label,
        modelPath: saved?.modelPath || base.modelPath,
        position: Array.isArray(saved?.position) ? (saved?.position as [number, number, number]) : ([...base.position] as [number, number, number]),
        rotation: Array.isArray(saved?.rotation) ? (saved?.rotation as [number, number, number]) : ([...base.rotation] as [number, number, number]),
        scale: typeof saved?.scale === "number" ? saved.scale : base.scale,
      };
    });

    const extraPlacements = parsed
      .filter((item): item is BattleAssetPlacement =>
        !!item?.id &&
        !DEFAULT_BATTLE_3D_ASSET_PLACEMENTS.some((base) => base.id === item.id) &&
        typeof item.label === "string" &&
        typeof item.modelPath === "string" &&
        Array.isArray(item.position) &&
        Array.isArray(item.rotation) &&
        typeof item.scale === "number",
      )
      .map(clonePlacement);

    return [...mergedDefaults, ...extraPlacements];
  } catch {
    return DEFAULT_BATTLE_3D_ASSET_PLACEMENTS.map(clonePlacement);
  }
}

function formatNumber(value: number) {
  return Number(value.toFixed(3));
}

function formatPlacementsCode(placements: BattleAssetPlacement[]) {
  const rows = placements
    .map((placement) => {
      const position = placement.position.map(formatNumber).join(", ");
      const rotation = placement.rotation.map(formatNumber).join(", ");
      return `  { id: "${placement.id}", label: "${placement.label}", modelPath: "${placement.modelPath}", position: [${position}], rotation: [${rotation}], scale: ${formatNumber(placement.scale)} },`;
    })
    .join("\n");

  return `const DEFAULT_BATTLE_3D_ASSET_PLACEMENTS: BattleAssetPlacement[] = [\n${rows}\n];`;
}

function getNextDuplicateLabel(baseLabel: string, existingLabels: string[]) {
  const cleanedLabel = baseLabel.replace(/\s+Copy\s+\d+$/i, "").replace(/\s+\d+$/i, "").trim() || "Object";
  let index = 2;
  let candidate = `${cleanedLabel} ${index}`;
  while (existingLabels.includes(candidate)) {
    index += 1;
    candidate = `${cleanedLabel} ${index}`;
  }
  return candidate;
}

function CameraPresetController({ presetName }: { presetName: CameraPresetName }) {
  const { camera } = useThree();
  const preset = CAMERA_PRESETS[presetName];

  useEffect(() => {
    camera.position.set(...preset.position);
    camera.lookAt(new THREE.Vector3(...preset.target));
    camera.updateProjectionMatrix();
  }, [camera, presetName, preset.position, preset.target]);

  return null;
}

function SkyDome() {
  const gltf = useGLTF(SKY_DOME_MODEL_PATH) as any;
  const scene = useMemo(() => cloneSkyDomeScene(gltf.scene), [gltf.scene]);

  return <primitive object={scene} renderOrder={-10} />;
}

function BattleGlbAsset({
  placement,
  devMode,
  selected,
  onSelect,
}: {
  placement: BattleAssetPlacement;
  devMode: boolean;
  selected: boolean;
  onSelect: (id: BattleAssetId) => void;
}) {
  const gltf = useGLTF(placement.modelPath) as any;
  const scene = useMemo(() => cloneGlbScene(gltf.scene), [gltf.scene]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!devMode) return;
    event.stopPropagation();
    onSelect(placement.id);
  };

  const labelHeight = placement.id === "trainer" ? 1.75 : placement.id === "arena-base" ? 0.45 : 1.25;

  return (
    <group position={placement.position} rotation={placement.rotation} scale={placement.scale} onClick={handleClick}>
      <primitive object={scene} />
      {devMode && (
        <Html position={[0, labelHeight, 0]} center>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(placement.id);
            }}
            style={{
              ...devAssetTagStyle,
              ...(selected ? devAssetTagActiveStyle : {}),
            }}
          >
            {placement.label}
          </button>
        </Html>
      )}
    </group>
  );
}

function ArenaScene({
  placements,
  devMode,
  selectedAssetId,
  cameraPreset,
  onSelectAsset,
}: {
  placements: BattleAssetPlacement[];
  devMode: boolean;
  selectedAssetId: BattleAssetId;
  cameraPreset: CameraPresetName;
  onSelectAsset: (id: BattleAssetId) => void;
}) {
  const selectedPlacement = placements.find((placement) => placement.id === selectedAssetId) || placements[0];
  const selectedTarget = selectedPlacement?.position || [0, 0.55, 0];
  const presetTarget = CAMERA_PRESETS[cameraPreset].target;
  const orbitTarget = devMode ? selectedTarget : presetTarget;

  return (
    <>
      <color attach="background" args={["#e8f7ff"]} />
      <ambientLight intensity={0.65} />
      <directionalLight castShadow intensity={1.35} position={[4, 7, 5]} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <CameraPresetController presetName={cameraPreset} />
      <Suspense fallback={<LoadingCard />}>
        <SkyDome />
        <group position={[0, -0.5, 0]}>
          {placements.map((placement) => (
            <BattleGlbAsset
              key={placement.id}
              placement={placement}
              devMode={devMode}
              selected={selectedAssetId === placement.id}
              onSelect={onSelectAsset}
            />
          ))}
        </group>
      </Suspense>
      <OrbitControls
        target={[orbitTarget[0], orbitTarget[1] + 0.25, orbitTarget[2]]}
        enablePan={true}
        enableRotate={true}
        enableZoom={true}
        minDistance={2.4}
        maxDistance={13.5}
        maxPolarAngle={Math.PI / 2.01}
      />
    </>
  );
}

function BattleParticipantCard({ eyebrow, name, subtitle, align = "left" }: BattleParticipantCardProps) {
  return (
    <section style={{ ...participantCardStyle, textAlign: align }}>
      <div style={eyebrowStyle}>{eyebrow}</div>
      <h2 style={participantNameStyle}>{name}</h2>
      <p style={participantSubStyle}>{subtitle}</p>
      <div style={healthTrackStyle}>
        <div style={healthFillStyle} />
      </div>
      <small style={healthTextStyle}>80/80 HP</small>
    </section>
  );
}

const Battle3D: React.FC = () => {
  const navigate = useNavigate();
  const player = useGame((state) => state.player);
  const companions = useStudio((state) => state.companions);
  const starterCompanion = companions.find((companion: any) => companion?.name === "Embercub") || companions[0];
  const enemyCompanion = companions.find((companion: any) => companion?.name === "Bubblefin") || {
    name: "Bubblefin",
    role: "3D enemy preview",
  };

  const [devMode, setDevMode] = useState(false);
  const [placements, setPlacements] = useState<BattleAssetPlacement[]>(() => loadBattlePlacements());
  const [selectedAssetId, setSelectedAssetId] = useState<BattleAssetId>("embercub");
  const [cameraPreset, setCameraPreset] = useState<CameraPresetName>("front");
  const [copyStatus, setCopyStatus] = useState("");

  const selectedPlacement = placements.find((placement) => placement.id === selectedAssetId) || placements[0];
  const canDeleteSelected = !!selectedPlacement && placements.length > 1 && !CORE_BATTLE_ASSET_IDS.has(selectedPlacement.id);

  useEffect(() => {
    if (!copyStatus) return;
    const timeout = window.setTimeout(() => setCopyStatus(""), 1600);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  const updateSelectedPlacement = (updater: (placement: BattleAssetPlacement) => BattleAssetPlacement) => {
    setPlacements((current) =>
      current.map((placement) =>
        placement.id === selectedAssetId ? updater(clonePlacement(placement)) : placement,
      ),
    );
  };

  const renameSelectedPlacement = (label: string) => {
    updateSelectedPlacement((placement) => ({ ...placement, label }));
  };

  const nudgePosition = (axis: 0 | 1 | 2, amount: number) => {
    updateSelectedPlacement((placement) => {
      placement.position[axis] = formatNumber(placement.position[axis] + amount);
      return placement;
    });
  };

  const nudgeRotation = (amount: number) => {
    updateSelectedPlacement((placement) => {
      placement.rotation[1] = formatNumber(placement.rotation[1] + amount);
      return placement;
    });
  };

  const nudgeScale = (amount: number) => {
    updateSelectedPlacement((placement) => {
      placement.scale = Math.max(0.05, formatNumber(placement.scale + amount));
      return placement;
    });
  };

  const duplicateSelectedPlacement = () => {
    if (!selectedPlacement) return;
    const baseId = selectedPlacement.id.replace(/-copy-\d+$/i, "");
    let copyIndex = 1;
    let nextId = `${baseId}-copy-${copyIndex}`;
    while (placements.some((placement) => placement.id === nextId)) {
      copyIndex += 1;
      nextId = `${baseId}-copy-${copyIndex}`;
    }

    const duplicate: BattleAssetPlacement = {
      ...clonePlacement(selectedPlacement),
      id: nextId,
      label: getNextDuplicateLabel(selectedPlacement.label, placements.map((placement) => placement.label)),
      position: [
        formatNumber(selectedPlacement.position[0] + 0.45),
        selectedPlacement.position[1],
        formatNumber(selectedPlacement.position[2] + 0.35),
      ],
    };

    setPlacements((current) => [...current, duplicate]);
    setSelectedAssetId(nextId);
    setCopyStatus(`Duplicated ${selectedPlacement.label}`);
  };

  const deleteSelectedPlacement = () => {
    if (!selectedPlacement) return;

    if (CORE_BATTLE_ASSET_IDS.has(selectedPlacement.id)) {
      setCopyStatus("Core battle actors cannot be deleted");
      return;
    }

    if (placements.length <= 1) {
      setCopyStatus("At least one object must remain");
      return;
    }

    const nextPlacements = placements.filter((placement) => placement.id !== selectedPlacement.id);
    setPlacements(nextPlacements);
    setSelectedAssetId(nextPlacements[0]?.id || "embercub");
    setCopyStatus(`Deleted ${selectedPlacement.label}`);
  };

  const savePlacementsToBrowser = () => {
    window.localStorage.setItem(BATTLE_DEV_STORAGE_KEY, JSON.stringify(placements));
    setCopyStatus("Saved browser placement");
  };

  const resetPlacements = () => {
    window.localStorage.removeItem(BATTLE_DEV_STORAGE_KEY);
    setPlacements(DEFAULT_BATTLE_3D_ASSET_PLACEMENTS.map(clonePlacement));
    setSelectedAssetId("embercub");
    setCameraPreset("front");
    setCopyStatus("Reset to defaults");
  };

  const copyPlacementsCode = async () => {
    const code = formatPlacementsCode(placements);
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("Copied placement code");
    } catch {
      setCopyStatus("Copy failed");
    }
  };

  return (
    <main style={pageStyle}>
      <header style={topBarStyle}>
        <button type="button" style={backButtonStyle} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div>
          <div style={eyebrowStyle}>Prototype</div>
          <h1 style={titleStyle}>3D Battle Arena</h1>
          <p style={subtitleStyle}>GLB-first combat space for pets, enemies, arenas, and future battle props.</p>
        </div>
        <button
          type="button"
          style={{ ...pillStyle, ...(devMode ? pillActiveStyle : {}) }}
          onClick={() => setDevMode((current) => !current)}
        >
          <Box size={16} />
          {devMode ? "Dev mode on" : "Dev mode"}
        </button>
      </header>

      <section style={battleShellStyle}>
        <div style={cameraPresetBarStyle}>
          <span style={cameraPresetLabelStyle}><Camera size={15} /> Camera</span>
          {(Object.keys(CAMERA_PRESETS) as CameraPresetName[]).map((presetName) => (
            <button
              key={presetName}
              type="button"
              style={{ ...cameraPresetButtonStyle, ...(cameraPreset === presetName ? cameraPresetButtonActiveStyle : {}) }}
              onClick={() => setCameraPreset(presetName)}
            >
              {CAMERA_PRESETS[presetName].label}
            </button>
          ))}
        </div>
        <div style={canvasWrapStyle}>
          <Canvas camera={{ position: CAMERA_PRESETS.front.position, fov: 36 }} shadows style={{ width: "100%", height: "100%" }}>
            <ArenaScene
              placements={placements}
              devMode={devMode}
              selectedAssetId={selectedAssetId}
              cameraPreset={cameraPreset}
              onSelectAsset={setSelectedAssetId}
            />
          </Canvas>
        </div>

        <div style={hudStyle}>
          <BattleParticipantCard
            eyebrow={player?.name ? "Student + pet" : "Player side"}
            name={starterCompanion?.name || "Embercub"}
            subtitle="GLB pet loaded from /assets/3d/pets/embercub.glb"
          />
          <BattleParticipantCard
            eyebrow="Opponent side"
            name={enemyCompanion?.name || "Bubblefin"}
            subtitle="GLB enemy loaded from /assets/3d/pets/bubblefin.glb"
            align="right"
          />
        </div>
      </section>

      {devMode && selectedPlacement && (
        <aside style={devPanelStyle}>
          <div style={eyebrowStyle}>Dev Mode</div>
          <h2 style={devPanelTitleStyle}>Battle Asset Placement</h2>
          <p style={devHelpTextStyle}>Select an arena asset, rename it, then nudge position, rotation, and scale. Copy the code when it looks right.</p>

          <label style={devLabelStyle}>
            Selected asset
            <select style={devSelectStyle} value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value as BattleAssetId)}>
              {placements.map((placement) => (
                <option key={placement.id} value={placement.id}>{placement.label}</option>
              ))}
            </select>
          </label>

          <label style={{ ...devLabelStyle, marginTop: "0.65rem" }}>
            Edit name
            <input style={devInputStyle} value={selectedPlacement.label} onChange={(event) => renameSelectedPlacement(event.target.value)} placeholder="Object name" />
          </label>

          <div style={devInfoBoxStyle}>
            <strong>{selectedPlacement.label || selectedPlacement.id}</strong>
            <span>ID {selectedPlacement.id}</span>
            <span>Position {selectedPlacement.position.join(", ")}</span>
            <span>Rotation Y {formatNumber(selectedPlacement.rotation[1])}</span>
            <span>Scale {formatNumber(selectedPlacement.scale)}</span>
          </div>

          <div style={devButtonGridStyle}>
            <button type="button" style={devButtonStyle} onClick={() => nudgePosition(0, -0.1)}>X -</button>
            <button type="button" style={devButtonStyle} onClick={() => nudgePosition(0, 0.1)}>X +</button>
            <button type="button" style={devButtonStyle} onClick={() => nudgePosition(2, -0.1)}>Z -</button>
            <button type="button" style={devButtonStyle} onClick={() => nudgePosition(2, 0.1)}>Z +</button>
            <button type="button" style={devButtonStyle} onClick={() => nudgePosition(1, -0.05)}>Y -</button>
            <button type="button" style={devButtonStyle} onClick={() => nudgePosition(1, 0.05)}>Y +</button>
            <button type="button" style={devButtonStyle} onClick={() => nudgeRotation(-0.1)}>Rot -</button>
            <button type="button" style={devButtonStyle} onClick={() => nudgeRotation(0.1)}>Rot +</button>
            <button type="button" style={devButtonStyle} onClick={() => nudgeScale(-0.05)}>Scale -</button>
            <button type="button" style={devButtonStyle} onClick={() => nudgeScale(0.05)}>Scale +</button>
          </div>

          <div style={devActionRowStyle}>
            <button type="button" style={devPrimaryButtonStyle} onClick={savePlacementsToBrowser}><Save size={15} /> Save</button>
            <button type="button" style={devPrimaryButtonStyle} onClick={copyPlacementsCode}><Copy size={15} /> Copy code</button>
            <button type="button" style={devPrimaryButtonStyle} onClick={duplicateSelectedPlacement}><Copy size={15} /> Duplicate</button>
            <button
              type="button"
              style={{ ...devDeleteButtonStyle, opacity: canDeleteSelected ? 1 : 0.55 }}
              onClick={deleteSelectedPlacement}
              disabled={!canDeleteSelected}
              title={canDeleteSelected ? "Delete selected object" : "Core battle actors cannot be deleted"}
            >
              <Trash2 size={15} /> Delete
            </button>
            <button type="button" style={devResetButtonStyle} onClick={resetPlacements}><RotateCcw size={15} /> Reset</button>
          </div>
          {copyStatus && <div style={devStatusStyle}>{copyStatus}</div>}
        </aside>
      )}

      <section style={actionPanelStyle}>
        <div>
          <div style={eyebrowStyle}>Next build target</div>
          <h2 style={panelTitleStyle}>Replace legacy 2D battle with a GLB arena flow</h2>
          <p style={panelTextStyle}>This page intentionally does not replace /battle yet. It gives us a safe route to build the new 3D combat loop without breaking the current prototype.</p>
        </div>
        <div style={buttonRowStyle}>
          <button type="button" style={primaryButtonStyle}><Sparkles size={18} /> Attack preview</button>
          <button type="button" style={secondaryButtonStyle}>Defend</button>
          <button type="button" style={secondaryButtonStyle}>Special</button>
        </div>
      </section>
    </main>
  );
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "0.75rem",
  background: "linear-gradient(135deg, #e8f7ff 0%, #fff8dd 48%, #f7efff 100%)",
  color: "#2b2352",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  padding: "0.8rem 1.15rem",
  borderRadius: "1.35rem",
  background: "rgba(255,255,255,0.88)",
  border: "2px solid rgba(255,255,255,0.9)",
  boxShadow: "0 18px 45px rgba(59, 45, 120, 0.12)",
};

const backButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.45rem",
  border: 0,
  borderRadius: 999,
  background: "#fff",
  color: "#2b2352",
  padding: "0.75rem 1rem",
  fontWeight: 900,
  cursor: "pointer",
};

const titleStyle: React.CSSProperties = { margin: 0, fontSize: "1.65rem", fontWeight: 950 };
const subtitleStyle: React.CSSProperties = { margin: "0.15rem 0 0", color: "#6f668f", fontWeight: 700 };
const eyebrowStyle: React.CSSProperties = { color: "#7c5cff", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.72rem", fontWeight: 950 };
const pillStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.4rem", border: "2px solid #9d8df1", borderRadius: 999, padding: "0.65rem 0.9rem", fontWeight: 900, background: "#fff", cursor: "pointer", color: "#2b2352" };
const pillActiveStyle: React.CSSProperties = { background: "#7c5cff", color: "#fff" };

const battleShellStyle: React.CSSProperties = {
  margin: "0.75rem auto 0",
  width: "min(1720px, calc(100vw - 2.5rem))",
  maxWidth: "1720px",
  borderRadius: "2rem",
  overflow: "hidden",
  background: "rgba(255,255,255,0.78)",
  border: "3px solid rgba(255,255,255,0.95)",
  boxShadow: "0 22px 55px rgba(59, 45, 120, 0.18)",
};

const cameraPresetBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "0.45rem",
  padding: "0.65rem 0.9rem",
  background: "rgba(255,255,255,0.74)",
  borderBottom: "1px solid rgba(157,141,241,0.18)",
};
const cameraPresetLabelStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "#6f668f", fontSize: "0.74rem", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.06em" };
const cameraPresetButtonStyle: React.CSSProperties = { border: "2px solid #d8d2fa", borderRadius: 999, background: "#fff", color: "#2b2352", padding: "0.45rem 0.7rem", fontSize: "0.78rem", fontWeight: 950, cursor: "pointer" };
const cameraPresetButtonActiveStyle: React.CSSProperties = { background: "#7c5cff", color: "#fff", borderColor: "#7c5cff" };

const canvasWrapStyle: React.CSSProperties = { height: "min(76vh, 860px)", minHeight: 650 };
const hudStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", padding: "1rem", background: "rgba(255,255,255,0.82)" };
const participantCardStyle: React.CSSProperties = { borderRadius: "1.35rem", background: "#fff", padding: "1rem", boxShadow: "inset 0 0 0 2px rgba(157,141,241,0.12)" };
const participantNameStyle: React.CSSProperties = { margin: "0.15rem 0", fontSize: "1.35rem", fontWeight: 950 };
const participantSubStyle: React.CSSProperties = { minHeight: 38, margin: 0, color: "#6f668f", fontSize: "0.85rem", fontWeight: 700 };
const healthTrackStyle: React.CSSProperties = { marginTop: "0.8rem", width: "100%", height: 12, borderRadius: 999, background: "#f0eafa", overflow: "hidden" };
const healthFillStyle: React.CSSProperties = { width: "100%", height: "100%", background: "linear-gradient(90deg, #86a789, #9fd8aa)" };
const healthTextStyle: React.CSSProperties = { display: "block", marginTop: "0.3rem", color: "#80769c", fontWeight: 900 };

const actionPanelStyle: React.CSSProperties = {
  width: "min(1720px, calc(100vw - 2.5rem))",
  maxWidth: "1720px",
  margin: "0.75rem auto 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  padding: "1rem 1.25rem",
  borderRadius: "1.5rem",
  background: "rgba(255,255,255,0.9)",
  border: "2px solid rgba(255,255,255,0.95)",
  boxShadow: "0 18px 45px rgba(59, 45, 120, 0.12)",
};
const panelTitleStyle: React.CSSProperties = { margin: "0.2rem 0", fontSize: "1.2rem", fontWeight: 950 };
const panelTextStyle: React.CSSProperties = { margin: 0, color: "#6f668f", fontWeight: 700, maxWidth: 760 };
const buttonRowStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "0.65rem", justifyContent: "flex-end" };
const primaryButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.45rem", border: 0, borderRadius: 999, background: "#7c5cff", color: "#fff", padding: "0.85rem 1.1rem", fontWeight: 950, cursor: "pointer" };
const secondaryButtonStyle: React.CSSProperties = { border: "2px solid #d8d2fa", borderRadius: 999, background: "#fff", color: "#2b2352", padding: "0.85rem 1.1rem", fontWeight: 950, cursor: "pointer" };
const loadingStyle: React.CSSProperties = { borderRadius: "1rem", background: "rgba(255,255,255,0.95)", color: "#2b2352", padding: "0.85rem 1rem", fontWeight: 950 };

const devAssetTagStyle: React.CSSProperties = {
  border: "2px solid rgba(157,141,241,0.45)",
  borderRadius: 999,
  background: "rgba(255,255,255,0.95)",
  color: "#2b2352",
  padding: "0.32rem 0.55rem",
  fontSize: "0.68rem",
  fontWeight: 950,
  boxShadow: "0 8px 18px rgba(52,41,92,0.18)",
  whiteSpace: "nowrap",
  cursor: "pointer",
};
const devAssetTagActiveStyle: React.CSSProperties = { background: "#7c5cff", color: "#fff", borderColor: "#fff" };
const devPanelStyle: React.CSSProperties = {
  position: "fixed",
  left: "1rem",
  top: "6.25rem",
  zIndex: 40,
  width: "17rem",
  maxHeight: "calc(100vh - 7.5rem)",
  overflowY: "auto",
  borderRadius: "1.4rem",
  background: "rgba(255,255,255,0.94)",
  border: "2px solid rgba(255,255,255,0.95)",
  boxShadow: "0 18px 45px rgba(59, 45, 120, 0.18)",
  padding: "1rem",
};
const devPanelTitleStyle: React.CSSProperties = { margin: "0.2rem 0", fontSize: "1.2rem", fontWeight: 950 };
const devHelpTextStyle: React.CSSProperties = { margin: "0 0 0.85rem", color: "#6f668f", fontSize: "0.78rem", fontWeight: 700, lineHeight: 1.35 };
const devLabelStyle: React.CSSProperties = { display: "grid", gap: "0.35rem", color: "#6f668f", fontSize: "0.68rem", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" };
const devSelectStyle: React.CSSProperties = { border: "2px solid #d8d2fa", borderRadius: "0.8rem", padding: "0.65rem", color: "#2b2352", fontWeight: 900, background: "#fff" };
const devInputStyle: React.CSSProperties = { border: "2px solid #d8d2fa", borderRadius: "0.8rem", padding: "0.65rem", color: "#2b2352", fontWeight: 900, background: "#fff" };
const devInfoBoxStyle: React.CSSProperties = { display: "grid", gap: "0.2rem", margin: "0.75rem 0", padding: "0.75rem", borderRadius: "0.9rem", background: "#f2efff", color: "#2b2352", fontSize: "0.75rem", fontWeight: 800 };
const devButtonGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" };
const devButtonStyle: React.CSSProperties = { border: "2px solid #d8d2fa", borderRadius: "0.8rem", background: "#fff", color: "#2b2352", padding: "0.58rem", fontWeight: 950, cursor: "pointer" };
const devActionRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginTop: "0.65rem" };
const devPrimaryButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", border: 0, borderRadius: "0.8rem", background: "#7c5cff", color: "#fff", padding: "0.58rem", fontSize: "0.72rem", fontWeight: 950, cursor: "pointer" };
const devDeleteButtonStyle: React.CSSProperties = { ...devPrimaryButtonStyle, background: "#ff5f6d", color: "#fff" };
const devResetButtonStyle: React.CSSProperties = { ...devPrimaryButtonStyle, background: "#fff3e1", color: "#8a4b00", border: "1px solid #ffc978" };
const devStatusStyle: React.CSSProperties = { marginTop: "0.65rem", color: "#7c5cff", fontSize: "0.78rem", fontWeight: 950, textAlign: "center" };

useGLTF.preload(ARENA_MODEL_PATH);
useGLTF.preload(SKY_DOME_MODEL_PATH);
useGLTF.preload(EMBERCUB_MODEL_PATH);
useGLTF.preload(BUBBLEFIN_MODEL_PATH);
useGLTF.preload(ROCK_MODEL_PATH);
useGLTF.preload(TREE_MODEL_PATH);
useGLTF.preload(TREE_2_MODEL_PATH);
useGLTF.preload(PLAYER_MODEL_PATH);

export default Battle3D;