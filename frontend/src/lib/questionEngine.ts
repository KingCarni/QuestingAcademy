// Procedural question generator for Questing Academy.
// Pure frontend, deterministic-ish (Math.random based) — generates infinite content
// from a small set of templates across math + reading subjects, K-7.
//
// Design goals:
//   * Same Question interface as static questions (drop-in replacement)
//   * Each template carries metadata for the admin dashboard
//   * Difficulty hook scales number ranges/word difficulty based on running accuracy

import type { Grade, Question } from "./types";

export type Subject = "math" | "reading";

export interface Template {
  id: string;
  subject: Subject;
  topic: string;          // free-form: addition, multiplication, rhyming, vocab, ...
  grades: Grade[];
  label: string;          // pretty name for admin UI
  example: string;        // a sample prompt for admin preview
  generate(difficulty: number): Omit<Question, "id">;
}

// --- helpers -----------------------------------------------------------------
const rnd = (n: number) => Math.floor(Math.random() * n);
const rndRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rnd(arr.length)];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function withChoices(correct: string, distractors: string[]): { choices: string[]; answerIndex: number } {
  const pool = [correct, ...distractors];
  const unique: string[] = [];
  for (const v of pool) if (!unique.includes(v)) unique.push(v);
  // pad with safe fallbacks if needed
  let pad = 0;
  while (unique.length < 4) {
    pad++;
    const f = String(pad * 7);
    if (!unique.includes(f)) unique.push(f);
  }
  const choices = shuffle(unique.slice(0, 4));
  return { choices, answerIndex: choices.indexOf(correct) };
}

function numericDistractors(answer: number, range = 4, count = 3): string[] {
  const set = new Set<number>();
  let guard = 0;
  while (set.size < count && guard < 40) {
    guard++;
    const delta = rndRange(-range, range);
    if (delta === 0) continue;
    const v = answer + delta;
    if (v < 0) continue;
    if (v === answer) continue;
    set.add(v);
  }
  // fallback fill if we got fewer
  let bump = 1;
  while (set.size < count) {
    const v = answer + bump;
    if (v !== answer) set.add(v);
    bump++;
  }
  return Array.from(set).slice(0, count).map(String);
}

// difficulty in [0,1] — raise upper bound by this fraction
function scale(min: number, max: number, difficulty: number) {
  const span = max - min;
  const upper = Math.round(min + span * Math.min(1, Math.max(0.4, 0.5 + difficulty * 0.6)));
  return { min, max: upper };
}

// --- MATH templates ----------------------------------------------------------
const ADD_BASIC: Template = {
  id: "math.add.basic",
  subject: "math",
  topic: "addition",
  grades: ["K", "1", "2"],
  label: "Addition (basic)",
  example: "3 + 4 = ?",
  generate(d) {
    const { min, max } = scale(1, 10, d);
    const a = rndRange(min, max), b = rndRange(min, max);
    const ans = a + b;
    const { choices, answerIndex } = withChoices(String(ans), numericDistractors(ans));
    return { grade: "1", subject: "math", topic: "addition", prompt: `${a} + ${b} = ?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const ADD_MID: Template = {
  id: "math.add.mid",
  subject: "math",
  topic: "addition",
  grades: ["2", "3", "4"],
  label: "Addition (2-3 digit)",
  example: "47 + 18 = ?",
  generate(d) {
    const { min, max } = scale(10, 99, d);
    const a = rndRange(min, max), b = rndRange(min, max);
    const ans = a + b;
    const { choices, answerIndex } = withChoices(String(ans), numericDistractors(ans, 8));
    return { grade: "3", subject: "math", topic: "addition", prompt: `${a} + ${b} = ?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const SUB_BASIC: Template = {
  id: "math.sub.basic",
  subject: "math",
  topic: "subtraction",
  grades: ["K", "1", "2"],
  label: "Subtraction (basic)",
  example: "8 − 3 = ?",
  generate(d) {
    const { max } = scale(5, 20, d);
    const a = rndRange(3, max);
    const b = rndRange(1, a);
    const ans = a - b;
    const { choices, answerIndex } = withChoices(String(ans), numericDistractors(ans));
    return { grade: "1", subject: "math", topic: "subtraction", prompt: `${a} − ${b} = ?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const MULT_BASIC: Template = {
  id: "math.mult.basic",
  subject: "math",
  topic: "multiplication",
  grades: ["3", "4"],
  label: "Multiplication (times tables)",
  example: "6 × 7 = ?",
  generate(d) {
    const { max } = scale(2, 9, d);
    const a = rndRange(2, max), b = rndRange(2, max);
    const ans = a * b;
    const { choices, answerIndex } = withChoices(String(ans), numericDistractors(ans, 6));
    return { grade: "3", subject: "math", topic: "multiplication", prompt: `${a} × ${b} = ?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const MULT_MID: Template = {
  id: "math.mult.mid",
  subject: "math",
  topic: "multiplication",
  grades: ["4", "5"],
  label: "Multiplication (larger)",
  example: "12 × 8 = ?",
  generate(d) {
    const { max } = scale(6, 14, d);
    const a = rndRange(6, max), b = rndRange(2, 12);
    const ans = a * b;
    const { choices, answerIndex } = withChoices(String(ans), numericDistractors(ans, 10));
    return { grade: "4", subject: "math", topic: "multiplication", prompt: `${a} × ${b} = ?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const DIV_BASIC: Template = {
  id: "math.div.basic",
  subject: "math",
  topic: "division",
  grades: ["3", "4", "5"],
  label: "Division (basic)",
  example: "24 ÷ 6 = ?",
  generate(d) {
    const { max } = scale(2, 10, d);
    const b = rndRange(2, max);
    const ans = rndRange(2, 12);
    const a = ans * b;
    const { choices, answerIndex } = withChoices(String(ans), numericDistractors(ans, 4));
    return { grade: "3", subject: "math", topic: "division", prompt: `${a} ÷ ${b} = ?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const COUNT_EMOJI: Template = {
  id: "math.count.emoji",
  subject: "math",
  topic: "counting",
  grades: ["K"],
  label: "Counting (emojis)",
  example: "Count the apples 🍎🍎🍎",
  generate(d) {
    const items = ["🍎", "⭐", "🌸", "🐝", "🍓", "🪀"];
    const item = pick(items);
    const n = rndRange(2, 5 + Math.round(d * 3));
    const { choices, answerIndex } = withChoices(String(n), numericDistractors(n, 2));
    return { grade: "K", subject: "math", topic: "counting", prompt: `How many? ${item.repeat(n)}`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const COMPARE: Template = {
  id: "math.compare",
  subject: "math",
  topic: "comparison",
  grades: ["K", "1", "2"],
  label: "Compare numbers",
  example: "Which is bigger?",
  generate(d) {
    const { max } = scale(5, 50, d);
    const nums = Array.from(new Set([rndRange(1, max), rndRange(1, max), rndRange(1, max), rndRange(1, max)]));
    while (nums.length < 4) nums.push(rndRange(1, max + 10));
    const biggest = Math.max(...nums);
    const choices = shuffle(nums.slice(0, 4).map(String));
    return { grade: "1", subject: "math", topic: "comparison", prompt: "Which is the biggest?", choices, answerIndex: choices.indexOf(String(biggest)), source: "template", templateId: this.id };
  },
};

const SHAPES: Template = {
  id: "math.shapes.sides",
  subject: "math",
  topic: "shapes",
  grades: ["K", "1", "2"],
  label: "Shape sides",
  example: "How many sides on a square?",
  generate() {
    const shapes = [
      { name: "triangle", sides: 3 },
      { name: "square", sides: 4 },
      { name: "pentagon", sides: 5 },
      { name: "hexagon", sides: 6 },
      { name: "octagon", sides: 8 },
    ];
    const s = pick(shapes);
    const { choices, answerIndex } = withChoices(String(s.sides), numericDistractors(s.sides, 2));
    return { grade: "1", subject: "math", topic: "shapes", prompt: `How many sides does a ${s.name} have?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const FRAC_OF: Template = {
  id: "math.frac.of",
  subject: "math",
  topic: "fractions",
  grades: ["4", "5"],
  label: "Fraction of a number",
  example: "1/2 of 10 = ?",
  generate() {
    const fracs = [
      { txt: "1/2", num: 1, den: 2 },
      { txt: "1/3", num: 1, den: 3 },
      { txt: "1/4", num: 1, den: 4 },
      { txt: "2/3", num: 2, den: 3 },
      { txt: "3/4", num: 3, den: 4 },
    ];
    const f = pick(fracs);
    const whole = f.den * rndRange(2, 6);
    const ans = (whole * f.num) / f.den;
    const { choices, answerIndex } = withChoices(String(ans), numericDistractors(ans, 4));
    return { grade: "4", subject: "math", topic: "fractions", prompt: `${f.txt} of ${whole} = ?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const PERCENT_OF: Template = {
  id: "math.percent.of",
  subject: "math",
  topic: "percents",
  grades: ["6", "7"],
  label: "Percent of a number",
  example: "20% of 50 = ?",
  generate() {
    const pcts = [10, 20, 25, 50, 75];
    const p = pick(pcts);
    const base = pick([20, 40, 50, 60, 80, 100, 120, 200]);
    const ans = (base * p) / 100;
    const { choices, answerIndex } = withChoices(String(ans), numericDistractors(ans, 6));
    return { grade: "6", subject: "math", topic: "percents", prompt: `What is ${p}% of ${base}?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const ALGEBRA_LINEAR: Template = {
  id: "math.algebra.linear",
  subject: "math",
  topic: "algebra",
  grades: ["6", "7"],
  label: "Solve linear equation",
  example: "x + 4 = 11. x = ?",
  generate(d) {
    const { max } = scale(3, 15, d);
    const x = rndRange(2, max);
    const a = rndRange(1, max);
    const op = pick(["+", "-"]);
    const right = op === "+" ? x + a : x - a;
    const prompt = `Solve: x ${op} ${a} = ${right}.  x = ?`;
    const { choices, answerIndex } = withChoices(String(x), numericDistractors(x, 3));
    return { grade: "7", subject: "math", topic: "algebra", prompt, choices, answerIndex, source: "template", templateId: this.id };
  },
};

// --- READING templates -------------------------------------------------------
const RHYME_BANK = [
  { word: "cat", rhymes: ["hat", "bat", "mat", "rat"], others: ["dog", "tree", "ship", "log", "bear"] },
  { word: "sun", rhymes: ["fun", "run", "bun", "won"], others: ["cat", "dog", "tree", "moon"] },
  { word: "dog", rhymes: ["log", "frog", "jog", "fog"], others: ["cat", "sun", "tree", "ship"] },
  { word: "star", rhymes: ["car", "far", "jar", "bar"], others: ["moon", "sun", "tree", "dog"] },
  { word: "bake", rhymes: ["cake", "lake", "make", "rake"], others: ["dog", "fish", "tree"] },
  { word: "tree", rhymes: ["bee", "knee", "free", "see"], others: ["cat", "dog", "sun", "moon"] },
];

const RHYMING: Template = {
  id: "read.rhyming",
  subject: "reading",
  topic: "rhyming",
  grades: ["K", "1", "2"],
  label: "Rhyming words",
  example: "Which word rhymes with 'cat'?",
  generate() {
    const item = pick(RHYME_BANK);
    const correct = pick(item.rhymes);
    const distractors = shuffle(item.others).slice(0, 3);
    const { choices, answerIndex } = withChoices(correct, distractors);
    return { grade: "1", subject: "reading", topic: "rhyming", prompt: `Which word rhymes with "${item.word}"?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const LETTER_START_WORDS = [
  "apple", "banana", "cat", "dog", "elephant", "fish", "goat", "hat", "igloo",
  "jelly", "kite", "lion", "moon", "nest", "octopus", "pig", "queen", "rabbit",
  "sun", "turtle", "umbrella", "violin", "whale", "yarn", "zebra",
];

const LETTER_START: Template = {
  id: "read.letter.start",
  subject: "reading",
  topic: "letter-sounds",
  grades: ["K"],
  label: "Beginning letter",
  example: "Which letter does 'apple' start with?",
  generate() {
    const word = pick(LETTER_START_WORDS);
    const first = word[0].toUpperCase();
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const distractors = shuffle(alpha.replace(first, "").split("")).slice(0, 3);
    const { choices, answerIndex } = withChoices(first, distractors);
    return { grade: "K", subject: "reading", topic: "letter-sounds", prompt: `Which letter does "${word}" start with?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const SYN_BANK_EASY = [
  { word: "big",    syn: "large",   not: ["small", "tiny", "low", "thin"] },
  { word: "small",  syn: "tiny",    not: ["big", "tall", "wide"] },
  { word: "fast",   syn: "quick",   not: ["slow", "lazy", "sleepy"] },
  { word: "happy",  syn: "glad",    not: ["sad", "angry", "tired"] },
  { word: "begin",  syn: "start",   not: ["stop", "end", "finish"] },
  { word: "cold",   syn: "chilly",  not: ["warm", "hot", "sunny"] },
];

const SYN_BANK_HARD = [
  { word: "courageous", syn: "brave",     not: ["scared", "weak", "shy"] },
  { word: "ancient",    syn: "old",       not: ["new", "modern", "young"] },
  { word: "rapid",      syn: "fast",      not: ["slow", "still", "quiet"] },
  { word: "enormous",   syn: "huge",      not: ["small", "tiny", "thin"] },
  { word: "delighted",  syn: "happy",     not: ["angry", "tired", "bored"] },
  { word: "humble",     syn: "modest",    not: ["proud", "loud", "brash"] },
];

const VOCAB_SYN: Template = {
  id: "read.vocab.synonym",
  subject: "reading",
  topic: "vocabulary",
  grades: ["1", "2", "3", "4", "5", "6", "7"],
  label: "Synonym match",
  example: "Which word means the same as 'big'?",
  generate(d) {
    const bank = d > 0.55 ? SYN_BANK_HARD : SYN_BANK_EASY;
    const item = pick(bank);
    const distractors = shuffle(item.not).slice(0, 3);
    const { choices, answerIndex } = withChoices(item.syn, distractors);
    return { grade: "3", subject: "reading", topic: "vocabulary", prompt: `Which word means the same as "${item.word}"?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

const ANT_BANK = [
  { word: "hot",     ant: "cold",   not: ["warm", "sunny", "fire"] },
  { word: "happy",   ant: "sad",    not: ["glad", "joyful", "smile"] },
  { word: "fast",    ant: "slow",   not: ["quick", "rapid", "swift"] },
  { word: "begin",   ant: "end",    not: ["start", "open", "create"] },
  { word: "brave",   ant: "scared", not: ["bold", "strong", "tough"] },
  { word: "loud",    ant: "quiet",  not: ["noisy", "booming", "shout"] },
];

const VOCAB_ANT: Template = {
  id: "read.vocab.antonym",
  subject: "reading",
  topic: "vocabulary",
  grades: ["2", "3", "4", "5", "6", "7"],
  label: "Antonym match",
  example: "Which word means the opposite of 'hot'?",
  generate() {
    const item = pick(ANT_BANK);
    const distractors = shuffle(item.not).slice(0, 3);
    const { choices, answerIndex } = withChoices(item.ant, distractors);
    return { grade: "4", subject: "reading", topic: "vocabulary", prompt: `Which word means the opposite of "${item.word}"?`, choices, answerIndex, source: "template", templateId: this.id };
  },
};

// --- registry ---------------------------------------------------------------
export const ALL_TEMPLATES: Template[] = [
  ADD_BASIC, ADD_MID, SUB_BASIC, MULT_BASIC, MULT_MID, DIV_BASIC,
  COUNT_EMOJI, COMPARE, SHAPES, FRAC_OF, PERCENT_OF, ALGEBRA_LINEAR,
  LETTER_START, RHYMING, VOCAB_SYN, VOCAB_ANT,
];

export function templatesForGrade(
  grade: Grade,
  subjectMode: "math" | "reading" | "mixed",
  disabled: string[] = [],
  isApproved?: (templateId: string) => boolean,
): Template[] {
  return ALL_TEMPLATES.filter((t) => {
    if (disabled.includes(t.id)) return false;
    if (!t.grades.includes(grade)) return false;
    if (subjectMode === "math" && t.subject !== "math") return false;
    if (subjectMode === "reading" && t.subject !== "reading") return false;
    // Studio approval gate — if a checker is supplied, only let approved/published through.
    if (isApproved && !isApproved(t.id)) return false;
    return true;
  });
}

export function generateQuestion(
  grade: Grade,
  subjectMode: "math" | "reading" | "mixed",
  disabled: string[],
  accuracy: number,
  isApproved?: (templateId: string) => boolean,
): Question {
  const pool = templatesForGrade(grade, subjectMode, disabled, isApproved);
  if (pool.length === 0) {
    // Safe fallback so battles never crash if admin disabled everything.
    return {
      id: "fallback-" + Date.now() + "-" + rnd(99999),
      grade,
      subject: "math",
      topic: "addition",
      prompt: "1 + 1 = ?",
      choices: ["1", "2", "3", "4"],
      answerIndex: 1,
      source: "template",
      templateId: "fallback",
    };
  }
  const t = pick(pool);
  const partial = t.generate(accuracy);
  return {
    ...partial,
    grade, // ensure question grade matches player grade for reporting
    id: `gen-${t.id}-${Date.now()}-${rnd(99999)}`,
  };
}

export function templateById(id: string): Template | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}
