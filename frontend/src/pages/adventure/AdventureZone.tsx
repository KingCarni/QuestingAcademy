import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
import { ChibiAvatar } from "../../components/ChibiAvatar";
import { useGame } from "../../lib/gameStore";
import {
  ADVENTURE_ZONE_ACTION_KIND_LABELS,
  ADVENTURE_ZONE_ACTION_LABELS,
  ADVENTURE_ZONE_MARKER_LABELS,
  ADVENTURE_ZONES,
  inferAdventureMarkerActionKind,
  type AdventureMarkerActionKind,
  type AdventureZoneMarker,
} from "../../lib/adventureZoneTypes";
import { ArrowLeft, Box, CheckCircle2, Leaf, MapPin, MessageCircle, Search, Sparkles, Swords, Trees, Waypoints } from "lucide-react";

const WALK_DURATION_S = 0.85;

type HeroPosition = { x: number; y: number };

type EncounterPresentationMode = "marker-only" | "visible-chip" | "visible-creature";

const markerIcon = (type: AdventureZoneMarker["type"]) => {
  switch (type) {
    case "town-return": return ArrowLeft;
    case "zone-exit": return Trees;
    case "quest-objective": return Sparkles;
    case "chest": return Box;
    case "resource-node": return Leaf;
    case "npc-anchor": return MessageCircle;
    case "battle-trigger": return Swords;
    case "companion-encounter": return Search;
    case "player-start": return MapPin;
    default: return Waypoints;
  }
};

const clampPercent = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const distancePercent = (a: HeroPosition, b: HeroPosition) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getMarkerActionKind = (marker: AdventureZoneMarker): AdventureMarkerActionKind => marker.actionKind ?? inferAdventureMarkerActionKind(marker.type);

const getEncounterVisual = (marker: AdventureZoneMarker) => {
  if (marker.type === "battle-trigger") return { emoji: "🌿", label: "Challenge" };
  if (marker.type === "companion-encounter") return { emoji: "✨", label: "Companion" };
  return { emoji: "📍", label: "Marker" };
};

const AdventureZone: React.FC = () => {
  const nav = useNavigate();
  const { zoneId } = useParams<{ zoneId: string }>();
  const player = useGame((s) => s.player);

  const zone = useMemo(() => ADVENTURE_ZONES.find((z) => z.id === zoneId) ?? ADVENTURE_ZONES[0], [zoneId]);
  const startMarker = zone.markers.find((marker) => marker.id === zone.playerStartMarkerId) ?? zone.markers.find((marker) => marker.type === "player-start");
  const bounds = zone.movementBounds ?? { minX: 4, maxX: 96, minY: 8, maxY: 92 };

  const [hero, setHero] = useState<HeroPosition>(() => ({ x: startMarker?.x ?? 50, y: startMarker?.y ?? 82 }));
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>("");
  const [showDebugMarkers, setShowDebugMarkers] = useState(true);
  const [cameraFollow, setCameraFollow] = useState(zone.camera?.enabled ?? true);
  const [presentationMode, setPresentationMode] = useState<EncounterPresentationMode>(zone.encounterPresentation);
  const [completedMarkers, setCompletedMarkers] = useState<Record<string, boolean>>({});
  const [lastAction, setLastAction] = useState("Click anywhere on the meadow to move.");
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const selectedMarker = zone.markers.find((marker) => marker.id === selectedMarkerId) ?? null;
  const completedCount = Object.values(completedMarkers).filter(Boolean).length;

  useEffect(() => {
    setHero({ x: startMarker?.x ?? 50, y: startMarker?.y ?? 82 });
    setSelectedMarkerId("");
    setCameraFollow(zone.camera?.enabled ?? true);
    setPresentationMode(zone.encounterPresentation);
    setCompletedMarkers({});
    setLastAction(`Loaded ${zone.name}.`);
  }, [zone.id, zone.name, zone.camera?.enabled, zone.encounterPresentation, startMarker?.x, startMarker?.y]);

  const clampToBounds = (x: number, y: number): HeroPosition => ({
    x: clampPercent(x, bounds.minX, bounds.maxX),
    y: clampPercent(y, bounds.minY, bounds.maxY),
  });

  const walkTo = (x: number, y: number): Promise<void> => {
    const next = clampToBounds(x, y);
    setHero(next);
    return new Promise((resolve) => setTimeout(resolve, WALK_DURATION_S * 1000));
  };

  const cameraTransform = useMemo(() => {
    if (!cameraFollow || zone.camera?.mode !== "soft-follow") return "translate3d(0%, 0%, 0) scale(1)";
    const offsetX = clampPercent((50 - hero.x) * 0.08, -2.4, 2.4);
    const offsetY = clampPercent((50 - hero.y) * 0.08, -1.4, 1.4);
    return `translate3d(${offsetX}%, ${offsetY}%, 0) scale(1.015)`;
  }, [cameraFollow, hero.x, hero.y, zone.camera?.mode]);

  const nearestMarker = useMemo(() => {
    const candidates = zone.markers.filter((marker) => marker.type !== "player-start");
    const near = candidates
      .map((marker) => ({ marker, distance: distancePercent(hero, { x: marker.x, y: marker.y }) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!near) return null;
    const radius = near.marker.radius ?? 7;
    return near.distance <= radius + 2 ? near.marker : null;
  }, [hero, zone.markers]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const next = clampToBounds(x, y);
    setSelectedMarkerId("");
    setLastAction(`Walking to ${next.x.toFixed(0)}%, ${next.y.toFixed(0)}%.`);
    walkTo(next.x, next.y);
  };

  const selectMarker = async (marker: AdventureZoneMarker, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedMarkerId(marker.id);
    setLastAction(`Moving toward ${marker.label}.`);
    await walkTo(marker.x, clampPercent(marker.y + 4, bounds.minY, bounds.maxY));
  };

  const completeMarker = (marker: AdventureZoneMarker, message: string) => {
    setCompletedMarkers((current) => ({ ...current, [marker.id]: true }));
    setLastAction(message);
  };

  const activateSelected = () => {
    if (!selectedMarker) return;
    const actionKind = getMarkerActionKind(selectedMarker);
    const actionLabel = ADVENTURE_ZONE_ACTION_KIND_LABELS[actionKind] || ADVENTURE_ZONE_ACTION_LABELS[selectedMarker.type];

    if (actionKind === "return-town") {
      setLastAction("Returning to town...");
      nav(selectedMarker.target || "/adventure/realms");
      return;
    }

    if (actionKind === "start-battle") {
      setLastAction(`Starting ${selectedMarker.label}...`);
      nav(selectedMarker.target || "/battle");
      return;
    }

    if (actionKind === "travel-zone") {
      if (selectedMarker.target && selectedMarker.target.startsWith("/")) {
        nav(selectedMarker.target);
        return;
      }
      setLastAction(`${selectedMarker.label} is a future route: ${selectedMarker.target || "not linked yet"}.`);
      return;
    }

    if (["inspect", "collect", "gather", "talk", "companion-encounter"].includes(actionKind)) {
      const rewardText = selectedMarker.rewardLabel ? ` ${selectedMarker.rewardLabel}.` : "";
      completeMarker(selectedMarker, `${actionLabel}: ${selectedMarker.label}.${rewardText}`);
      return;
    }

    setLastAction(`${actionLabel}: ${selectedMarker.label}`);
  };

  return (
    <AdventureLayout title={zone.name} subtitle={`${zone.subtitle} · ${zone.biome}`} back="/adventure/realms">
      <section className="w-full px-2 md:px-4 py-3 pb-28">
        <div className="mx-auto mb-3 max-w-[92rem] rounded-[2rem] bg-white/82 border-2 border-white p-4 shadow-sm" data-testid="adventure-zone-dev-slots">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">TEA-132 / TEA-133 adventure interactions</p>
              <p className="text-xs text-ink-muted">Gameplay marker actions, completion states, and optional encounter presentation modes.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="chip bg-primary/10 border-primary/20 text-primary">{zone.mode}</span>
              <select value={presentationMode} onChange={(e) => setPresentationMode(e.target.value as EncounterPresentationMode)} className="chip bg-gold/15 border-gold/30 text-ink-muted font-extrabold outline-none">
                <option value="marker-only">marker-only</option>
                <option value="visible-chip">visible-chip</option>
                <option value="visible-creature">visible-creature</option>
              </select>
              <label className="chip bg-white/80 border-white text-ink-muted cursor-pointer">
                <input type="checkbox" checked={showDebugMarkers} onChange={(e) => setShowDebugMarkers(e.target.checked)} />
                Show markers
              </label>
              <label className="chip bg-white/80 border-white text-ink-muted cursor-pointer">
                <input type="checkbox" checked={cameraFollow} onChange={(e) => setCameraFollow(e.target.checked)} />
                Soft camera
              </label>
              <span className="chip bg-emerald-100 border-emerald-200 text-emerald-700">{completedCount} completed</span>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-none min-h-[calc(100vh-11rem)] pr-[18.5rem]">
          <div className="flex justify-center">
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              data-testid="adventure-zone-canvas"
              className="relative w-[calc(100vw-21rem)] max-w-[148rem] min-w-[112rem] aspect-[16/9] rounded-[2.75rem] overflow-hidden border-[7px] border-white shadow-2xl shadow-indigo-900/20 cursor-pointer select-none ring-4 ring-primary/10 bg-cover bg-center"
              style={{
                backgroundImage: `url(${zone.mapUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundColor: "#BFE0F2",
              }}
            >
              <motion.div className="absolute inset-0 origin-center" animate={{ transform: cameraTransform }} transition={{ duration: 0.45, ease: "easeOut" }}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-ink/18 pointer-events-none" />
                <div className="absolute top-5 left-5 rounded-3xl bg-white/84 backdrop-blur-md border-2 border-white px-4 py-3 shadow-lg pointer-events-none z-30">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Adventure zone</p>
                  <p className="h-display text-xl text-ink">{zone.name}</p>
                  <p className="text-xs text-ink-muted">Hero {hero.x.toFixed(0)}%, {hero.y.toFixed(0)}%</p>
                </div>

                {zone.markers.filter((marker) => marker.type === "battle-trigger" || marker.type === "companion-encounter").map((marker) => {
                  if (presentationMode === "marker-only") return null;
                  const visual = getEncounterVisual(marker);
                  return (
                    <button
                      key={`encounter-${marker.id}`}
                      type="button"
                      onClick={(e) => selectMarker(marker, e)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                      data-testid={`adventure-zone-visible-encounter-${marker.id}`}
                    >
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} className="grid place-items-center">
                        {presentationMode === "visible-creature" ? (
                          <div className="w-16 h-16 rounded-full bg-white/82 border-4 border-white shadow-xl grid place-items-center text-3xl">
                            {marker.type === "battle-trigger" ? "🍄" : "🐾"}
                          </div>
                        ) : (
                          <div className="rounded-full bg-white/88 border-4 border-white shadow-xl px-4 py-2 text-sm font-extrabold text-ink flex items-center gap-2">
                            <span>{visual.emoji}</span>
                            <span>{visual.label}</span>
                          </div>
                        )}
                      </motion.div>
                    </button>
                  );
                })}

                {showDebugMarkers && zone.markers.map((marker) => {
                  const Icon = markerIcon(marker.type);
                  const selected = selectedMarker?.id === marker.id;
                  const nearby = nearestMarker?.id === marker.id;
                  const completed = Boolean(completedMarkers[marker.id]);
                  return (
                    <button
                      key={marker.id}
                      type="button"
                      onClick={(e) => selectMarker(marker, e)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group"
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                      data-testid={`adventure-zone-marker-${marker.id}`}
                    >
                      <div className={`rounded-full border-2 px-3 py-2 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-extrabold transition ${completed ? "bg-emerald-100 text-emerald-700 border-white" : selected ? "bg-primary text-white border-white scale-110" : nearby ? "bg-gold/90 text-ink border-white scale-105" : "bg-white/86 text-ink border-white hover:-translate-y-0.5"}`}>
                        {completed ? <CheckCircle2 size={14} strokeWidth={3} /> : <Icon size={14} strokeWidth={3} />}
                        <span className="max-w-[140px] truncate">{marker.label}</span>
                      </div>
                      {marker.radius && (
                        <span className="absolute left-1/2 top-1/2 rounded-full border-2 border-white/65 bg-primary/10 -z-10" style={{ width: `${marker.radius * 2.2}rem`, height: `${marker.radius * 2.2}rem`, transform: "translate(-50%, -50%)" }} />
                      )}
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted bg-white/75 rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 transition">
                        {ADVENTURE_ZONE_MARKER_LABELS[marker.type]}
                      </div>
                    </button>
                  );
                })}

                {player && (
                  <motion.div
                    data-testid="adventure-zone-hero-sprite"
                    className="absolute pointer-events-none z-40 drop-shadow-xl"
                    initial={false}
                    animate={{ left: `${hero.x}%`, top: `${hero.y}%` }}
                    transition={{ duration: WALK_DURATION_S, ease: "easeInOut" }}
                    style={{ translateX: "-50%", translateY: "-100%" }}
                  >
                    <motion.div animate={{ y: [0, -4, 0, -3, 0] }} transition={{ duration: WALK_DURATION_S, ease: "easeInOut", repeat: 0 }} key={`${hero.x.toFixed(0)}-${hero.y.toFixed(0)}`}>
                      <ChibiAvatar config={player.avatar} size={74} />
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>

          <aside className="fixed right-3 top-28 z-30 w-[17.5rem] max-h-[calc(100vh-9rem)] overflow-y-auto rounded-[2rem] border-[4px] border-white bg-white/84 backdrop-blur-md shadow-2xl shadow-indigo-900/10 p-4" data-testid="adventure-zone-detail-rail">
            <div className="mb-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Selected marker</p>
              <h2 className="h-display text-2xl text-ink mt-1">{selectedMarker?.label || nearestMarker?.label || "Choose a trail point"}</h2>
              <p className="text-xs text-ink-muted mt-1">{selectedMarker ? ADVENTURE_ZONE_MARKER_LABELS[selectedMarker.type] : nearestMarker ? `Nearby: ${ADVENTURE_ZONE_MARKER_LABELS[nearestMarker.type]}` : "Pick an objective, chest, exit, or encounter marker."}</p>
            </div>
            <div className="rounded-[1.5rem] bg-gradient-to-br from-primary/10 via-white/80 to-gold/15 border-2 border-white p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white grid place-items-center text-2xl shadow-inner" aria-hidden>{selectedMarker && completedMarkers[selectedMarker.id] ? "✅" : "🧭"}</div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">Prototype action</p>
                  <p className="h-display text-lg leading-tight">{selectedMarker ? ADVENTURE_ZONE_ACTION_KIND_LABELS[getMarkerActionKind(selectedMarker)] : nearestMarker ? ADVENTURE_ZONE_ACTION_KIND_LABELS[getMarkerActionKind(nearestMarker)] : "No action"}</p>
                </div>
              </div>
              <p className="text-xs text-ink-muted mt-3 leading-snug">{selectedMarker?.description || nearestMarker?.description || "Marker-driven interactions first. Visible creatures/companions are optional presentation modes."}</p>
              {selectedMarker?.encounterFamily && <p className="text-[10px] text-primary font-extrabold mt-2 uppercase tracking-wider">Encounter: {selectedMarker.encounterFamily}</p>}
              {selectedMarker?.rewardLabel && <p className="text-[10px] text-emerald-700 font-extrabold mt-2 uppercase tracking-wider">Reward: {selectedMarker.rewardLabel}</p>}
              <button type="button" onClick={activateSelected} disabled={!selectedMarker} className="btn-primary w-full justify-center mt-4 disabled:opacity-50 disabled:cursor-not-allowed" data-testid="adventure-zone-activate-marker">
                {selectedMarker ? ADVENTURE_ZONE_ACTION_KIND_LABELS[getMarkerActionKind(selectedMarker)] : "Select marker"}
              </button>
            </div>
            <div className="rounded-[1.25rem] bg-white/72 border-2 border-white p-3 mb-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">Movement status</p>
              <p className="text-xs text-ink-muted mt-1 leading-snug">{lastAction}</p>
              <p className="text-[10px] text-ink-muted mt-2">Bounds: X {bounds.minX}-{bounds.maxX}, Y {bounds.minY}-{bounds.maxY}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">Zone markers</p>
              {zone.markers.map((marker) => {
                const Icon = markerIcon(marker.type);
                const completed = Boolean(completedMarkers[marker.id]);
                return (
                  <button key={`rail-${marker.id}`} type="button" onClick={() => selectMarker(marker)} className={`w-full card-base !p-3 text-left border-2 flex items-center gap-3 ${selectedMarker?.id === marker.id ? "border-primary bg-primary/10" : completed ? "border-emerald-200 bg-emerald-50" : "border-white/80"}`}>
                    {completed ? <CheckCircle2 size={16} strokeWidth={3} className="text-emerald-600" /> : <Icon size={16} strokeWidth={3} className="text-primary" />}
                    <div className="min-w-0">
                      <p className="h-display text-base truncate">{marker.label}</p>
                      <p className="text-xs text-ink-muted truncate">{ADVENTURE_ZONE_MARKER_LABELS[marker.type]}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </section>
    </AdventureLayout>
  );
};

export default AdventureZone;
