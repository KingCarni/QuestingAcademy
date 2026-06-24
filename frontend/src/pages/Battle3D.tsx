import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { ArrowLeft, Box, Copy, RotateCcw, Save, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { useGame } from "../lib/gameStore";
import { useStudio } from "../lib/studioStore";

const EMBERCUB_MODEL_PATH = "/assets/3d/pets/embercub.glb";
const BUBBLEFIN_MODEL_PATH = "/assets/3d/pets/bubblefin.glb";
const ROCK_MODEL_PATH = "/assets/3d/props/rock.glb";
const TREE_MODEL_PATH = "/assets/3d/props/tree.glb";
const TREE_2_MODEL_PATH = "/assets/3d/props/tree2.glb";
const PLAYER_MODEL_PATH = "/assets/3d/avatar/avatar.glb";
const BATTLE_DEV_STORAGE_KEY = "eduMatesBattle3DPlacements.v1";

type BattleParticipantCardProps = {
  eyebrow: string;
  name: string;
  subtitle: string;
  align?: "left" | "right";
};

type BattleAssetId = string;

type BattleAssetPlacement = {
  id: BattleAssetId;
  label: string;
  modelPath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

const DEFAULT_BATTLE_3D_ASSET_PLACEMENTS: BattleAssetPlacement[] = [
  { id: "trainer", label: "Trainer", modelPath: PLAYER_MODEL_PATH, position: [-4.7, 1.3, 1.05], rotation: [0, 1.45, 0], scale: 1.35 },
  { id: "embercub", label: "Embercub", modelPath: EMBERCUB_MODEL_PATH, position: [-2.1, 0.78, 0], rotation: [0, 1.2, 0], scale: 1.1 },
  { id: "bubblefin", label: "Bubblefin", modelPath: BUBBLEFIN_MODEL_PATH, position: [2.25, 0.88, 0.35], rotation: [0, -1.05, 0], scale: 0.9 },
  { id: "rock-1", label: "Rock 1", modelPath: ROCK_MODEL_PATH, position: [3.45, 0.05, -1.15], rotation: [0, 0.35, 0], scale: 0.75 },
  { id: "tree-1", label: "Tree 1", modelPath: TREE_MODEL_PATH, position: [-4.85, -0.45, -2.35], rotation: [0, 0.2, 0], scale: 1.45 },
  { id: "tree-2", label: "Tree 2", modelPath: TREE_2_MODEL_PATH, position: [4.85, -0.45, -2.55], rotation: [0, -0.35, 0], scale: 1.35 },
];

function LoadingCard() {
  return (
    <Html center>
      <div style={loadingStyle}>Loading 3D battle arena...</div>
    </Html>
  );
}

class ModelErrorBoundary extends React.Component<
  { label: string; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { label: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: { label: string }) {
    if (previousProps.label !== this.props.label && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div style={missingAssetStyle}>{this.props.label} missing GLB</div>
        </Html>
      );
    }

    return this.props.children;
  }
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
        position: Array.isArray(saved?.position) ? (saved?.position as [number, number, number]) : [...base.position] as [number, number, number],
        rotation: Array.isArray(saved?.rotation) ? (saved?.rotation as [number, number, number]) : [...base.rotation] as [number, number, number],
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

  return (
    <group
      position={placement.position}
      rotation={placement.rotation}
      scale={placement.scale}
      onClick={handleClick}
    >
      <primitive object={scene} />
      {devMode && (
        <Html position={[0, placement.id === "trainer" ? 1.75 : 1.25, 0]} center>
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
  onSelectAsset,
}: {
  placements: BattleAssetPlacement[];
  devMode: boolean;
  selectedAssetId: BattleAssetId;
  onSelectAsset: (id: BattleAssetId) => void;
}) {
  const selectedPlacement = placements.find((placement) => placement.id === selectedAssetId) || placements[0];
  const orbitTarget = selectedPlacement?.position || [0, 0.55, 0];

  return (
    <>
      <color attach="background" args={["#e8f7ff"]} />
      <ambientLight intensity={0.65} />
      <directionalLight castShadow intensity={1.35} position={[4, 7, 5]} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Suspense fallback={<LoadingCard />}>
        <group position={[0, -0.5, 0]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <circleGeometry args={[4.25, 72]} />
            <meshStandardMaterial color="#bfe7e3" roughness={0.82} />
          </mesh>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
            <ringGeometry args={[4.25, 4.65, 72]} />
            <meshStandardMaterial color="#9d8df1" roughness={0.8} />
          </mesh>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
            <planeGeometry args={[12, 8]} />
            <meshStandardMaterial color="#f7f2df" roughness={0.9} />
          </mesh>

          {placements.map((placement) => (
            <ModelErrorBoundary key={placement.id} label={placement.label}>
              <BattleGlbAsset
                placement={placement}
                devMode={devMode}
                selected={selectedAssetId === placement.id}
                onSelect={onSelectAsset}
              />
            </ModelErrorBoundary>
          ))}
        </group>
      </Suspense>
      <OrbitControls
        target={[orbitTarget[0], orbitTarget[1] + 0.25, orbitTarget[2]]}
        enablePan={devMode}
        minDistance={3.25}
        maxDistance={9.5}
        maxPolarAngle={Math.PI / 2.02}
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
  const [copyStatus, setCopyStatus] = useState("");

  const selectedPlacement = placements.find((placement) => placement.id === selectedAssetId) || placements[0];

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

    const baseId = selectedPlacement.id.replace(/-copy-\d+$/, "");
    let copyIndex = 1;
    let nextId = `${baseId}-copy-${copyIndex}`;

    while (placements.some((placement) => placement.id === nextId)) {
      copyIndex += 1;
      nextId = `${baseId}-copy-${copyIndex}`;
    }

    const duplicate: BattleAssetPlacement = {
      ...clonePlacement(selectedPlacement),
      id: nextId,
      label: `${selectedPlacement.label} Copy ${copyIndex}`,
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

  const savePlacementsToBrowser = () => {
    window.localStorage.setItem(BATTLE_DEV_STORAGE_KEY, JSON.stringify(placements));
    setCopyStatus("Saved browser placement");
  };

  const resetPlacements = () => {
    window.localStorage.removeItem(BATTLE_DEV_STORAGE_KEY);
    setPlacements(DEFAULT_BATTLE_3D_ASSET_PLACEMENTS.map(clonePlacement));
    setSelectedAssetId("embercub");
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
        <div style={canvasWrapStyle}>
          <Canvas camera={{ position: [0, 4.2, 6.2], fov: 42 }} shadows style={{ width: "100%", height: "100%" }}>
            <ArenaScene
              placements={placements}
              devMode={devMode}
              selectedAssetId={selectedAssetId}
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
          <p style={devHelpTextStyle}>Select an arena asset, then nudge position, rotation, and scale. Copy the code when it looks right.</p>

          <label style={devLabelStyle}>
            Selected asset
            <select
              style={devSelectStyle}
              value={selectedAssetId}
              onChange={(event) => setSelectedAssetId(event.target.value as BattleAssetId)}
            >
              {placements.map((placement) => (
                <option key={placement.id} value={placement.id}>{placement.label}</option>
              ))}
            </select>
          </label>

          <div style={devInfoBoxStyle}>
            <strong>{selectedPlacement.label}</strong>
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
            <button type="button" style={devResetButtonStyle} onClick={resetPlacements}><RotateCcw size={15} /> Reset</button>
          </div>
          {copyStatus && <div style={devStatusStyle}>{copyStatus}</div>}
        </aside>
      )}

      <section style={actionPanelStyle}>
        <div>
          <div style={eyebrowStyle}>Next build target</div>
          <h2 style={panelTitleStyle}>Replace legacy 2D battle with a GLB arena flow</h2>
          <p style={panelTextStyle}>
            This page intentionally does not replace /battle yet. It gives us a safe route to build the new 3D combat loop without breaking the current prototype.
          </p>
        </div>
        <div style={buttonRowStyle}>
          <button type="button" style={primaryButtonStyle}>
            <Sparkles size={18} />
            Attack preview
          </button>
          <button type="button" style={secondaryButtonStyle}>Defend</button>
          <button type="button" style={secondaryButtonStyle}>Special</button>
        </div>
      </section>
    </main>
  );
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "1.25rem",
  background: "linear-gradient(135deg, #e8f7ff 0%, #fff8dd 48%, #f7efff 100%)",
  color: "#2b2352",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  padding: "1rem 1.25rem",
  borderRadius: "1.5rem",
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
  margin: "1rem auto 0",
  maxWidth: "1180px",
  borderRadius: "2rem",
  overflow: "hidden",
  background: "rgba(255,255,255,0.78)",
  border: "3px solid rgba(255,255,255,0.95)",
  boxShadow: "0 22px 55px rgba(59, 45, 120, 0.18)",
};

const canvasWrapStyle: React.CSSProperties = { height: "min(62vh, 620px)", minHeight: 420 };
const hudStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", padding: "1rem", background: "rgba(255,255,255,0.82)" };
const participantCardStyle: React.CSSProperties = { borderRadius: "1.35rem", background: "#fff", padding: "1rem", boxShadow: "inset 0 0 0 2px rgba(157,141,241,0.12)" };
const participantNameStyle: React.CSSProperties = { margin: "0.15rem 0", fontSize: "1.35rem", fontWeight: 950 };
const participantSubStyle: React.CSSProperties = { minHeight: 38, margin: 0, color: "#6f668f", fontSize: "0.85rem", fontWeight: 700 };
const healthTrackStyle: React.CSSProperties = { marginTop: "0.8rem", width: "100%", height: 12, borderRadius: 999, background: "#f0eafa", overflow: "hidden" };
const healthFillStyle: React.CSSProperties = { width: "100%", height: "100%", background: "linear-gradient(90deg, #86a789, #9fd8aa)" };
const healthTextStyle: React.CSSProperties = { display: "block", marginTop: "0.3rem", color: "#80769c", fontWeight: 900 };

const actionPanelStyle: React.CSSProperties = {
  maxWidth: "1180px",
  margin: "1rem auto 0",
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
const panelTextStyle: React.CSSProperties = { margin: 0, color: "#6f668f", fontWeight: 700, maxWidth: 680 };
const buttonRowStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "0.65rem", justifyContent: "flex-end" };
const primaryButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.45rem", border: 0, borderRadius: 999, background: "#7c5cff", color: "#fff", padding: "0.85rem 1.1rem", fontWeight: 950, cursor: "pointer" };
const secondaryButtonStyle: React.CSSProperties = { border: "2px solid #d8d2fa", borderRadius: 999, background: "#fff", color: "#2b2352", padding: "0.85rem 1.1rem", fontWeight: 950, cursor: "pointer" };
const nameTagStyle: React.CSSProperties = { borderRadius: 999, background: "rgba(255,255,255,0.92)", color: "#2b2352", padding: "0.35rem 0.55rem", fontSize: "0.72rem", fontWeight: 950, boxShadow: "0 8px 18px rgba(52,41,92,0.18)", whiteSpace: "nowrap" };
const loadingStyle: React.CSSProperties = { borderRadius: "1rem", background: "rgba(255,255,255,0.95)", color: "#2b2352", padding: "0.85rem 1rem", fontWeight: 950 };
const missingAssetStyle: React.CSSProperties = { ...loadingStyle, color: "#8a4b00", background: "rgba(255,243,225,0.96)", border: "1px solid #ffc978" };

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
const devInfoBoxStyle: React.CSSProperties = { display: "grid", gap: "0.2rem", margin: "0.75rem 0", padding: "0.75rem", borderRadius: "0.9rem", background: "#f2efff", color: "#2b2352", fontSize: "0.75rem", fontWeight: 800 };
const devButtonGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" };
const devButtonStyle: React.CSSProperties = { border: "2px solid #d8d2fa", borderRadius: "0.8rem", background: "#fff", color: "#2b2352", padding: "0.58rem", fontWeight: 950, cursor: "pointer" };
const devActionRowStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginTop: "0.65rem" };
const devPrimaryButtonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", border: 0, borderRadius: "0.8rem", background: "#7c5cff", color: "#fff", padding: "0.58rem", fontSize: "0.72rem", fontWeight: 950, cursor: "pointer" };
const devResetButtonStyle: React.CSSProperties = { ...devPrimaryButtonStyle, background: "#fff3e1", color: "#8a4b00", border: "1px solid #ffc978" };
const devStatusStyle: React.CSSProperties = { marginTop: "0.65rem", color: "#7c5cff", fontSize: "0.78rem", fontWeight: 950, textAlign: "center" };

useGLTF.preload(EMBERCUB_MODEL_PATH);
useGLTF.preload(BUBBLEFIN_MODEL_PATH);
useGLTF.preload(ROCK_MODEL_PATH);
useGLTF.preload(TREE_MODEL_PATH);
useGLTF.preload(PLAYER_MODEL_PATH);

export default Battle3D;