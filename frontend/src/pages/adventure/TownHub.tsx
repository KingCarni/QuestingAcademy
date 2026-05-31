import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
import { Card } from "../../components/Card";
import { ChibiAvatar } from "../../components/ChibiAvatar";
import { NpcDialogue } from "../../components/adventure/NpcDialogue";
import { useStudio } from "../../lib/studioStore";
import { useGame } from "../../lib/gameStore";
import { GraduationCap, Egg, Swords, Scroll, ShoppingBag, Users, DoorClosed, Sparkles, MessageCircle, Footprints, type LucideIcon } from "lucide-react";
import type { StudioNPC, NPCRole, RealmBuilding } from "../../lib/studioTypes";

interface BuildingConfig {
  label: string;
  icon: LucideIcon;
  to?: string;
  color: string;
  emoji: string;
  description: string;
  pos: { left: string; top: string };
  npcRole?: NPCRole;
}

const BUILDING_MAP: Record<string, BuildingConfig> = {
  "learning-academy": { label: "Academy",     icon: GraduationCap, to: "/academy",          color: "bg-sage text-white",     emoji: "🎓", description: "Practice math & reading with friendly tutors.", pos: { left: "20%", top: "30%" }, npcRole: "teacher" },
  hatchery:           { label: "Hatchery",    icon: Egg,           to: "/egg",              color: "bg-gold text-ink",       emoji: "🥚", description: "Warm your egg and meet a new companion!",       pos: { left: "78%", top: "28%" }, npcRole: "caretaker" },
  "town-hub":         { label: "Battle Path", icon: Swords,        to: "/battle",           color: "bg-primary text-white",  emoji: "⚔️", description: "Start an adventure and challenge cozy critters.", pos: { left: "50%", top: "22%" } },
  "quest-board":      { label: "Quest Board", icon: Scroll,        to: "/adventure/quests", color: "bg-[#FF9F68] text-white",emoji: "📜", description: "See today's quests and pick a mission.",         pos: { left: "32%", top: "60%" }, npcRole: "quest-giver" },
  shop:               { label: "Shop",        icon: ShoppingBag,                            color: "bg-white text-ink-muted",emoji: "🛍️", description: "Stickers, hats, and sparkles. (Coming soon)",     pos: { left: "68%", top: "60%" }, npcRole: "shopkeeper" },
  "guild-hall":       { label: "Guild Hall",  icon: Users,                                  color: "bg-white text-ink-muted",emoji: "🏰", description: "Team up with classmates. (Coming soon)",          pos: { left: "85%", top: "55%" }, npcRole: "guide" },
  "companion-habitat":{ label: "Habitat",     icon: Users,                                  color: "bg-white text-ink-muted",emoji: "🌿", description: "Hang out with your pets in their home. (Coming soon)", pos: { left: "12%", top: "55%" } },
  "boss-gate":        { label: "Boss Gate",   icon: DoorClosed,                             color: "bg-white text-ink-muted",emoji: "🚪", description: "A bigger challenge awaits beyond. (Coming soon)", pos: { left: "50%", top: "78%" } },
};

const WALK_DURATION_S = 0.9;

const TownHub: React.FC = () => {
  const nav = useNavigate();
  const { realmId } = useParams<{ realmId: string }>();
  const realms = useStudio((s) => s.realms);
  const npcs = useStudio((s) => s.npcs);
  const player = useGame((s) => s.player);
  const setActiveRealm = useGame((s) => s.setActiveRealm);

  // Set as active realm when entering the town.
  useEffect(() => {
    if (realmId) setActiveRealm(realmId);
  }, [realmId, setActiveRealm]);

  const realm = realms.find((r) => r.id === realmId);
  // Hero state + canvas ref must be declared before any early return to keep hook order stable.
  const [hero, setHero] = useState<{ x: number; y: number }>({ x: 50, y: 95 });
  const [dialogueNpc, setDialogueNpc] = useState<StudioNPC | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  if (!realm) return <Navigate to="/adventure/realms" replace />;

  const buildings: RealmBuilding[] = realm.buildings ?? ["town-hub", "hatchery", "learning-academy", "quest-board"];

  const findNpc = (role?: NPCRole): StudioNPC | null => {
    if (!role) return null;
    return (
      npcs.find(
        (n) => n.realmId === realmId && n.role === role && (n.status === "approved" || n.status === "published")
      ) ?? null
    );
  };

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
    walkTo(Math.max(6, Math.min(94, x)), Math.max(10, Math.min(92, y)));
  };

  const enterBuilding = async (cfg: BuildingConfig) => {
    if (!cfg.to) return; // coming-soon
    await walkTo(parseFloat(cfg.pos.left), parseFloat(cfg.pos.top) + 12);
    nav(cfg.to);
  };

  const openTalk = async (cfg: BuildingConfig) => {
    const npc = findNpc(cfg.npcRole);
    if (!npc) return;
    await walkTo(parseFloat(cfg.pos.left), parseFloat(cfg.pos.top) + 12);
    setDialogueNpc(npc);
  };

  return (
    <AdventureLayout
      title={realm.name}
      subtitle={`${realm.biome}${realm.tone ? ` · ${realm.tone}` : ""}`}
      back="/adventure/realms"
    >
      {/* Painted overhead town canvas with positioned buildings + walking hero */}
      <Card className="!p-0 mb-5 overflow-hidden relative">
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          data-testid="town-canvas"
          className="relative w-full cursor-pointer select-none"
          style={{
            minHeight: 460,
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.6) 0%, transparent 50%)," +
              "linear-gradient(180deg,#9CC9E3 0%,#C9DDCB 45%,#E6E0BE 100%)",
          }}
        >
          {/* Painted clouds */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute top-6 left-12 w-32 h-10 rounded-full bg-white/80 blur-sm" />
            <div className="absolute top-12 right-16 w-40 h-12 rounded-full bg-white/80 blur-sm" />
          </div>
          {/* Painted path */}
          <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
            <path
              d="M 50 92 Q 30 78 32 60 Q 35 45 50 40 Q 65 35 68 50 Q 70 70 50 78 Z"
              fill="#F4E6BE"
              opacity="0.5"
            />
            <path
              d="M 50 92 Q 50 70 50 22"
              fill="none"
              stroke="#9D8DF1"
              strokeWidth="0.7"
              strokeDasharray="1.6 2"
              opacity="0.55"
            />
          </svg>

          {/* Buildings */}
          {buildings.map((b) => {
            const cfg = BUILDING_MAP[b];
            if (!cfg) return null;
            const Icon = cfg.icon;
            const available = !!cfg.to;
            const npc = findNpc(cfg.npcRole);
            return (
              <div
                key={b}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={cfg.pos}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative group flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => enterBuilding(cfg)}
                    data-testid={`town-tile-${b}`}
                    aria-label={`${cfg.label} — ${cfg.description}`}
                    disabled={!available}
                    className={`${cfg.color} relative rounded-2xl px-3 py-3 md:px-4 md:py-4 w-24 md:w-28 flex flex-col items-center gap-1 font-extrabold shadow-md transition group-hover:brightness-110 group-hover:-translate-y-0.5 group-active:translate-y-px ${
                      !available ? "opacity-80 cursor-not-allowed" : ""
                    }`}
                  >
                    <span className="text-2xl md:text-3xl" aria-hidden>{cfg.emoji}</span>
                    <Icon size={18} strokeWidth={3} />
                    <span className="text-[11px] md:text-xs leading-tight text-center">{cfg.label}</span>
                    {!available && (
                      <span className="text-[9px] uppercase tracking-wider opacity-80">Soon</span>
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
                    </div>
                  </button>
                  {/* Talk sub-icon — small, top-right */}
                  {npc && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openTalk(cfg); }}
                      data-testid={`town-talk-${b}`}
                      aria-label={`Talk to ${npc.name}`}
                      title={`Talk to ${npc.name}`}
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white border-2 border-primary text-primary grid place-items-center shadow hover:bg-primary hover:text-white transition"
                    >
                      <MessageCircle size={14} strokeWidth={3} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Walking hero */}
          {player && (
            <motion.div
              data-testid="town-hero-sprite"
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

      <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-3">
        <Footprints size={12} strokeWidth={3} className="inline -mt-0.5 mr-1" />
        Tap a building to walk over · tap the bubble to chat
      </p>

      <NpcDialogue
        npc={dialogueNpc}
        onClose={() => setDialogueNpc(null)}
        onContinue={() => setDialogueNpc(null)}
        continueLabel="Continue"
      />
    </AdventureLayout>
  );
};

export default TownHub;
