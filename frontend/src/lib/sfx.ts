// Gentle Web Audio API sounds — no asset files needed.
// All sounds are short, soft, and only fire after a user interaction.

let ctxRef: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctxRef) {
    const C = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctxRef = new C();
  }
  // Resume if suspended (autoplay policy)
  if (ctxRef.state === "suspended") void ctxRef.resume();
  return ctxRef;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", startAt = 0, gain = 0.18) {
  const ctx = getCtx();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = ctx.currentTime + startAt;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + duration + 0.05);
}

export const sfx = {
  // Soft "ding" — single warm sine
  ding(): void {
    tone(880, 0.28, "sine");
  },
  // Sparkle — quick ascending arpeggio
  sparkle(): void {
    tone(660, 0.18, "sine", 0.0);
    tone(880, 0.18, "sine", 0.08);
    tone(1175, 0.28, "sine", 0.16);
  },
  // Level-up — major triad bell
  levelUp(): void {
    tone(523.25, 0.32, "triangle", 0.0, 0.16); // C5
    tone(659.25, 0.32, "triangle", 0.08, 0.16); // E5
    tone(783.99, 0.42, "triangle", 0.16, 0.18); // G5
  },
  // Hatch — soft pop + sparkle
  hatch(): void {
    tone(220, 0.12, "sine", 0.0, 0.22);
    tone(523.25, 0.22, "triangle", 0.1, 0.15);
    tone(880, 0.28, "sine", 0.22, 0.14);
    tone(1175, 0.36, "sine", 0.34, 0.12);
  },
};
