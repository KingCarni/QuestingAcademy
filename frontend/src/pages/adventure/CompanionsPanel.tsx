import React from "react";
import { Link } from "react-router-dom";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
import { Card } from "../../components/Card";
import { CompanionAvatar } from "../../components/CompanionAvatar";
import { useGame } from "../../lib/gameStore";
import { COMPANIONS } from "../../lib/mockData";

const HELPER: Record<string, string> = {
  spriggle: "Helps with addition. Calms tricky moments with sunshine.",
  embercub: "Best buddy for multiplication. Bold and brave.",
  pebblin:  "Steady help with shapes and counting. Never gives up.",
};

const CompanionsPanel: React.FC = () => {
  const player = useGame((s) => s.player);
  const setActive = useGame((s) => s.setActiveCompanion);
  const owned = (player?.ownedCompanionIds ?? []).map((id) => COMPANIONS.find((c) => c.id === id)!).filter(Boolean);
  const active = COMPANIONS.find((c) => c.id === player?.activeCompanionId);

  return (
    <AdventureLayout title="Your companions" subtitle="Pick who travels with you today" back="/adventure">
      {active && (
        <Card className="mb-5" data-testid="companions-active">
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Active companion</p>
          <div className="flex flex-col md:flex-row items-center gap-5 mt-3">
            <CompanionAvatar companion={active} size={120} animate reveal />
            <div className="flex-1 text-center md:text-left">
              <p className="h-display text-3xl">{active.name}</p>
              <p className={`text-sm font-extrabold uppercase ${active.palette.accent}`}>{active.affinity} · {active.personality.replace("-"," ")}</p>
              <p className="text-ink-muted mt-2">{HELPER[active.id] ?? active.tagline}</p>
              <div className="grid grid-cols-3 gap-2 mt-4 max-w-sm">
                <Stat label="HP" v={active.baseHP} />
                <Stat label="ATK" v={active.baseAttack} />
                <Stat label="DEF" v={active.baseDefense} />
              </div>
              <Link to="/battle" className="btn-primary !text-base !py-2 !px-5 mt-4 inline-flex" data-testid="companions-go-battle">Go practice →</Link>
            </div>
          </div>
        </Card>
      )}

      <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted mb-3">Your team</p>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {owned.map((c) => (
          <Card key={c.id} hover data-testid={`companions-card-${c.id}`} className="text-center">
            <CompanionAvatar companion={c} size={96} animate />
            <p className="h-display text-xl mt-3">{c.name}</p>
            <p className={`text-xs font-extrabold uppercase ${c.palette.accent}`}>{c.affinity}</p>
            <p className="text-xs text-ink-muted mt-1">{HELPER[c.id] ?? c.tagline}</p>
            {c.id !== player?.activeCompanionId && (
              <button data-testid={`companions-pick-${c.id}`} onClick={() => setActive(c.id)} className="btn-outline mt-3 !text-xs !py-1.5 !px-4">Take with me</button>
            )}
          </Card>
        ))}
      </div>
    </AdventureLayout>
  );
};

const Stat: React.FC<{ label: string; v: number }> = ({ label, v }) => (
  <div className="rounded-xl bg-bg border-2 border-white p-2 text-center">
    <p className="text-[10px] font-extrabold uppercase text-ink-muted">{label}</p>
    <p className="h-display text-lg">{v}</p>
  </div>
);

export default CompanionsPanel;
