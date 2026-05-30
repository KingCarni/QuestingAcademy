// Read-aloud helper using the browser's SpeechSynthesis API.
// Frontend-only, no API keys, no network.
// TODO(backend): swap to an OpenAI TTS endpoint for warmer, consistent narration.
//
// Voice selection strategy (in priority order):
//   1. Strictly en-US, not en-GB / en-AU / en-IN.
//   2. Prefer modern "natural" / "neural" engines from each platform:
//        Google US English, Microsoft Aria/Jenny/Guy Online (Natural),
//        Apple Samantha / Alex (en-US).
//   3. Skip multilingual voices that often pronounce single English words with
//        residual accent (e.g., "Google UK English Female", "Daniel", "Karen").
//   4. Numbers/operators are normalized so they speak naturally without code-switching.

let preferredVoice: SpeechSynthesisVoice | null = null;

const POSITIVE_NAME_PATTERNS = [
  /google\s+us\s+english/i,
  /microsoft\s+aria/i,
  /microsoft\s+jenny/i,
  /microsoft\s+guy/i,
  /microsoft\s+sara/i,
  /samantha/i,
  /alex/i,
  /natural/i,
  /neural/i,
];

const NEGATIVE_NAME_PATTERNS = [
  /uk\s+english/i,
  /british/i,
  /australian/i,
  /indian/i,
  /irish/i,
  /scottish/i,
  /south\s+african/i,
  /daniel/i,
  /karen/i,
  /tessa/i,
  /moira/i,
  /rishi/i,
];

function scoreVoice(v: SpeechSynthesisVoice): number {
  let score = 0;
  // Strict en-US gets the biggest bump
  if (v.lang === "en-US" || v.lang === "en_US") score += 100;
  else if (v.lang?.toLowerCase().startsWith("en-us")) score += 80;
  else if (v.lang?.toLowerCase().startsWith("en")) score += 10;
  else score -= 50;

  if (POSITIVE_NAME_PATTERNS.some((rx) => rx.test(v.name))) score += 30;
  if (NEGATIVE_NAME_PATTERNS.some((rx) => rx.test(v.name))) score -= 60;

  // Prefer "default" voice if present (often the system's best)
  if (v.default) score += 5;
  // localService voices are usually clearer than network ones on offline devices
  if (v.localService) score += 2;

  return score;
}

function selectBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const ranked = voices
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"))
    .map((v) => ({ v, score: scoreVoice(v) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.v ?? voices[0];
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  // Voice list loads async on some browsers.
  window.speechSynthesis.onvoiceschanged = () => {
    preferredVoice = selectBestVoice();
  };
  // Try once immediately too
  preferredVoice = selectBestVoice();
}

export function isTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getActiveVoiceName(): string | null {
  return preferredVoice?.name ?? null;
}

export function speak(text: string): void {
  if (!isTTSAvailable()) return;
  // Cancel anything currently speaking to avoid overlap.
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(prepareForSpeech(text));
  const v = preferredVoice ?? selectBestVoice();
  if (v) {
    utterance.voice = v;
    // Pin lang to en-US so the engine picks the right pronunciation table
    utterance.lang = "en-US";
  } else {
    utterance.lang = "en-US";
  }
  // Warm narrator tone: slightly slower + neutral pitch (avoid squeaky)
  utterance.rate = 0.92;
  utterance.pitch = 1.05;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
}

// Make math + reading prompts read more naturally in English.
function prepareForSpeech(text: string): string {
  return text
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/−/g, " minus ")          // Unicode math minus only — leave normal hyphens alone
    .replace(/\+/g, " plus ")
    .replace(/\//g, " over ")          // 1/2 → "1 over 2"
    .replace(/=\s*\?/g, " equals what")
    .replace(/=/g, " equals ")
    .replace(/\?/g, "?")
    // strip emojis that some engines awkwardly read out as "smile face"
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
