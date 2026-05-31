import React from "react";
import { Link } from "react-router-dom";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
import { Card } from "../../components/Card";
import { useStudio } from "../../lib/studioStore";
import { Sparkles, Coins, Star } from "lucide-react";

const QuestsPreview: React.FC = () => {
  const quests = useStudio((s) => s.quests).filter((q) => q.status === "approved" || q.status === "published");

  return (
    <AdventureLayout title="Quests & Adventures" subtitle="Friendly missions waiting for you" back="/adventure">
      {quests.length === 0 ? (
        <Card className="text-center">
          <p className="text-5xl mb-2" aria-hidden>📜</p>
          <p className="h-display text-2xl">No quests right now</p>
          <p className="text-ink-muted">Check back soon for new adventures!</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {quests.map((q) => (
            <Card key={q.id} hover data-testid={`quest-card-${q.id}`}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gold/20 grid place-items-center text-2xl shrink-0" aria-hidden>📜</div>
                <div className="min-w-0 flex-1">
                  <p className="h-display text-xl">{q.title}</p>
                  <p className="text-xs font-extrabold uppercase text-primary">Topic: {q.subject}</p>
                </div>
              </div>
              <p className="text-sm text-ink-muted mt-3">{q.objective}</p>
              <p className="text-xs font-bold text-ink-muted mt-2">From: {q.npcGiver}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="chip bg-primary/10 text-primary border-primary/30"><Sparkles size={11} strokeWidth={3} /> XP</span>
                <span className="chip bg-gold/20 text-ink border-gold/40"><Coins size={11} strokeWidth={3} /> Coins</span>
                <span className="chip bg-[#FCE2F0] text-[#8A2462] border-[#D77DA5]/40"><Star size={11} strokeWidth={3} /> Sticker</span>
              </div>
              <p className="text-[10px] font-extrabold text-ink-muted mt-3 uppercase tracking-wider">Reward: {q.rewards}</p>
              <Link to="/battle" data-testid={`quest-start-${q.id}`} className="btn-primary mt-4 !text-sm !py-2 !px-5 inline-flex">
                Start practice ✨
              </Link>
            </Card>
          ))}
        </div>
      )}
    </AdventureLayout>
  );
};

export default QuestsPreview;
