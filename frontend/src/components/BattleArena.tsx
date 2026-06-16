import React from "react";

export type BattleCompanionAsset = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  imageUrl?: string;
  iconUrl?: string;
  affinity?: string;
  fallbackEmoji?: string;
};

export type BattleBackgroundAsset = {
  id: string;
  name: string;
  imageUrl?: string;
};

export type BattleSceneConfig = {
  id: string;
  background: BattleBackgroundAsset;
  player: BattleCompanionAsset;
  enemy: BattleCompanionAsset;
};

export const demoBattleSceneConfig: BattleSceneConfig = {
  id: "demo-winter-battle",
  background: {
    id: "winter-village",
    name: "Winter Village",
    imageUrl: "/assets/battle-backgrounds/winter-village.png",
  },
  player: {
    id: "embercub",
    name: "Embercub",
    affinity: "fire",
    hp: 80,
    maxHp: 80,
    imageUrl: "/assets/companions/embercub.png",
    fallbackEmoji: "🔥",
  },
  enemy: {
    id: "slumbug",
    name: "Slumbug",
    affinity: "nature",
    hp: 60,
    maxHp: 60,
    imageUrl: "/assets/companions/slumbug.png",
    fallbackEmoji: "🐛",
  },
};

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

const hpPercent = (hp: number, maxHp: number): number =>
  clampPercent(maxHp <= 0 ? 0 : (hp / maxHp) * 100);

const CompanionPortrait: React.FC<{ companion: BattleCompanionAsset; side: "player" | "enemy" }> = ({ companion, side }) => {
  const ringClass = side === "player" ? "border-[#FFA56F]" : "border-[#CFA56A]";

  return (
    <div className={`w-40 h-40 md:w-48 md:h-48 rounded-full bg-[#FFF3E8]/90 border-[10px] ${ringClass} shadow-xl grid place-items-center overflow-hidden`}>
      {companion.imageUrl ? (
        <img
          src={companion.imageUrl}
          alt={companion.name}
          className="w-[78%] h-[78%] object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="text-6xl" aria-hidden>{companion.fallbackEmoji || "🐾"}</span>
      )}
      {!companion.imageUrl && <span className="sr-only">{companion.name}</span>}
    </div>
  );
};

const HpBar: React.FC<{ companion: BattleCompanionAsset; side: "player" | "enemy" }> = ({ companion, side }) => {
  const percent = hpPercent(companion.hp, companion.maxHp);
  const fillClass = side === "player" ? "bg-[#98CFA8]" : "bg-[#FFAA73]";

  return (
    <div className="w-full">
      <div className="flex justify-between px-1 text-xs md:text-sm font-extrabold text-ink-muted">
        <span>HP</span>
        <span>{companion.hp}/{companion.maxHp}</span>
      </div>
      <div className="h-7 rounded-full bg-white/75 border-2 border-white shadow-inner overflow-hidden">
        <div className={`h-full ${fillClass} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const BattleSlot: React.FC<{ companion: BattleCompanionAsset; side: "player" | "enemy" }> = ({ companion, side }) => (
  <div className="flex flex-col items-center min-w-0">
    <CompanionPortrait companion={companion} side={side} />
    <h2 className="h-display text-2xl md:text-3xl mt-2 text-center drop-shadow-sm">{companion.name}</h2>
    <div className="w-full max-w-md mt-2">
      <HpBar companion={companion} side={side} />
    </div>
  </div>
);

export const BattleArena: React.FC<{ scene?: BattleSceneConfig }> = ({ scene = demoBattleSceneConfig }) => {
  const backgroundUrl = scene.background.imageUrl;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <section className="relative rounded-[2rem] border-4 border-white shadow-2xl overflow-hidden min-h-[340px] bg-gradient-to-br from-[#EAF7FF] to-[#FFF8DD]">
        {backgroundUrl && (
          <img
            src={backgroundUrl}
            alt={scene.background.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
        <div className="absolute inset-0 bg-white/45" />
        <div className="relative z-10 grid grid-cols-2 gap-6 md:gap-12 items-end px-8 py-8 md:px-20 md:py-10">
          <BattleSlot companion={scene.player} side="player" />
          <BattleSlot companion={scene.enemy} side="enemy" />
        </div>
      </section>

      <section className="rounded-[2rem] bg-white border-4 border-white shadow-xl p-6 md:p-8">
        <p className="text-xs md:text-sm font-extrabold uppercase tracking-widest text-ink-muted mb-4">Your move</p>
        <div className="grid md:grid-cols-3 gap-4">
          <button type="button" className="btn-primary !text-xl !py-4 justify-center">⚔ Attack</button>
          <button type="button" className="btn-primary !text-xl !py-4 justify-center !bg-sage">🛡 Defend</button>
          <button type="button" className="btn-primary !text-xl !py-4 justify-center !bg-[#F4C753] !text-ink">✣ Special</button>
        </div>
        <p className="text-sm font-bold text-ink-muted mt-4">Pick a move, then solve the question to power it up.</p>
      </section>
    </main>
  );
};

export default BattleArena;
