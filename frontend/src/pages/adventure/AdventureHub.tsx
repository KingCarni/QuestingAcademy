import React from "react";
import { Link } from "react-router-dom";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
import { Card } from "../../components/Card";
import { ChibiAvatar } from "../../components/ChibiAvatar";
import { CompanionAvatar } from "../../components/CompanionAvatar";
import { useGame } from "../../lib/gameStore";
import { COMPANIONS } from "../../lib/mockData";
import { Map, PawPrint, Scroll, Swords, Sparkles } from "lucide-react";

const HELPER_TEXT: Record<string, string> = {
  spriggle: "Spriggle loves sums — addition feels sunny with this leafy buddy.",
  embercub: "Embercub charges into hard problems first — great for multiplication!",
  pebblin:  "Pebblin keeps you steady — perfect for shape and counting practice.",
};

const AdventureHub: React.FC = () => {
  const player = useGame((s) => s.player);
  const active = COMPANIONS.find((c) => c.id === player?.activeCompanionId);

  return (
    <AdventureLayout title={player?.name ? `Hi, ${player.name}!` : "Welcome, adventurer!"} subtitle="Meadowfall Grove · Sunny afternoon">
      <Card className="!p-6 md:!p-8 mb-5 relative overflow-hidden">
        <div aria-hidden className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-gold/20 blur-2xl" />
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          {player && <ChibiAvatar config={player.avatar} size={140} animate />}
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Today's adventure</p>
            <h1 className="h-display text-3xl md:text-5xl mt-1">A magical day awaits ✨</h1>
            <p className="text-ink-muted mt-2">Pick up where you left off, or head somewhere new.</p>
            <Link
              data-testid="adv-start-btn"
              to="/adventure/realms"
              className="btn-primary !text-xl md:!text-2xl !px-8 !py-4 mt-5 inline-flex"
            >
              <Sparkles size={20} strokeWidth={3} /> Start Adventure
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-5">
        {active && (
          <Card data-testid="adv-active-companion">
            <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">Today's buddy</p>
            <div className="flex items-center gap-4 mt-3">
              <CompanionAvatar companion={active} size={96} animate />
              <div className="min-w-0">
                <p className="h-display text-2xl truncate">{active.name}</p>
                <p className={`text-xs font-extrabold uppercase ${active.palette.accent}`}>{active.affinity} · {active.personality.replace("-"," ")}</p>
                <p className="text-sm text-ink-muted mt-1">{HELPER_TEXT[active.id] ?? "A loyal friend ready for adventure."}</p>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted mb-3">Quick travel</p>
          <div className="grid grid-cols-2 gap-3">
            <QuickTile to="/adventure/realms"     icon={<Map        size={22} strokeWidth={3} />} label="Realm Map" color="bg-primary text-white" testid="adv-quick-map" />
            <QuickTile to="/adventure/companions" icon={<PawPrint   size={22} strokeWidth={3} />} label="Companions" color="bg-sage text-white"    testid="adv-quick-companions" />
            <QuickTile to="/adventure/quests"     icon={<Scroll     size={22} strokeWidth={3} />} label="Quests"     color="bg-gold text-ink"      testid="adv-quick-quests" />
            <QuickTile to="/battle"               icon={<Swords     size={22} strokeWidth={3} />} label="Practice"   color="bg-[#FF9F68] text-white" testid="adv-quick-battle" />
          </div>
        </Card>
      </div>
    </AdventureLayout>
  );
};

const QuickTile: React.FC<{ to: string; icon: React.ReactNode; label: string; color: string; testid: string }> = ({ to, icon, label, color, testid }) => (
  <Link to={to} data-testid={testid}
    className={`${color} rounded-2xl p-4 flex flex-col items-center gap-1 font-extrabold text-sm hover:brightness-110 active:translate-y-px transition shadow-md`}>
    {icon}{label}
  </Link>
);

export default AdventureHub;
