import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
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
  "learning-academy": { label: "Academy", icon: GraduationCap, to: "/academy", color: "bg-sage text-white", emoji: "🎓", description: "Practice math & reading with friendly tutors.", pos: { left: "25%", top: "18%" }, npcRole: "teacher" },
  hatchery: { label: "Hatchery", icon: Egg, to: "/egg", color: "bg-gold text-ink", emoji: "🥚", description: "Warm your egg and meet a new companion!", pos: { left: "58%", top: "14%" }, npcRole: "caretaker" },
  "town-hub": { label: "Battle Path", icon: Swords, to: "/battle", color: "bg-primary text-white", emoji: "⚔️", description: "Start an adventure and challenge cozy critters.", pos: { left: "52%", top: "82%" } },
  "quest-board": { label: "Quest Board", icon: Scroll, to: "/adventure/quests", color: "bg-[#FF9F68] text-white", emoji: "📜", description: "See today's quests and pick a mission.", pos: { left: "83%", top: "54%" }, npcRole: "quest-giver" },
  shop: { label: "Shop", icon: ShoppingBag, color: "bg-white text-ink-muted", emoji: "🛍️", description: "Stickers, hats, and sparkles. (Coming soon)", pos: { left: "20%", top: "68%" }, npcRole: "shopkeeper" },
  "guild-hall": { label: "Guild Hall", icon: Users, color: "bg-white text-ink-muted", emoji: "🏰", description: "Team up with classmates. (Coming soon)", pos: { left: "73%", top: "32%" }, npcRole: "guide" },
  "companion-habitat": { label: "Habitat", icon: Users, color: "bg-white text-ink-muted", emoji: "🌿", description: "Hang out with your pets in their home. (Coming soon)", pos: { left: "12%", top: "50%" } },
  "boss-gate": { label: "Boss Gate", icon: DoorClosed, color: "bg-white text-ink-muted", emoji: "🚪", description: "A bigger challenge awaits beyond. (Coming soon)", pos: { left: "50%", top: "92%" } },
};

const WALK_DURATION_S = 0.9;
const TOWN_SCENE = "/assets/town-hub-1.png";

const TownHub: React.FC = () => {
  const nav = useNavigate();
  const { realmId } = useParams<{ realmId: string }>();
  const realms = useStudio((s) => s.realms);
  const npcs = useStudio((s) => s.npcs);
  const player = useGame((s) => s.player);
  const setActiveRealm = useGame((s) => s.setActiveRealm);

  useEffect(() => {
    if (realmId) setActiveRealm(realmId);
  }, [realmId, setActiveRealm]);

  const realm = realms.find((r) => r.id === realmId);
  const [hero, setHero] = useState<{ x: number; y: number }>({ x: 50, y: 74 });
  const [dialogueNpc, setDialogueNpc] = useState<StudioNPC | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  if (!realm) return <Navigate to="/adventure/realms" replace />;

  const buildings: RealmBuilding[] = realm.buildings ?? ["town-hub", "hatchery", "learning-academy", "quest-board"];

  const findNpc = (role?: NPCRole): StudioNPC | null => {
    if (!role) return null;
    return npcs.find((n) => n.realmId === realmId && n.role === role && (n.status === "approved" || n.status === "published")) ?? null;
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
    walkTo(Math.max(5, Math.min(95, x)), Math.max(8, Math.min(92, y)));
  };

  const enterBuilding = async (cfg: BuildingConfig) => {
    if (!cfg.to) return;
    await walkTo(parseFloat(cfg.pos.left), Math.min(92, parseFloat(cfg.pos.top) + 10));
    nav(cfg.to);
  };

  const openTalk = async (cfg: BuildingConfig) => {
    const npc = findNpc(cfg.npcRole);
    if (!npc) return;
    await walkTo(parseFloat(cfg.pos.left), Math.min(92, parseFloat(cfg.pos.top) + 10));
    setDialogueNpc(npc);
  };

  return (
    <AdventureLayout title={realm.name} subtitle={`${realm.biome}${realm.tone ? ` · ${realm.tone}` : ""}`} back="/adventure/realms">
      <section className="w-[94vw] max-w-[1500px] mx-auto">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs md:text-sm font-extrabold uppercase tracking-widest text-primary">
            <Footprints size={13} strokeWidth={3} className="inline -mt-0.5 mr-1" />
            Tap a building to walk over · tap the bubble to chat
          </p>
          <span className="chip bg-white/85 border-white text-ink-muted">✨ Welcome to {realm.name}</span>
        </div>

        <div className="relative rounded-[2rem] overflow-hidden border-[6px] border-white shadow-2xl shadow-indigo-900/15 bg-white">
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            data-testid="town-canvas"
            className="relative w-full cursor-pointer select-none bg-cover bg-center"
            style={{
              height: "calc(100vh - 190px)",
              minHeight: 720,
              maxHeight: 920,
              backgroundImage: `url(${TOWN_SCENE})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-ink/20 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/65 to-transparent pointer-events-none" />

            {buildings.map((b) => {
              const cfg = BUILDING_MAP[b];
              if (!cfg) return null;
              const Icon = cfg.icon;
              const available = !!cfg.to;
              const npc = findNpc(cfg.npcRole);
              return (
                <div key={b} className="absolute -translate-x-1/2 -translate-y-1/2" style={cfg.pos} onClick={(e) => e.stopPropagation()}>
                  <div className="relative group flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => enterBuilding(cfg)}
                      data-testid={`town-tile-${b}`}
                      aria-label={`${cfg.label} — ${cfg.description}`}
                      disabled={!available}
                      className={`${cfg.color} relative rounded-3xl px-4 py-3 md:px-5 md:py-4 min-w-[118px] flex flex-col items-center gap-1 font-extrabold shadow-xl border-2 border-white/90 transition group-hover:brightness-110 group-hover:-translate-y-1 group-active:translate-y-px ${!available ? "opacity-90 cursor-not-allowed" : ""}`}
                    >
                      <span className="text-2xl md:text-3xl" aria-hidden>{cfg.emoji}</span>
                      <Icon size={18} strokeWidth={3} />
                      <span className="text-[11px] md:text-xs leading-tight text-center">{cfg.label}</span>
                      {!available && <span className="text-[9px] uppercase tracking-wider opacity-80">Soon</span>}
                    </button>
                    <div role="tooltip" className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full w-56 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition duration-150 z-20">
                      <div className="rounded-3xl bg-white/95 border-2 border-white p-3 text-ink text-center shadow-xl">
                        <p className="text-xs font-extrabold uppercase tracking-wider">{cfg.label}</p>
                        <p className="text-[11px] text-ink-muted mt-1 leading-snug">{cfg.description}</p>
                      </div>
                    </div>
                    {npc && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openTalk(cfg); }}
                        data-testid={`town-talk-${b}`}
                        aria-label={`Talk to ${npc.name}`}
                        title={`Talk to ${npc.name}`}
                        className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white border-2 border-primary text-primary grid place-items-center shadow-lg hover:bg-primary hover:text-white transition"
                      >
                        <MessageCircle size={15} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {player && (
              <motion.div
                data-testid="town-hero-sprite"
                className="absolute pointer-events-none drop-shadow-xl"
                initial={false}
                animate={{ left: `${hero.x}%`, top: `${hero.y}%` }}
                transition={{ duration: WALK_DURATION_S, ease: "easeInOut" }}
                style={{ translateX: "-50%", translateY: "-100%" }}
              >
                <motion.div animate={{ y: [0, -3, 0, -3, 0] }} transition={{ duration: WALK_DURATION_S, ease: "easeInOut", repeat: 0 }} key={`${hero.x.toFixed(0)}-${hero.y.toFixed(0)}`}>
                  <ChibiAvatar config={player.avatar} size={78} />
                </motion.div>
              </motion.div>
            )}
          </div>
          <div className="absolute left-4 right-4 bottom-4 md:left-6 md:right-6 rounded-3xl bg-white/90 border-2 border-white shadow-xl p-4 flex flex-wrap items-start gap-3 pointer-events-none">
            <span className="chip bg-primary/10 text-primary border-primary/30 inline-flex items-center gap-1 shrink-0">
              <Sparkles size={12} strokeWidth={3} /> {realm.name}
            </span>
            <p className="text-sm text-ink-muted flex-1 min-w-[220px]">{realm.description}</p>
          </div>
        </div>
      </section>

      <NpcDialogue npc={dialogueNpc} onClose={() => setDialogueNpc(null)} onContinue={() => setDialogueNpc(null)} continueLabel="Continue" />
    </AdventureLayout>
  );
};

export default TownHub;
