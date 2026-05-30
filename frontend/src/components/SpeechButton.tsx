import React, { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isTTSAvailable, speak, stopSpeaking } from "../lib/speech";
import { cn } from "../lib/cn";

interface Props {
  text: string;
  className?: string;
  testid?: string;
}

export const SpeechButton: React.FC<Props> = ({ text, className, testid }) => {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(isTTSAvailable());
  }, []);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  if (!supported) return null;

  const handleClick = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(text);
    // SpeechSynthesisUtterance has onend, but quick path: poll for done.
    const poll = setInterval(() => {
      if (typeof window === "undefined") return;
      if (!window.speechSynthesis.speaking) {
        setSpeaking(false);
        clearInterval(poll);
      }
    }, 250);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={testid ?? "speech-btn"}
      aria-label={speaking ? "Stop reading question" : "Read question aloud"}
      title={speaking ? "Stop" : "Read aloud"}
      className={cn(
        "inline-flex items-center justify-center w-12 h-12 rounded-full border-4 transition-transform select-none",
        "shadow-btn-primary active:translate-y-[6px] active:shadow-none",
        speaking
          ? "bg-primary text-white border-primary animate-pulseGlow"
          : "bg-white text-primary border-primary hover:bg-primary/10",
        className
      )}
    >
      {speaking ? <VolumeX size={22} strokeWidth={3} /> : <Volume2 size={22} strokeWidth={3} />}
    </button>
  );
};
