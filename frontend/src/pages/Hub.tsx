import React from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { useGame } from "../lib/gameStore";
import { COMPANIONS } from "../lib/mockData";
import { CompanionAvatar } from "../components/CompanionAvatar";
import { ProgressBar } from "../components/ProgressBar";
import { Swords, Egg as EggIcon, GraduationCap, Library, ShieldCheck, MapPin } from "lucide-react";

const MAP_BG = "https://static.prod-images.emergentagent.com/jobs/2eddbcc9-3d07-49c8-985b-00a190300e36/images/2ddd9941ab063781678a9c083121e56dd7cec531512b14fdf37b8d70c7da25e5.png";

const Hub: React.FC = () => {
  const player = useGame((s) => s.player)!;
  const eggs = useGame((s) => s.eggs);
  const active = COMPANIONS.find((c) => c.id === player.activeCompanionId) ?? COMPANIONS[0];

  return (
    <div className="min-h-screen pb-12">
      <TopBar />
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Map */}
        <section
          className="relative rounded-card overflow-hidden border-4 border-white shadow-xl shadow-indigo-900/10"
          style={{ minHeight: 380 }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${MAP_BG})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/30" />
          <div className="relative z-10 p-6 md:p-8 flex flex-col h-full" style={{ minHeight: 380 }}>
            <div className="flex items-center gap-3 self-start chip bg-white/95 border-primary/30">
              <MapPin size={16} strokeWidth={3} className="text-primary" /> Meadowfall Grove
            </div>

            <div className="flex-1 relative">
              <MapTile
                to="/battle"
                icon={<Swords strokeWidth={3} />}
                label="Adventure"
                hint="Battle critters"
                color="bg-primary"
                shadow="shadow-btn-primary"
                style={{ top: "28%", left: "10%" }}
                testid="hub-tile-battle"
              />
              <MapTile
                to="/egg"
                icon={<EggIcon strokeWidth={3} />}
                label="Hatchery"
                hint={eggs.some((e) => !e.hatched) ? "Eggs warming…" : "All hatched!"}
                color="bg-gold"
                shadow="shadow-btn-gold"
                textBlack
                style={{ top: "12%", right: "16%" }}
                testid="hub-tile-egg"
              />
              <MapTile
                to="/academy"
                icon={<GraduationCap strokeWidth={3} />}
                label="Learning Academy"
                hint="Train pals"
                color="bg-sage"
                shadow="shadow-btn-sage"
                style={{ bottom: "8%", left: "26%" }}
                testid="hub-tile-academy"
              />
              <MapTile
                to="/collection"
                icon={<Library strokeWidth={3} />}
                label="Collection"
                hint={`${player.ownedCompanionIds.length} owned`}
                color="bg-[#FF9F68]"
                shadow="shadow-[0_6px_0_#C76A35]"
                style={{ bottom: "14%", right: "10%" }}
                testid="hub-tile-collection"
              />
            </div>
          </div>
        </section>

        {/* Lower row */}
        <section className="grid md:grid-cols-3 gap-5">
          <div className="card-base p-6">
            <p className="text-sm font-extrabold uppercase tracking-wider text-ink-muted mb-3">Active Companion</p>
            <div className="flex items-center gap-4">
              <CompanionAvatar companion={active} size={96} animate />
              <div className="min-w-0">
                <p className="h-display text-2xl truncate">{active.name}</p>
                <p className={"text-sm font-extrabold uppercase " + active.palette.accent}>
                  {active.affinity}
                </p>
                <p className="text-ink-muted text-sm mt-1">{active.tagline}</p>
              </div>
            </div>
          </div>

          <div className="card-base p-6">
            <p className="text-sm font-extrabold uppercase tracking-wider text-ink-muted mb-3">Hero Progress</p>
            <p className="h-display text-2xl mb-2">Level {player.level}</p>
            <ProgressBar value={player.xp} max={player.xpToNext} color="primary" showLabel label="XP" testid="hub-xp-bar" />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Mini label="Coins" value={String(player.coins)} />
              <Mini label="Owned" value={`${player.ownedCompanionIds.length}`} />
            </div>
          </div>

          <div className="card-base p-6">
            <p className="text-sm font-extrabold uppercase tracking-wider text-ink-muted mb-3">Eggs</p>
            <div className="space-y-3">
              {eggs.map((e) => (
                <div key={e.id}>
                  <div className="flex justify-between text-sm font-bold">
                    <span>{e.name}</span>
                    <span>{e.hatched ? "Hatched 🎉" : `${Math.round(e.progress)}%`}</span>
                  </div>
                  <ProgressBar value={e.progress} max={100} color="egg" testid={`hub-egg-${e.id}`} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 px-2">
          <Link
            data-testid="hub-parent-btn"
            to="/parent"
            className="btn-ghost !text-base"
          >
            <ShieldCheck size={18} strokeWidth={3} /> Parent Dashboard
          </Link>
          <p className="text-xs font-bold text-ink-muted">More realms coming soon ✨</p>
        </div>
      </main>
    </div>
  );
};

const MapTile: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  color: string;
  shadow: string;
  textBlack?: boolean;
  style?: React.CSSProperties;
  testid: string;
}> = ({ to, icon, label, hint, color, shadow, textBlack, style, testid }) => (
  <Link
    data-testid={testid}
    to={to}
    className={`absolute group flex flex-col items-center`}
    style={style}
  >
    <div
      className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl ${color} ${shadow} ${
        textBlack ? "text-ink" : "text-white"
      } grid place-items-center animate-bounceSoft group-hover:brightness-110 group-active:translate-y-1 transition`}
    >
      <span className="scale-125 md:scale-150">{icon}</span>
    </div>
    <div className="mt-2 chip bg-white/95 border-white text-center">
      <span className="h-bouncy">{label}</span>
    </div>
    <span className="text-[10px] md:text-xs font-extrabold uppercase tracking-wider text-ink-muted mt-1 drop-shadow-sm bg-white/70 px-2 py-0.5 rounded-full">
      {hint}
    </span>
  </Link>
);

const Mini: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-bg p-3 text-center border-2 border-white">
    <p className="text-xs font-extrabold uppercase text-ink-muted">{label}</p>
    <p className="h-display text-2xl">{value}</p>
  </div>
);

export default Hub;
