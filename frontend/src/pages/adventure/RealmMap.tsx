import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
import { ChibiAvatar } from "../../components/ChibiAvatar";
import { useStudio } from "../../lib/studioStore";
import { useGame } from "../../lib/gameStore";
import { Lock, MapPin, ArrowRight, Sparkles, Footprints } from "lucide-react";

// Painted "world map" — floating realm islands connected by a dashed adventure trail.
// Click anywhere on the canvas → hero strolls there.
// Click an island → hero strolls to it, then enters the town (sets activeRealmId).

type Pos = { left: string; top: string };
const LIVE_POSITIONS: Pos[] = [
  { left: "18%",  top: "62%" },
  { left: "50%",  top: "22%" },
  { left: "78%",  top: "60%" },
  { left: "55%",  top: "82%" },
];
const UPCOMING_POSITIONS: Pos[] = [
  { left: "82%",  top: "20%" },
  { left: "22%",  top: "20%" },
  { left: "62%",  top: "50%" },
];

const BIOME_EMOJI: Record<string, string> = {
  "spring meadow":      "🌳",
  "snowy pine forest":  "❄️",
  snowy:                "❄️",
  desert:               "🏜️",
  beach:                "🏖️",
  ocean:                "🌊",
  mountain:             "🏔️",
  cave:                 "🕳️",
  volcano:              "🌋",
  swamp:                "🪻",
  sky:                  "☁️",
};
const emojiFor = (biome: string) => {
  const key = biome.toLowerCase();
  for (const k of Object.keys(BIOME_EMOJI)) if (key.includes(k)) return BIOME_EMOJI[k];
  return "🗺️";
};

// Cozy stroll: ~900ms, slight bob.
const WALK_DURATION_S = 0.9;

const RealmMap: React.FC = () => {
  const nav = useNavigate();
  const realms = useStudio((s) => s.realms);
  const setActiveRealm = useGame((s) => s.setActiveRealm);
  const player = useGame((s) => s.player);

  const live = realms.filter((r) => r.status === "approved" || r.status === "published");
  const upcoming = realms.filter((r) => r.status === "pending" || r.status === "draft" || r.status === "generated");

  // Hero walk position (as % within the canvas)
  const [hero, setHero] = useState<{ x: number; y: number }>({ x: 50, y: 88 });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const walkingRef = useRef(false);

  const walkTo = (x: number, y: number): Promise<void> => {
    walkingRef.current = true;
    setHero({ x, y });
    return new Promise((resolve) => setTimeout(() => { walkingRef.current = false; resolve(); }, WALK_DURATION_S * 1000));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    walkTo(Math.max(4, Math.min(96, x)), Math.max(8, Math.min(92, y)));
  };

  const handleIslandClick = async (realmId: string, pos: Pos, e: React.MouseEvent) => {
    e.stopPropagation();
    const x = parseFloat(pos.left);
    const y = parseFloat(pos.top) + 8; // stand at the foot of the island
    await walkTo(x, y);
    setActiveRealm(realmId);
    nav(`/adventure/town/${realmId}`);
  };

  // Reset hero to entry point each mount
  useEffect(() => {
    setHero({ x: 50, y: 88 });
  }, []);

  return (
    <AdventureLayout title="Realm Map" subtitle="Tap an island to travel — tap the map to take a stroll" back="/adventure">
      <p className="text-ink-muted mb-4">
        <Footprints size={14} strokeWidth={3} className="inline -mt-0.5 mr-1 text-primary" />
        Pick where to adventure today. New realms unlock as you grow!
      </p>

      {/* Painted world canvas */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        data-testid="realm-world-canvas"
        className="relative rounded-card overflow-hidden border-4 border-white shadow-xl shadow-indigo-900/10 cursor-pointer select-none"
        style={{
          minHeight: 560,
          background:
            "radial-gradient(ellipse at 50% -10%, #FFF6D8 0%, transparent 55%)," +
            "radial-gradient(ellipse at 90% 60%, #DCEEF7 0%, transparent 45%)," +
            "radial-gradient(ellipse at 10% 75%, #E6F1DE 0%, transparent 45%)," +
            "linear-gradient(180deg, #BFE0F2 0%, #D6E9F5 45%, #F4EBD0 100%)",
        }}
      >
        {/* Painted clouds */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute top-6 left-12 w-40 h-12 rounded-full bg-white/80 blur-md" />
          <div className="absolute top-10 left-24 w-28 h-10 rounded-full bg-white/70 blur-md" />
          <div className="absolute top-24 right-16 w-48 h-14 rounded-full bg-white/80 blur-md" />
          <div className="absolute bottom-24 left-1/3 w-56 h-12 rounded-full bg-white/60 blur-md" />
          <div className="absolute bottom-6 right-1/4 w-32 h-10 rounded-full bg-white/70 blur-md" />
        </div>

        {/* Painted texture dots */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 2px)," +
              "radial-gradient(circle, rgba(157,141,241,0.25) 1px, transparent 2px)",
            backgroundSize: "26px 26px, 52px 52px",
            backgroundPosition: "0 0, 13px 13px",
          }}
        />

        {/* Dashed adventure path */}
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
          <path
            d="M 18 70 Q 32 38 50 30 T 78 64"
            fill="none"
            stroke="#9D8DF1"
            strokeWidth="0.9"
            strokeDasharray="2 2.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>

        {/* Walking hero (chibi) */}
        {player && (
          <motion.div
            data-testid="hero-sprite"
            className="absolute pointer-events-none"
            initial={false}
            animate={{ left: `${hero.x}%`, top: `${hero.y}%` }}
            transition={{ duration: WALK_DURATION_S, ease: "easeInOut" }}
            style={{ translateX: "-50%", translateY: "-100%" }}
          >
            <motion.div
              animate={{ y: [0, -3, 0, -3, 0] }}
              transition={{ duration: WALK_DURATION_S, ease: "easeInOut", repeat: 0 }}
              key={`${hero.x.toFixed(0)}-${hero.y.toFixed(0)}`}
            >
              <ChibiAvatar config={player.avatar} size={64} />
            </motion.div>
          </motion.div>
        )}

        {/* Floating realm islands */}
        {live.map((r, i) => {
          const pos = LIVE_POSITIONS[i % LIVE_POSITIONS.length];
          const emoji = emojiFor(r.biome);
          return (
            <button
              type="button"
              key={r.id}
              onClick={(e) => handleIslandClick(r.id, pos, e)}
              data-testid={`realm-node-${r.id}`}
              aria-label={`Travel to ${r.name}`}
              className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
              style={pos}
            >
              <div className="relative flex flex-col items-center">
                <div className="relative">
                  <div aria-hidden className="absolute inset-x-2 -bottom-2 h-3 bg-ink/20 blur-md rounded-full" />
                  <div className="w-28 h-28 md:w-32 md:h-32 rounded-[42%] bg-gradient-to-b from-[#E8F4E1] via-[#CDE0CF] to-[#86A789] border-4 border-white shadow-xl grid place-items-center transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-0.5">
                    <span className="text-5xl md:text-6xl drop-shadow-sm" aria-hidden>{emoji}</span>
                  </div>
                  <div className="absolute -top-2 -right-2 chip bg-gold text-ink border-gold/60 text-[10px] flex items-center gap-1">
                    <Sparkles size={10} strokeWidth={3} /> Open
                  </div>
                </div>
                <div className="mt-3 chip bg-white/95 border-white max-w-[140px] sm:max-w-none truncate sm:whitespace-nowrap text-center">
                  <MapPin size={12} strokeWidth={3} className="text-primary" />
                  <span className="h-bouncy">{r.name}</span>
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-primary bg-white/80 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition">
                  Travel here <ArrowRight size={10} strokeWidth={3} />
                </div>
              </div>
            </button>
          );
        })}

        {/* Locked islands */}
        {upcoming.map((r, i) => {
          const pos = UPCOMING_POSITIONS[i % UPCOMING_POSITIONS.length];
          return (
            <div
              key={r.id}
              data-testid={`realm-locked-${r.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={pos}
              title={`${r.name} · coming soon`}
            >
              <div className="flex flex-col items-center opacity-80">
                <div className="relative">
                  <div aria-hidden className="absolute inset-x-2 -bottom-2 h-3 bg-ink/20 blur-md rounded-full" />
                  <div className="w-24 h-24 rounded-[42%] bg-gradient-to-b from-[#EEF2FB] to-[#C9C0EF] border-4 border-white grid place-items-center grayscale-[40%]">
                    <Lock size={26} strokeWidth={3} className="text-ink-muted" />
                  </div>
                </div>
                <span className="chip mt-2 bg-white/85 border-white text-ink-muted max-w-[120px] sm:max-w-none truncate sm:whitespace-nowrap text-[11px]">
                  {r.name}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted mt-1">
                  Coming soon
                </span>
              </div>
            </div>
          );
        })}

        {/* Compass */}
        <div aria-hidden className="absolute top-3 right-3 w-14 h-14 rounded-full bg-white/90 border-2 border-white shadow grid place-items-center font-extrabold text-ink-muted text-xs pointer-events-none">
          <div className="relative w-full h-full grid place-items-center">
            <span className="absolute top-1">N</span>
            <span className="absolute bottom-1">S</span>
            <span className="absolute left-1">W</span>
            <span className="absolute right-1">E</span>
            <span className="text-primary text-lg">✦</span>
          </div>
        </div>
      </div>

      {/* Realm legend list */}
      <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted mt-6 mb-3">Realms unlocked</p>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3" data-testid="realm-legend">
        {live.map((r) => (
          <button
            type="button"
            key={`legend-${r.id}`}
            onClick={() => { setActiveRealm(r.id); nav(`/adventure/town/${r.id}`); }}
            data-testid={`realm-legend-${r.id}`}
            className="card-base !p-4 hover:-translate-y-0.5 transition flex items-center gap-3 text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-sage/40 grid place-items-center text-2xl shrink-0" aria-hidden>
              {emojiFor(r.biome)}
            </div>
            <div className="min-w-0">
              <p className="h-display text-lg leading-tight truncate">{r.name}</p>
              <p className="text-xs text-ink-muted truncate">{r.biome}</p>
            </div>
            <ArrowRight size={16} strokeWidth={3} className="ml-auto text-primary shrink-0" />
          </button>
        ))}
      </div>
    </AdventureLayout>
  );
};

export default RealmMap;
