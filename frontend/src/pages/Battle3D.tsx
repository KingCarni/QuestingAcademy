import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { ArrowLeft, Box, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { useGame } from "../lib/gameStore";
import { useStudio } from "../lib/studioStore";

const EMBERCUB_MODEL_PATH = "/assets/3d/pets/embercub.glb";
const PLAYER_MODEL_PATH = "/assets/3d/avatar/avatar.glb";

type BattleParticipantCardProps = {
  eyebrow: string;
  name: string;
  subtitle: string;
  align?: "left" | "right";
};

function LoadingCard() {
  return (
    <Html center>
      <div style={loadingStyle}>Loading 3D battle arena...</div>
    </Html>
  );
}

function EmbercubModel() {
  const gltf = useGLTF(EMBERCUB_MODEL_PATH) as any;
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((child: any) => {
      if (child?.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return cloned;
  }, [gltf.scene]);

  return <primitive object={scene} position={[-1.9, 0.12, 0]} rotation={[0, 1.1, 0]} scale={0.95} />;
}

function PlayerModelGhost() {
  const gltf = useGLTF(PLAYER_MODEL_PATH) as any;
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((child: any) => {
      if (child?.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return cloned;
  }, [gltf.scene]);

  return <primitive object={scene} position={[-3.4, 0.05, 1.05]} rotation={[0, 0.75, 0]} scale={0.75} />;
}

function EnemyPlaceholder() {
  return (
    <group position={[2.05, 0.35, -0.05]} rotation={[0, -0.7, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.62, 32, 24]} />
        <meshStandardMaterial color="#d4a373" roughness={0.7} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.05, 0]}>
        <coneGeometry args={[0.55, 0.7, 5]} />
        <meshStandardMaterial color="#6b3f36" roughness={0.65} />
      </mesh>
      <Html position={[0, 1.85, 0]} center>
        <div style={nameTagStyle}>Enemy GLB slot</div>
      </Html>
    </group>
  );
}

function ArenaScene() {
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
          <EmbercubModel />
          <PlayerModelGhost />
          <EnemyPlaceholder />
        </group>
      </Suspense>
      <OrbitControls target={[0, 0.35, 0]} enablePan={false} minDistance={4.5} maxDistance={8} maxPolarAngle={Math.PI / 2.05} />
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
  const npcs = useStudio((state) => state.npcs);
  const starterCompanion = companions.find((companion: any) => companion?.name === "Embercub") || companions[0];
  const opponent = npcs.find((npc: any) => npc?.status === "approved" || npc?.status === "published") || {
    name: "Training Dummy",
    role: "3D enemy placeholder",
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
        <div style={pillStyle}>
          <Box size={16} />
          Arena scaffold
        </div>
      </header>

      <section style={battleShellStyle}>
        <div style={canvasWrapStyle}>
          <Canvas camera={{ position: [0, 4.2, 6.2], fov: 42 }} shadows style={{ width: "100%", height: "100%" }}>
            <ArenaScene />
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
            name={opponent?.name || "Enemy GLB slot"}
            subtitle="Temporary placeholder until enemy GLBs are assigned through Content Studio."
            align="right"
          />
        </div>
      </section>

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
const pillStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.4rem", border: "2px solid #9d8df1", borderRadius: 999, padding: "0.65rem 0.9rem", fontWeight: 900, background: "#fff" };

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

useGLTF.preload(EMBERCUB_MODEL_PATH);
useGLTF.preload(PLAYER_MODEL_PATH);

export default Battle3D;
