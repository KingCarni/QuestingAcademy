import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { ChibiAvatar } from "../components/ChibiAvatar";
import { useGame } from "../lib/gameStore";
import { AVATAR_OPTIONS } from "../lib/mockData";
import type { AvatarConfig } from "../lib/types";
import { Shuffle } from "lucide-react";

const HAIR_LABEL: Record<string, string> = {
  tuft: "Tuft",
  braids: "Braids",
  bowl: "Bowl",
  puff: "Puff",
  spike: "Spike",
};
const ACC_LABEL: Record<string, string> = {
  none: "None",
  glasses: "Glasses",
  crown: "Crown",
  headband: "Headband",
  "wizard-hat": "Wizard Hat",
};

const defaultAvatar: AvatarConfig = {
  skin: AVATAR_OPTIONS.skin[1],
  hair: "tuft",
  hairColor: AVATAR_OPTIONS.hairColor[1],
  outfit: AVATAR_OPTIONS.outfit[0],
  accessory: "wizard-hat",
  name: "",
};

const CharacterCreator: React.FC = () => {
  const nav = useNavigate();
  const player = useGame((s) => s.player);
  const setAvatar = useGame((s) => s.setAvatar);
  const [a, setA] = useState<AvatarConfig>(player?.avatar.name ? player.avatar : defaultAvatar);

  const update = <K extends keyof AvatarConfig>(k: K, v: AvatarConfig[K]) =>
    setA((prev) => ({ ...prev, [k]: v }));

  const randomize = () => {
    const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
    setA((prev) => ({
      ...prev,
      skin: pick(AVATAR_OPTIONS.skin),
      hair: pick(AVATAR_OPTIONS.hair) as string,
      hairColor: pick(AVATAR_OPTIONS.hairColor),
      outfit: pick(AVATAR_OPTIONS.outfit),
      accessory: pick(AVATAR_OPTIONS.accessory) as string,
    }));
  };

  const onContinue = () => {
    if (!a.name.trim()) return;
    setAvatar({ ...a, name: a.name.trim() });
    nav("/starter");
  };

  return (
    <div className="min-h-screen">
      <TopBar back="/onboarding" title="Design your chibi" />
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="text-center mb-6">
          <p className="text-sm font-extrabold uppercase tracking-widest text-primary">Step 2 of 3</p>
          <h1 className="h-display text-4xl md:text-5xl mt-1">Make it cute, make it yours.</h1>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          <Card className="md:col-span-2 flex flex-col items-center text-center">
            <div className="rounded-card bg-[#FBF6EA] w-full grid place-items-center py-8 border-4 border-white">
              <ChibiAvatar config={a} size={220} animate />
            </div>
            <label className="block w-full mt-5">
              <span className="text-sm font-extrabold uppercase tracking-wider text-ink-muted">Your hero’s name</span>
              <input
                data-testid="avatar-name-input"
                value={a.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Mochi"
                maxLength={14}
                className="mt-2 w-full text-center text-2xl h-display border-4 border-primary/30 focus:border-primary outline-none rounded-full py-3 px-5 bg-white"
              />
            </label>
            <button data-testid="avatar-randomize-btn" onClick={randomize} className="btn-outline mt-4 !text-base !py-2 !px-5">
              <Shuffle size={18} strokeWidth={3} /> Surprise me
            </button>
          </Card>

          <Card className="md:col-span-3 space-y-6">
            <OptionRow label="Skin">
              {AVATAR_OPTIONS.skin.map((c, i) => (
                <Swatch key={c} color={c} active={a.skin === c} onClick={() => update("skin", c)} testid={`skin-${i}`} />
              ))}
            </OptionRow>

            <OptionRow label="Hair Style">
              {AVATAR_OPTIONS.hair.map((h) => (
                <Pill key={h} active={a.hair === h} onClick={() => update("hair", h)} testid={`hair-${h}`}>
                  {HAIR_LABEL[h]}
                </Pill>
              ))}
            </OptionRow>

            <OptionRow label="Hair Color">
              {AVATAR_OPTIONS.hairColor.map((c, i) => (
                <Swatch key={c} color={c} active={a.hairColor === c} onClick={() => update("hairColor", c)} testid={`haircolor-${i}`} />
              ))}
            </OptionRow>

            <OptionRow label="Outfit">
              {AVATAR_OPTIONS.outfit.map((c, i) => (
                <Swatch key={c} color={c} active={a.outfit === c} onClick={() => update("outfit", c)} testid={`outfit-${i}`} />
              ))}
            </OptionRow>

            <OptionRow label="Accessory">
              {AVATAR_OPTIONS.accessory.map((acc) => (
                <Pill key={acc} active={a.accessory === acc} onClick={() => update("accessory", acc)} testid={`acc-${acc}`}>
                  {ACC_LABEL[acc]}
                </Pill>
              ))}
            </OptionRow>
          </Card>
        </div>

        <div className="mt-10 flex justify-center">
          <button
            data-testid="character-continue-btn"
            onClick={onContinue}
            disabled={!a.name.trim()}
            className="btn-primary !px-12 !text-2xl"
          >
            Continue ✨
          </button>
        </div>
      </main>
    </div>
  );
};

const OptionRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-sm font-extrabold uppercase tracking-wider text-ink-muted mb-2">{label}</p>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

const Swatch: React.FC<{ color: string; active: boolean; onClick: () => void; testid: string }> = ({
  color,
  active,
  onClick,
  testid,
}) => (
  <button
    data-testid={testid}
    onClick={onClick}
    aria-label={`Color ${color}`}
    className={"w-10 h-10 rounded-full border-4 transition-transform " + (active ? "border-primary scale-110" : "border-white")}
    style={{ background: color, boxShadow: "0 2px 0 rgba(0,0,0,0.06)" }}
  />
);

const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; testid: string }> = ({
  active,
  onClick,
  children,
  testid,
}) => (
  <button
    data-testid={testid}
    onClick={onClick}
    className={
      "px-4 py-2 rounded-full border-2 font-bold text-sm transition-colors " +
      (active ? "bg-primary text-white border-primary" : "bg-white text-ink border-white hover:border-primary/40")
    }
  >
    {children}
  </button>
);

export default CharacterCreator;
