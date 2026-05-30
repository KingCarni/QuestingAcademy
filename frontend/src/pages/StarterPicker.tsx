import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { CompanionAvatar } from "../components/CompanionAvatar";
import { useGame } from "../lib/gameStore";
import { STARTER_COMPANIONS } from "../lib/mockData";

const StarterPicker: React.FC = () => {
  const nav = useNavigate();
  const pickStarter = useGame((s) => s.pickStarter);
  const [selected, setSelected] = useState<string | null>(null);

  const choose = () => {
    if (!selected) return;
    pickStarter(selected);
    nav("/hub");
  };

  return (
    <div className="min-h-screen">
      <TopBar back="/character" title="Choose your companion" />
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="text-center mb-8">
          <p className="text-sm font-extrabold uppercase tracking-widest text-primary">Step 3 of 3</p>
          <h1 className="h-display text-4xl md:text-5xl mt-1">Who joins your quest?</h1>
          <p className="text-ink-muted mt-2">Each companion has a personality — and a flavor of magic.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {STARTER_COMPANIONS.map((c) => {
            const active = selected === c.id;
            return (
              <button
                key={c.id}
                data-testid={`starter-card-${c.id}`}
                onClick={() => setSelected(c.id)}
                className="text-left"
              >
                <Card hover className={active ? "ring-4 ring-primary" : ""}>
                  <div className="flex flex-col items-center text-center">
                    <CompanionAvatar companion={c} size={140} animate />
                    <p className="h-display text-2xl mt-4">{c.name}</p>
                    <p className={"text-sm font-extrabold uppercase tracking-wider " + c.palette.accent}>
                      {c.affinity} · {c.personality.replace("-", " ")}
                    </p>
                    <p className="text-ink-muted mt-3">{c.description}</p>
                    <div className="grid grid-cols-3 gap-2 w-full mt-5">
                      <Stat label="HP"  v={c.baseHP} />
                      <Stat label="ATK" v={c.baseAttack} />
                      <Stat label="DEF" v={c.baseDefense} />
                    </div>
                    <div className="mt-5">
                      <span className={`chip ${active ? "bg-primary text-white border-primary" : ""}`}>
                        {active ? "Chosen ✓" : "Tap to choose"}
                      </span>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            data-testid="starter-confirm-btn"
            onClick={choose}
            disabled={!selected}
            className="btn-primary !px-12 !text-2xl"
          >
            Start Adventure ✨
          </button>
        </div>
      </main>
    </div>
  );
};

const Stat: React.FC<{ label: string; v: number }> = ({ label, v }) => (
  <div className="rounded-2xl bg-bg border-2 border-white p-3 text-center">
    <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">{label}</p>
    <p className="h-display text-xl">{v}</p>
  </div>
);

export default StarterPicker;
