import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
import { ChibiAvatar } from "../../components/ChibiAvatar";
import { useGame } from "../../lib/gameStore";
import {
  ADVENTURE_ZONE_ACTION_LABELS,
  ADVENTURE_ZONE_MARKER_LABELS,
  ADVENTURE_ZONES,
  type AdventureZoneMarker,
} from "../../lib/adventureZoneTypes";
import { ArrowLeft, Box, Leaf, MapPin, MessageCircle, Search, Sparkles, Swords, Trees, Waypoints } from "lucide-react";

const WALK_DURATION_S = 0.9;

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

const AdventureZone: React.FC = () => {
  const nav = useNavigate();
  const { zoneId } = useParams<{ zoneId: string }>();
  const player = useGame((s) => s.player);

  const zone = useMemo(() => ADVENTURE_ZONES.find((z) => z.id === zoneId) ?? ADVENTURE_ZONES[0], [zoneId]);
  const startMarker = zone.markers.find((marker) => marker.type === "player-start");
  const [hero, setHero] = useState<{ x: number; y: number }>(() => ({ x: startMarker?.x ?? 50, y: startMarker?.y ?? 82 }));
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>("");
  const [showDebugMarkers, setShowDebugMarkers] = useState(true);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const selectedMarker = zone.markers.find((marker) => marker.id === selectedMarkerId) ?? null;

  useEffect(() => {
    setHero({ x: startMarker?.x ?? 50, y: startMarker?.y ?? 82 });
    setSelectedMarkerId("");
  }, [zone.id, startMarker?.x, startMarker?.y]);

  const walkTo = (x: number, y: number): Promise<void> => {
    setHero({ x, y });
    return new Promise((resolve) => setTimeout(resolve, WALK_DURATION_S * 1000));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSelectedMarkerId("");
    walkTo(clampPercent(x, 4, 96), clampPercent(y, 8, 92));
  };

  const selectMarker = async (marker: AdventureZoneMarker, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedMarkerId(marker.id);
    await walkTo(marker.x, clampPercent(marker.y + 4, 8, 92));
  };

  const activateSelected = () => {
    if (!selectedMarker) return;
    if (selectedMarker.type === "town-return") {
      nav("/adventure/realms");
      return;
    }
    if (selectedMarker.type === "battle-trigger") {
      nav(selectedMarker.target || "/battle");
      return;
    }
  };

  return (
    <AdventureLayout title={zone.name} subtitle={`${zone.subtitle} · ${zone.biome}`} back="/adventure/realms">
      <section className="w-full px-2 md:px-4 py-3 pb-28">
        <div className="mx-auto mb-3 max-w-[92rem] rounded-[2rem] bg-white/82 border-2 border-white p-4 shadow-sm" data-testid="adventure-zone-dev-slots">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Dev adventure zone</p>
              <p className="text-xs text-ink-muted">Prototype shell for out-of-town maps. Movement is shared-stage ready; collision comes next.</p>
            </div>
            <label className="chip bg-white/80 border-white text-ink-muted cursor-pointer">
              <input type="checkbox" checked={showDebugMarkers} onChange={(e) => setShowDebugMarkers(e.target.checked)} />
              Show debug markers
            </label>
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
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-ink/18 pointer-events-none" />
              <div className="absolute top-5 left-5 rounded-3xl bg-white/84 backdrop-blur-md border-2 border-white px-4 py-3 shadow-lg pointer-events-none z-30">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Adventure zone</p>
                <p className="h-display text-xl text-ink">{zone.name}</p>
              </div>

              {showDebugMarkers && zone.markers.map((marker) => {
                const Icon = markerIcon(marker.type);
                const selected = selectedMarker?.id === marker.id;
                return (
                  <button
                    key={marker.id}
                    type="button"
                    onClick={(e) => selectMarker(marker, e)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group"
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    data-testid={`adventure-zone-marker-${marker.id}`}
                  >
                    <div className={`rounded-full border-2 px-3 py-2 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-extrabold transition ${selected ? "bg-primary text-white border-white scale-110" : "bg-white/86 text-ink border-white hover:-translate-y-0.5"}`}>
                      <Icon size={14} strokeWidth={3} />
                      <span className="max-w-[140px] truncate">{marker.label}</span>
                    </div>
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
                  <motion.div animate={{ y: [0, -3, 0, -3, 0] }} transition={{ duration: WALK_DURATION_S, ease: "easeInOut", repeat: 0 }} key={`${hero.x.toFixed(0)}-${hero.y.toFixed(0)}`}>
                    <ChibiAvatar config={player.avatar} size={72} />
                  </motion.div>
                </motion.div>
              )}
            </div>
          </div>

          <aside className="fixed right-3 top-28 z-30 w-[17.5rem] max-h-[calc(100vh-9rem)] overflow-y-auto rounded-[2rem] border-[4px] border-white bg-white/84 backdrop-blur-md shadow-2xl shadow-indigo-900/10 p-4" data-testid="adventure-zone-detail-rail">
            <div className="mb-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Selected marker</p>
              <h2 className="h-display text-2xl text-ink mt-1">{selectedMarker?.label || "Choose a trail point"}</h2>
              <p className="text-xs text-ink-muted mt-1">{selectedMarker ? ADVENTURE_ZONE_MARKER_LABELS[selectedMarker.type] : "Pick an objective, chest, exit, or encounter marker."}</p>
            </div>
            <div className="rounded-[1.5rem] bg-gradient-to-br from-primary/10 via-white/80 to-gold/15 border-2 border-white p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white grid place-items-center text-2xl shadow-inner" aria-hidden>🧭</div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">Prototype action</p>
                  <p className="h-display text-lg leading-tight">{selectedMarker ? ADVENTURE_ZONE_ACTION_LABELS[selectedMarker.type] : "No action"}</p>
                </div>
              </div>
              <p className="text-xs text-ink-muted mt-3 leading-snug">{selectedMarker?.description || "Marker-driven interactions first. Visible creatures/companions can come later as a presentation layer."}</p>
              <button type="button" onClick={activateSelected} disabled={!selectedMarker} className="btn-primary w-full justify-center mt-4 disabled:opacity-50 disabled:cursor-not-allowed" data-testid="adventure-zone-activate-marker">
                {selectedMarker ? ADVENTURE_ZONE_ACTION_LABELS[selectedMarker.type] : "Select marker"}
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">Zone markers</p>
              {zone.markers.map((marker) => {
                const Icon = markerIcon(marker.type);
                return (
                  <button key={`rail-${marker.id}`} type="button" onClick={() => selectMarker(marker)} className={`w-full card-base !p-3 text-left border-2 flex items-center gap-3 ${selectedMarker?.id === marker.id ? "border-primary bg-primary/10" : "border-white/80"}`}>
                    <Icon size={16} strokeWidth={3} className="text-primary" />
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
