import React, { useRef, useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { ProgressBar } from "../components/ProgressBar";
import { SpeechButton } from "../components/SpeechButton";
import { ConfettiBurst } from "../components/ConfettiBurst";
import { useGame } from "../lib/gameStore";
import { useStudio } from "../lib/studioStore";
import { COMPANIONS, ENEMIES } from "../lib/mockData";
import type { Enemy, Question } from "../lib/types";
import { sfx } from "../lib/sfx";
import { Swords, Shield, Sparkles, Coins, Heart, BookOpen, Trophy, X as XIcon } from "lucide-react";

type Phase = "intro" | "question" | "feedback" | "victory" | "defeat";

const DEFAULT_BG = "https://static.prod-images.emergentagent.com/jobs/2eddbcc9-3d07-49c8-985b-00a190300e36/images/3c0bb9d1132f7acc1e24202db1dd9fe4f6d6bf544566fa6b2336a6a5ad7aba12.png";

// TEA-110 Phase 3: optional dev overrides. Leave blank for normal runtime selection.
const BATTLE_DEV_CONFIG = {
  backgroundId: "",
  playerCompanionId: "",
  enemyCompanionId: "",
};

const isApprovedRuntimeAsset = (item?: any): boolean => item?.status === "approved" || item?.status === "published";

const normalizeStudioImageUrl = (url?: string): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/api/studio/image")) return `http://localhost:5050${trimmed}`;
  if (trimmed.startsWith("api/studio/image")) return `http://localhost:5050/${trimmed}`;
  if (trimmed.startsWith("/studio/image")) return `http://localhost:5050/api${trimmed}`;
  if (trimmed.startsWith("studio/image")) return `http://localhost:5050/api/${trimmed}`;
  if (trimmed.startsWith("/uploads/")) return `http://localhost:5050${trimmed}`;
  if (trimmed.startsWith("uploads/")) return `http://localhost:5050/${trimmed}`;
  return trimmed;
};

const getStudioCompanionBattleAssetUrl = (item?: any): string =>
  normalizeStudioImageUrl(
    item?.battleAsset ||
    item?.battleAssetUrl ||
    item?.battleSpriteUrl ||
    item?.transparentPreviewUrl ||
    item?.transparentUrl ||
    item?.previewUrl ||
    item?.generatedImageUrl ||
    item?.imageUrl ||
    item?.url ||
    ""
  );

const getStudioBackgroundAssetUrl = (item?: any): string =>
  normalizeStudioImageUrl(
    item?.battleBackgroundUrl ||
    item?.backgroundUrl ||
    item?.previewUrl ||
    item?.generatedImageUrl ||
    item?.imageUrl ||
    item?.url ||
    item?.manualComposition?.previewCompositeUrl ||
    item?.manualComposition?.backgroundUrl ||
    ""
  );

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
  const activeRealmId = useGame((s) => s.activeRealmId);
  const questRun = useGame((s) => s.questRun);
  const tickQuestOnCorrect = useGame((s) => s.tickQuestOnCorrect);
  const abandonQuest = useGame((s) => s.abandonQuest);
  const battleBgs = useStudio((s) => s.battleBgs);
  const realms = useStudio((s) => s.realms);
  const scenes = useStudio((s) => s.scenes);
  const companion = COMPANIONS.find((c) => c.id === player.activeCompanionId)!;
  const studioCompanions = useStudio((s) => s.companions);
  const [selectedBattleBgId, setSelectedBattleBgId] = useState<string>(BATTLE_DEV_CONFIG.backgroundId ?? "");
  const [selectedPlayerCompanionId, setSelectedPlayerCompanionId] = useState<string>(BATTLE_DEV_CONFIG.playerCompanionId ?? "");
  const [selectedEnemyCompanionId, setSelectedEnemyCompanionId] = useState<string>(BATTLE_DEV_CONFIG.enemyCompanionId ?? "");
  const [flipPlayerCompanion, setFlipPlayerCompanion] = useState(false);
  const [flipEnemyCompanion, setFlipEnemyCompanion] = useState(false);
  const [playerCompanionFlying, setPlayerCompanionFlying] = useState(false);
  const [enemyCompanionFlying, setEnemyCompanionFlying] = useState(false);

  const approvedStudioCompanions = useMemo(
    () => studioCompanions.filter((c: any) => c.status === "approved" || c.status === "published"),
    [studioCompanions]
  );

  const isCompanionLikeStudioCard = (item: any): boolean => {
    const haystack = [
      item?.type,
      item?.assetType,
      item?.category,
      item?.purpose,
      item?.useMode,
      item?.collection,
      item?.kind,
      item?.role,
      item?.promptType,
      ...(Array.isArray(item?.tags) ? item.tags : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return /companion|pet|character|creature|npc/.test(haystack);
  };

  const studioAssetCards = useMemo(() => {
    const possibleCollections = [
      (useStudio as any).getState?.()?.assets,
      (useStudio as any).getState?.()?.assetCards,
      (useStudio as any).getState?.()?.studioAssets,
      (useStudio as any).getState?.()?.cards,
      (useStudio as any).getState?.()?.libraryAssets,
    ];

    return possibleCollections.find((collection: any) => Array.isArray(collection)) ?? [];
  }, [battleBgs, scenes, realms]);

  const approvedCompanionAssetOptions = useMemo(() => {
    const merged = [
      ...approvedStudioCompanions,
      ...studioAssetCards.filter((asset: any) => isApprovedRuntimeAsset(asset) && isCompanionLikeStudioCard(asset)),
    ];
    const seen = new Set<string>();
    return merged.filter((item: any) => {
      const id = item?.id || item?.assetId || item?.name;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [approvedStudioCompanions, studioAssetCards]);

  const approvedBattleBgs = useMemo(
    () => battleBgs.filter((b: any) => isApprovedRuntimeAsset(b) && getStudioBackgroundAssetUrl(b)),
    [battleBgs]
  );

  const approvedSceneBackgrounds = useMemo(
    () => scenes.filter((scene: any) => isApprovedRuntimeAsset(scene) && getStudioBackgroundAssetUrl(scene)),
    [scenes]
  );

  const approvedBackgroundOptions = useMemo(
    () => [
      ...approvedBattleBgs.map((bg: any) => ({ ...bg, __slotId: `battleBg:${bg.id}`, __slotLabel: bg.realm || bg.environment || bg.name || bg.title || bg.id, __slotType: "Battle BG" })),
      ...approvedSceneBackgrounds.map((scene: any) => ({ ...scene, __slotId: `scene:${scene.id}`, __slotLabel: scene.name || scene.title || scene.realm || scene.id, __slotType: "Scene" })),
    ],
    [approvedBattleBgs, approvedSceneBackgrounds]
  );

  const activeStudioCompanion = useMemo(() => {
    return (
      approvedCompanionAssetOptions.find((c: any) => selectedPlayerCompanionId && c.id === selectedPlayerCompanionId) ||
      approvedCompanionAssetOptions.find((c: any) => BATTLE_DEV_CONFIG.playerCompanionId && c.id === BATTLE_DEV_CONFIG.playerCompanionId) ||
      approvedCompanionAssetOptions.find((c: any) => c.runtimeCompanionId === player.activeCompanionId || c.id === player.activeCompanionId || c.name === companion?.name) ||
      approvedCompanionAssetOptions[0] ||
      null
    );
  }, [approvedCompanionAssetOptions, selectedPlayerCompanionId, player.activeCompanionId, companion?.name]);

  const companionImageUrl = getStudioCompanionBattleAssetUrl(activeStudioCompanion);
  const [playerImageFailed, setPlayerImageFailed] = useState(false);

  const battleBackgroundUrl = useMemo(() => {
    const selectedBg = approvedBackgroundOptions.find((bg: any) => bg.__slotId === selectedBattleBgId);
    const forcedBg = approvedBackgroundOptions.find((bg: any) => BATTLE_DEV_CONFIG.backgroundId && (bg.id === BATTLE_DEV_CONFIG.backgroundId || bg.__slotId === BATTLE_DEV_CONFIG.backgroundId));
    const realmBg = activeRealmId
      ? approvedBattleBgs.find((b: any) => b.realmId === activeRealmId && getStudioBackgroundAssetUrl(b))
      : null;
    const anyBattleBg = approvedBattleBgs.find((b: any) => getStudioBackgroundAssetUrl(b));
    const approvedSceneBg = approvedSceneBackgrounds.find((scene: any) => getStudioBackgroundAssetUrl(scene));

    return (
      getStudioBackgroundAssetUrl(selectedBg) ||
      getStudioBackgroundAssetUrl(forcedBg) ||
      getStudioBackgroundAssetUrl(realmBg) ||
      getStudioBackgroundAssetUrl(anyBattleBg) ||
      getStudioBackgroundAssetUrl(approvedSceneBg) ||
      DEFAULT_BG
    );
  }, [activeRealmId, approvedBackgroundOptions, approvedBattleBgs, approvedSceneBackgrounds, selectedBattleBgId]);

  const realmName = useMemo(() => {
    if (!activeRealmId) return "Meadowfall Path";
    return realms.find((r) => r.id === activeRealmId)?.name ?? "Meadowfall Path";
  }, [activeRealmId, realms]);

  const startTimeRef = useRef<number>(Date.now());

  // Battle state
  const [enemy, setEnemy] = useState<Enemy>(() => ({ ...pickRandom(ENEMIES) }));
  const approvedStudioEnemies = approvedCompanionAssetOptions.filter((c: any) => c.id !== activeStudioCompanion?.id);
  const studioEnemy =
    approvedStudioEnemies.find((c: any) => selectedEnemyCompanionId && c.id === selectedEnemyCompanionId) ||
    approvedStudioEnemies.find((c: any) => BATTLE_DEV_CONFIG.enemyCompanionId && c.id === BATTLE_DEV_CONFIG.enemyCompanionId) ||
    approvedStudioEnemies[0] ||
    approvedCompanionAssetOptions.find((c: any) => selectedEnemyCompanionId && c.id === selectedEnemyCompanionId) ||
    null;
  const enemyImageUrl = getStudioCompanionBattleAssetUrl(studioEnemy);
  const describeBattleCompanion = (item: any, fallbackName: string, fallbackType: string, fallbackLevel?: number | string) => {
    const type =
      item?.element ||
      item?.affinity ||
      item?.type ||
      item?.assetType ||
      item?.category ||
      fallbackType ||
      "Companion";
    const level = item?.level || item?.rank || fallbackLevel || player.level || 1;
    return {
      name: item?.name || fallbackName,
      type,
      level,
    };
  };

  const playerBattleInfo = describeBattleCompanion(activeStudioCompanion, companion.name, "Companion", (companion as any)?.level);
  const enemyBattleInfo = describeBattleCompanion(studioEnemy, enemy.name, (enemy as any)?.element || "Enemy", (enemy as any)?.level);

  const [enemyImageFailed, setEnemyImageFailed] = useState(false);
  useEffect(() => setPlayerImageFailed(false), [companionImageUrl]);
  useEffect(() => setEnemyImageFailed(false), [enemyImageUrl]);

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
  const [questCompleteToast, setQuestCompleteToast] = useState<{ xp: number; coins: number; label: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

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

    // Quest progress on correct answers
    if (correct && questRun) {
      const res = tickQuestOnCorrect();
      if (res.completed && res.reward) {
        setQuestCompleteToast(res.reward);
        setConfettiActive(true);
        if (soundOn) sfx.levelUp();
        // Auto-dismiss toast after a few seconds
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setQuestCompleteToast(null), 4500);
      }
    }

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


  const renderCompanionVisual = (
    imageUrl: string,
    imageFailed: boolean,
    onImageError: () => void,
    fallbackEmoji: string,
    flip: boolean,
    alt: string,
    flying: boolean
  ) => (
    <div className="relative h-[215px] md:h-[260px] w-full flex items-end justify-center pointer-events-none">
      {flying && (
        <div className="absolute bottom-0 left-1/2 h-5 w-36 -translate-x-1/2 rounded-full bg-black/18 blur-md" aria-hidden />
      )}
      {imageUrl && !imageFailed ? (
        <div className={`h-full w-full flex items-end justify-center ${flying ? "-translate-y-8 md:-translate-y-10" : "translate-y-24 md:translate-y-28"}`}>
          <img
            src={imageUrl}
            alt={alt}
            className="max-h-[230px] md:max-h-[285px] max-w-[320px] md:max-w-[390px] object-contain object-bottom drop-shadow-2xl animate-float"
            style={{ transform: flip ? "scaleX(-1)" : "scaleX(1)", transformOrigin: "center bottom" }}
            onError={onImageError}
          />
        </div>
      ) : (
        <div
          className={`w-[150px] h-[150px] md:w-[180px] md:h-[180px] rounded-full grid place-items-center bg-[#EFE4D4]/90 border-[5px] border-[#D4A373] ${flying ? "-translate-y-8 md:-translate-y-10" : "translate-y-24 md:translate-y-28"}`}
          style={{ boxShadow: "0 10px 0 #D4A37355" }}
        >
          <span style={{ fontSize: 82 }} aria-hidden>{fallbackEmoji}</span>
        </div>
      )}
    </div>
  );

  const renderBattleOverlay = () => {
    if (phase === "intro") {
      return (
        <div className="absolute inset-x-8 bottom-4 z-20 mx-auto max-w-6xl rounded-[2rem] bg-white/82 backdrop-blur-md border-2 border-white/80 shadow-xl p-4 md:p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-ink-muted">Your move</p>
              <p className="text-ink-muted text-xs mt-1">Pick a move, then solve the math to power it up.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <button data-testid="battle-move-attack" onClick={() => startTurn("attack")} className="btn-primary !text-base md:!text-lg justify-center">
              <Swords size={18} strokeWidth={3} /> Attack
            </button>
            <button data-testid="battle-move-defend" onClick={() => startTurn("defend")} className="btn-sage !text-base md:!text-lg justify-center">
              <Shield size={18} strokeWidth={3} /> Defend
            </button>
            <button data-testid="battle-move-special" onClick={() => startTurn("special")} className="btn-gold !text-base md:!text-lg justify-center">
              <Sparkles size={18} strokeWidth={3} /> Special
            </button>
          </div>
        </div>
      );
    }

    if (phase === "question" && question) {
      return (
        <div className="absolute inset-x-6 bottom-6 z-20 mx-auto max-w-5xl rounded-[2rem] bg-white/84 backdrop-blur-md border-2 border-white/80 shadow-2xl p-5 md:p-7">
          <div className="flex items-center justify-between gap-3 mb-2">
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
          <p data-testid="battle-question-prompt" className="h-display text-2xl md:text-4xl mb-5">{question.prompt}</p>
          <div className="grid grid-cols-2 gap-3">
            {question.choices.map((c, i) => (
              <button
                key={i}
                data-testid={`battle-answer-${i}`}
                onClick={() => handleAnswer(i)}
                className="btn-outline !text-xl md:!text-2xl !py-4"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (phase === "feedback") {
      return (
        <div className="absolute inset-x-6 bottom-6 z-20 mx-auto max-w-3xl rounded-[2rem] bg-white/84 backdrop-blur-md border-2 border-white/80 shadow-2xl p-6">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-full grid place-items-center text-white ${lastCorrect ? "bg-sage" : "bg-danger"} animate-popIn`}>
              {lastCorrect ? <Sparkles strokeWidth={3} /> : <Heart strokeWidth={3} />}
            </div>
            <div>
              <p className="h-display text-2xl">{lastCorrect ? "Sparkle Strike!" : "Glancing Hit"}</p>
              <p data-testid="battle-feedback-text" className="text-ink-muted">{lastFeedback}</p>
            </div>
          </div>
        </div>
      );
    }

    if (phase === "victory") {
      return (
        <div className="absolute inset-x-6 bottom-6 z-20 mx-auto max-w-4xl rounded-[2rem] bg-white/86 backdrop-blur-md border-2 border-white/80 shadow-2xl p-6 text-center">
          <div className="text-5xl mb-2" aria-hidden>🎉</div>
          <p className="h-display text-3xl">You won the round!</p>
          <p className="text-ink-muted mt-1">{studioEnemy?.name || enemy.name} runs back into the meadow.</p>
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
            <button data-testid="battle-home-btn" onClick={() => nav("/adventure")} className="btn-outline">
              Back to Hub
            </button>
            <button data-testid="battle-egg-btn" onClick={() => nav("/egg")} className="btn-gold">
              Check Eggs 🥚
            </button>
          </div>
        </div>
      );
    }

    if (phase === "defeat") {
      return (
        <div className="absolute inset-x-6 bottom-6 z-20 mx-auto max-w-3xl rounded-[2rem] bg-white/86 backdrop-blur-md border-2 border-danger/20 shadow-2xl p-6 text-center">
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
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen pb-12">
      <ConfettiBurst active={confettiActive} onDone={() => setConfettiActive(false)} />
      <TopBar back="/adventure" title={`Adventure: ${realmName}`} />
      <main className="w-full max-w-[90rem] mx-auto px-4 md:px-8 py-6 space-y-5">
        {/* Quest banner */}
        {questRun && (
          <Card className="!p-3 border-primary/30 bg-primary/5" data-testid="battle-quest-banner">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-9 h-9 rounded-2xl bg-primary text-white grid place-items-center shrink-0">
                <Trophy size={16} strokeWidth={3} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Quest</p>
                <p className="h-display text-base truncate">{questRun.questTitle}</p>
                <div className="mt-1 h-2 rounded-full bg-bg overflow-hidden border border-white">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (questRun.progress / questRun.target) * 100)}%` }}
                    data-testid="battle-quest-progress"
                  />
                </div>
                <p className="text-[11px] text-ink-muted mt-1">
                  {questRun.progress} / {questRun.target} correct · Reward: {questRun.rewardLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={abandonQuest}
                data-testid="battle-quest-abandon"
                className="btn-ghost !text-xs !py-1.5 !px-3"
                aria-label="Abandon quest"
              >
                <XIcon size={12} strokeWidth={3} /> Abandon
              </button>
            </div>
          </Card>
        )}

        {/* Quest complete celebration toast */}
        {questCompleteToast && (
          <Card className="!p-4 border-gold/40 bg-gold/10 animate-popIn" data-testid="battle-quest-complete-toast">
            <div className="flex items-center gap-3">
              <div className="text-3xl" aria-hidden>🏆</div>
              <div className="min-w-0">
                <p className="h-display text-xl">Quest Complete!</p>
                <p className="text-sm text-ink-muted">+{questCompleteToast.xp} XP · +{questCompleteToast.coins} coins · {questCompleteToast.label}</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="!p-4 border-primary/20 bg-primary/5" data-testid="battle-dev-asset-selector">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Dev battle slots</p>
              <p className="text-xs text-ink-muted">Approved/published Studio assets only. This is a test selector, not player-facing.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Background</span>
              <select className="input mt-1" value={selectedBattleBgId} onChange={(e) => setSelectedBattleBgId(e.target.value)}>
                <option value="">Auto background</option>
                {approvedBackgroundOptions.map((bg: any) => (
                  <option key={bg.__slotId} value={bg.__slotId}>{bg.__slotType}: {bg.__slotLabel}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Player companion</span>
              <select className="input mt-1" value={selectedPlayerCompanionId} onChange={(e) => setSelectedPlayerCompanionId(e.target.value)}>
                <option value="">Auto player</option>
                {approvedCompanionAssetOptions.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name || c.id}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">Enemy companion</span>
              <select className="input mt-1" value={selectedEnemyCompanionId} onChange={(e) => setSelectedEnemyCompanionId(e.target.value)}>
                <option value="">Auto enemy</option>
                {approvedCompanionAssetOptions.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name || c.id}</option>
                ))}
              </select>
            </label>
            <div className="md:col-span-3 flex gap-3 flex-wrap text-xs font-bold text-ink-muted">
              <label className="inline-flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 border border-primary/15">
                <input type="checkbox" checked={flipPlayerCompanion} onChange={(e) => setFlipPlayerCompanion(e.target.checked)} />
                Flip player companion
              </label>
              <label className="inline-flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 border border-primary/15">
                <input type="checkbox" checked={flipEnemyCompanion} onChange={(e) => setFlipEnemyCompanion(e.target.checked)} />
                Flip enemy companion
              </label>
              <label className="inline-flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 border border-primary/15">
                <input type="checkbox" checked={playerCompanionFlying} onChange={(e) => setPlayerCompanionFlying(e.target.checked)} />
                Player flying
              </label>
              <label className="inline-flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 border border-primary/15">
                <input type="checkbox" checked={enemyCompanionFlying} onChange={(e) => setEnemyCompanionFlying(e.target.checked)} />
                Enemy flying
              </label>
            </div>
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden w-full">
          <div
            className="relative min-h-[760px] md:min-h-[860px] px-6 md:px-14 pt-10 md:pt-16 pb-16 md:pb-20 overflow-hidden"
            style={{
              backgroundImage: `url(${battleBackgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-transparent to-white/55" />

            <div className="relative z-10 grid grid-cols-2 gap-8 w-full h-[520px] md:h-[600px] items-end">
              {/* Companion */}
              <div className={`flex flex-col items-center justify-end h-full ${shake === "player" ? "animate-shake" : ""}`}>
                {renderCompanionVisual(
                  companionImageUrl,
                  playerImageFailed,
                  () => setPlayerImageFailed(true),
                  companion.emoji,
                  flipPlayerCompanion,
                  `${activeStudioCompanion?.name || companion.name} companion`,
                  playerCompanionFlying
                )}
                <div className="group relative w-full max-w-sm mt-8 md:mt-10 text-center">
                  <div className="absolute left-1/2 bottom-0 h-80 w-80 -translate-x-1/2 translate-y-2" aria-hidden />
                  <div className="pointer-events-none absolute left-1/2 bottom-full z-30 mb-3 hidden w-56 -translate-x-1/2 rounded-2xl bg-white/92 px-4 py-3 text-left shadow-xl border border-white/80 backdrop-blur-md group-hover:block">
                    <p className="h-display text-lg">{playerBattleInfo.name}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{playerBattleInfo.type}</p>
                    <p className="text-xs font-bold text-primary mt-1">Level {playerBattleInfo.level}</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-extrabold uppercase tracking-wider text-ink-muted">
                      <span>HP</span>
                      <span>{companionHp}/{companionMaxHp}</span>
                    </div>
                    <ProgressBar value={companionHp} max={companionMaxHp} color="sage" testid="battle-companion-hp" />
                  </div>
                </div>
              </div>

              {/* Enemy */}
              <div className={`flex flex-col items-center justify-end h-full ${shake === "enemy" ? "animate-shake" : ""}`}>
                {renderCompanionVisual(
                  enemyImageUrl,
                  enemyImageFailed,
                  () => setEnemyImageFailed(true),
                  enemy.emoji,
                  flipEnemyCompanion,
                  `${studioEnemy?.name || enemy.name} enemy companion`,
                  enemyCompanionFlying
                )}
                <div className="group relative w-full max-w-sm mt-8 md:mt-10 text-center">
                  <div className="absolute left-1/2 bottom-0 h-80 w-80 -translate-x-1/2 translate-y-2" aria-hidden />
                  <div className="pointer-events-none absolute left-1/2 bottom-full z-30 mb-3 hidden w-56 -translate-x-1/2 rounded-2xl bg-white/92 px-4 py-3 text-left shadow-xl border border-white/80 backdrop-blur-md group-hover:block">
                    <p className="h-display text-lg">{enemyBattleInfo.name}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{enemyBattleInfo.type}</p>
                    <p className="text-xs font-bold text-primary mt-1">Level {enemyBattleInfo.level}</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-extrabold uppercase tracking-wider text-ink-muted">
                      <span>HP</span>
                      <span>{enemyHp}/{enemy.maxHp}</span>
                    </div>
                    <ProgressBar value={enemyHp} max={enemy.maxHp} color="fire" testid="battle-enemy-hp" />
                  </div>
                </div>
              </div>
            </div>

            {renderBattleOverlay()}
          </div>
        </Card>

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
