import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { AdventureLayout } from "../../components/adventure/AdventureLayout";
import { Card } from "../../components/Card";
import { useStudio } from "../../lib/studioStore";
import { useGame } from "../../lib/gameStore";
import { Sparkles, Coins, Star, Trophy, X as XIcon } from "lucide-react";

// Light parser: extract "XP" + "coins" counts and a step target from quest text.
// Quest schema is free-form right now, so we sniff sensible defaults.
function parseRewards(rewardsText: string): { xp: number; coins: number; label: string } {
  const xpMatch  = rewardsText.match(/(\d+)\s*XP/i);
  const coinMatch = rewardsText.match(/(\d+)\s*coin/i);
  return {
    xp: xpMatch ? parseInt(xpMatch[1], 10) : 20,
    coins: coinMatch ? parseInt(coinMatch[1], 10) : 10,
    label: rewardsText,
  };
}

function parseTarget(steps: string[]): number {
  // Look for "Answer N <topic> questions"
  for (const s of steps) {
    const m = s.match(/(\d+)\s+(?:grade-\w+\s+|[a-z-]+\s+)?question/i);
    if (m) return Math.max(1, parseInt(m[1], 10));
    const m2 = s.match(/solve\s+(\d+)/i);
    if (m2) return Math.max(1, parseInt(m2[1], 10));
  }
  return 3;
}

const QuestsPreview: React.FC = () => {
  const nav = useNavigate();
  const quests = useStudio((s) => s.quests).filter((q) => q.status === "approved" || q.status === "published");
  const startQuest = useGame((s) => s.startQuest);
  const abandonQuest = useGame((s) => s.abandonQuest);
  const questRun = useGame((s) => s.questRun);

  const handleStart = (qid: string) => {
    const q = quests.find((x) => x.id === qid);
    if (!q) return;
    const reward = parseRewards(q.rewards);
    const target = parseTarget(q.steps);
    startQuest({
      questId: q.id,
      questTitle: q.title,
      target,
      rewardXp: reward.xp,
      rewardCoins: reward.coins,
      rewardLabel: reward.label,
    });
    nav("/battle");
  };

  return (
    <AdventureLayout title="Quests & Adventures" subtitle="Friendly missions waiting for you" back="/adventure">
      {questRun && (
        <Card className="mb-4 !p-4 border-primary/30 bg-primary/5" data-testid="quest-active-banner">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center">
              <Trophy size={18} strokeWidth={3} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Active quest</p>
              <p className="h-display text-lg truncate">{questRun.questTitle}</p>
              <p className="text-xs text-ink-muted">{questRun.progress} / {questRun.target} correct · Reward: {questRun.rewardLabel}</p>
            </div>
            <Link to="/battle" data-testid="quest-resume-btn" className="btn-primary !text-xs !py-2 !px-3">Resume</Link>
            <button data-testid="quest-abandon-btn" onClick={abandonQuest} className="btn-ghost !text-xs !py-2 !px-3" aria-label="Abandon quest">
              <XIcon size={14} strokeWidth={3} /> Abandon
            </button>
          </div>
        </Card>
      )}

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
              <button
                type="button"
                onClick={() => handleStart(q.id)}
                disabled={!!questRun && questRun.questId !== q.id}
                data-testid={`quest-start-${q.id}`}
                className="btn-primary mt-4 !text-sm !py-2 !px-5 inline-flex disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {questRun && questRun.questId === q.id ? "In progress…" : "Start quest ✨"}
              </button>
            </Card>
          ))}
        </div>
      )}
    </AdventureLayout>
  );
};

export default QuestsPreview;
