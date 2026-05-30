import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, BookOpen, Heart, ShieldCheck } from "lucide-react";
import { useGame } from "../lib/gameStore";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/2eddbcc9-3d07-49c8-985b-00a190300e36/images/b8d8a10f02b8c9ad5d5472ae0c6b5354061fe57c832a06562939fbdcc2b60b6d.png";

const Landing: React.FC = () => {
  const player = useGame((s) => s.player);
  const resetAll = useGame((s) => s.resetAll);
  const hasStarter = !!player?.starterCompanionId;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background art with gentle overlay for readability */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_BG})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/40 to-bg" />
      <div className="absolute -top-12 -left-10 w-72 h-72 bg-primary/25 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -right-10 w-80 h-80 bg-gold/30 rounded-full blur-3xl" />

      {/* Top brand */}
      <header className="relative z-10 px-6 md:px-12 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary">
            <Sparkles strokeWidth={3} />
          </div>
          <div>
            <p className="h-display text-2xl leading-none">Questing Academy</p>
            <p className="text-xs font-bold text-ink-muted tracking-widest uppercase">Meadowfall Grove · Beta</p>
          </div>
        </div>
        <Link data-testid="landing-parent-link" to="/parent" className="btn-ghost !py-2 !px-4 !text-base">
          <ShieldCheck size={18} strokeWidth={3} /> Parent
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-12 md:pt-20 pb-16 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-5 gap-10 items-center">
          <div className="md:col-span-3">
            <div className="chip mb-5 bg-white/90 border-primary/30 text-primary">
              <Sparkles size={14} strokeWidth={3} /> Made for Grades K–7
            </div>
            <h1 className="h-display text-5xl md:text-7xl leading-[0.95]">
              Make math feel like a
              <span className="block text-primary">cozy little adventure.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-ink/80 max-w-xl">
              Hatch eggs, collect cuddly companions and battle gentle critters by answering
              math questions in a bright, kind little world.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                data-testid="landing-play-btn"
                to={hasStarter ? "/hub" : "/onboarding"}
                className="btn-primary !text-2xl !px-10 !py-5"
              >
                {hasStarter ? "Continue Quest" : "Play Now"}
              </Link>
              {hasStarter && (
                <button
                  data-testid="landing-reset-btn"
                  onClick={() => {
                    if (window.confirm("Start a brand new adventure? Current progress will be cleared.")) resetAll();
                  }}
                  className="btn-outline !text-lg"
                >
                  New Adventure
                </button>
              )}
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-xl">
              <Stat icon={<Heart size={20} strokeWidth={3} className="text-danger" />} label="Kind monsters only" />
              <Stat icon={<BookOpen size={20} strokeWidth={3} className="text-sage" />} label="Aligned with school" />
              <Stat icon={<ShieldCheck size={20} strokeWidth={3} className="text-primary" />} label="Parent-friendly" />
            </div>
          </div>

          <div className="md:col-span-2">
            <FloatingBadges />
          </div>
        </div>
      </section>

      {/* How it works ribbon */}
      <section className="relative z-10 px-6 md:px-12 pb-20">
        <div className="card-base max-w-6xl mx-auto p-6 md:p-10 grid md:grid-cols-4 gap-6">
          {[
            { e: "🧙", t: "1. Create your chibi", s: "Pick skin, hair, outfit and a magical hat." },
            { e: "🌱", t: "2. Choose a companion", s: "Spriggle, Embercub or Pebblin." },
            { e: "⚔️", t: "3. Battle with math", s: "Right answers do extra sparkle damage." },
            { e: "🥚", t: "4. Hatch & grow", s: "Train pals at the Math Academy." },
          ].map((s) => (
            <div key={s.t} className="text-center">
              <div className="text-5xl mb-2" aria-hidden>{s.e}</div>
              <p className="h-display text-lg">{s.t}</p>
              <p className="text-sm text-ink-muted mt-1">{s.s}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 text-center pb-8 text-xs font-bold text-ink-muted">
        Frontend MVP prototype · Mock data only · v0.1
      </footer>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/80 border-2 border-white">
    {icon}
    <span className="text-sm font-extrabold">{label}</span>
  </div>
);

const FloatingBadges: React.FC = () => (
  <div className="relative h-[360px]">
    <Bubble emoji="🌱" color="#86A789" className="top-2 left-4" delay="0s" />
    <Bubble emoji="🔥" color="#FF9F68" className="top-24 right-2" delay=".4s" />
    <Bubble emoji="🪨" color="#D4A373" className="bottom-12 left-12" delay=".8s" />
    <Bubble emoji="✨" color="#F4C753" className="top-40 left-1/2" delay="1.1s" />
    <Bubble emoji="🥚" color="#9D8DF1" className="bottom-2 right-8" delay=".6s" />
  </div>
);

const Bubble: React.FC<{ emoji: string; color: string; className: string; delay: string }> = ({
  emoji,
  color,
  className,
  delay,
}) => (
  <div
    className={"absolute w-24 h-24 rounded-full grid place-items-center text-4xl border-4 border-white animate-floaty " + className}
    style={{ background: color + "33", boxShadow: `0 14px 0 ${color}66`, animationDelay: delay }}
    aria-hidden
  >
    {emoji}
  </div>
);

export default Landing;
