import React from "react";
import { Link } from "react-router-dom";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
import { useStudio } from "../../lib/studioStore";
import { Lock, MapPin, ArrowRight, Sparkles } from "lucide-react";

// Painted "world map" — floating realm islands connected by a dashed adventure trail.
// Frontend-only: pure SVG + CSS, no external images.

type Pos = { left: string; top: string };
const LIVE_POSITIONS: Pos[] = [
  { left: "10%",  top: "62%" },   // starter realm bottom-left
  { left: "44%",  top: "22%" },   // second realm up & center
  { left: "76%",  top: "58%" },   // third realm bottom-right
  { left: "55%",  top: "78%" },   // optional spillover
];
const UPCOMING_POSITIONS: Pos[] = [
  { left: "82%",  top: "18%" },
  { left: "18%",  top: "18%" },
  { left: "62%",  top: "50%" },
];

const BIOME_EMOJI: Record<string, string> = {
  "spring meadow":        "🌳",
  "snowy pine forest":    "❄️",
  "snowy":                "❄️",
  "desert":               "🏜️",
  "beach":                "🏖️",
  "ocean":                "🌊",
  "mountain":             "🏔️",
  "cave":                 "🕳️",
  "volcano":              "🌋",
  "swamp":                "🪻",
  "sky":                  "☁️",
};
const emojiFor = (biome: string) => {
  const key = biome.toLowerCase();
  for (const k of Object.keys(BIOME_EMOJI)) if (key.includes(k)) return BIOME_EMOJI[k];
  return "🗺️";
};

const RealmMap: React.FC = () => {
  const realms = useStudio((s) => s.realms);
  const live = realms.filter((r) => r.status === "approved" || r.status === "published");
  const upcoming = realms.filter((r) => r.status === "pending" || r.status === "draft" || r.status === "generated");

  return (
    <AdventureLayout title="Realm Map" subtitle="Tap a glowing island to travel" back="/adventure">
      <p className="text-ink-muted mb-4">A whole world to explore. New realms unlock as you grow!</p>

      {/* Painted world canvas */}
      <div
        data-testid="realm-world-canvas"
        className="relative rounded-card overflow-hidden border-4 border-white shadow-xl shadow-indigo-900/10"
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

        {/* Painted sea/grass texture dots */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 2px)," +
              "radial-gradient(circle, rgba(157,141,241,0.25) 1px, transparent 2px)",
            backgroundSize: "26px 26px, 52px 52px",
            backgroundPosition: "0 0, 13px 13px",
          }}
        />

        {/* Dashed adventure path between islands */}
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>
          <path
            d="M 12 65 Q 26 35 46 26 T 78 60"
            fill="none"
            stroke="#9D8DF1"
            strokeWidth="0.9"
            strokeDasharray="2 2.5"
            strokeLinecap="round"
            opacity="0.7"
            filter="url(#softGlow)"
          />
        </svg>

        {/* Floating realm islands */}
        {live.map((r, i) => {
          const pos = LIVE_POSITIONS[i % LIVE_POSITIONS.length];
          const emoji = emojiFor(r.biome);
          return (
            <Link
              key={r.id}
              to={`/adventure/town/${r.id}`}
              data-testid={`realm-node-${r.id}`}
              className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
              style={pos}
            >
              {/* Island */}
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
                <div className="mt-3 chip bg-white/95 border-white whitespace-nowrap">
                  <MapPin size={12} strokeWidth={3} className="text-primary" />
                  <span className="h-bouncy">{r.name}</span>
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-primary bg-white/80 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition">
                  Travel here <ArrowRight size={10} strokeWidth={3} />
                </div>
              </div>
            </Link>
          );
        })}

        {/* Locked / coming-soon islands */}
        {upcoming.map((r, i) => {
          const pos = UPCOMING_POSITIONS[i % UPCOMING_POSITIONS.length];
          return (
            <div
              key={r.id}
              data-testid={`realm-locked-${r.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
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
                <span className="chip mt-2 bg-white/85 border-white text-ink-muted whitespace-nowrap text-[11px]">
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
        <div aria-hidden className="absolute top-3 right-3 w-14 h-14 rounded-full bg-white/90 border-2 border-white shadow grid place-items-center font-extrabold text-ink-muted text-xs">
          <div className="relative w-full h-full grid place-items-center">
            <span className="absolute top-1">N</span>
            <span className="absolute bottom-1">S</span>
            <span className="absolute left-1">W</span>
            <span className="absolute right-1">E</span>
            <span className="text-primary text-lg">✦</span>
          </div>
        </div>
      </div>

      {/* Realm legend list (kid-friendly fallback / accessibility) */}
      <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted mt-6 mb-3">Realms unlocked</p>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3" data-testid="realm-legend">
        {live.map((r) => (
          <Link
            key={`legend-${r.id}`}
            to={`/adventure/town/${r.id}`}
            data-testid={`realm-legend-${r.id}`}
            className="card-base !p-4 hover:-translate-y-0.5 transition flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-sage/40 grid place-items-center text-2xl shrink-0" aria-hidden>
              {emojiFor(r.biome)}
            </div>
            <div className="min-w-0">
              <p className="h-display text-lg leading-tight truncate">{r.name}</p>
              <p className="text-xs text-ink-muted truncate">{r.biome}</p>
            </div>
            <ArrowRight size={16} strokeWidth={3} className="ml-auto text-primary shrink-0" />
          </Link>
        ))}
      </div>
    </AdventureLayout>
  );
};

export default RealmMap;
