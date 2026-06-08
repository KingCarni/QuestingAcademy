import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
import { ChibiAvatar } from "../../components/ChibiAvatar";
import { useStudio } from "../../lib/studioStore";
import { useGame } from "../../lib/gameStore";
import { Castle, Lock, MapPin, Waypoints } from "lucide-react";

type Pos = { left: string; top: string };
type MapSourceMode = "auto" | "realm" | "scene";
type RuntimeMarker = { id: string; label: string; type: string; x: number; y: number; source?: any };

const LIVE_POSITIONS: Pos[] = [
  { left: "20%", top: "58%" },
  { left: "43%", top: "28%" },
  { left: "70%", top: "54%" },
  { left: "54%", top: "78%" },
];
const UPCOMING_POSITIONS: Pos[] = [
  { left: "82%", top: "24%" },
  { left: "17%", top: "22%" },
  { left: "66%", top: "35%" },
];
const BIOME_EMOJI: Record<string, string> = { "spring meadow": "🌳", "snowy pine forest": "❄️", snowy: "❄️", desert: "🏜️", beach: "🏖️", ocean: "🌊", mountain: "🏔️", cave: "🕳️", volcano: "🌋", swamp: "🪻", sky: "☁️" };
const emojiFor = (biome = "") => { const key = biome.toLowerCase(); for (const k of Object.keys(BIOME_EMOJI)) if (key.includes(k)) return BIOME_EMOJI[k]; return "🗺️"; };
const WALK_DURATION_S = 0.9;
const isRuntimeReady = (item?: any) => item?.status === "approved" || item?.status === "published";
const sceneLabel = (scene?: any): string => scene?.name || scene?.title || scene?.id || "Imported Scene";

const normalizeStudioImageUrl = (url?: string): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/api/studio/image")) return `http://localhost:5050${trimmed}`;
  if (trimmed.startsWith("api/studio/image")) return `http://localhost:5050/${trimmed}`;
  if (trimmed.startsWith("/studio/image")) return `http://localhost:5050/api${trimmed}`;
  if (trimmed.startsWith("studio/image")) return `http://localhost:5050/api/${trimmed}`;
  if (trimmed.startsWith("/uploads/")) return `http://localhost:5050${trimmed}`;
  if (trimmed.startsWith("uploads/")) return `http://localhost:5050/${trimmed}`;
  return trimmed;
};

const getScenePreviewUrl = (scene?: any): string => normalizeStudioImageUrl(scene?.manualComposition?.previewCompositeUrl || scene?.manualComposition?.backgroundUrl || scene?.previewCompositeUrl || scene?.compositeUrl || scene?.previewUrl || scene?.generatedImageUrl || scene?.imageUrl || scene?.backgroundUrl || scene?.url || "");
const clampPercent = (value: any, fallback: number) => { const n = Number(value); if (!Number.isFinite(n)) return fallback; return Math.max(4, Math.min(96, n)); };

const getPossibleSceneMarkers = (scene?: any): RuntimeMarker[] => {
  if (!scene) return [];
  const rawCollections = [scene?.runtimeMarkers, scene?.markers, scene?.manualComposition?.markers, scene?.manualComposition?.exportedMarkers, scene?.manualComposition?.pointsOfInterest, scene?.pointsOfInterest, scene?.zones, scene?.manualComposition?.zones, scene?.assets, scene?.manualComposition?.assets].filter(Array.isArray);
  return rawCollections.flat().slice(0, 24).map((marker: any, index: number) => {
    const fallbackX = 18 + ((index * 17) % 64);
    const fallbackY = 22 + ((index * 19) % 52);
    return {
      id: String(marker?.id || marker?.assetId || marker?.name || `marker-${index}`),
      label: marker?.label || marker?.name || marker?.title || marker?.assetName || `Marker ${index + 1}`,
      type: marker?.type || marker?.kind || marker?.role || marker?.category || marker?.markerType || "point of interest",
      x: clampPercent(marker?.x ?? marker?.left ?? marker?.position?.x ?? marker?.anchor?.x ?? marker?.center?.x, fallbackX),
      y: clampPercent(marker?.y ?? marker?.top ?? marker?.position?.y ?? marker?.anchor?.y ?? marker?.center?.y, fallbackY),
      source: marker,
    };
  });
};

const RealmMap: React.FC = () => {
  const nav = useNavigate();
  const realms = useStudio((s) => s.realms);
  const scenes = useStudio((s) => s.scenes);
  const setActiveRealm = useGame((s) => s.setActiveRealm);
  const player = useGame((s) => s.player);

  const live = realms.filter((r: any) => r.status === "approved" || r.status === "published");
  const upcoming = realms.filter((r: any) => r.status === "pending" || r.status === "draft" || r.status === "generated");
  const sceneOptions = scenes.filter((scene: any) => isRuntimeReady(scene) || getScenePreviewUrl(scene));

  const [mapMode, setMapMode] = useState<MapSourceMode>("auto");
  const [selectedRealmId, setSelectedRealmId] = useState<string>(() => live[0]?.id ?? "");
  const [selectedSceneId, setSelectedSceneId] = useState<string>(() => sceneOptions[0]?.id ?? "");
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>("");
  const selectedRealm = live.find((r: any) => r.id === selectedRealmId) ?? live[0] ?? null;
  const selectedScene = sceneOptions.find((s: any) => s.id === selectedSceneId) ?? sceneOptions[0] ?? null;
  const activeScene = mapMode === "scene" || (mapMode === "auto" && selectedScene) ? selectedScene : null;
  const activeSceneImage = getScenePreviewUrl(activeScene);
  const sceneMarkers = useMemo(() => getPossibleSceneMarkers(activeScene), [activeScene]);
  const selectedMarker = sceneMarkers.find((m) => m.id === selectedMarkerId) ?? null;
  const [hero, setHero] = useState<{ x: number; y: number }>({ x: 50, y: 82 });
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const walkTo = (x: number, y: number): Promise<void> => { setHero({ x, y }); return new Promise((resolve) => setTimeout(resolve, WALK_DURATION_S * 1000)); };
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => { const c = canvasRef.current; if (!c) return; const rect = c.getBoundingClientRect(); const x = ((e.clientX - rect.left) / rect.width) * 100; const y = ((e.clientY - rect.top) / rect.height) * 100; walkTo(Math.max(4, Math.min(96, x)), Math.max(8, Math.min(92, y))); };
  const selectRealm = async (realmId: string, pos?: Pos, enter = false) => { setSelectedRealmId(realmId); setSelectedMarkerId(""); if (pos) await walkTo(parseFloat(pos.left), parseFloat(pos.top) + 8); if (enter) { setActiveRealm(realmId); nav(`/adventure/town/${realmId}`); } };
  const selectMarker = async (marker: RuntimeMarker, e?: React.MouseEvent) => { e?.stopPropagation(); setSelectedMarkerId(marker.id); await walkTo(marker.x, marker.y + 4); };
  const enterSelected = () => { if (selectedRealm) { setActiveRealm(selectedRealm.id); nav(`/adventure/town/${selectedRealm.id}`); } };

  useEffect(() => { setHero({ x: 50, y: 82 }); }, []);
  useEffect(() => { if (!selectedRealmId && live[0]?.id) setSelectedRealmId(live[0].id); }, [live, selectedRealmId]);

  return (
    <AdventureLayout title="Realm Map" subtitle="Import a scene map, inspect markers, and enter a realm" back="/adventure">
      <section className="w-full px-4 md:px-8 py-6 pb-28">
        <div className="mx-auto mb-5 max-w-[70rem] rounded-[2rem] bg-white/82 border-2 border-white p-4 shadow-sm" data-testid="realm-dev-map-slots">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3"><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Dev map slots</p><p className="text-xs text-ink-muted">Select imported realms/scenes. Scene markers/zones/assets are previewed as runtime map chips.</p></div></div>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Map source</span><select className="input mt-1" value={mapMode} onChange={(e) => setMapMode(e.target.value as MapSourceMode)}><option value="auto">Auto</option><option value="realm">Realm atlas fallback</option><option value="scene">Imported scene composition</option></select></label>
            <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Realm</span><select className="input mt-1" value={selectedRealmId} onChange={(e) => setSelectedRealmId(e.target.value)}>{live.map((r: any) => <option key={r.id} value={r.id}>{r.name || r.id}</option>)}</select></label>
            <label className="block"><span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Scene composition</span><select className="input mt-1" value={selectedSceneId} onChange={(e) => setSelectedSceneId(e.target.value)}><option value="">No scene selected</option>{sceneOptions.map((s: any) => <option key={s.id} value={s.id}>{sceneLabel(s)}</option>)}</select></label>
          </div>
        </div>

        <div className="grid w-full grid-cols-[minmax(0,1fr)_24rem] gap-7 items-start">
          <div className="flex justify-center">
            <div ref={canvasRef} onClick={handleCanvasClick} data-testid="realm-world-canvas" className="relative w-full max-w-[86rem] aspect-[16/9] min-h-[44rem] rounded-[2.75rem] overflow-hidden border-[7px] border-white shadow-2xl shadow-indigo-900/20 cursor-pointer select-none ring-4 ring-primary/10" style={{ backgroundImage: activeSceneImage ? `url(${activeSceneImage})` : undefined, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#BFE0F2" }}>
            {!activeSceneImage && <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 18% 18%, rgba(255,255,255,0.95) 0%, transparent 26%), radial-gradient(ellipse at 78% 20%, rgba(255,246,216,0.9) 0%, transparent 32%), radial-gradient(ellipse at 18% 78%, rgba(205,224,207,0.8) 0%, transparent 34%), linear-gradient(145deg, #BFE0F2 0%, #D7EEF4 38%, #F6EBCB 100%)" }} />}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/45" />
            <div className="absolute top-5 left-5 rounded-3xl bg-white/80 backdrop-blur-md border-2 border-white px-4 py-3 shadow-lg pointer-events-none z-30"><p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Runtime map</p><p className="h-display text-xl text-ink">{activeScene ? sceneLabel(activeScene) : "Edu-Mates Atlas"}</p></div>

            {!activeSceneImage && <>
              <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-10"><path d="M 20 66 C 28 42, 38 34, 43 32 S 62 38, 70 60" fill="none" stroke="#9D8DF1" strokeWidth="1.35" strokeDasharray="2.4 2.2" strokeLinecap="round" opacity="0.82" /><path d="M 20 66 C 28 42, 38 34, 43 32 S 62 38, 70 60" fill="none" stroke="white" strokeWidth="2.4" strokeDasharray="2.4 2.2" strokeLinecap="round" opacity="0.35" /></svg>
              {live.map((r: any, i: number) => { const pos = LIVE_POSITIONS[i % LIVE_POSITIONS.length]; const selected = selectedRealm?.id === r.id; return <button type="button" key={r.id} onClick={(e) => { e.stopPropagation(); selectRealm(r.id, pos, false); }} onDoubleClick={(e) => { e.stopPropagation(); selectRealm(r.id, pos, true); }} data-testid={`realm-node-${r.id}`} className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none z-20" style={pos}><div className="relative flex flex-col items-center"><div className={`w-24 h-24 md:w-32 md:h-32 rounded-[40%] border-[5px] shadow-2xl grid place-items-center ${selected ? "border-gold bg-gradient-to-b from-[#FFF6D8] via-[#E8F4E1] to-[#86A789] ring-4 ring-gold/35" : "border-white bg-gradient-to-b from-[#E8F4E1] via-[#CDE0CF] to-[#86A789]"}`}><span className="text-5xl md:text-6xl drop-shadow-sm" aria-hidden>{emojiFor(r.biome)}</span></div><div className={`mt-3 chip border-white max-w-[210px] truncate text-center shadow-sm ${selected ? "bg-primary text-white" : "bg-white/95 text-ink"}`}><MapPin size={12} strokeWidth={3} /> <span className="h-bouncy">{r.name}</span></div></div></button>; })}
              {upcoming.map((r: any, i: number) => { const pos = UPCOMING_POSITIONS[i % UPCOMING_POSITIONS.length]; return <div key={r.id} className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-75" style={pos}><div className="w-20 h-20 rounded-[42%] bg-white/55 border-4 border-white grid place-items-center backdrop-blur-sm"><Lock size={26} strokeWidth={3} className="text-ink-muted" /></div></div>; })}
            </>}

            {sceneMarkers.map((marker) => { const selected = selectedMarker?.id === marker.id; return <button key={marker.id} type="button" onClick={(e) => selectMarker(marker, e)} className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group" style={{ left: `${marker.x}%`, top: `${marker.y}%` }} data-testid={`realm-marker-${marker.id}`}><div className={`rounded-full border-2 px-3 py-2 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-extrabold transition ${selected ? "bg-primary text-white border-white scale-110" : "bg-white/86 text-ink border-white hover:-translate-y-0.5"}`}><Waypoints size={14} strokeWidth={3} /><span className="max-w-[130px] truncate">{marker.label}</span></div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted bg-white/75 rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 transition">{marker.type}</div></button>; })}

            {player && <motion.div data-testid="hero-sprite" className="absolute pointer-events-none z-40" initial={false} animate={{ left: `${hero.x}%`, top: `${hero.y}%` }} transition={{ duration: WALK_DURATION_S, ease: "easeInOut" }} style={{ translateX: "-50%", translateY: "-100%" }}><motion.div animate={{ y: [0, -3, 0, -3, 0] }} transition={{ duration: WALK_DURATION_S, ease: "easeInOut", repeat: 0 }} key={`${hero.x.toFixed(0)}-${hero.y.toFixed(0)}`}><ChibiAvatar config={player.avatar} size={66} /></motion.div></motion.div>}
            </div>
          </div>

          <aside className="w-full rounded-[2.5rem] border-[5px] border-white bg-white/82 backdrop-blur-md shadow-2xl shadow-indigo-900/10 p-5 sticky top-6 max-h-[44rem] overflow-y-auto" data-testid="realm-legend">
            <div className="mb-5"><p className="text-xs font-extrabold uppercase tracking-widest text-primary">Selected Destination</p><h2 className="h-display text-3xl text-ink mt-1">{selectedMarker?.label || selectedRealm?.name || "Choose your path"}</h2><p className="text-sm text-ink-muted mt-2">{selectedMarker ? selectedMarker.type : selectedRealm ? selectedRealm.biome : "Pick a realm or imported marker from the map."}</p></div>
            <div className="rounded-[2rem] bg-gradient-to-br from-primary/10 via-white/80 to-gold/15 border-2 border-white p-5 mb-5"><div className="flex items-center gap-4"><div className="w-20 h-20 rounded-3xl bg-white grid place-items-center text-4xl shadow-inner" aria-hidden>{selectedMarker ? "📍" : emojiFor(selectedRealm?.biome || "")}</div><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">{selectedMarker ? "Imported marker" : "Open realm"}</p><p className="h-display text-2xl leading-tight">{selectedMarker?.label || selectedRealm?.name || "No destination"}</p><p className="text-xs text-ink-muted mt-1">{selectedMarker ? "Marker is selectable now. Runtime routing comes next." : "Ready for town, quests, and battles."}</p></div></div><button type="button" onClick={enterSelected} className="btn-primary w-full justify-center mt-5" data-testid="realm-enter-selected"><Castle size={18} strokeWidth={3} /> Enter / Travel</button></div>
            <div className="space-y-3"><p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Scene markers</p>{sceneMarkers.length ? sceneMarkers.slice(0, 8).map((marker) => <button key={`panel-${marker.id}`} type="button" onClick={() => selectMarker(marker)} className={`w-full card-base !p-3 text-left border-2 flex items-center gap-3 ${selectedMarker?.id === marker.id ? "border-primary bg-primary/10" : "border-white/80"}`}><Waypoints size={16} strokeWidth={3} className="text-primary" /><div className="min-w-0"><p className="h-display text-base truncate">{marker.label}</p><p className="text-xs text-ink-muted truncate">{marker.type}</p></div></button>) : <p className="text-sm text-ink-muted">No exported markers/zones/assets found on this scene yet.</p>}</div>
          </aside>
        </div>
      </section>
    </AdventureLayout>
  );
};

export default RealmMap;
