import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { StudioPanel } from "../components/studio/StudioPanel";
import { GeneratorPanel } from "../components/studio/GeneratorPanel";
import { StatusChip } from "../components/studio/StatusChip";
import { useStudio } from "../lib/studioStore";
import { ALL_TEMPLATES, generateQuestion } from "../lib/questionEngine";
import {
  mockCompanionConcept,
  mockRealmConcept,
  mockQuestChain,
  mockBattleBackground,
  mockCompanionArt,
  mockNanoBananaGenerateImage,
  baseMeta,
  nowISO,
} from "../lib/mockGen";
import type {
  StudioStatus,
  StudioCollectionKey,
  StudioAvatar,
  StudioCompanion,
  StudioEvolution,
  StudioArt,
  StudioAsset,
  StudioRealm,
  StudioBattleBg,
  StudioScene,
  StudioNPC,
  StudioQuest,
  StudioEvent,
} from "../lib/studioTypes";
import { ShieldCheck, Lock, Library, Eye, Send, Check, X } from "lucide-react";
import { cn } from "../lib/cn";

const STUDIO_PIN = "2580"; // same as Admin — single staff gate for the prototype

type TabKey =
  | "questions" | "avatars" | "companions" | "evolutions" | "arts" | "assets"
  | "realms" | "battleBgs" | "scenes" | "npcs" | "quests" | "events" | "queue";

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "questions",  label: "Questions",   emoji: "📝" },
  { key: "avatars",    label: "Avatars",     emoji: "🧑" },
  { key: "companions", label: "Pets",        emoji: "🐾" },
  { key: "evolutions", label: "Evolutions",  emoji: "🌱" },
  { key: "arts",       label: "Companion Art", emoji: "🎨" },
  { key: "assets",     label: "Assets",      emoji: "🎒" },
  { key: "realms",     label: "Realms",      emoji: "🗺️" },
  { key: "battleBgs",  label: "Battle BGs",  emoji: "⚔️" },
  { key: "scenes",     label: "Scenes",      emoji: "🏠" },
  { key: "npcs",       label: "NPCs",        emoji: "💬" },
  { key: "quests",     label: "Quests",      emoji: "📜" },
  { key: "events",     label: "Events",      emoji: "🎉" },
  { key: "queue",      label: "Publish Queue", emoji: "🚀" },
];

const ContentStudio: React.FC = () => {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<TabKey>("questions");

  if (!unlocked) {
    return (
      <div className="min-h-screen">
        <TopBar back="/admin" title="TeachMe Studio" />
        <main className="max-w-md mx-auto px-4 md:px-8 py-10">
          <Card className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white grid place-items-center mx-auto shadow-btn-primary">
              <Lock strokeWidth={3} />
            </div>
            <h1 className="h-display text-3xl mt-3">TeachMe Studio</h1>
            <p className="text-ink-muted mt-1">Content review & approval workspace.</p>
            <p className="text-xs font-extrabold text-primary mt-1">(Demo PIN: 2580)</p>
            <input
              data-testid="studio-pin-input"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setErr(""); }}
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              className="mt-5 w-full text-center text-3xl tracking-[0.5em] h-display border-4 border-primary/30 focus:border-primary outline-none rounded-full py-3 px-5 bg-white"
            />
            {err && <p data-testid="studio-pin-error" className="text-danger text-sm mt-2 font-bold">{err}</p>}
            <button
              data-testid="studio-pin-submit"
              onClick={() => (pin === STUDIO_PIN ? setUnlocked(true) : setErr("Invalid PIN. Try 2580."))}
              className="btn-primary mt-5 w-full !text-xl"
            >
              Enter Studio
            </button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <TopBar back="/admin" title="TeachMe Studio" />
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-5">
        <Card className="!p-5 md:!p-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary">
              <Library strokeWidth={3} />
            </div>
            <div className="min-w-0">
              <h1 className="h-display text-2xl md:text-3xl leading-tight">Content Studio</h1>
              <p className="text-ink-muted text-sm">Approve, reject, and publish every piece of content kids see.</p>
            </div>
            <Link to="/admin" className="ml-auto btn-outline !text-sm !py-2 !px-4" data-testid="studio-back-admin">
              <ShieldCheck size={16} strokeWidth={3} /> Admin
            </Link>
          </div>
        </Card>

        {/* Tabs */}
        <div className="card-base !p-2 md:!p-3 sticky top-0 z-20" style={{ position: "sticky" }}>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {TABS.map((t) => (
              <button
                key={t.key}
                data-testid={`studio-tab-${t.key}`}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-3 py-2 rounded-full text-sm font-extrabold whitespace-nowrap transition-colors",
                  tab === t.key
                    ? "bg-primary text-white"
                    : "bg-transparent text-ink hover:bg-bg"
                )}
              >
                <span className="mr-1" aria-hidden>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "questions"  && <QuestionsTab />}
        {tab === "avatars"    && <AvatarsTab />}
        {tab === "companions" && <CompanionsTab />}
        {tab === "evolutions" && <EvolutionsTab />}
        {tab === "arts"       && <ArtsTab />}
        {tab === "assets"     && <AssetsTab />}
        {tab === "realms"     && <RealmsTab />}
        {tab === "battleBgs"  && <BattleBgsTab />}
        {tab === "scenes"     && <ScenesTab />}
        {tab === "npcs"       && <NpcsTab />}
        {tab === "quests"     && <QuestsTab />}
        {tab === "events"     && <EventsTab />}
        {tab === "queue"      && <PublishQueueTab />}
      </main>
    </div>
  );
};

// ============================================================================
// TABS
// ============================================================================

const QuestionsTab: React.FC = () => {
  const templates = useStudio((s) => s.templates);
  const setStatus = useStudio((s) => s.setStatus);
  const [previewByTid, setPreviewByTid] = useState<Record<string, string>>({});

  // Filter + display all 16 templates with their meta
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "published" | "rejected">("all");

  const items = templates.map((meta) => {
    const tpl = ALL_TEMPLATES.find((t) => t.id === meta.templateId);
    return { meta, tpl };
  });

  const filtered = items.filter(({ meta }) => {
    switch (filter) {
      case "pending": return meta.status === "pending";
      case "approved": return meta.status === "approved";
      case "published": return meta.status === "published";
      case "rejected": return meta.status === "rejected" || meta.status === "archived";
      default: return true;
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="h-display text-2xl">Question templates</h2>
        <p className="text-ink-muted">Only <b>approved</b> or <b>published</b> templates can appear in battles.</p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "approved", "published", "rejected"] as const).map((k) => (
          <button
            key={k}
            data-testid={`questions-filter-${k}`}
            onClick={() => setFilter(k)}
            className={cn(
              "px-3 py-1.5 rounded-full border-2 text-sm font-extrabold capitalize transition-colors",
              filter === k ? "bg-primary text-white border-primary" : "bg-white text-ink border-white hover:border-primary/40"
            )}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map(({ meta, tpl }) => {
          if (!tpl) return null;
          const preview = previewByTid[tpl.id];
          return (
            <div
              key={meta.id}
              data-testid={`questions-card-${tpl.id}`}
              className="rounded-2xl bg-white border-4 border-white shadow-lg shadow-indigo-900/5 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <StatusChip status={meta.status} />
                <span className="text-[10px] font-extrabold uppercase text-ink-muted">{tpl.subject} · {tpl.topic}</span>
              </div>
              <p className="h-display text-lg">{tpl.label}</p>
              <p className="text-sm text-ink-muted">Grades: {tpl.grades.join(", ")}</p>
              <p className="text-xs italic text-ink-muted mt-1">e.g. {tpl.example}</p>

              {preview && (
                <div className="mt-3 p-3 rounded-xl bg-bg border-2 border-white">
                  <p className="text-xs font-extrabold flex items-center gap-1"><Eye size={12} strokeWidth={3} /> Sample</p>
                  <p className="text-sm font-bold mt-1">{preview}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  data-testid={`questions-preview-${tpl.id}`}
                  onClick={() => {
                    const q = generateQuestion(tpl.grades[0], "mixed", [], 0.5);
                    setPreviewByTid((m) => ({ ...m, [tpl.id]: `${q.prompt}  →  ${q.choices[q.answerIndex]}` }));
                  }}
                  className="text-xs font-extrabold text-primary hover:underline"
                >
                  Generate sample
                </button>
                <button data-testid={`questions-approve-${tpl.id}`}  onClick={() => setStatus("templates", meta.id, "approved")}  className="text-xs font-extrabold text-sage hover:underline">Approve</button>
                <button data-testid={`questions-publish-${tpl.id}`}  onClick={() => setStatus("templates", meta.id, "published")} className="text-xs font-extrabold text-primary hover:underline">Publish</button>
                <button data-testid={`questions-reject-${tpl.id}`}   onClick={() => setStatus("templates", meta.id, "rejected")}  className="text-xs font-extrabold text-danger hover:underline">Reject</button>
                <button data-testid={`questions-archive-${tpl.id}`}  onClick={() => setStatus("templates", meta.id, "archived")}  className="text-xs font-extrabold text-ink-muted hover:underline">Archive</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---- Avatars ---------------------------------------------------------------
const AvatarsTab: React.FC = () => {
  const items = useStudio((s) => s.avatars);
  const addItem = useStudio((s) => s.addItem);
  return (
    <StudioPanel
      testId="avatars"
      collection="avatars"
      items={items}
      generator={
        <GeneratorPanel
          title="Add avatar asset"
          description="Manually create a new placeholder avatar part for review."
          testIdPrefix="avatars"
          fields={[
            { key: "name",     label: "Name",       placeholder: "e.g. Star Bow Headband" },
            { key: "category", label: "Category",   placeholder: "hair / outfit / accessory / skin" },
            { key: "rarity",   label: "Rarity",     placeholder: "common / rare / epic / legendary" },
            { key: "ageRange", label: "Age range",  placeholder: "K-3" },
            { key: "color",    label: "Preview color", placeholder: "#F4C753" },
            { key: "desc",     label: "Notes", placeholder: "Short description", textarea: true, optional: true },
          ]}
          onGenerate={(v) => {
            const item: StudioAvatar = {
              ...baseMeta("user"),
              id: "av-" + Date.now(),
              name: v.name || "Untitled avatar part",
              category: (["hair","outfit","accessory","skin"].includes(v.category as string) ? v.category : "accessory") as StudioAvatar["category"],
              rarity: (["common","rare","epic","legendary"].includes(v.rarity as string) ? v.rarity : "common") as StudioAvatar["rarity"],
              ageRange: v.ageRange || "K-7",
              previewColor: v.color || "#9D8DF1",
              description: v.desc,
            };
            addItem("avatars", item);
          }}
        />
      }
      renderItem={(i: StudioAvatar) => (
        <div className="flex gap-3">
          <div
            className="w-16 h-16 rounded-2xl border-4 border-white shrink-0"
            style={{ background: i.previewColor }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="h-display text-lg truncate">{i.name}</p>
            <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.category} · {i.rarity}</p>
            <p className="text-xs text-ink-muted mt-0.5">Ages {i.ageRange}</p>
            {i.description && <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>}
          </div>
        </div>
      )}
    />
  );
};

// ---- Companions ------------------------------------------------------------
const CompanionsTab: React.FC = () => {
  const items = useStudio((s) => s.companions);
  const addItem = useStudio((s) => s.addItem);
  return (
    <StudioPanel
      testId="companions"
      collection="companions"
      items={items}
      generator={
        <GeneratorPanel
          title="Generate companion concept"
          description="Auto-build a new companion. Goes to Pending Review."
          testIdPrefix="companions"
          fields={[
            { key: "prompt", label: "Prompt / vibe", placeholder: "e.g. snowy fox cub who loves multiplication", textarea: true },
          ]}
          onGenerate={(v) => addItem("companions", mockCompanionConcept(v.prompt))}
          buttonLabel="Generate concept"
        />
      }
      renderItem={(i: StudioCompanion) => (
        <div className="flex gap-3">
          <div
            className="w-16 h-16 rounded-full border-4 border-white grid place-items-center shrink-0 text-3xl"
            style={{ background: `linear-gradient(180deg, ${i.palette.from}, ${i.palette.to})` }}
            aria-hidden
          >{i.emoji}</div>
          <div className="min-w-0">
            <p className="h-display text-lg truncate">{i.name}</p>
            <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.affinity} · {i.rarity}</p>
            <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.lore}</p>
            <p className="text-[10px] font-bold text-primary mt-1">Academy: {i.academyAffinity}</p>
            <p className="text-[10px] font-extrabold text-ink-muted">Moves: {i.moves.join(" · ")}</p>
          </div>
        </div>
      )}
    />
  );
};

// ---- Evolutions ------------------------------------------------------------
const EvolutionsTab: React.FC = () => {
  const items = useStudio((s) => s.evolutions);
  const addItem = useStudio((s) => s.addItem);
  return (
    <StudioPanel
      testId="evolutions"
      collection="evolutions"
      items={items}
      generator={
        <GeneratorPanel
          title="Add evolution chain"
          testIdPrefix="evolutions"
          fields={[
            { key: "base",  label: "Base companion name", placeholder: "e.g. Spriggle" },
            { key: "academy", label: "Academy influence", placeholder: "addition" },
            { key: "stage2", label: "Stage 2 lore", placeholder: "What blooms?", textarea: true },
            { key: "stage3", label: "Stage 3 lore", placeholder: "Final form lore", textarea: true },
          ]}
          onGenerate={(v) => {
            const item: StudioEvolution = {
              ...baseMeta("user"),
              id: "evo-" + Date.now(),
              baseCompanionName: v.base || "New Companion",
              academyInfluence: v.academy || "addition",
              stages: [
                { name: v.base || "Base", lore: "Starter form", unlockCondition: "Starter", visualDescription: "Tiny chibi base" },
                { name: (v.base || "Base") + " mid", lore: v.stage2 || "Petal armor blossoms.", unlockCondition: "Answer 30 of academy", visualDescription: "Rounder, accent ribbons" },
                { name: (v.base || "Base") + " final", lore: v.stage3 || "Gentle guardian form.", unlockCondition: "Mastery 80%", visualDescription: "Antlers / glow cape" },
              ],
            };
            addItem("evolutions", item);
          }}
        />
      }
      renderItem={(i: StudioEvolution) => (
        <div>
          <p className="h-display text-lg">{i.baseCompanionName}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">Academy: {i.academyInfluence}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {i.stages.map((st, idx) => (
              <div key={idx} className="rounded-xl bg-bg p-2 border-2 border-white text-center">
                <p className="text-[10px] font-extrabold uppercase text-ink-muted">Stage {idx + 1}</p>
                <p className="h-display text-sm">{st.name}</p>
                <p className="text-[10px] text-ink-muted mt-1 line-clamp-2">{st.lore}</p>
                <p className="text-[10px] text-primary font-extrabold mt-1">{st.unlockCondition}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    />
  );
};

// ---- Arts ------------------------------------------------------------------
const ArtsTab: React.FC = () => {
  const items = useStudio((s) => s.arts);
  const addItem = useStudio((s) => s.addItem);
  return (
    <StudioPanel
      testId="arts"
      collection="arts"
      items={items}
      generator={
        <GeneratorPanel
          title="Generate companion art"
          description="Mocked Nano Banana — returns a styled placeholder preview."
          testIdPrefix="arts"
          fields={[
            { key: "companionId",   label: "Companion id",   placeholder: "e.g. scmp-1" },
            { key: "companionName", label: "Companion name", placeholder: "e.g. Spriggle" },
            { key: "prompt",        label: "Prompt",         placeholder: "cozy chibi nature companion, soft lavender + sage, big eyes", textarea: true },
            { key: "style",         label: "Style notes",    placeholder: "Ghibli x Pokemon, soft round shapes", optional: true, textarea: true },
          ]}
          onGenerate={(v) =>
            addItem(
              "arts",
              mockCompanionArt(v.companionId || "unknown", v.companionName || "Unnamed", v.prompt || "soft chibi companion", v.style || "")
            )
          }
          buttonLabel="Generate with Nano Banana"
        />
      }
      renderItem={(i: StudioArt) => (
        <div>
          {i.previewUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={i.previewUrl} className="w-full h-40 object-cover rounded-xl border-2 border-white" />
          )}
          <p className="h-display text-lg mt-2 truncate">{i.companionName}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">id {i.companionId}</p>
          <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.prompt}</p>
          {i.styleNotes && <p className="text-[10px] font-extrabold text-primary mt-1">Style: {i.styleNotes}</p>}
        </div>
      )}
    />
  );
};

// ---- Assets ----------------------------------------------------------------
const AssetsTab: React.FC = () => {
  const items = useStudio((s) => s.assets);
  const addItem = useStudio((s) => s.addItem);
  return (
    <StudioPanel
      testId="assets"
      collection="assets"
      items={items}
      generator={
        <GeneratorPanel
          title="Add asset"
          description="General icons, badges, room art, eggs, cosmetics, stickers."
          testIdPrefix="assets"
          fields={[
            { key: "name",  label: "Name",  placeholder: "e.g. Sun Coin Icon" },
            { key: "kind",  label: "Kind",  placeholder: "icon / badge / academy-room / egg / cosmetic / sticker" },
            { key: "color", label: "Preview color", placeholder: "#F4C753" },
            { key: "desc",  label: "Notes", optional: true, textarea: true },
          ]}
          onGenerate={(v) => {
            const kinds = ["icon","badge","academy-room","egg","cosmetic","sticker"];
            const item: StudioAsset = {
              ...baseMeta("user"),
              id: "as-" + Date.now(),
              name: v.name || "Untitled asset",
              kind: (kinds.includes(v.kind) ? v.kind : "icon") as StudioAsset["kind"],
              previewColor: v.color || "#9D8DF1",
              description: v.desc,
            };
            addItem("assets", item);
          }}
        />
      }
      renderItem={(i: StudioAsset) => (
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-2xl border-4 border-white shrink-0" style={{ background: i.previewColor }} aria-hidden />
          <div className="min-w-0">
            <p className="h-display text-lg truncate">{i.name}</p>
            <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.kind}</p>
            {i.description && <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>}
          </div>
        </div>
      )}
    />
  );
};

// ---- Realms ----------------------------------------------------------------
const RealmsTab: React.FC = () => {
  const items = useStudio((s) => s.realms);
  const addItem = useStudio((s) => s.addItem);
  return (
    <StudioPanel
      testId="realms"
      collection="realms"
      items={items}
      generator={
        <GeneratorPanel
          title="Generate Realm Concept"
          testIdPrefix="realms"
          fields={[{ key: "prompt", label: "Prompt", placeholder: "e.g. cozy winter pine forest with snow sprites", textarea: true, optional: true }]}
          onGenerate={(v) => addItem("realms", mockRealmConcept(v.prompt))}
          buttonLabel="Generate realm"
        />
      }
      renderItem={(i: StudioRealm) => (
        <div>
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.biome}</p>
          <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>
          <p className="text-[10px] font-extrabold text-primary mt-2">Grades: {i.grades.join(", ")} · Subjects: {i.subjects.join(", ")}</p>
          <p className="text-[10px] font-bold text-ink-muted">Enemies: {i.enemyTypes.join(", ")}</p>
          <p className="text-[10px] font-bold text-ink-muted">Habitats: {i.habitats.join(", ")}</p>
        </div>
      )}
    />
  );
};

// ---- Battle BGs ------------------------------------------------------------
const BattleBgsTab: React.FC = () => {
  const items = useStudio((s) => s.battleBgs);
  const addItem = useStudio((s) => s.addItem);
  return (
    <StudioPanel
      testId="battleBgs"
      collection="battleBgs"
      items={items}
      generator={
        <GeneratorPanel
          title="Generate Battle Background"
          description="Mocked Nano Banana — preview only."
          testIdPrefix="battleBgs"
          fields={[
            { key: "realm",  label: "Realm",       placeholder: "Meadowfall Grove" },
            { key: "prompt", label: "Scene prompt", placeholder: "soft pastel meadow path, late afternoon, dandelions", textarea: true },
          ]}
          onGenerate={(v) => addItem("battleBgs", mockBattleBackground(v.prompt || "sunlit meadow", v.realm || "Meadowfall Grove"))}
          buttonLabel="Generate with Nano Banana"
        />
      }
      renderItem={(i: StudioBattleBg) => (
        <div>
          {i.previewUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={i.previewUrl} className="w-full h-32 object-cover rounded-xl border-2 border-white" />
          )}
          <p className="h-display text-lg mt-2">{i.realm}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.environment}</p>
          <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.prompt}</p>
        </div>
      )}
    />
  );
};

// ---- Scenes ----------------------------------------------------------------
const ScenesTab: React.FC = () => {
  const items = useStudio((s) => s.scenes);
  const addItem = useStudio((s) => s.addItem);
  return (
    <StudioPanel
      testId="scenes"
      collection="scenes"
      items={items}
      generator={
        <GeneratorPanel
          title="Add scene / town"
          description="Town hubs, classrooms, hatcheries, shops, guild halls."
          testIdPrefix="scenes"
          fields={[
            { key: "name",    label: "Scene name", placeholder: "e.g. Sticker Shop" },
            { key: "purpose", label: "Purpose",    placeholder: "Cosmetic shop" },
            { key: "realm",   label: "Realm",      placeholder: "Meadowfall Grove" },
            { key: "npcs",    label: "NPCs",       placeholder: "Mochi, Linden", optional: true },
            { key: "prompt",  label: "Visual prompt", placeholder: "warm cottage interior, glowing eggs", textarea: true },
          ]}
          onGenerate={(v) => {
            const item: StudioScene = {
              ...baseMeta("user"),
              id: "sc-" + Date.now(),
              name: v.name || "Untitled scene",
              purpose: v.purpose || "—",
              realm: v.realm || "Meadowfall Grove",
              npcs: (v.npcs || "").split(",").map((s) => s.trim()).filter(Boolean),
              visualPrompt: v.prompt || "soft cozy interior",
            };
            addItem("scenes", item);
          }}
        />
      }
      renderItem={(i: StudioScene) => (
        <div>
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.purpose} · {i.realm}</p>
          <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.visualPrompt}</p>
          {!!i.npcs.length && (
            <p className="text-[10px] font-extrabold text-primary mt-1">NPCs: {i.npcs.join(", ")}</p>
          )}
        </div>
      )}
    />
  );
};

// ---- NPCs ------------------------------------------------------------------
const NpcsTab: React.FC = () => {
  const items = useStudio((s) => s.npcs);
  const addItem = useStudio((s) => s.addItem);
  return (
    <StudioPanel
      testId="npcs"
      collection="npcs"
      items={items}
      generator={
        <GeneratorPanel
          title="Add NPC + dialogue"
          description="Child-safe characters and lines."
          testIdPrefix="npcs"
          fields={[
            { key: "name",     label: "NPC name",  placeholder: "Linden the Keeper" },
            { key: "role",     label: "Role",      placeholder: "Hatchery host" },
            { key: "realm",    label: "Realm",     placeholder: "Meadowfall Grove" },
            { key: "dialogue", label: "Sample line", placeholder: "Welcome, little scholar!", textarea: true },
            { key: "safety",   label: "Safety notes", placeholder: "No urgency, no personal info asks", textarea: true },
          ]}
          onGenerate={(v) => {
            const item: StudioNPC = {
              ...baseMeta("user"),
              id: "npc-" + Date.now(),
              name: v.name || "Unnamed NPC",
              role: v.role || "—",
              realm: v.realm || "Meadowfall Grove",
              dialogue: v.dialogue || "...",
              safetyNotes: v.safety || "Encouraging only.",
            };
            addItem("npcs", item);
          }}
        />
      }
      renderItem={(i: StudioNPC) => (
        <div>
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.role} · {i.realm}</p>
          <p className="text-sm italic mt-2">“{i.dialogue}”</p>
          <p className="text-[10px] font-extrabold text-sage mt-2">Safety: {i.safetyNotes}</p>
        </div>
      )}
    />
  );
};

// ---- Quests ----------------------------------------------------------------
const QuestsTab: React.FC = () => {
  const items = useStudio((s) => s.quests);
  const addItem = useStudio((s) => s.addItem);
  return (
    <StudioPanel
      testId="quests"
      collection="quests"
      items={items}
      generator={
        <GeneratorPanel
          title="Generate Quest Chain"
          testIdPrefix="quests"
          fields={[{ key: "prompt", label: "Quest theme", placeholder: "Find a lost acorn for the meadow keeper", textarea: true, optional: true }]}
          onGenerate={(v) => addItem("quests", mockQuestChain(v.prompt))}
          buttonLabel="Generate quest"
        />
      }
      renderItem={(i: StudioQuest) => (
        <div>
          <p className="h-display text-lg">{i.title}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">Subject: {i.subject} · Giver: {i.npcGiver}</p>
          <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.objective}</p>
          <ul className="text-xs mt-2 list-disc pl-4 space-y-0.5">
            {i.steps.map((s, idx) => <li key={idx}>{s}</li>)}
          </ul>
          <p className="text-[10px] font-extrabold text-primary mt-2">Rewards: {i.rewards}</p>
        </div>
      )}
    />
  );
};

// ---- Events ----------------------------------------------------------------
const EventsTab: React.FC = () => {
  const items = useStudio((s) => s.events);
  const addItem = useStudio((s) => s.addItem);
  return (
    <StudioPanel
      testId="events"
      collection="events"
      items={items}
      generator={
        <GeneratorPanel
          title="Add live event"
          description="Seasonal or classroom event."
          testIdPrefix="events"
          fields={[
            { key: "name",       label: "Event name", placeholder: "Spring Sparkle Week" },
            { key: "startDate",  label: "Start (YYYY-MM-DD)", placeholder: "2026-04-01" },
            { key: "endDate",    label: "End (YYYY-MM-DD)",   placeholder: "2026-04-08" },
            { key: "reward",     label: "Reward type",        placeholder: "Cosmetic + Egg" },
            { key: "special",    label: "Special",            placeholder: "Twinklet egg drop boost" },
            { key: "community",  label: "Classroom/Guild",    placeholder: "Classroom shared sticker board" },
          ]}
          onGenerate={(v) => {
            const item: StudioEvent = {
              ...baseMeta("user"),
              id: "ev-" + Date.now(),
              name: v.name || "Untitled event",
              startDate: v.startDate || nowISO().slice(0, 10),
              endDate: v.endDate || nowISO().slice(0, 10),
              rewardType: v.reward || "Cosmetic",
              special: v.special || "—",
              community: v.community || "Classroom",
            };
            addItem("events", item);
          }}
        />
      }
      renderItem={(i: StudioEvent) => (
        <div>
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.startDate} → {i.endDate}</p>
          <p className="text-xs mt-1">Reward: <b>{i.rewardType}</b></p>
          <p className="text-xs">Special: {i.special}</p>
          <p className="text-[10px] font-extrabold text-primary mt-1">Community: {i.community}</p>
        </div>
      )}
    />
  );
};

// ---- Publish Queue ---------------------------------------------------------
const PublishQueueTab: React.FC = () => {
  // Read raw collections (stable references) and compute the queue locally.
  const templates  = useStudio((s) => s.templates);
  const avatars    = useStudio((s) => s.avatars);
  const companions = useStudio((s) => s.companions);
  const evolutions = useStudio((s) => s.evolutions);
  const arts       = useStudio((s) => s.arts);
  const assets     = useStudio((s) => s.assets);
  const realms     = useStudio((s) => s.realms);
  const battleBgs  = useStudio((s) => s.battleBgs);
  const scenes     = useStudio((s) => s.scenes);
  const npcs       = useStudio((s) => s.npcs);
  const quests     = useStudio((s) => s.quests);
  const events     = useStudio((s) => s.events);
  const bulk = useStudio((s) => s.bulkSetStatus);

  const queue = useMemo(() => {
    const groups: { collection: StudioCollectionKey; items: { id: string; label: string }[] }[] = [
      { collection: "templates",  items: templates.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Template · ${i.templateId}` })) },
      { collection: "avatars",    items: avatars.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Avatar · ${i.name}` })) },
      { collection: "companions", items: companions.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Companion · ${i.name}` })) },
      { collection: "evolutions", items: evolutions.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Evolution · ${i.baseCompanionName}` })) },
      { collection: "arts",       items: arts.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Art · ${i.companionName}` })) },
      { collection: "assets",     items: assets.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Asset · ${i.name}` })) },
      { collection: "realms",     items: realms.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Realm · ${i.name}` })) },
      { collection: "battleBgs",  items: battleBgs.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Battle BG · ${i.realm}` })) },
      { collection: "scenes",     items: scenes.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Scene · ${i.name}` })) },
      { collection: "npcs",       items: npcs.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `NPC · ${i.name}` })) },
      { collection: "quests",     items: quests.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Quest · ${i.title}` })) },
      { collection: "events",     items: events.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Event · ${i.name}` })) },
    ];
    return groups;
  }, [templates, avatars, companions, evolutions, arts, assets, realms, battleBgs, scenes, npcs, quests, events]);

  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  const toggle = (col: StudioCollectionKey, id: string) => {
    setSelected((s) => {
      const next = { ...s };
      const set = new Set(next[col] ?? []);
      if (set.has(id)) set.delete(id); else set.add(id);
      next[col] = set;
      return next;
    });
  };

  const totalApproved = queue.reduce((acc, g) => acc + g.items.length, 0);
  const totalSelected = Object.values(selected).reduce((acc, s) => acc + (s ? s.size : 0), 0);

  const act = (status: StudioStatus) => {
    Object.entries(selected).forEach(([col, set]) => {
      if (set && set.size) bulk(col as StudioCollectionKey, Array.from(set), status);
    });
    setSelected({});
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap justify-between items-end gap-3">
          <div>
            <h2 className="h-display text-2xl">Publish queue</h2>
            <p className="text-ink-muted text-sm">
              <b>{totalApproved}</b> approved item{totalApproved === 1 ? "" : "s"} waiting to go live.
              <span className="ml-2 text-primary">{totalSelected} selected.</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              data-testid="queue-publish-selected"
              disabled={totalSelected === 0}
              onClick={() => act("published")}
              className="btn-primary !text-sm !py-2 !px-4 disabled:opacity-40"
            >
              <Send size={14} strokeWidth={3} /> Publish selected
            </button>
            <button
              data-testid="queue-archive-selected"
              disabled={totalSelected === 0}
              onClick={() => act("archived")}
              className="btn-ghost !text-sm !py-2 !px-4 disabled:opacity-40"
            >
              Archive selected
            </button>
          </div>
        </div>
      </Card>

      {queue.every((g) => g.items.length === 0) ? (
        <Card className="text-center">
          <p className="h-display text-xl">No approved items waiting.</p>
          <p className="text-ink-muted text-sm">Approve items in any tab to queue them for publishing.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {queue.map((g) => g.items.length === 0 ? null : (
            <Card key={g.collection}>
              <div className="flex justify-between items-center mb-2">
                <p className="h-display text-xl capitalize">{g.collection}</p>
                <p className="text-[10px] font-extrabold uppercase text-ink-muted">{g.items.length} items</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {g.items.map((it) => {
                  const isSel = selected[g.collection]?.has(it.id);
                  return (
                    <label
                      key={it.id}
                      data-testid={`queue-item-${it.id}`}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition",
                        isSel ? "bg-primary/10 border-primary/40" : "bg-bg border-white hover:border-primary/40"
                      )}
                    >
                      <input
                        type="checkbox"
                        data-testid={`queue-check-${it.id}`}
                        checked={!!isSel}
                        onChange={() => toggle(g.collection, it.id)}
                        className="w-5 h-5 accent-primary"
                      />
                      <span className="text-sm font-bold truncate">{it.label}</span>
                      <StatusChip status="approved" className="ml-auto" />
                    </label>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentStudio;
