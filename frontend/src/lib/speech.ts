// Read-aloud helper using the browser's SpeechSynthesis API.
// Frontend-only, no API keys, no network.
// TODO(backend): swap to an OpenAI TTS endpoint once the backend exists for warmer voices.

let preferredVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (preferredVoice) return preferredVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Try to pick a warm, friendly english voice. Prefer female/child-like names.
  const order = [
    /samantha/i,
    /google.*us.*english/i,
    /microsoft.*aria/i,
    /microsoft.*jenny/i,
    /female/i,
    /en-?us/i,
    /english/i,
  ];
  for (const rx of order) {
    const v = voices.find((x) => rx.test(x.name) || rx.test(x.lang));
    if (v) {
      preferredVoice = v;
      return v;
    }
  }
  preferredVoice = voices[0];
  return preferredVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  // Voice list loads async on some browsers.
  window.speechSynthesis.onvoiceschanged = () => {
    preferredVoice = null;
    pickVoice();
  };
}

export function isTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string): void {
  if (!isTTSAvailable()) return;
  // Cancel anything currently speaking to avoid overlap.
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(prepareForSpeech(text));
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = 0.95;
  u.pitch = 1.15;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
}

// Make math prompts read more naturally.
function prepareForSpeech(text: string): string {
  return text
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/−/g, " minus ")
    .replace(/-/g, " minus ")
    .replace(/\+/g, " plus ")
    .replace(/=\s*\?/g, " equals what")
    .replace(/=/g, " equals ")
    .replace(/\?/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}
