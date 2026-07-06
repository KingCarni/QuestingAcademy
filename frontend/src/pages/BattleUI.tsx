/**
 * BattleUI.tsx
 * TEA-178 / TEA-179 / TEA-180
 *
 * Split architecture:
 *   <BattleHpBars />  — goes INSIDE <Canvas>, uses Drei Html for world-space HP bars
 *   <BattlePanel />   — goes OUTSIDE <Canvas>, renders via ReactDOM.createPortal into
 *                       document.body so it is 100% immune to camera transforms
 *
 * Usage in Battle3D.tsx:
 *   // Inside <Canvas> / ArenaScene:
 *   <BattleHpBars store={battleStore} playerPos={[-2.5,2.6,0]} enemyPos={[2.5,3.2,0]} />
 *
 *   // Outside <Canvas>, sibling to the canvas div:
 *   <BattlePanel store={battleStore} canvasRef={canvasWrapRef} />
 *
 *   // Create the shared store above both:
 *   const battleStore = useBattleStore({ playerMaxHp: 80, enemyMaxHp: 60 })
 */

import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Html } from "@react-three/drei";
import { useGame } from "../lib/gameStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BattleState = "idle" | "question" | "quiz" | "capture-result" | "victory" | "defeat";

interface Question {
  text: string;
  answers: string[];
  correctIndex: number;
  subject: string;
  grade: number;
}

// Shared mutable store passed as a prop — avoids prop drilling and re-render storms
export interface BattleStore {
  playerName: string;
  enemyName: string;
  playerMaxHp: number;
  enemyMaxHp: number;
  questions: Question[];
  onPlayerAttack?: () => void;
  onEnemyAttack?: () => void;
}

// ---------------------------------------------------------------------------
// Battle rewards
// ---------------------------------------------------------------------------

const BATTLE_REWARD = { xp: 30, coins: 15, eggProgress: 10 };

// ---------------------------------------------------------------------------
// Sample questions
// ---------------------------------------------------------------------------

const SAMPLE_QUESTIONS: Question[] = [
  { text: "If you have 24 apples shared equally among 6 friends, how many does each get?", answers: ["3","4","6","8"], correctIndex: 1, subject: "Math", grade: 3 },
  { text: "What is 7 × 8?", answers: ["54","56","58","64"], correctIndex: 1, subject: "Math", grade: 3 },
  { text: "Which shape has exactly 3 sides?", answers: ["Square","Circle","Triangle","Pentagon"], correctIndex: 2, subject: "Math", grade: 2 },
  { text: "What is 100 − 37?", answers: ["63","53","67","73"], correctIndex: 0, subject: "Math", grade: 3 },
  { text: "What is half of 48?", answers: ["22","24","26","28"], correctIndex: 1, subject: "Math", grade: 3 },
  { text: "What is 9 × 9?", answers: ["72","81","89","91"], correctIndex: 1, subject: "Math", grade: 4 },
  { text: "How many sides does a hexagon have?", answers: ["5","6","7","8"], correctIndex: 1, subject: "Math", grade: 2 },
  { text: "What is 144 ÷ 12?", answers: ["10","11","12","13"], correctIndex: 2, subject: "Math", grade: 4 },
  { text: "What is 15 + 28?", answers: ["42","43","44","45"], correctIndex: 1, subject: "Math", grade: 2 },
  { text: "Which fraction is largest: ½, ¼, ¾, or ⅓?", answers: ["½","¼","¾","⅓"], correctIndex: 2, subject: "Math", grade: 4 },
];

const ANSWER_KEYS = ["A","B","C","D"];
const QUIZ_QUESTION_COUNT = 10;
const QUIZ_TIMER_SECONDS = 8;

// ---------------------------------------------------------------------------
// TTS
// ---------------------------------------------------------------------------

function speak(text: string, rate = 0.92) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

function speakQ(q?: Question | null) {
  if (!q?.text || !Array.isArray(q.answers)) return;
  speak(`${q.text}. Your choices are: ${q.answers.map((a,i) => `${ANSWER_KEYS[i]}: ${a}`).join(". ")}`);
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const FONT = "Inter, system-ui, sans-serif";

const panelBase: React.CSSProperties = {
  background: "rgba(10,6,24,0.82)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.13)",
  borderRadius: 20,
  padding: "18px 20px",
  marginBottom: 12,
  fontFamily: FONT,
  color: "#fff",
};

const answerGridStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
};

function answerStyle(i: number, correctIdx: number, selected: number | null, result: "correct"|"wrong"|null): React.CSSProperties {
  let bg = "rgba(255,255,255,0.08)", border = "rgba(255,255,255,0.18)", color = "#fff";
  if (result && i === correctIdx)               { bg = "rgba(74,222,128,0.22)";  border = "rgba(74,222,128,0.6)";  color = "#bbf7d0"; }
  else if (result === "wrong" && i === selected){ bg = "rgba(248,113,113,0.22)"; border = "rgba(248,113,113,0.6)"; color = "#fecaca"; }
  return {
    background: bg, border: `1.5px solid ${border}`, borderRadius: 12,
    padding: "11px 14px", color, fontSize: 14, fontWeight: 600,
    cursor: result ? "default" : "pointer", textAlign: "left",
    display: "flex", alignItems: "center", gap: 10,
    fontFamily: FONT, transition: "all 0.12s ease",
  };
}

function quizAnswerStyle(i: number, correctIdx: number, answered: number | null): React.CSSProperties {
  let bg = "rgba(255,255,255,0.08)", border = "rgba(255,255,255,0.18)", color = "#fff";
  if (answered !== null && i === correctIdx)    { bg = "rgba(74,222,128,0.22)";  border = "rgba(74,222,128,0.6)";  color = "#bbf7d0"; }
  else if (answered === i && i !== correctIdx)  { bg = "rgba(248,113,113,0.22)"; border = "rgba(248,113,113,0.6)"; color = "#fecaca"; }
  return {
    background: bg, border: `1.5px solid ${border}`, borderRadius: 12,
    padding: "11px 14px", color, fontSize: 14, fontWeight: 600,
    cursor: answered !== null ? "default" : "pointer", textAlign: "left",
    display: "flex", alignItems: "center", gap: 10, fontFamily: FONT,
  };
}

const keyBadge: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 7,
  background: "rgba(255,255,255,0.12)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 11, fontWeight: 800, flexShrink: 0,
};

const ttsBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8, padding: "4px 12px", cursor: "pointer",
  color: "rgba(255,255,255,0.65)", fontSize: 12, fontFamily: FONT,
};

// ---------------------------------------------------------------------------
// HpBar — INSIDE Canvas, world-space anchor
// ---------------------------------------------------------------------------

interface HpBarProps {
  name: string; hp: number; maxHp: number;
  position: [number,number,number]; eggProgress?: number;
}

export function BattleHpBar({ name, hp, maxHp, position }: HpBarProps) {
  const [liveHp, setLiveHp] = useState(hp);

  useEffect(() => {
    setLiveHp(hp);
  }, [hp]);

  useEffect(() => {
    const handleHpUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ playerHp?: number; enemyHp?: number }>).detail;
      if (!detail) return;

      const isEnemyBar = name.toLowerCase().includes("bubblefin") || name.toLowerCase().includes("enemy");
      const nextHp = isEnemyBar ? detail.enemyHp : detail.playerHp;

      if (typeof nextHp === "number") {
        setLiveHp(nextHp);
      }
    };

    window.addEventListener("battleHpUpdate", handleHpUpdate);
    return () => window.removeEventListener("battleHpUpdate", handleHpUpdate);
  }, [name]);

  const pct = Math.max(0, (liveHp / maxHp) * 100);
  const isLow = pct < 30;
  return (
    <Html position={position} center distanceFactor={8} zIndexRange={[10,20]}>
      <div style={{
        width: 175, background: "rgba(8,5,18,0.9)", border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 12, padding: "9px 13px", fontFamily: FONT, userSelect: "none",
        backdropFilter: "blur(6px)", pointerEvents: "none",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 5 }}>
          <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>{name}</span>
          <span style={{ color:"rgba(255,255,255,0.5)", fontSize:11 }}>{Math.max(0, liveHp)}/{maxHp}</span>
        </div>
        <div style={{ height:7, background:"rgba(0,0,0,0.5)", borderRadius:4, overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${pct}%`, borderRadius:4,
            background: isLow ? "linear-gradient(90deg,#ef4444,#f87171)" : "linear-gradient(90deg,#22c55e,#4ade80)",
            transition:"width 0.5s ease",
          }} />
        </div>
        {/* Hatch/capture progress intentionally removed from world-space HP bars. */}
      </div>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// DamageFloat — INSIDE Canvas, world-space
// ---------------------------------------------------------------------------

interface DamageFloatProps {
  amount: number; position: [number,number,number]; color?: string; onDone: () => void;
}

export function BattleDamageFloat({ amount, position, color="#fbbf24", onDone }: DamageFloatProps) {
  useEffect(() => { const t = setTimeout(onDone, 1300); return () => clearTimeout(t); }, [onDone]);
  return (
    <Html position={position} center zIndexRange={[30,40]}>
      <div style={{
        fontSize:24, fontWeight:800, color, fontFamily:FONT,
        textShadow:"0 2px 8px rgba(0,0,0,0.9)", pointerEvents:"none",
        animation:"eduFloatUp 1.3s ease-out forwards", whiteSpace:"nowrap",
      }}>
        -{amount}
        <style>{`@keyframes eduFloatUp{0%{opacity:1;transform:translateY(0) scale(1.2)}20%{opacity:1;transform:translateY(-8px) scale(1)}100%{opacity:0;transform:translateY(-44px) scale(0.85)}}`}</style>
      </div>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// ActionButton
// ---------------------------------------------------------------------------

interface ActionBtnProps {
  icon: string; label: string; bg: string; hoverBg: string;
  onClick: () => void; border?: string; textColor?: string; disabled?: boolean; helperText?: string;
}

function ActionBtn({ icon, label, bg, hoverBg, onClick, border, textColor="#fff", disabled = false, helperText }: ActionBtnProps) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? hoverBg : bg,
        border: border ? `1.5px solid ${border}` : "none",
        borderRadius: 18, padding: "18px 12px 15px",
        cursor: "pointer", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 8,
        transition: "all 0.15s ease",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.35)" : "0 4px 12px rgba(0,0,0,0.25)",
      }}
    >
      <span style={{ fontSize:32, filter:"drop-shadow(0 2px 5px rgba(0,0,0,0.35))" }}>{icon}</span>
      <span style={{ fontSize:15, fontWeight:950, color:textColor, letterSpacing:"0.065em", textTransform:"uppercase", fontFamily:FONT, textShadow:"0 1px 5px rgba(0,0,0,0.35)" }}>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// BattlePanel — OUTSIDE Canvas, rendered via portal to document.body
// This is the key: portalling to body means it is completely independent
// of the canvas, Three.js transforms, and OrbitControls.
// ---------------------------------------------------------------------------

export interface BattlePanelProps {
  store: BattleStore;
  /** Ref to the canvas wrapper div — used to position the panel correctly */
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function BattlePanel({ store, canvasRef }: BattlePanelProps) {
  const { playerName, enemyName, playerMaxHp, enemyMaxHp, questions = SAMPLE_QUESTIONS, onPlayerAttack, onEnemyAttack } = store;

  const awardBattle  = useGame((s) => s.awardBattle);
  const hatchIfReady = useGame((s) => s.hatchIfReady);

  // Rendered state
  const [battleState, setBattleState]   = useState<BattleState>("idle");
  const [playerHp, setPlayerHp]         = useState(playerMaxHp);
  const [enemyHp, setEnemyHp]           = useState(enemyMaxHp);
  const [eggProgress, setEggProgress]   = useState(0);
  const [statusMsg, setStatusMsg]       = useState("Choose an action");
  const [currentQ, setCurrentQ]         = useState<Question | null>(null);
  const [answerResult, setAnswerResult] = useState<"correct"|"wrong"|null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number|null>(null);
  const [quizIndex, setQuizIndex]       = useState(0);
  const [quizCorrect, setQuizCorrect]   = useState(0);
  const [quizResults, setQuizResults]   = useState<(boolean|null)[]>([]);
  const [quizTimerPct, setQuizTimerPct] = useState(100);
  const [quizQ, setQuizQ]               = useState<Question|null>(null);
  const [quizAnsResult, setQuizAnsResult] = useState<number|null>(null);
  const [captureChance, setCaptureChance] = useState(0);

  // Live HP refs — no stale closures
  const playerHpRef = useRef(playerMaxHp);
  const enemyHpRef  = useRef(enemyMaxHp);
  const defendedRef = useRef(false);
  const quizTimerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const quizQRef     = useRef<Question|null>(null);

  const syncPlayer = (hp: number) => { playerHpRef.current = hp; setPlayerHp(hp); };
  const syncEnemy  = (hp: number) => { enemyHpRef.current  = hp; setEnemyHp(hp); };
  const clamp = (v: number) => Math.max(0, v);
  const activeQuestions = questions.length > 0 ? questions : SAMPLE_QUESTIONS;
  const enemyHpPct = enemyMaxHp > 0 ? enemyHp / enemyMaxHp : 0;
  const quizUnlocked = enemyHpPct <= 0.3;

  const addEgg = useCallback((pts: number) => setEggProgress((p) => Math.min(100, p + pts)), []);
  const pickQ  = useCallback(() => activeQuestions[Math.floor(Math.random() * activeQuestions.length)] || SAMPLE_QUESTIONS[0], [activeQuestions]);

  const checkEnd = useCallback((pHp: number, eHp: number): boolean => {
    if (eHp <= 0) {
      setBattleState("victory");
      setStatusMsg("🎉 You won! Capture chance unlocked!");
      awardBattle(BATTLE_REWARD.xp, BATTLE_REWARD.coins, BATTLE_REWARD.eggProgress);
      hatchIfReady();
      return true;
    }
    if (pHp <= 0) {
      setBattleState("defeat");
      setStatusMsg("💫 You fainted... Try again!");
      return true;
    }
    return false;
  }, [awardBattle, hatchIfReady]);

  const enemyTurn = useCallback((wasDefended: boolean) => {
    const dmg = wasDefended ? Math.floor(Math.random()*4)+2 : Math.floor(Math.random()*8)+5;
    setTimeout(() => {
      onEnemyAttack?.();
      setTimeout(() => {
        const newHp = clamp(playerHpRef.current - dmg);
        syncPlayer(newHp);
        setStatusMsg(`${enemyName} hits for ${dmg}${wasDefended ? " (blocked!)" : ""}!`);
        if (!checkEnd(newHp, enemyHpRef.current)) {
          setTimeout(() => { setBattleState("idle"); setStatusMsg("Choose an action"); defendedRef.current = false; }, 1200);
        }
      }, 500);
    }, 800);
  }, [onEnemyAttack, enemyName, checkEnd]);

  const handleAttack = useCallback(() => {
    if (battleState !== "idle") return;
    const q = pickQ();
    setCurrentQ(q); setAnswerResult(null); setSelectedAnswer(null);
    setBattleState("question"); setStatusMsg("Answer correctly to strike!");
    speakQ(q);
  }, [battleState, pickQ]);

  const handleAnswer = useCallback((chosen: number) => {
    if (!currentQ || answerResult) return;
    setSelectedAnswer(chosen);
    const correct = chosen === currentQ.correctIndex;
    setAnswerResult(correct ? "correct" : "wrong");
    if (correct) {
      const dmg = 10 + Math.floor(Math.random()*10);
      speak("Great job!");
      onPlayerAttack?.();
      setTimeout(() => {
        const newEHp = clamp(enemyHpRef.current - dmg);
        syncEnemy(newEHp);
        addEgg(5);
        setStatusMsg(`Direct hit! ${playerName} strikes for ${dmg}!`);
        setTimeout(() => {
          setBattleState("idle"); setCurrentQ(null);
          if (!checkEnd(playerHpRef.current, newEHp)) enemyTurn(false);
        }, 1500);
      }, 400);
    } else {
      speak("Not quite — try again next turn!");
      setTimeout(() => {
        setStatusMsg(`Wrong — ${enemyName} counters!`);
        setBattleState("idle"); setCurrentQ(null);
        enemyTurn(defendedRef.current);
      }, 1200);
    }
  }, [currentQ, answerResult, onPlayerAttack, playerName, enemyName, addEgg, checkEnd, enemyTurn]);

  const handleDefend = useCallback(() => {
    if (battleState !== "idle") return;
    defendedRef.current = true;
    setStatusMsg(`${playerName} braces for impact!`);
    enemyTurn(true);
  }, [battleState, playerName, enemyTurn]);

  const handleRun = useCallback(() => {
    if (battleState !== "idle") return;
    setStatusMsg("You fled the battle!");
    setTimeout(() => setStatusMsg("Choose an action"), 2000);
  }, [battleState]);

  const clearQuizTimer = useCallback(() => {
    if (quizTimerRef.current) { clearInterval(quizTimerRef.current); quizTimerRef.current = null; }
  }, []);

  const advanceQuiz = useCallback((index: number, correct: number, results: (boolean|null)[]) => {
    if (index >= QUIZ_QUESTION_COUNT) {
      clearQuizTimer();
      const chance = Math.round((correct / QUIZ_QUESTION_COUNT) * 100);
      setCaptureChance(chance);
      setBattleState("capture-result");
      addEgg(correct * 3);
      const newEHp = clamp(enemyHpRef.current - Math.round(correct * 2.5));
      syncEnemy(newEHp);
      setTimeout(() => {
        if (!checkEnd(playerHpRef.current, newEHp)) {
          setBattleState("idle");
          setStatusMsg(`Quiz done! ${correct}/10 — capture chance: ${chance}%`);
        }
        setQuizIndex(0); setQuizCorrect(0); setQuizResults([]);
      }, 4000);
      return;
    }
    const q = activeQuestions[index % activeQuestions.length] || SAMPLE_QUESTIONS[0];
    quizQRef.current = q;
    setQuizQ(q); setQuizAnsResult(null); setQuizTimerPct(100); setQuizIndex(index);
    speak(q.text, 1.0);
    let elapsed = 0;
    clearQuizTimer();
    quizTimerRef.current = setInterval(() => {
      elapsed += 100;
      const pct = Math.max(0, 100 - (elapsed / (QUIZ_TIMER_SECONDS * 1000)) * 100);
      setQuizTimerPct(pct);
      if (pct <= 0) {
        clearQuizTimer();
        const nr = [...results, null];
        setQuizResults(nr);
        setTimeout(() => advanceQuiz(index + 1, correct, nr), 400);
      }
    }, 100);
  }, [activeQuestions, clearQuizTimer, addEgg, checkEnd]);

  const handleQuizAnswer = useCallback((chosen: number) => {
    if (quizAnsResult !== null || !quizQRef.current) return;
    clearQuizTimer();
    const isCorrect = chosen === quizQRef.current.correctIndex;
    setQuizAnsResult(chosen);
    setQuizResults((prev) => {
      const next = [...prev, isCorrect];
      const nc = next.filter(Boolean).length;
      setQuizCorrect(nc);
      setTimeout(() => advanceQuiz(quizIndex + 1, nc, next), 600);
      return next;
    });
  }, [quizAnsResult, clearQuizTimer, advanceQuiz, quizIndex]);

  const handleStartQuiz = useCallback(() => {
    if (battleState !== "idle") return;
    if (!quizUnlocked) {
      setStatusMsg(`${enemyName} is still too strong. Weaken them below 30% HP to try Quiz Capture!`);
      setTimeout(() => setStatusMsg("Choose an action"), 1800);
      return;
    }
    setQuizIndex(0); setQuizCorrect(0); setQuizResults([]);
    setBattleState("quiz"); setStatusMsg("⚡ Quiz Capture — answer quickly!");
    advanceQuiz(0, 0, []);
  }, [battleState, quizUnlocked, enemyName, advanceQuiz]);

  useEffect(() => () => clearQuizTimer(), [clearQuizTimer]);

  const handleReset = useCallback(() => {
    syncPlayer(playerMaxHp); syncEnemy(enemyMaxHp);
    defendedRef.current = false;
    setBattleState("idle"); setStatusMsg("Choose an action");
    setCurrentQ(null); setAnswerResult(null); setSelectedAnswer(null); setEggProgress(0);
  }, [playerMaxHp, enemyMaxHp]);

  // Expose HP to HpBars via CustomEvent so they stay in sync
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("battleHpUpdate", { detail: { playerHp, enemyHp, eggProgress } }));
  }, [playerHp, enemyHp, eggProgress]);

  // ---------------------------------------------------------------------------
  // Portal render — completely outside Canvas, fixed to viewport bottom
  // ---------------------------------------------------------------------------

  const portal = document.getElementById("battle-ui-portal") ?? document.body;

  return ReactDOM.createPortal(
    <div style={{
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      padding: "0 24px 28px",
      zIndex: 9999,
      fontFamily: FONT,
      pointerEvents: "none",
    }}>
      {/* Status pill */}
      <div style={{ textAlign:"center", marginBottom:10 }}>
        <span style={{
          background:"rgba(10,6,24,0.78)", backdropFilter:"blur(12px)",
          border:"1px solid rgba(255,255,255,0.14)", borderRadius:24,
          padding:"6px 20px", color:"rgba(255,255,255,0.9)",
          fontSize:13, fontWeight:600, fontFamily:FONT,
          boxShadow:"0 4px 16px rgba(0,0,0,0.4)",
        }}>
          {statusMsg}
        </span>
      </div>

      {/* ── Attack question ── */}
      {battleState === "question" && currentQ && (
        <div style={{ ...panelBase, pointerEvents:"all", boxShadow:"0 8px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <span style={{ fontSize:10, color:"rgba(200,180,255,0.75)", textTransform:"uppercase", letterSpacing:"0.08em" }}>
              {currentQ.subject} · Grade {currentQ.grade}
            </span>
            <button style={ttsBtn} onClick={() => speakQ(currentQ)}>🔊 Read aloud</button>
          </div>
          <div style={{ fontSize:16, fontWeight:600, lineHeight:1.45, marginBottom:14 }}>{currentQ.text}</div>
          <div style={answerGridStyle}>
            {currentQ.answers.map((a,i) => (
              <button key={i} style={answerStyle(i, currentQ.correctIndex, selectedAnswer, answerResult)}
                onClick={() => handleAnswer(i)} disabled={!!answerResult}>
                <span style={keyBadge}>{ANSWER_KEYS[i]}</span>{a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Quiz lightning round ── */}
      {battleState === "quiz" && quizQ && (
        <div style={{ ...panelBase, border:"1px solid rgba(251,191,36,0.3)", pointerEvents:"all", boxShadow:"0 8px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:800, color:"#fbbf24", textTransform:"uppercase", letterSpacing:"0.08em" }}>⚡ Lightning round</span>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.55)" }}>{quizCorrect} / {quizIndex} correct</span>
          </div>
          <div style={{ display:"flex", gap:4, marginBottom:8 }}>
            {Array.from({ length:QUIZ_QUESTION_COUNT }).map((_,i) => {
              const r = quizResults[i];
              const active = i === quizIndex;
              const bg = r===true?"#4ade80":r===false?"#f87171":(r===null&&i<quizIndex)?"#555":active?"#fbbf24":"rgba(255,255,255,0.15)";
              return <div key={i} style={{ flex:1, height:6, borderRadius:3, background:bg, transition:"background 0.3s" }} />;
            })}
          </div>
          <div style={{ height:4, background:"rgba(255,255,255,0.1)", borderRadius:2, marginBottom:12, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${quizTimerPct}%`, background:quizTimerPct<30?"#ef4444":"linear-gradient(90deg,#fbbf24,#f59e0b)", borderRadius:2, transition:"width 0.1s linear, background 0.3s" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:10, color:"rgba(200,180,255,0.75)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Question {quizIndex+1} of {QUIZ_QUESTION_COUNT}</span>
            <button style={ttsBtn} onClick={() => speak(quizQ.text)}>🔊</button>
          </div>
          <div style={{ fontSize:16, fontWeight:600, lineHeight:1.45, marginBottom:12 }}>{quizQ.text}</div>
          <div style={answerGridStyle}>
            {quizQ.answers.map((a,i) => (
              <button key={i} style={quizAnswerStyle(i, quizQ.correctIndex, quizAnsResult)}
                onClick={() => handleQuizAnswer(i)} disabled={quizAnsResult !== null}>
                <span style={keyBadge}>{ANSWER_KEYS[i]}</span>{a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Capture result ── */}
      {battleState === "capture-result" && (
        <div style={{ ...panelBase, border:"1px solid rgba(168,85,247,0.35)", textAlign:"center", boxShadow:"0 8px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize:52, marginBottom:8 }}>🥚</div>
          <div style={{ fontSize:18, fontWeight:800, marginBottom:5 }}>
            {quizCorrect>=8?"Amazing round!":quizCorrect>=5?"Quiz complete!":"Nice try!"}
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)", marginBottom:14 }}>{quizCorrect}/{QUIZ_QUESTION_COUNT} correct</div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:12, color:"rgba(192,132,252,0.85)" }}>Capture chance</span>
            <span style={{ fontSize:12, color:"rgba(192,132,252,0.85)" }}>{captureChance}%</span>
          </div>
          <div style={{ height:10, background:"rgba(0,0,0,0.4)", borderRadius:5, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${captureChance}%`, background:"linear-gradient(90deg,#a855f7,#c084fc)", borderRadius:5, transition:"width 1.5s ease" }} />
          </div>
        </div>
      )}

      {/* ── Victory ── */}
      {battleState === "victory" && (
        <div style={{ ...panelBase, border:"1px solid rgba(74,222,128,0.4)", textAlign:"center", pointerEvents:"all", boxShadow:"0 8px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize:44, marginBottom:8 }}>🏆</div>
          <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>{enemyName} defeated!</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)", marginBottom:16 }}>
            +{BATTLE_REWARD.xp} XP · +{BATTLE_REWARD.coins} coins · 🥚 +{BATTLE_REWARD.eggProgress}% warmth
          </div>
          <button onClick={handleReset} style={primaryBtn}>Continue</button>
        </div>
      )}

      {/* ── Defeat ── */}
      {battleState === "defeat" && (
        <div style={{ ...panelBase, border:"1px solid rgba(248,113,113,0.4)", textAlign:"center", pointerEvents:"all", boxShadow:"0 8px 40px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize:44, marginBottom:8 }}>💫</div>
          <div style={{ fontSize:18, fontWeight:800, marginBottom:16 }}>You fainted...</div>
          <button onClick={handleReset} style={primaryBtn}>Try again</button>
        </div>
      )}

      {/* ── Action bar ── */}
      {battleState === "idle" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, pointerEvents:"all" }}>
          <ActionBtn icon="⚔️" label="Attack" bg="linear-gradient(135deg,#6d28d9,#8b5cf6)" hoverBg="linear-gradient(135deg,#7c3aed,#a78bfa)" onClick={handleAttack} />
          <ActionBtn icon="🛡️" label="Defend" bg="linear-gradient(135deg,#1e40af,#2563eb)" hoverBg="linear-gradient(135deg,#1d4ed8,#60a5fa)" onClick={handleDefend} />
          <ActionBtn icon="⚡" label="Quiz Capture"   bg="linear-gradient(135deg,#92400e,#d97706)" hoverBg="linear-gradient(135deg,#b45309,#f59e0b)" onClick={handleStartQuiz} disabled={!quizUnlocked} helperText={quizUnlocked ? "Ready" : "Unlocks at 30% HP"} />
          <ActionBtn icon="🏃" label="Run Away" bg="linear-gradient(135deg,#991b1b,#ef4444)" hoverBg="linear-gradient(135deg,#b91c1c,#f97316)" border="rgba(255,255,255,0.22)" textColor="#fff" onClick={handleRun} />
        </div>
      )}
    </div>,
    portal
  );
}

const primaryBtn: React.CSSProperties = {
  background:"#7c3aed", border:"none", borderRadius:12,
  padding:"11px 32px", color:"#fff", fontSize:14,
  fontWeight:700, cursor:"pointer", fontFamily:FONT,
  boxShadow:"0 4px 16px rgba(124,58,237,0.4)",
};

// ---------------------------------------------------------------------------
// Convenience re-exports for world-space elements
// ---------------------------------------------------------------------------

export { BattleHpBar as HpBar, BattleDamageFloat as DamageFloat };
