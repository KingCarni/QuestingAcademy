// Battle3dDesign.tsx — TEA design exploration for the Edu-Mates 3D battle UI.
// Three philosophies (Pokémon / Hearthstone / Dreamlight) × five feedback states
// rendered on top of the existing 3D arena backdrop. No real Three.js — the
// backdrop is a static image so reviewers can pick a direction without touching
// the live game. NOT routed through RequirePlayer; this is a designer view.

import React from "react";
import { Link } from "react-router-dom";
import {
  Swords, Shield, BookOpen, LogOut, Lock, Volume2, Sparkles,
  CheckCircle2, XCircle, Wand2, Star, Heart, ArrowLeft,
  Crown, Leaf, Trophy,
} from "lucide-react";

const BACKDROP =
  "https://customer-assets.emergentagent.com/job_quest-academy-mvp/artifacts/2sql4wq4_image.png";

type PhilosophyId = "pokemon" | "hearthstone" | "dreamlight";
type StateId = "default" | "modal" | "correct" | "wrong" | "locked";

interface PhilosophyTheme {
  id: PhilosophyId;
  name: string;
  tagline: string;
  signatureAccent: string;
  accentBg: string;       // tailwind bg-... for primary chips
  accentText: string;     // tailwind text-... contrast against accentBg
  accentRing: string;     // ring color when selected
  modalShell: string;     // tailwind classes for the modal wrapper
  modalDimmer: string;    // bg + backdrop-blur for the scrim
  modalHeaderLabel: string;
  ctaLabel: string;
  ctaAfterAnswer: string;
  spacing: string;        // micro-note
  hierarchy: string;
  placement: string;
}

const PHILOSOPHIES: PhilosophyTheme[] = [
  {
    id: "pokemon",
    name: "Option 1 · Pokémon (Game-First)",
    tagline: "The question feels like a battle command. Direct, snappy, no friction.",
    signatureAccent: "Emerald #10B981",
    accentBg: "bg-emerald-500",
    accentText: "text-white",
    accentRing: "ring-emerald-300",
    modalShell:
      "bg-white border-4 border-slate-900 rounded-xl shadow-[6px_6px_0_0_rgba(15,23,42,0.9)]",
    modalDimmer: "bg-slate-900/40",
    modalHeaderLabel: "SPELL COMMAND",
    ctaLabel: "Choose an answer",
    ctaAfterAnswer: "Continue",
    spacing: "Tight 8/12px gutters · sharp 12px corners · no idle motion",
    hierarchy: "Question header is small; the four answers ARE the focus",
    placement: "Modal pinned bottom-center, 720px max, leaves the arena fully visible",
  },
  {
    id: "hearthstone",
    name: "Option 2 · Hearthstone (Premium Card)",
    tagline: "A magical card unfurls from the arena. Premium, animated, ceremonial.",
    signatureAccent: "Royal Magenta #BE185D",
    accentBg: "bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-700",
    accentText: "text-white",
    accentRing: "ring-fuchsia-300",
    modalShell:
      "bg-gradient-to-b from-amber-50 to-amber-100 border-4 border-amber-400 rounded-2xl shadow-2xl shadow-fuchsia-900/40 ring-2 ring-amber-200/60",
    modalDimmer: "bg-slate-900/60 backdrop-blur-md",
    modalHeaderLabel: "CHALLENGE CARD",
    ctaLabel: "Cast Spell",
    ctaAfterAnswer: "Unleash Attack",
    spacing: "Generous 24/32px gutters · 24px corners · ornate inner borders",
    hierarchy: "Headline glyph → question → answers → CTA forms a deliberate vertical ritual",
    placement: "Modal centered, 640px max; arena dimmed + blurred so the card is the star",
  },
  {
    id: "dreamlight",
    name: "Option 3 · Dreamlight Valley (Cozy & Whimsical)",
    tagline: "A friend asks a question. Soft glass, warm pastels, kind feedback.",
    signatureAccent: "Peach #FDBA74 + Butter #FDE047",
    accentBg: "bg-amber-300",
    accentText: "text-amber-950",
    accentRing: "ring-amber-200",
    modalShell:
      "bg-white/80 backdrop-blur-lg border-4 border-white rounded-3xl shadow-2xl ring-2 ring-amber-100/60",
    modalDimmer: "bg-purple-900/20 backdrop-blur-sm",
    modalHeaderLabel: "FRIENDSHIP QUESTION",
    ctaLabel: "Try it!",
    ctaAfterAnswer: "Cast attack!",
    spacing: "Pillowy 20/28px gutters · 28-32px corners · light glassmorphism",
    hierarchy: "Equal warmth across all elements; nothing feels like a 'test'",
    placement: "Modal centered, 560px max; arena stays bright behind soft pastel glass",
  },
];

const QUESTION = "What is 7 × 8?";
const ANSWERS = [42, 54, 56, 64];
const CORRECT = 56;

// ---------------------------------------------------------------------------
// Shared overlay primitives
// ---------------------------------------------------------------------------

const StageFrame: React.FC<{ children: React.ReactNode; testid: string; tall?: boolean }> = ({ children, testid, tall }) => (
  <div
    data-testid={testid}
    className={`relative w-full ${tall ? "aspect-[16/10]" : "aspect-[16/9]"} rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-slate-900`}
    style={{
      backgroundImage: `url(${BACKDROP})`,
      // Source image includes the user's browser chrome (top) + taskbar (bottom).
      // Scaling to 180% height and centering ~35% from top crops out both chromes
      // so the painted 3D arena fills the stage.
      backgroundSize: "auto 180%",
      backgroundPosition: "center 35%",
      backgroundRepeat: "no-repeat",
    }}
  >
    {children}
  </div>
);

const HpCard: React.FC<{ side: "player" | "enemy"; name: string; lvl: number; hp: number; max: number; avatarBg: string; testid: string }> = ({ side, name, lvl, hp, max, avatarBg, testid }) => {
  const pct = Math.round((hp / max) * 100);
  return (
    <div
      data-testid={testid}
      className={`absolute ${side === "player" ? "left-4 bottom-4" : "right-4 top-4"} bg-white/90 backdrop-blur-sm border-2 border-white rounded-2xl px-3 py-2 shadow-lg flex items-center gap-2 min-w-[180px]`}
    >
      <div className={`${avatarBg} w-9 h-9 rounded-xl border-2 border-white grid place-items-center`} aria-hidden>
        <Heart size={14} className="text-white" strokeWidth={3} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-extrabold text-sm text-slate-900 truncate">{name}</p>
          <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-300 text-amber-950 px-1.5 py-0.5 rounded-md">Lvl {lvl}</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] font-bold text-slate-600 mt-0.5 tabular-nums">{hp}/{max} HP</p>
      </div>
    </div>
  );
};

const BattleLog: React.FC<{ text: string }> = ({ text }) => (
  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/70 text-white px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide backdrop-blur-sm border border-white/30">
    {text}
  </div>
);

const ActionBar: React.FC<{
  philosophyId: PhilosophyId;
  attackEmphasis?: boolean;
  quizLocked: boolean;
  testidPrefix: string;
}> = ({ philosophyId, attackEmphasis = true, quizLocked, testidPrefix }) => {
  // Per-philosophy button styling
  const baseBtn = "relative flex items-center gap-2 px-4 py-3 rounded-2xl font-extrabold border-2 transition active:translate-y-px shadow-md min-h-[56px]";
  const styles: Record<PhilosophyId, { attack: string; defend: string; quiz: string; run: string }> = {
    pokemon: {
      attack: `${baseBtn} bg-emerald-500 text-white border-slate-900`,
      defend: `${baseBtn} bg-white text-slate-900 border-slate-900`,
      quiz: `${baseBtn} bg-white text-slate-900 border-slate-900`,
      run: `${baseBtn} bg-white text-slate-900 border-slate-900`,
    },
    hearthstone: {
      attack: `${baseBtn} bg-gradient-to-br from-fuchsia-600 to-purple-700 text-white border-amber-300 ring-2 ring-amber-200/60`,
      defend: `${baseBtn} bg-slate-100 text-slate-900 border-amber-400/70`,
      quiz: `${baseBtn} bg-slate-100 text-slate-900 border-amber-400/70`,
      run: `${baseBtn} bg-slate-100 text-slate-900 border-amber-400/70`,
    },
    dreamlight: {
      attack: `${baseBtn} bg-amber-300 text-amber-950 border-white`,
      defend: `${baseBtn} bg-white/90 text-slate-900 border-white`,
      quiz: `${baseBtn} bg-white/90 text-slate-900 border-white`,
      run: `${baseBtn} bg-white/90 text-slate-900 border-white`,
    },
  };
  const s = styles[philosophyId];
  return (
    <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
      <div className="mx-auto max-w-2xl bg-white/30 backdrop-blur-sm rounded-3xl p-2 border-2 border-white/60 shadow-xl">
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            data-testid={`${testidPrefix}-action-attack`}
            className={`${s.attack} ${attackEmphasis ? "scale-[1.02]" : ""} justify-center`}
            aria-label="Attack"
          >
            <Swords size={20} strokeWidth={3} />
            <span className="text-sm">Attack</span>
            {attackEmphasis && <Sparkles size={14} strokeWidth={3} className="text-amber-200" />}
          </button>
          <button type="button" data-testid={`${testidPrefix}-action-defend`} className={`${s.defend} justify-center`}>
            <Shield size={20} strokeWidth={3} />
            <span className="text-sm">Defend</span>
          </button>
          <button
            type="button"
            data-testid={`${testidPrefix}-action-quiz`}
            disabled={quizLocked}
            aria-disabled={quizLocked}
            aria-label={quizLocked ? "Quiz, locked, unlocks soon" : "Quiz"}
            className={`${s.quiz} justify-center ${quizLocked ? "opacity-50 cursor-not-allowed grayscale" : ""}`}
          >
            {quizLocked ? <Lock size={18} strokeWidth={3} /> : <BookOpen size={20} strokeWidth={3} />}
            <span className="text-sm">Quiz</span>
            {quizLocked && (
              <span data-testid={`${testidPrefix}-quiz-lock-chip`} className="absolute -top-2 -right-2 bg-slate-800 text-amber-200 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full border-2 border-amber-200">
                Soon
              </span>
            )}
          </button>
          <button type="button" data-testid={`${testidPrefix}-action-run`} className={`${s.run} justify-center`}>
            <LogOut size={20} strokeWidth={3} />
            <span className="text-sm">Run</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Question Modal — variant per philosophy + per state
// ---------------------------------------------------------------------------

type ModalState = "default" | "correct" | "wrong";

const QuestionModal: React.FC<{
  philosophy: PhilosophyTheme;
  state: ModalState;
  testidPrefix: string;
}> = ({ philosophy, state, testidPrefix }) => {
  const selected = state === "default" ? null : state === "correct" ? CORRECT : 42;
  const isWrong = state === "wrong";
  const isCorrect = state === "correct";

  const headerIcon =
    philosophy.id === "pokemon" ? <Wand2 size={18} strokeWidth={3} /> :
    philosophy.id === "hearthstone" ? <Crown size={18} strokeWidth={3} /> :
    <Leaf size={18} strokeWidth={3} />;

  const headerBg =
    philosophy.id === "pokemon" ? "bg-slate-900 text-amber-200" :
    philosophy.id === "hearthstone" ? "bg-gradient-to-r from-fuchsia-700 to-purple-800 text-amber-200" :
    "bg-amber-200 text-amber-950";

  const answerBase =
    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold border-2 text-left transition active:translate-y-px min-h-[56px]";

  const answerStyles = (n: number) => {
    if (selected === null) {
      // Default — every answer looks tappable
      if (philosophy.id === "pokemon")     return `${answerBase} bg-white text-slate-900 border-slate-900 hover:bg-emerald-50`;
      if (philosophy.id === "hearthstone") return `${answerBase} bg-white text-slate-900 border-amber-400 hover:border-fuchsia-500`;
      return `${answerBase} bg-white/90 text-slate-900 border-white hover:bg-amber-50`;
    }
    const isThis = n === selected;
    const isCorrectAnswer = n === CORRECT;
    if (isCorrect && isThis) return `${answerBase} bg-emerald-100 text-emerald-900 border-emerald-500 ring-4 ring-emerald-300`;
    if (isWrong && isThis)   return `${answerBase} bg-orange-100 text-orange-900 border-orange-400 ring-4 ring-orange-200`;
    if (isWrong && isCorrectAnswer) return `${answerBase} bg-emerald-50 text-emerald-900 border-emerald-400 ring-2 ring-emerald-200`;
    return `${answerBase} bg-slate-50 text-slate-500 border-slate-200 opacity-70`;
  };

  return (
    <div className={`absolute inset-0 ${philosophy.modalDimmer} grid place-items-center px-6`}>
      <div
        data-testid={`${testidPrefix}-modal`}
        className={`${philosophy.modalShell} w-full ${philosophy.id === "pokemon" ? "max-w-[720px]" : philosophy.id === "hearthstone" ? "max-w-[640px]" : "max-w-[560px]"} p-5`}
      >
        {/* Header strip */}
        <div className={`flex items-center justify-between gap-3 ${headerBg} rounded-xl px-3 py-2 mb-4`}>
          <span className="inline-flex items-center gap-2 text-[11px] font-extrabold tracking-widest">
            {headerIcon} {philosophy.modalHeaderLabel}
          </span>
          <span className="text-[10px] font-extrabold tracking-widest uppercase opacity-80">
            Embercub · Fire
          </span>
        </div>

        {/* Question + Read aloud */}
        <div className="flex items-start gap-3 mb-4">
          <button
            type="button"
            data-testid={`${testidPrefix}-question-tts`}
            aria-label="Read question aloud"
            className="shrink-0 w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 grid place-items-center border-2 border-blue-200 hover:bg-blue-200 transition"
          >
            <Volume2 size={18} strokeWidth={3} />
          </button>
          <p className="flex-1 text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
            {QUESTION}
          </p>
        </div>

        {/* Answers — 2x2 grid */}
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Answer choices">
          {ANSWERS.map((n) => (
            <div key={n} className="relative">
              <button
                type="button"
                data-testid={`answer-btn-${philosophy.id}-${n}`}
                aria-pressed={selected === n}
                className={answerStyles(n)}
              >
                <span className="text-2xl tabular-nums">{n}</span>
                {selected === n && isCorrect    && <CheckCircle2 size={18} strokeWidth={3} className="ml-auto text-emerald-600" />}
                {selected === n && isWrong      && <XCircle      size={18} strokeWidth={3} className="ml-auto text-orange-600" />}
                {isWrong && n === CORRECT && selected !== n && <CheckCircle2 size={18} strokeWidth={3} className="ml-auto text-emerald-500" />}
              </button>
              <button
                type="button"
                data-testid={`answer-tts-${philosophy.id}-${n}`}
                aria-label={`Read answer ${n} aloud`}
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-blue-200 text-blue-700 grid place-items-center shadow hover:bg-blue-50"
              >
                <Volume2 size={11} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>

        {/* Feedback / explanation */}
        {isCorrect && (
          <div
            data-testid={`${testidPrefix}-feedback-correct`}
            className="mt-4 flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-300"
          >
            <Sparkles size={20} strokeWidth={3} className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-extrabold text-emerald-900 text-sm">Spell charged! 7 × 8 = 56.</p>
              <p className="text-xs text-emerald-800">Think of it as seven groups of eight — Embercub's flame grows brighter!</p>
            </div>
          </div>
        )}
        {isWrong && (
          <div
            data-testid={`${testidPrefix}-feedback-wrong`}
            className="mt-4 flex items-start gap-3 p-3 rounded-2xl bg-orange-50 border-2 border-orange-300"
          >
            <Star size={20} strokeWidth={3} className="text-orange-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-extrabold text-orange-900 text-sm">Almost! The right answer is 56.</p>
              <p className="text-xs text-orange-800">Let's learn together — 7 × 8 is the same as 7 + 7 eight times.</p>
            </div>
          </div>
        )}

        {/* CTA row */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
            {selected === null ? philosophy.ctaLabel : "Ready?"}
          </span>
          <button
            type="button"
            data-testid={`${testidPrefix}-modal-cta`}
            className={`${philosophy.accentBg} ${philosophy.accentText} ml-auto inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-extrabold border-2 border-white shadow-md min-h-[52px] ${selected === null ? "opacity-90" : ""}`}
          >
            {selected === null ? <Wand2 size={18} strokeWidth={3} /> : <Sparkles size={18} strokeWidth={3} />}
            {selected === null ? philosophy.ctaLabel : philosophy.ctaAfterAnswer}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// State stage builder — one StageFrame per (philosophy, state)
// ---------------------------------------------------------------------------

const STATES: { id: StateId; label: string; subtitle: string; battleLog: string }[] = [
  { id: "default", label: "1. Default action selection", subtitle: "Idle creatures, action bar visible, no modal", battleLog: "Embercub is ready!" },
  { id: "modal",   label: "2. Question modal open",     subtitle: "Attack pressed — modal layers over the dimmed arena", battleLog: "Cast a spell to attack!" },
  { id: "correct", label: "3. Correct answer",          subtitle: "Celebratory state with spell-charge cue + explanation", battleLog: "Spell charged!" },
  { id: "wrong",   label: "4. Wrong answer",            subtitle: "Kind 'try again' state — reveal correct answer + explanation", battleLog: "Almost! Let's learn together." },
  { id: "locked",  label: "5. Quiz locked",             subtitle: "Action bar shows Quiz greyed out + 'Soon' chip", battleLog: "Embercub is ready!" },
];

const Stage: React.FC<{ philosophy: PhilosophyTheme; state: StateId }> = ({ philosophy, state }) => {
  const testidPrefix = `philosophy-${philosophy.id}-state-${state}`;
  const showModal = state === "modal" || state === "correct" || state === "wrong";
  const modalState: ModalState = state === "correct" ? "correct" : state === "wrong" ? "wrong" : "default";
  const stateMeta = STATES.find((s) => s.id === state)!;

  return (
    <StageFrame testid={testidPrefix}>
      <BattleLog text={stateMeta.battleLog} />
      <HpCard side="player" name="Embercub" lvl={5} hp={56} max={80} avatarBg="bg-orange-500" testid={`${testidPrefix}-hp-player`} />
      <HpCard side="enemy"  name="Bubblefin" lvl={6} hp={64} max={80} avatarBg="bg-cyan-500"   testid={`${testidPrefix}-hp-enemy`} />
      <ActionBar
        philosophyId={philosophy.id}
        attackEmphasis={state === "default" || state === "locked"}
        quizLocked={true}
        testidPrefix={testidPrefix}
      />
      {showModal && <QuestionModal philosophy={philosophy} state={modalState} testidPrefix={testidPrefix} />}
    </StageFrame>
  );
};

// ---------------------------------------------------------------------------
// Page-level layout
// ---------------------------------------------------------------------------

const Annotation: React.FC<{ label: string; lines: { k: string; v: string }[] }> = ({ label, lines }) => (
  <div className="bg-white/95 border-2 border-slate-200 rounded-2xl p-3 text-xs text-slate-700 shadow-sm">
    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">{label}</p>
    <ul className="space-y-1">
      {lines.map((l) => (
        <li key={l.k}><span className="font-extrabold text-slate-900">{l.k}:</span> {l.v}</li>
      ))}
    </ul>
  </div>
);

const PhilosophySection: React.FC<{ p: PhilosophyTheme; recommended?: boolean }> = ({ p, recommended }) => (
  <section data-testid={`philosophy-${p.id}-section`} className="mt-12 first:mt-0">
    <header className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <p className="text-[11px] font-extrabold tracking-widest text-purple-600 uppercase">Philosophy</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{p.name}</h2>
        <p className="text-sm text-slate-600 mt-1 max-w-prose">{p.tagline}</p>
      </div>
      <div className="flex items-center gap-2">
        {recommended && (
          <span className="inline-flex items-center gap-1 bg-amber-300 text-amber-950 text-[10px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-full border-2 border-white shadow">
            <Trophy size={12} strokeWidth={3} /> Designer's pick
          </span>
        )}
        <span className="inline-flex items-center gap-1 bg-slate-900 text-amber-200 text-[10px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-full">
          Accent · {p.signatureAccent}
        </span>
      </div>
    </header>

    <Annotation
      label="UI notes for this philosophy"
      lines={[
        { k: "Spacing",   v: p.spacing },
        { k: "Hierarchy", v: p.hierarchy },
        { k: "Placement", v: p.placement },
      ]}
    />

    <div className="mt-6 grid gap-8">
      {STATES.map((s) => (
        <div key={s.id} data-testid={`philosophy-${p.id}-${s.id}-block`} className="grid lg:grid-cols-[1fr_280px] gap-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase mb-2">{s.label}</p>
            <Stage philosophy={p} state={s.id} />
            <p className="text-xs text-slate-600 mt-2">{s.subtitle}</p>
          </div>
          <Annotation
            label={`Why this works · ${s.label.split(".")[1]?.trim() ?? s.label}`}
            lines={stateAnnotations(p.id, s.id)}
          />
        </div>
      ))}
    </div>
  </section>
);

// Per-(philosophy, state) annotation strings — kept inline for compactness.
function stateAnnotations(p: PhilosophyId, s: StateId): { k: string; v: string }[] {
  const cores: Record<PhilosophyId, Record<StateId, { k: string; v: string }[]>> = {
    pokemon: {
      default: [
        { k: "Focal point", v: "Glowing emerald Attack button (1.02× scale) — kids know exactly what to press first." },
        { k: "HP cards",     v: "Solid white, heavy borders — game-y, instantly readable from across the room." },
        { k: "Motion",       v: "Minimal — idle creature animation only. Snappy clicks." },
      ],
      modal: [
        { k: "Dim layer",    v: "bg-slate-900/40 — visible arena, no blur. Reads 'overlay', not 'page'." },
        { k: "Tap targets",  v: "All four answers ≥ 56px. 2×2 grid keeps thumb reach on tablet." },
        { k: "TTS",          v: "Blue speaker icons stand out against the white panel — non-readers find them fast." },
      ],
      correct: [
        { k: "Reward cue",   v: "Selected answer + green ring + ✓ icon. CTA flips to 'Continue' to keep tempo high." },
        { k: "Explanation",  v: "Single emerald row — short enough that re-engagement is sub-second." },
      ],
      wrong: [
        { k: "Tone",         v: "Orange (not red) + Star icon ('Almost!') — never punitive." },
        { k: "Reveal",       v: "Correct answer gets its own soft green ring so the right number is unambiguous." },
      ],
      locked: [
        { k: "Lock chip",    v: "'Soon' chip sits above the Quiz icon, grayscale on the rest signals 'not now, but soon!'" },
      ],
    },
    hearthstone: {
      default: [
        { k: "Focal point", v: "Fuchsia→indigo gradient Attack with amber ring screams 'cast me'. Other actions recede." },
        { k: "Atmosphere",   v: "Same 3D scene but the action bar lives on a frosted plate — premium without obscuring play." },
        { k: "Motion",       v: "Idle pets + gentle ring pulse on Attack would be the only ambient motion." },
      ],
      modal: [
        { k: "Dim layer",    v: "bg-slate-900/60 + backdrop-blur-md — the card unfurls and pulls focus, intentionally ceremonial." },
        { k: "Card frame",   v: "Amber-vellum body + double border = 'this matters'. Children read it as a treasured object." },
        { k: "CTA",          v: "Two-step confirm: select → 'Cast Spell'. Adds gravity without slowing K-7 players noticeably." },
      ],
      correct: [
        { k: "Reward cue",   v: "Selected answer glows emerald inside the vellum card. CTA becomes 'Unleash Attack'." },
        { k: "Sparkles",     v: "A few framer-motion stars from the card's corners would sell the premium ritual." },
      ],
      wrong: [
        { k: "Tone",         v: "Soft orange swap on selected answer; correct answer shines emerald. No card shake." },
        { k: "Explanation",  v: "1 line is enough — the card itself already feels like a teaching moment." },
      ],
      locked: [
        { k: "Lock chip",    v: "Same 'Soon' chip — but a thin amber pulse can hint future unlocks without nagging." },
      ],
    },
    dreamlight: {
      default: [
        { k: "Focal point", v: "Butter-yellow Attack — warm, never aggressive. Hierarchy by color, not size." },
        { k: "Glassmorphism", v: "Translucent white plate keeps Embercub and Bubblefin visible at all times." },
        { k: "Motion",       v: "Slow 2s breathing on the action plate; idle bobs on pets. Calm, cozy." },
      ],
      modal: [
        { k: "Dim layer",    v: "bg-purple-900/20 + light blur — the arena STAYS visible. Question feels like a chat bubble, not an interrupt." },
        { k: "Card body",    v: "bg-white/80 + 28-32px corners + amber ring — closer to a 'friendship letter' than a quiz." },
        { k: "Read-aloud",   v: "Big blue button up front — TTS is treated as a first-class control for early readers." },
      ],
      correct: [
        { k: "Reward cue",   v: "Soft sparkle row + green ring; CTA softens to 'Cast attack!' — kid stays in flow." },
        { k: "Encouragement", v: "Always-affirming copy: 'Spell charged!' before showing the math." },
      ],
      wrong: [
        { k: "Tone",         v: "Star icon (not X) + warm orange. Copy frames it as a shared journey: 'Let's learn together.'" },
        { k: "Reveal",       v: "Correct answer gently glows; the kid keeps agency to read both before continuing." },
      ],
      locked: [
        { k: "Lock chip",    v: "Same 'Soon' chip with a friendly lock — Dreamlight's whole language is 'unlocking new friends'." },
      ],
    },
  };
  return cores[p][s];
}

const Battle3dDesign: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 via-blue-50 to-amber-50">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b-2 border-purple-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center gap-3">
          <Link to="/adventure" data-testid="design-back-link" className="inline-flex items-center gap-1 text-xs font-extrabold text-purple-700 hover:text-purple-900">
            <ArrowLeft size={14} strokeWidth={3} /> Adventure
          </Link>
          <div className="hidden sm:flex items-center gap-2 ml-auto text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
            <Wand2 size={12} strokeWidth={3} className="text-purple-600" />
            Design exploration · TEA-Battle3D
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <section className="bg-white border-4 border-purple-200 rounded-3xl p-6 sm:p-8 shadow-xl">
          <p className="text-[11px] font-extrabold tracking-widest text-purple-600 uppercase">Edu-Mates · Battle3D UI</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mt-1 leading-tight">
            Three philosophies, five states each.
          </h1>
          <p className="text-base sm:text-lg text-slate-700 mt-3 max-w-prose">
            The learning challenge should feel like <em>casting a spell</em>, not taking a test. Each mockup keeps the 3D arena visible behind the UI and treats the question as the mechanic that empowers an attack.
          </p>

          <div data-testid="designers-pick" className="mt-6 inline-flex flex-wrap items-start gap-3 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 max-w-3xl">
            <Trophy size={22} strokeWidth={3} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold tracking-widest text-amber-700 uppercase">Designer's pick · Why</p>
              <p className="font-extrabold text-slate-900 text-lg">Option 3 — Dreamlight Valley (Cozy &amp; Whimsical)</p>
              <p className="text-sm text-slate-700 mt-1">
                Its soft glassmorphism and encouraging feedback loops mitigate test-anxiety for elementary students while keeping the 3D world feeling alive behind the question — closest to "casting a spell, not taking a test."
              </p>
            </div>
          </div>
        </section>

        {/* Three philosophy sections */}
        {PHILOSOPHIES.map((p) => (
          <PhilosophySection key={p.id} p={p} recommended={p.id === "dreamlight"} />
        ))}

        {/* Comparison table */}
        <section data-testid="comparison-table" className="mt-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Side-by-side trade-offs</h2>
          <p className="text-sm text-slate-600 mt-1 mb-4">A quick at-a-glance ranking on the four dimensions that matter most for a K-7 learning RPG.</p>
          <div className="overflow-x-auto rounded-2xl border-2 border-purple-200 bg-white shadow-md">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 text-purple-900">
                <tr>
                  <th className="text-left p-3 font-extrabold uppercase text-[11px] tracking-widest">Dimension</th>
                  <th className="p-3 font-extrabold uppercase text-[11px] tracking-widest">Pokémon</th>
                  <th className="p-3 font-extrabold uppercase text-[11px] tracking-widest">Hearthstone</th>
                  <th className="p-3 font-extrabold uppercase text-[11px] tracking-widest">Dreamlight</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {[
                  { dim: "Motion budget",           pok: "Low",      hs: "High",     dl: "Medium" },
                  { dim: "Kid-friendliness (6-10)", pok: "Good",     hs: "Good",     dl: "Excellent" },
                  { dim: "Screen real-estate cost", pok: "Low",      hs: "High",     dl: "Medium" },
                  { dim: "Accessibility ceiling",   pok: "AA easy",  hs: "AA tricky",dl: "AA easy" },
                  { dim: "Implementation effort",   pok: "S",        hs: "L",        dl: "M" },
                ].map((row) => (
                  <tr key={row.dim} className="border-t border-purple-100">
                    <td className="p-3 font-extrabold">{row.dim}</td>
                    <td className="p-3 text-center">{row.pok}</td>
                    <td className="p-3 text-center">{row.hs}</td>
                    <td className="p-3 text-center bg-amber-50/60 font-extrabold">{row.dl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Dreamlight column is highlighted as the designer's pick. We can promote any of the three into the working <code className="bg-purple-50 px-1.5 py-0.5 rounded text-purple-900 font-bold">/battle3d</code> route once you decide — the 3D scene from your local <code className="bg-purple-50 px-1.5 py-0.5 rounded text-purple-900 font-bold">battle3d</code> file just needs to land here first.
          </p>
        </section>

        <footer className="mt-12 mb-8 text-xs text-slate-500 text-center">
          Backdrop is a static image of the existing 3D arena · No production code touched · Route: <code>/design/battle3d</code>
        </footer>
      </main>
    </div>
  );
};

export default Battle3dDesign;
