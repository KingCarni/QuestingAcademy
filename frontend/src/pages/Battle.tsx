import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { CompanionAvatar } from "../components/CompanionAvatar";
import { ProgressBar } from "../components/ProgressBar";
import { SpeechButton } from "../components/SpeechButton";
import { ConfettiBurst } from "../components/ConfettiBurst";
import { useGame } from "../lib/gameStore";
import { COMPANIONS, ENEMIES } from "../lib/mockData";
import type { Enemy, Question } from "../lib/types";
import { sfx } from "../lib/sfx";
import { Swords, Shield, Sparkles, Coins, Heart, BookOpen } from "lucide-react";

type Phase = "intro" | "question" | "feedback" | "victory" | "defeat";

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const Battle: React.FC = () => {
  const nav = useNavigate();
  const player = useGame((s) => s.player)!;
  const awardBattle = useGame((s) => s.awardBattle);
  const trackQuestion = useGame((s) => s.trackQuestion);
  const hatchIfReady = useGame((s) => s.hatchIfReady);
  const nextQuestion = useGame((s) => s.nextQuestion);
  const recordWrong = useGame((s) => s.recordWrong);
  const recordCorrect = useGame((s) => s.recordCorrect);
  const soundOn = useGame((s) => s.settings.soundOn);
  const companion = COMPANIONS.find((c) => c.id === player.activeCompanionId)!;

  const startTimeRef = useRef<number>(Date.now());

  // Battle state
  const [enemy, setEnemy] = useState<Enemy>(() => ({ ...pickRandom(ENEMIES) }));
  const [enemyHp, setEnemyHp] = useState<number>(enemy.hp);
  const [companionHp, setCompanionHp] = useState<number>(companion.baseHP);
  const [companionMaxHp] = useState<number>(companion.baseHP);
  const [phase, setPhase] = useState<Phase>("intro");
  const [move, setMove] = useState<"attack" | "defend" | "special" | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [lastFeedback, setLastFeedback] = useState<string>("");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [shake, setShake] = useState<"player" | "enemy" | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  // Question source: procedural engine + spaced repetition (see gameStore.nextQuestion)
  const newQuestion = () => setQuestion(nextQuestion());

  const startTurn = (m: "attack" | "defend" | "special") => {
    setMove(m);
    setLastFeedback("");
    setLastCorrect(null);
    newQuestion();
    setPhase("question");
  };

  const handleAnswer = (idx: number) => {
    if (!question || !move) return;
    const correct = idx === question.answerIndex;
    const tSec = (Date.now() - startTimeRef.current) / 1000;
    startTimeRef.current = Date.now();
    trackQuestion(correct, question.topic, tSec);
    // Spaced repetition bookkeeping
    if (correct) recordCorrect(question);
    else recordWrong(question);

    // Damage logic
    const baseDmg = move === "attack" ? 22 : move === "special" ? 30 : 10;
    const dmg = correct ? baseDmg : Math.max(4, Math.round(baseDmg * 0.35));
    let newEnemyHp = Math.max(0, enemyHp - dmg);
    setEnemyHp(newEnemyHp);
    setShake("enemy");
    setLastCorrect(correct);
    const fromTricky = question.source === "tricky";
    setLastFeedback(
      correct
        ? `✨ Sparkle strike! ${dmg} damage to ${enemy.name}.${fromTricky ? " (Tricky question — nice recovery!)" : ""}`
        : `Almost! Just ${dmg} damage. Right answer was ${question.choices[question.answerIndex]}.${fromTricky ? " We'll bring this one back later." : ""}`
    );
    setPhase("feedback");

    // Sound feedback (user-triggered click, so autoplay-policy safe)
    if (soundOn) {
      if (correct) sfx.sparkle();
      else sfx.ding();
    }

    setTimeout(() => setShake(null), 450);

    // Check defeat
    if (newEnemyHp <= 0) {
      setTimeout(() => {
        const { leveledUp, newLevel } = awardBattle(enemy.reward.xp, enemy.reward.coins, enemy.reward.eggProgress);
        const hatched = hatchIfReady();
        if (leveledUp) {
          setLevelUp(newLevel);
          setConfettiActive(true);
          if (soundOn) sfx.levelUp();
        } else if (hatched.length) {
          setConfettiActive(true);
          if (soundOn) sfx.hatch();
        }
        setPhase("victory");
      }, 700);
      return;
    }

    // Enemy retaliates if move was not defend OR partial damage on wrong
    setTimeout(() => {
      const enemyAtk =
        move === "defend" ? Math.round(enemy.attack * (correct ? 0.3 : 0.6)) : enemy.attack + (correct ? 0 : 4);
      const newCompHp = Math.max(0, companionHp - enemyAtk);
      setCompanionHp(newCompHp);
      setShake("player");
      setTimeout(() => setShake(null), 450);
      if (newCompHp <= 0) {
        setPhase("defeat");
      } else {
        setPhase("intro");
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen pb-12">
      <ConfettiBurst active={confettiActive} onDone={() => setConfettiActive(false)} />
      <TopBar back="/adventure" title="Adventure: Meadowfall Path" />
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-5">
        <Card className="!p-0 overflow-hidden">
          <div
            className="relative px-6 md:px-10 py-8 md:py-12"
            style={{
              backgroundImage: `url(https://static.prod-images.emergentagent.com/jobs/2eddbcc9-3d07-49c8-985b-00a190300e36/images/3c0bb9d1132f7acc1e24202db1dd9fe4f6d6bf544566fa6b2336a6a5ad7aba12.png)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/55" />

            <div className="relative grid md:grid-cols-2 gap-8 items-end">
              {/* Companion */}
              <div className={`flex flex-col items-center ${shake === "player" ? "animate-shake" : ""}`}>
                <CompanionAvatar companion={companion} size={150} animate />
                <p className="h-display text-2xl mt-3">{companion.name}</p>
                <div className="w-full max-w-xs mt-2">
                  <div className="flex justify-between text-xs font-extrabold uppercase tracking-wider text-ink-muted">
                    <span>HP</span>
                    <span>{companionHp}/{companionMaxHp}</span>
                  </div>
                  <ProgressBar value={companionHp} max={companionMaxHp} color="sage" testid="battle-companion-hp" />
                </div>
              </div>

              {/* Enemy */}
              <div className={`flex flex-col items-center ${shake === "enemy" ? "animate-shake" : ""}`}>
                <div
                  className="w-[140px] h-[140px] rounded-full grid place-items-center bg-[#EFE4D4] border-[6px] border-[#D4A373]"
                  style={{ boxShadow: "0 10px 0 #D4A37355" }}
                >
                  <span style={{ fontSize: 72 }} aria-hidden>{enemy.emoji}</span>
                </div>
                <p className="h-display text-2xl mt-3">{enemy.name}</p>
                <div className="w-full max-w-xs mt-2">
                  <div className="flex justify-between text-xs font-extrabold uppercase tracking-wider text-ink-muted">
                    <span>HP</span>
                    <span>{enemyHp}/{enemy.maxHp}</span>
                  </div>
                  <ProgressBar value={enemyHp} max={enemy.maxHp} color="fire" testid="battle-enemy-hp" />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Action area */}
        {phase === "intro" && (
          <Card>
            <p className="text-sm font-extrabold uppercase tracking-wider text-ink-muted mb-3">Your move</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <button data-testid="battle-move-attack" onClick={() => startTurn("attack")} className="btn-primary !text-lg">
                <Swords size={20} strokeWidth={3} /> Attack
              </button>
              <button data-testid="battle-move-defend" onClick={() => startTurn("defend")} className="btn-sage !text-lg">
                <Shield size={20} strokeWidth={3} /> Defend
              </button>
              <button data-testid="battle-move-special" onClick={() => startTurn("special")} className="btn-gold !text-lg">
                <Sparkles size={20} strokeWidth={3} /> Special
              </button>
            </div>
            <p className="text-ink-muted text-sm mt-3">Pick a move, then solve the math to power it up.</p>
          </Card>
        )}

        {phase === "question" && question && (
          <Card>
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-extrabold uppercase tracking-wider text-primary">{question.topic}</p>
                {question.subject === "reading" && (
                  <span className="chip bg-[#FFF5E6] border-[#F4C753]/40 text-[#8A6620]">
                    <BookOpen size={12} strokeWidth={3} /> Reading
                  </span>
                )}
                {question.source === "tricky" && (
                  <span data-testid="battle-tricky-chip" className="chip bg-[#FCE2F0] border-[#D77DA5]/40 text-[#8A2462]">
                    🔁 Tricky review
                  </span>
                )}
              </div>
              <SpeechButton text={question.prompt} testid="battle-speech-btn" />
            </div>
            <p data-testid="battle-question-prompt" className="h-display text-3xl md:text-4xl mb-5">{question.prompt}</p>
            <div className="grid grid-cols-2 gap-3">
              {question.choices.map((c, i) => (
                <button
                  key={i}
                  data-testid={`battle-answer-${i}`}
                  onClick={() => handleAnswer(i)}
                  className="btn-outline !text-2xl !py-5"
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>
        )}

        {phase === "feedback" && (
          <Card className={lastCorrect ? "border-sage/40" : "border-danger/40"}>
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-full grid place-items-center text-white ${
                  lastCorrect ? "bg-sage" : "bg-danger"
                } animate-popIn`}
              >
                {lastCorrect ? <Sparkles strokeWidth={3} /> : <Heart strokeWidth={3} />}
              </div>
              <div>
                <p className="h-display text-2xl">{lastCorrect ? "Sparkle Strike!" : "Glancing Hit"}</p>
                <p data-testid="battle-feedback-text" className="text-ink-muted">{lastFeedback}</p>
              </div>
            </div>
          </Card>
        )}

        {phase === "victory" && (
          <Card className="text-center">
            <div className="text-6xl mb-2" aria-hidden>🎉</div>
            <p className="h-display text-3xl">You won the round!</p>
            <p className="text-ink-muted mt-1">{enemy.name} runs back into the meadow.</p>
            {levelUp !== null && (
              <p data-testid="battle-levelup-banner" className="mt-3 inline-block chip bg-gold/20 border-gold/40 text-ink h-display text-lg">
                🌟 Level Up! You are now Level {levelUp}
              </p>
            )}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mt-5">
              <Reward icon={<Sparkles strokeWidth={3} className="text-primary" />} label="XP" value={`+${enemy.reward.xp}`} />
              <Reward icon={<Coins strokeWidth={3} className="text-gold" />} label="Coins" value={`+${enemy.reward.coins}`} />
              <Reward icon={<span className="text-xl">🥚</span>} label="Egg" value={`+${enemy.reward.eggProgress}%`} />
            </div>
            <div className="mt-6 flex justify-center gap-3 flex-wrap">
              <button
                data-testid="battle-next-btn"
                onClick={() => {
                  const e = { ...pickRandom(ENEMIES) };
                  setEnemy(e);
                  setEnemyHp(e.hp);
                  setCompanionHp(companionMaxHp);
                  setLevelUp(null);
                  setPhase("intro");
                }}
                className="btn-primary"
              >
                Next Battle
              </button>
              <button data-testid="battle-home-btn" onClick={() => nav("/hub")} className="btn-outline">
                Back to Hub
              </button>
              <button data-testid="battle-egg-btn" onClick={() => nav("/egg")} className="btn-gold">
                Check Eggs 🥚
              </button>
            </div>
          </Card>
        )}

        {phase === "defeat" && (
          <Card className="text-center border-danger/30">
            <div className="text-5xl mb-2" aria-hidden>💫</div>
            <p className="h-display text-3xl">Your companion needs a rest.</p>
            <p className="text-ink-muted mt-1">No worries — every hero takes a breather!</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                data-testid="battle-retry-btn"
                onClick={() => {
                  const e = { ...pickRandom(ENEMIES) };
                  setEnemy(e);
                  setEnemyHp(e.hp);
                  setCompanionHp(companionMaxHp);
                  setPhase("intro");
                }}
                className="btn-primary"
              >
                Try Again
              </button>
              <button data-testid="battle-home-btn-defeat" onClick={() => nav("/adventure")} className="btn-outline">
                Back to Hub
              </button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

const Reward: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-2xl bg-bg p-4 border-2 border-white">
    <div className="grid place-items-center mb-1">{icon}</div>
    <p className="text-xs font-extrabold uppercase text-ink-muted">{label}</p>
    <p className="h-display text-2xl">{value}</p>
  </div>
);

export default Battle;
