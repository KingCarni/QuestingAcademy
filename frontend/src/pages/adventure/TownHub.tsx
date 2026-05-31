import React from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
import { Card } from "../../components/Card";
import { useStudio } from "../../lib/studioStore";
import { GraduationCap, Egg, Swords, Scroll, ShoppingBag, Users, DoorClosed, Sparkles, type LucideIcon } from "lucide-react";

interface BuildingConfig {
  label: string;
  icon: LucideIcon;
  to?: string;
  color: string;
  emoji: string;
  description: string;
}

// Map building IDs to live routes / coming-soon UI
// TODO(rpg): realm travel will later swap battle backgrounds + enemy sets per realm.
const BUILDING_MAP: Record<string, BuildingConfig> = {
  "learning-academy":  { label: "Academy",     icon: GraduationCap, to: "/academy",         color: "bg-sage text-white",     emoji: "🎓", description: "Practice math & reading with friendly tutors." },
  "hatchery":          { label: "Hatchery",    icon: Egg,           to: "/egg",             color: "bg-gold text-ink",       emoji: "🥚", description: "Warm your egg and meet a new companion!" },
  "town-hub":          { label: "Battle Path", icon: Swords,        to: "/battle",          color: "bg-primary text-white",  emoji: "⚔️", description: "Start an adventure and challenge cozy critters." },
  "quest-board":       { label: "Quest Board", icon: Scroll,        to: "/adventure/quests",color: "bg-[#FF9F68] text-white",emoji: "📜", description: "See today's quests and pick a mission." },
  "shop":              { label: "Shop",        icon: ShoppingBag,   color: "bg-white text-ink-muted",                          emoji: "🛍️", description: "Stickers, hats, and sparkles. (Coming soon)" },
  "guild-hall":        { label: "Guild Hall",  icon: Users,         color: "bg-white text-ink-muted",                          emoji: "🏰", description: "Team up with classmates. (Coming soon)" },
  "companion-habitat": { label: "Habitat",     icon: Users,         color: "bg-white text-ink-muted",                          emoji: "🌿", description: "Hang out with your pets in their home. (Coming soon)" },
  "boss-gate":         { label: "Boss Gate",   icon: DoorClosed,    color: "bg-white text-ink-muted",                          emoji: "🚪", description: "A bigger challenge awaits beyond. (Coming soon)" },
};

const TownHub: React.FC = () => {
  const { realmId } = useParams<{ realmId: string }>();
  const realms = useStudio((s) => s.realms);
  const realm = realms.find((r) => r.id === realmId);

  if (!realm) return <Navigate to="/adventure/realms" replace />;

  const buildings = realm.buildings ?? ["town-hub", "hatchery", "learning-academy", "quest-board"];

  return (
    <AdventureLayout title={realm.name} subtitle={`${realm.biome}${realm.tone ? ` · ${realm.tone}` : ""}`} back="/adventure/realms">
      {/* Painted town panorama */}
      <Card className="!p-0 mb-5 overflow-hidden relative">
        <div
          className="h-56 md:h-72 w-full relative"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.55) 0%, transparent 50%)," +
              "linear-gradient(180deg,#9CC9E3 0%,#CDE0CF 55%,#F4E6BE 100%)",
          }}
          aria-hidden
        >
          <div className="absolute top-6 left-12 w-24 h-8 rounded-full bg-white/80 blur-sm" />
          <div className="absolute top-10 right-16 w-32 h-10 rounded-full bg-white/80 blur-sm" />
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-center gap-3 text-5xl md:text-6xl select-none">
            <span aria-hidden>🌳</span>
            <span aria-hidden className="text-7xl md:text-8xl">🏘️</span>
            <span aria-hidden>🌳</span>
            <span aria-hidden>🏠</span>
            <span aria-hidden className="hidden md:inline">🌷</span>
          </div>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-start gap-3">
            <span className="chip bg-primary/10 text-primary border-primary/30 inline-flex items-center gap-1">
              <Sparkles size={12} strokeWidth={3} /> Welcome to {realm.name}
            </span>
            <p className="text-sm text-ink-muted flex-1 min-w-[200px]">{realm.description}</p>
          </div>
        </div>
      </Card>

      <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">Where would you like to go?</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="town-pin-grid">
        {buildings.map((b) => {
          const cfg = BUILDING_MAP[b];
          if (!cfg) return null;
          const Icon = cfg.icon;
          const available = !!cfg.to;
          const inner = (
            <div
              className={`${cfg.color} relative rounded-2xl p-5 flex flex-col items-center gap-2 font-extrabold shadow-md transition group-hover:brightness-110 group-hover:-translate-y-0.5 group-active:translate-y-px ${
                !available ? "opacity-80 cursor-not-allowed" : ""
              }`}
            >
              <span className="text-3xl" aria-hidden>{cfg.emoji}</span>
              <Icon size={20} strokeWidth={3} />
              <span className="text-sm">{cfg.label}</span>
              {!available && (
                <span className="text-[10px] uppercase tracking-wider opacity-80">Coming soon</span>
              )}
              {/* Hover tooltip */}
              <div
                role="tooltip"
                className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-48 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition duration-150 z-20"
              >
                <div className="card-base !p-3 !rounded-2xl text-ink text-center shadow-xl">
                  <p className="text-xs font-extrabold uppercase tracking-wider">{cfg.label}</p>
                  <p className="text-[11px] text-ink-muted mt-1 leading-snug">{cfg.description}</p>
                </div>
                <div aria-hidden className="mx-auto -mt-1 w-3 h-3 rotate-45 bg-white border-r-2 border-b-2 border-white" />
              </div>
            </div>
          );
          return available ? (
            <Link
              key={b}
              to={cfg.to!}
              data-testid={`town-tile-${b}`}
              aria-label={`${cfg.label} — ${cfg.description}`}
              className="group focus:outline-none focus:ring-4 focus:ring-primary/30 rounded-2xl"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={b}
              data-testid={`town-tile-${b}`}
              tabIndex={0}
              aria-label={`${cfg.label} — ${cfg.description}`}
              className="group focus:outline-none focus:ring-4 focus:ring-primary/30 rounded-2xl"
            >
              {inner}
            </div>
          );
        })}
      </div>

      {/* Tiny helper for kids on touch devices (no hover) */}
      <p className="text-[11px] text-ink-muted text-center mt-4 font-bold">
        Tip: hover a pin to see what it does, tap to enter.
      </p>
    </AdventureLayout>
  );
};

export default TownHub;
