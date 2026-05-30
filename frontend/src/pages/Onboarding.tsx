import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { TopBar } from "../components/TopBar";
import { useGame } from "../lib/gameStore";
import type { Grade } from "../lib/types";

const GRADES: { id: Grade; label: string; emoji: string; desc: string }[] = [
  { id: "K", label: "Kindergarten", emoji: "🌟", desc: "Counting, shapes, tiny sums." },
  { id: "1", label: "Grade 1",      emoji: "🌿", desc: "Add and subtract within 20." },
  { id: "2", label: "Grade 2",      emoji: "🌸", desc: "Two-digit math and place value." },
  { id: "3", label: "Grade 3",      emoji: "🍀", desc: "Times tables and big sums." },
  { id: "4", label: "Grade 4",      emoji: "🌻", desc: "Multi-digit + first fractions." },
  { id: "5", label: "Grade 5",      emoji: "🌷", desc: "Decimals and fraction work." },
  { id: "6", label: "Grade 6",      emoji: "🍁", desc: "Ratios, percents, negatives." },
  { id: "7", label: "Grade 7",      emoji: "🪴", desc: "Pre-algebra and equations." },
];

const Onboarding: React.FC = () => {
  const nav = useNavigate();
  const setGrade = useGame((s) => s.setGrade);
  const player = useGame((s) => s.player);
  const [selected, setSelected] = useState<Grade>(player?.grade ?? "K");

  const handleNext = () => {
    setGrade(selected);
    nav("/character");
  };

  return (
    <div className="min-h-screen">
      <TopBar back="/" title="Welcome, scholar!" />
      <main className="max-w-4xl mx-auto px-4 md:px-8 py-10">
        <div className="text-center mb-8">
          <p className="text-sm font-extrabold uppercase tracking-widest text-primary">Step 1 of 3</p>
          <h1 className="h-display text-4xl md:text-5xl mt-1">What grade are you in?</h1>
          <p className="text-ink-muted mt-2">We’ll match math just right for you.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {GRADES.map((g) => {
            const active = selected === g.id;
            return (
              <button
                key={g.id}
                data-testid={`grade-card-${g.id}`}
                onClick={() => setSelected(g.id)}
                className={`text-left ${active ? "ring-4 ring-primary" : ""}`}
              >
                <Card hover className={active ? "border-primary" : ""}>
                  <div className="text-6xl mb-3" aria-hidden>{g.emoji}</div>
                  <p className="h-display text-2xl">{g.label}</p>
                  <p className="text-ink-muted mt-1">{g.desc}</p>
                  <div className="mt-4">
                    <span className={`chip ${active ? "bg-primary text-white border-primary" : ""}`}>
                      {active ? "Selected ✓" : "Tap to choose"}
                    </span>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <button data-testid="onboarding-next-btn" onClick={handleNext} className="btn-primary !px-12 !text-2xl">
            Next ✨
          </button>
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
