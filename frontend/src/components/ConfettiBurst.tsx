import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";

interface Props {
  active: boolean;
  durationMs?: number;
  numberOfPieces?: number;
  colors?: string[];
  onDone?: () => void;
}

// One-shot confetti overlay. Rendered above the page. Auto-stops after durationMs.
export const ConfettiBurst: React.FC<Props> = ({
  active,
  durationMs = 2600,
  numberOfPieces = 220,
  colors = ["#9D8DF1", "#F4C753", "#86A789", "#FF9F68", "#7BB7D6", "#D4A373"],
  onDone,
}) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!active) return;
    setRunning(true);
    const t = setTimeout(() => {
      setRunning(false);
      onDone?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [active, durationMs, onDone]);

  if (!running || !size.w) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[100]" aria-hidden>
      <Confitti w={size.w} h={size.h} pieces={numberOfPieces} colors={colors} />
    </div>
  );
};

// Wrapper to keep Confetti props typed locally
const Confitti: React.FC<{ w: number; h: number; pieces: number; colors: string[] }> = ({
  w,
  h,
  pieces,
  colors,
}) => (
  <Confetti
    width={w}
    height={h}
    numberOfPieces={pieces}
    recycle={false}
    gravity={0.18}
    colors={colors}
  />
);
