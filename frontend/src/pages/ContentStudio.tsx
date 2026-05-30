import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { StudioPanel } from "../components/studio/StudioPanel";
import { GeneratorPanel } from "../components/studio/GeneratorPanel";
import { StatusChip } from "../components/studio/StatusChip";
import {
  Field, TextField, TextArea, SelectField, NumberField, ColorField,
  SearchSelect, MultiSelectChips, StylePresetPicker,
} from "../components/studio/FormFields";
import { useStudio } from "../lib/studioStore";
import { ALL_TEMPLATES, generateQuestion } from "../lib/questionEngine";
import {
  mockCompanionConcept, mockRealmConcept, mockQuestChain,
  mockBattleBackground, mockCompanionArt, baseMeta, nowISO,
} from "../lib/mockGen";
import {
  randomAvatarName, randomCompanionName, randomCompanionLore, randomMoveSet,
  randomStats, randomRealmName, randomBiome, randomQuestTitle, randomScenePrompt,
  randomVisualPrompt, randomNPCName, randomDialogueLine, randomHex,
} from "../lib/randomizer";
import type {
  StudioStatus, StudioCollectionKey,
  StudioAvatar, StudioCompanion, StudioEvolution, StudioArt,
  StudioAsset, StudioRealm, StudioBattleBg, StudioScene, StudioNPC,
  StudioQuest, StudioEvent, AvatarCategory, Rarity, Affinity, CompanionRole,
  AssetKind, ScenePurpose, RealmBuilding,
  NPCTone, NPCRole, NPCTemperament, NPCTeachingStyle, NPCHumorLevel, NPCFormality, NPCEncouragement,
  TimeOfDay, SceneMood,
} from "../lib/studioTypes";
import {
  AVATAR_CATEGORIES, RARITIES, AFFINITIES, COMPANION_ROLES, ASSET_KINDS,
  SCENE_PURPOSES, REALM_BUILDINGS, NPC_TONES, NPC_ROLES, NPC_TEMPERAMENTS,
  NPC_TEACHING_STYLES, NPC_HUMOR_LEVELS, NPC_FORMALITIES, NPC_ENCOURAGEMENT,
  TIMES_OF_DAY, SCENE_MOODS,
} from "../lib/studioTypes";
import { ShieldCheck, Library, Lock, Send, Eye, ChevronDown, ChevronRight, Wand2, Sparkles } from "lucide-react";
import { cn } from "../lib/cn";

const STUDIO_PIN = "2580";

type TabKey =
  | "questions" | "avatars" | "companions" | "evolutions" | "arts" | "assets"
  | "realms" | "battleBgs" | "scenes" | "npcs" | "quests" | "events" | "queue";

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "questions",  label: "Questions",     emoji: "📝" },
  { key: "avatars",    label: "Avatars",       emoji: "🧑" },
  { key: "companions", label: "Pets",          emoji: "🐾" },
  { key: "evolutions", label: "Evolutions",    emoji: "🌱" },
  { key: "arts",       label: "Companion Art", emoji: "🎨" },
  { key: "assets",     label: "Assets",        emoji: "🎒" },
  { key: "realms",     label: "Realms",        emoji: "🗺️" },
  { key: "battleBgs",  label: "Battle BGs",    emoji: "⚔️" },
  { key: "scenes",     label: "Scenes",        emoji: "🏠" },
  { key: "npcs",       label: "NPCs",          emoji: "💬" },
  { key: "quests",     label: "Quests",        emoji: "📜" },
  { key: "events",     label: "Events",        emoji: "🎉" },
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
              type="password" inputMode="numeric" maxLength={6} placeholder="••••"
              className="mt-5 w-full text-center text-3xl tracking-[0.5em] h-display border-4 border-primary/30 focus:border-primary outline-none rounded-full py-3 px-5 bg-white"
            />
            {err && <p data-testid="studio-pin-error" className="text-danger text-sm mt-2 font-bold">{err}</p>}
            <button data-testid="studio-pin-submit" onClick={() => (pin === STUDIO_PIN ? setUnlocked(true) : setErr("Invalid PIN. Try 2580."))} className="btn-primary mt-5 w-full !text-xl">
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

        <div className="card-base !p-2 md:!p-3 sticky top-0 z-20">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                data-testid={`studio-tab-${t.key}`}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-3 py-2 rounded-full text-sm font-extrabold whitespace-nowrap transition-colors",
                  tab === t.key ? "bg-primary text-white" : "bg-transparent text-ink hover:bg-bg"
                )}
              >
                <span className="mr-1" aria-hidden>{t.emoji}</span>{t.label}
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
// QUESTIONS — Subject → Topic → Template (grouped, approval is per-template)
// ============================================================================

const SUBJECT_ORDER: { key: "math" | "reading"; label: string; emoji: string }[] = [
  { key: "math",    label: "Math",    emoji: "🧮" },
  { key: "reading", label: "Reading", emoji: "📖" },
];

const QuestionsTab: React.FC = () => {
  const templates = useStudio((s) => s.templates);
  const setStatus = useStudio((s) => s.setStatus);
  const [filter, setFilter] = useState<StudioStatus | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [samplesByTid, setSamplesByTid] = useState<Record<string, string[]>>({});

  const grouped = useMemo(() => {
    type TBucket = { topic: string; templates: { tpl: typeof ALL_TEMPLATES[number]; meta: typeof templates[number] }[] };
    type SBucket = { subject: "math" | "reading"; label: string; emoji: string; topics: TBucket[] };
    const out: SBucket[] = SUBJECT_ORDER.map((s) => ({ subject: s.key, label: s.label, emoji: s.emoji, topics: [] as TBucket[] }));
    for (const tpl of ALL_TEMPLATES) {
      const meta = templates.find((m) => m.templateId === tpl.id);
      if (!meta) continue;
      if (filter !== "all" && meta.status !== filter) continue;
      const subj = out.find((x) => x.subject === tpl.subject);
      if (!subj) continue;
      let topicB = subj.topics.find((t) => t.topic === tpl.topic);
      if (!topicB) { topicB = { topic: tpl.topic, templates: [] }; subj.topics.push(topicB); }
      topicB.templates.push({ tpl, meta });
    }
    return out;
  }, [templates, filter]);

  const toggleExpand = (tid: string) =>
    setExpanded((s) => { const n = new Set(s); n.has(tid) ? n.delete(tid) : n.add(tid); return n; });

  const generateSamples = (tid: string) => {
    const tpl = ALL_TEMPLATES.find((t) => t.id === tid);
    if (!tpl) return;
    const samples = Array.from({ length: 4 }).map(() => {
      const q = generateQuestion(tpl.grades[0], "mixed", [], 0.5);
      return `${q.prompt}  →  ${q.choices[q.answerIndex]}`;
    });
    setSamplesByTid((m) => ({ ...m, [tid]: samples }));
    if (!expanded.has(tid)) toggleExpand(tid);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="h-display text-2xl">Question templates</h2>
            <p className="text-ink-muted text-sm">
              Approval is per <b>template/concept</b>, not per generated example.
              Only <b>approved</b> or <b>published</b> templates appear in battles.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all","draft","pending","approved","published","rejected","archived"] as const).map((k) => (
              <button
                key={k}
                data-testid={`questions-filter-${k}`}
                onClick={() => setFilter(k)}
                className={cn(
                  "px-3 py-1 rounded-full border-2 text-xs font-extrabold capitalize transition-colors",
                  filter === k ? "bg-primary text-white border-primary" : "bg-white text-ink border-white hover:border-primary/40"
                )}
              >{k}</button>
            ))}
          </div>
        </div>
      </Card>

      {grouped.map((subj) => (
        <Card key={subj.subject} data-testid={`questions-subject-${subj.subject}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl" aria-hidden>{subj.emoji}</span>
            <h3 className="h-display text-2xl">{subj.label}</h3>
            <span className="chip ml-2">{subj.topics.reduce((acc, t) => acc + t.templates.length, 0)} templates</span>
          </div>
          {subj.topics.length === 0 && <p className="text-sm text-ink-muted">No templates match the current filter.</p>}

          <div className="space-y-4">
            {subj.topics.map((topicB) => (
              <div key={topicB.topic} data-testid={`questions-topic-${subj.subject}-${topicB.topic}`}>
                <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
                  {topicB.topic} <span className="text-ink-muted ml-1">· {topicB.templates.length}</span>
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {topicB.templates.map(({ tpl, meta }) => {
                    const exp = expanded.has(tpl.id);
                    const samples = samplesByTid[tpl.id] ?? [];
                    return (
                      <div
                        key={tpl.id}
                        data-testid={`questions-card-${tpl.id}`}
                        className="rounded-2xl bg-white border-4 border-white shadow-lg shadow-indigo-900/5 p-4"
                      >
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <StatusChip status={meta.status} />
                          <span className="text-[10px] font-extrabold uppercase text-ink-muted">grades {tpl.grades.join(",")}</span>
                        </div>
                        <p className="h-display text-lg leading-tight">{tpl.label}</p>
                        <p className="text-xs italic text-ink-muted mt-1">e.g. {tpl.example}</p>

                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <Mini testid={`questions-approve-${tpl.id}`}  onClick={() => setStatus("templates", meta.id, "approved")}  cls="bg-sage text-white">Approve</Mini>
                          <Mini testid={`questions-publish-${tpl.id}`}  onClick={() => setStatus("templates", meta.id, "published")} cls="bg-primary text-white">Publish</Mini>
                          <Mini testid={`questions-reject-${tpl.id}`}   onClick={() => setStatus("templates", meta.id, "rejected")}  cls="bg-white text-danger border-2 border-danger/40">Reject</Mini>
                          <Mini testid={`questions-archive-${tpl.id}`}  onClick={() => setStatus("templates", meta.id, "archived")}  cls="bg-white text-ink-muted border-2 border-ink-muted/30">Archive</Mini>
                          <Mini testid={`questions-resend-${tpl.id}`}   onClick={() => setStatus("templates", meta.id, "pending")}   cls="bg-white text-ink-muted border-2 border-ink-muted/30">Send to review</Mini>
                        </div>

                        <button
                          type="button"
                          data-testid={`questions-toggle-${tpl.id}`}
                          onClick={() => toggleExpand(tpl.id)}
                          className="mt-3 text-xs font-extrabold text-primary inline-flex items-center gap-1 hover:underline"
                        >
                          {exp ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
                          Generated examples
                        </button>

                        {exp && (
                          <div className="mt-2 p-3 rounded-2xl bg-bg border-2 border-white space-y-1">
                            {samples.length === 0 ? (
                              <p className="text-xs text-ink-muted">No samples yet. Click below to generate.</p>
                            ) : samples.map((s, i) => (
                              <p key={i} className="text-xs font-bold flex items-center gap-1">
                                <Eye size={11} strokeWidth={3} className="text-primary" /> {s}
                              </p>
                            ))}
                            <button
                              type="button"
                              data-testid={`questions-preview-${tpl.id}`}
                              onClick={() => generateSamples(tpl.id)}
                              className="text-xs font-extrabold text-primary inline-flex items-center gap-1 hover:underline mt-1"
                            >
                              <Wand2 size={11} strokeWidth={3} /> Generate 4 samples
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};

const Mini: React.FC<{ testid: string; onClick: () => void; cls: string; children: React.ReactNode }> = ({ testid, onClick, cls, children }) => (
  <button type="button" data-testid={testid} onClick={onClick}
    className={cn("text-[11px] font-extrabold rounded-full px-2.5 py-1 hover:brightness-105 transition", cls)}>
    {children}
  </button>
);

// ============================================================================
// AVATARS
// ============================================================================
const AvatarsTab: React.FC = () => {
  const items = useStudio((s) => s.avatars);
  const addItem = useStudio((s) => s.addItem);
  const addPalette = useStudio((s) => s.addPalette);
  const [draft, setDraft] = useState<Partial<StudioAvatar>>({ category: "hair", rarity: "common", previewColor: "#9D8DF1" });

  const update = <K extends keyof StudioAvatar>(k: K, v: StudioAvatar[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSavePalette = (hex: string) => {
    addPalette({ id: "pal-user-" + Date.now(), name: `Saved ${hex}`, colors: [hex], createdAt: new Date().toISOString() });
  };

  const submit = () => {
    const item: StudioAvatar = {
      ...baseMeta("user"),
      id: "av-" + Date.now(),
      name: draft.name?.trim() || randomAvatarName(draft.category),
      category: (draft.category as AvatarCategory) ?? "accessory",
      rarity: (draft.rarity as Rarity) ?? "common",
      previewColor: draft.previewColor ?? "#9D8DF1",
      description: draft.description,
      hair: draft.hair,
      outfit: draft.outfit,
      accessory: draft.accessory,
    };
    addItem("avatars", item);
    setDraft({ category: "hair", rarity: "common", previewColor: "#9D8DF1" });
  };

  const cat = draft.category as AvatarCategory | undefined;

  return (
    <StudioPanel
      testId="avatars"
      collection="avatars"
      items={items}
      generator={
        <div className="rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6" data-testid="avatars-generator">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary"><Wand2 size={18} strokeWidth={3} /></div>
            <div><p className="h-display text-xl leading-tight">Add avatar asset</p><p className="text-sm text-ink-muted">Avatar assets apply to all grades.</p></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name">
              <TextField testid="avatars-input-name" value={draft.name ?? ""} onChange={(v) => update("name", v)} placeholder="e.g. Star Bow"
                onRandomize={() => update("name", randomAvatarName(draft.category))} />
            </Field>
            <Field label="Category">
              <SelectField testid="avatars-input-category" value={draft.category ?? ""} onChange={(v) => update("category", v as AvatarCategory)} options={AVATAR_CATEGORIES} />
            </Field>
            <Field label="Rarity">
              <SelectField testid="avatars-input-rarity" value={draft.rarity ?? ""} onChange={(v) => update("rarity", v as Rarity)} options={RARITIES} />
            </Field>
            <Field label="Preview color">
              <ColorField testid="avatars-input-color" value={draft.previewColor ?? "#9D8DF1"} onChange={(v) => update("previewColor", v)} onSave={handleSavePalette} />
            </Field>
            {cat === "hair" && <>
              <Field label="Hair length"><SelectField testid="avatars-hair-length" value={draft.hair?.length ?? ""} options={["short","medium","long"] as const} onChange={(v) => update("hair", { ...(draft.hair ?? {}), length: v as "short"|"medium"|"long" })} placeholder="—" /></Field>
              <Field label="Hair style"><SelectField testid="avatars-hair-style" value={draft.hair?.style ?? ""} options={["tuft","braids","bowl","puff","spike","wavy","ponytail"]} onChange={(v) => update("hair", { ...(draft.hair ?? {}), style: v as any })} placeholder="—" /></Field>
              <Field label="Texture"><SelectField testid="avatars-hair-texture" value={draft.hair?.texture ?? ""} options={["straight","wavy","curly","coily"]} onChange={(v) => update("hair", { ...(draft.hair ?? {}), texture: v as any })} placeholder="—" /></Field>
              <Field label="Hair color"><ColorField testid="avatars-hair-color" value={draft.hair?.color ?? "#8C5A2B"} onChange={(v) => update("hair", { ...(draft.hair ?? {}), color: v })} onSave={handleSavePalette} /></Field>
            </>}
            {cat === "outfit" && <>
              <Field label="Outfit type"><SelectField testid="avatars-outfit-type" value={draft.outfit?.outfitType ?? ""} options={["robe","tunic","uniform","dress","armor","casual"]} onChange={(v) => update("outfit", { ...(draft.outfit ?? {}), outfitType: v as any })} placeholder="—" /></Field>
              <Field label="Theme"><TextField testid="avatars-outfit-theme" value={draft.outfit?.theme ?? ""} onChange={(v) => update("outfit", { ...(draft.outfit ?? {}), theme: v })} placeholder="e.g. cozy, magical" /></Field>
              <Field label="Primary color"><ColorField testid="avatars-outfit-color1" value={draft.outfit?.primaryColor ?? "#9D8DF1"} onChange={(v) => update("outfit", { ...(draft.outfit ?? {}), primaryColor: v })} onSave={handleSavePalette} /></Field>
              <Field label="Secondary color"><ColorField testid="avatars-outfit-color2" value={draft.outfit?.secondaryColor ?? "#F4C753"} onChange={(v) => update("outfit", { ...(draft.outfit ?? {}), secondaryColor: v })} onSave={handleSavePalette} /></Field>
              <Field label="Trim / accent" full><TextField testid="avatars-outfit-trim" value={draft.outfit?.trim ?? ""} onChange={(v) => update("outfit", { ...(draft.outfit ?? {}), trim: v })} placeholder="e.g. gold piping" /></Field>
            </>}
            {cat === "accessory" && <>
              <Field label="Accessory type"><TextField testid="avatars-acc-type" value={draft.accessory?.accessoryType ?? ""} onChange={(v) => update("accessory", { ...(draft.accessory ?? {}), accessoryType: v })} placeholder="e.g. halo, pin, brooch" /></Field>
              <Field label="Placement"><SelectField testid="avatars-acc-placement" value={draft.accessory?.placement ?? ""} options={["head","neck","shoulder","back","wrist","ankle"]} onChange={(v) => update("accessory", { ...(draft.accessory ?? {}), placement: v as any })} placeholder="—" /></Field>
              <Field label="Material"><SelectField testid="avatars-acc-material" value={draft.accessory?.material ?? ""} options={["fabric","metal","wood","crystal","feather"]} onChange={(v) => update("accessory", { ...(draft.accessory ?? {}), material: v as any })} placeholder="—" /></Field>
              <Field label="Color"><ColorField testid="avatars-acc-color" value={draft.accessory?.color ?? "#F4C753"} onChange={(v) => update("accessory", { ...(draft.accessory ?? {}), color: v })} onSave={handleSavePalette} /></Field>
            </>}
            <Field label="Notes" full><TextArea testid="avatars-input-notes" value={draft.description ?? ""} onChange={(v) => update("description", v)} placeholder="Short description" /></Field>
          </div>
          <button type="button" data-testid="avatars-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Add to review
          </button>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted mt-3">New items enter <span className="text-primary">Pending Review</span> — never live.</p>
        </div>
      }
      renderItem={(i: StudioAvatar) => (
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-2xl border-4 border-white shrink-0" style={{ background: i.previewColor }} aria-hidden />
          <div className="min-w-0">
            <p className="h-display text-lg truncate">{i.name}</p>
            <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.category.replace("-"," ")} · {i.rarity}</p>
            {i.description && <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>}
            {i.hair?.style && <p className="text-[10px] font-bold text-primary mt-1">Hair: {i.hair.style}, {i.hair.length}, {i.hair.texture}</p>}
            {i.outfit?.outfitType && <p className="text-[10px] font-bold text-primary mt-1">Outfit: {i.outfit.outfitType} · {i.outfit.theme}</p>}
            {i.accessory?.accessoryType && <p className="text-[10px] font-bold text-primary mt-1">Acc: {i.accessory.accessoryType} @ {i.accessory.placement}</p>}
          </div>
        </div>
      )}
    />
  );
};

// ============================================================================
// COMPANIONS (Pets)
// ============================================================================
const CompanionsTab: React.FC = () => {
  const items = useStudio((s) => s.companions);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioCompanion>>({
    affinity: "nature", rarity: "common", role: "balanced",
    stats: { hp: 90, attack: 20, defense: 14, speed: 15 },
    palette: { from: "#E8F4E1", to: "#86A789" },
    shinyEnabled: false, shinyPalette: { from: "#FCE2F0", to: "#D77DA5" },
    moves: ["Pat", "Hug", "Shield"],
  });
  const update = <K extends keyof StudioCompanion>(k: K, v: StudioCompanion[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const randomize = () => {
    const aff = AFFINITIES[Math.floor(Math.random() * AFFINITIES.length)];
    setDraft((d) => ({
      ...d,
      name: randomCompanionName(),
      affinity: aff,
      rarity: RARITIES[Math.floor(Math.random() * 4)] as Rarity, // skip legendary by default
      role: COMPANION_ROLES[Math.floor(Math.random() * COMPANION_ROLES.length)],
      lore: randomCompanionLore(),
      moves: randomMoveSet(aff),
      stats: randomStats(),
      palette: { from: randomHex(), to: randomHex() },
      shinyPalette: { from: randomHex(), to: randomHex() },
      emoji: ({ nature: "🌱", fire: "🔥", earth: "🪨", water: "🫧", air: "🌬️", star: "✨" } as any)[aff],
    }));
  };

  const submit = () => {
    const item: StudioCompanion = {
      ...baseMeta("user"),
      id: "scmp-" + Date.now(),
      name: draft.name?.trim() || randomCompanionName(),
      affinity: (draft.affinity as Affinity) ?? "nature",
      rarity: (draft.rarity as Rarity) ?? "common",
      role: (draft.role as CompanionRole) ?? "balanced",
      academyAffinity: draft.academyAffinity ?? "addition",
      personality: draft.personality ?? "—",
      lore: draft.lore ?? randomCompanionLore(),
      moves: draft.moves ?? ["Pat", "Hug", "Shield"],
      emoji: draft.emoji ?? "🌱",
      stats: draft.stats ?? { hp: 90, attack: 20, defense: 14, speed: 15 },
      palette: draft.palette ?? { from: "#E8F4E1", to: "#86A789" },
      shinyEnabled: !!draft.shinyEnabled,
      shinyPalette: draft.shinyPalette,
    };
    addItem("companions", item);
  };

  return (
    <StudioPanel
      testId="companions"
      collection="companions"
      items={items}
      generator={
        <div className="rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6" data-testid="companions-generator">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary"><Wand2 size={18} strokeWidth={3} /></div>
              <div><p className="h-display text-xl leading-tight">Create / tune companion</p><p className="text-sm text-ink-muted">All companions enter Pending Review. Not granted to players until separately published.</p></div>
            </div>
            <button type="button" data-testid="companions-randomize" onClick={randomize} className="btn-outline !text-sm !py-2 !px-4">
              <Sparkles size={14} strokeWidth={3} /> Randomize
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name"><TextField testid="companions-input-name" value={draft.name ?? ""} onChange={(v) => update("name", v)} placeholder="e.g. Mossy-42" onRandomize={() => update("name", randomCompanionName())} /></Field>
            <Field label="Affinity / element"><SelectField testid="companions-input-affinity" value={draft.affinity ?? ""} options={AFFINITIES} onChange={(v) => update("affinity", v as Affinity)} /></Field>
            <Field label="Rarity"><SelectField testid="companions-input-rarity" value={draft.rarity ?? ""} options={RARITIES} onChange={(v) => update("rarity", v as Rarity)} /></Field>
            <Field label="Role"><SelectField testid="companions-input-role" value={draft.role ?? ""} options={COMPANION_ROLES} onChange={(v) => update("role", v as CompanionRole)} /></Field>
            <Field label="Academy affinity"><TextField testid="companions-input-academy" value={draft.academyAffinity ?? ""} onChange={(v) => update("academyAffinity", v)} placeholder="addition / fractions / rhyming…" /></Field>
            <Field label="Emoji glyph"><TextField testid="companions-input-emoji" value={draft.emoji ?? ""} onChange={(v) => update("emoji", v)} placeholder="🌱" /></Field>
            <Field label="HP"><NumberField testid="companions-stat-hp" value={draft.stats?.hp ?? 0} onChange={(n) => update("stats", { ...(draft.stats!), hp: n })} min={1} max={300} /></Field>
            <Field label="Attack"><NumberField testid="companions-stat-attack" value={draft.stats?.attack ?? 0} onChange={(n) => update("stats", { ...(draft.stats!), attack: n })} min={1} max={120} /></Field>
            <Field label="Defense"><NumberField testid="companions-stat-defense" value={draft.stats?.defense ?? 0} onChange={(n) => update("stats", { ...(draft.stats!), defense: n })} min={1} max={120} /></Field>
            <Field label="Speed"><NumberField testid="companions-stat-speed" value={draft.stats?.speed ?? 0} onChange={(n) => update("stats", { ...(draft.stats!), speed: n })} min={1} max={120} /></Field>
            <Field label="Color from"><ColorField testid="companions-palette-from" value={draft.palette?.from ?? "#E8F4E1"} onChange={(v) => update("palette", { ...(draft.palette!), from: v })} onSave={() => {}} /></Field>
            <Field label="Color to"><ColorField testid="companions-palette-to" value={draft.palette?.to ?? "#86A789"} onChange={(v) => update("palette", { ...(draft.palette!), to: v })} onSave={() => {}} /></Field>
            <Field label="Lore" full><TextArea testid="companions-input-lore" value={draft.lore ?? ""} onChange={(v) => update("lore", v)} placeholder="Short, kid-friendly backstory" onRandomize={() => update("lore", randomCompanionLore())} /></Field>
            <Field label="Moves (comma separated)" full><TextField testid="companions-input-moves" value={(draft.moves ?? []).join(", ")} onChange={(v) => update("moves", v.split(",").map((m) => m.trim()).filter(Boolean))} placeholder="Pat, Hug, Shield" /></Field>
            <Field label="Shiny enabled?">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border-2 border-white">
                <input type="checkbox" data-testid="companions-shiny-enabled" checked={!!draft.shinyEnabled} onChange={(e) => update("shinyEnabled", e.target.checked)} className="w-5 h-5 accent-primary" />
                <span className="text-sm font-extrabold">Recolor variant (no stat changes)</span>
              </label>
            </Field>
            {draft.shinyEnabled && <>
              <Field label="Shiny color from"><ColorField testid="companions-shiny-from" value={draft.shinyPalette?.from ?? "#FCE2F0"} onChange={(v) => update("shinyPalette", { ...(draft.shinyPalette ?? { from: "", to: "" }), from: v })} /></Field>
              <Field label="Shiny color to"><ColorField testid="companions-shiny-to"   value={draft.shinyPalette?.to ?? "#D77DA5"}   onChange={(v) => update("shinyPalette", { ...(draft.shinyPalette ?? { from: "", to: "" }), to: v })} /></Field>
            </>}
          </div>
          {/* Live preview */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-1">Standard preview</p>
              <CompanionDot emoji={draft.emoji ?? "🌱"} palette={draft.palette ?? { from: "#E8F4E1", to: "#86A789" }} />
            </div>
            {draft.shinyEnabled && (
              <div>
                <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-1">Shiny preview ✨</p>
                <CompanionDot emoji={draft.emoji ?? "🌱"} palette={draft.shinyPalette ?? { from: "#FCE2F0", to: "#D77DA5" }} />
              </div>
            )}
          </div>
          <button type="button" data-testid="companions-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Add companion concept
          </button>
        </div>
      }
      renderItem={(i: StudioCompanion) => (
        <div>
          <div className="flex items-start gap-3">
            <CompanionDot emoji={i.emoji} palette={i.palette} size={64} />
            <div className="min-w-0 flex-1">
              <p className="h-display text-lg truncate">{i.name}</p>
              <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.affinity} · {i.role} · {i.rarity}</p>
              <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.lore}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            <Stat label="HP" v={i.stats.hp} /><Stat label="ATK" v={i.stats.attack} /><Stat label="DEF" v={i.stats.defense} /><Stat label="SPD" v={i.stats.speed} />
          </div>
          <p className="text-[10px] font-bold text-primary mt-2">Academy: {i.academyAffinity} · Moves: {i.moves.join(" · ")}</p>
          {i.shinyEnabled && i.shinyPalette && (
            <div className="mt-2 flex items-center gap-2 text-[10px] font-extrabold uppercase text-ink-muted">
              <span>Shiny variant ✨</span>
              <CompanionDot emoji={i.emoji} palette={i.shinyPalette} size={28} />
            </div>
          )}
        </div>
      )}
    />
  );
};

const Stat: React.FC<{ label: string; v: number }> = ({ label, v }) => (
  <div className="rounded-lg bg-bg border-2 border-white p-1.5 text-center">
    <p className="text-[9px] font-extrabold uppercase text-ink-muted">{label}</p>
    <p className="h-display text-sm">{v}</p>
  </div>
);

const CompanionDot: React.FC<{ emoji: string; palette: { from: string; to: string }; size?: number }> = ({ emoji, palette, size = 56 }) => (
  <div
    className="rounded-full border-4 border-white grid place-items-center shrink-0"
    style={{ width: size, height: size, background: `linear-gradient(180deg, ${palette.from}, ${palette.to})`, fontSize: size * 0.45 }}
    aria-hidden
  >{emoji}</div>
);

// ============================================================================
// EVOLUTIONS
// ============================================================================
const EvolutionsTab: React.FC = () => {
  const items = useStudio((s) => s.evolutions);
  const companions = useStudio((s) => s.companions);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioEvolution>>({ stageNumber: 2 });
  const update = <K extends keyof StudioEvolution>(k: K, v: StudioEvolution[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const baseCompanion = companions.find((c) => c.id === draft.baseCompanionId);

  const randomize = () => {
    const c = companions[Math.floor(Math.random() * companions.length)];
    if (!c) return;
    const stage = Math.random() < 0.5 ? 2 : 3;
    setDraft({
      baseCompanionId: c.id,
      baseCompanionName: c.name,
      stageNumber: stage as 2 | 3,
      evolutionName: `${c.name} ${stage === 2 ? "mid" : "final"}`,
      lore: `As ${c.name} grows, its ${c.affinity} powers bloom.`,
      unlockCondition: stage === 2 ? `Answer 30 ${c.academyAffinity} correctly` : `Reach Academy mastery 80%`,
      academyInfluence: c.academyAffinity,
      visualNotes: stage === 2 ? "Rounder body, accent ribbons" : "Antlered crown, glowing cape",
      statGrowthNotes: stage === 2 ? "+10 HP, +4 ATK" : "+20 HP, +8 ATK, +4 DEF",
    });
  };

  const submit = () => {
    if (!draft.baseCompanionId) return;
    const item: StudioEvolution = {
      ...baseMeta("user"),
      id: "evo-" + Date.now(),
      baseCompanionId: draft.baseCompanionId,
      baseCompanionName: baseCompanion?.name || draft.baseCompanionName || "",
      stageNumber: (draft.stageNumber as 1 | 2 | 3) ?? 2,
      evolutionName: draft.evolutionName ?? "—",
      lore: draft.lore ?? "—",
      unlockCondition: draft.unlockCondition ?? "—",
      academyInfluence: draft.academyInfluence ?? baseCompanion?.academyAffinity ?? "addition",
      visualNotes: draft.visualNotes ?? "—",
      statGrowthNotes: draft.statGrowthNotes ?? "—",
    };
    addItem("evolutions", item);
    setDraft({ stageNumber: 2 });
  };

  return (
    <StudioPanel
      testId="evolutions"
      collection="evolutions"
      items={items}
      generator={
        <div className="rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6" data-testid="evolutions-generator">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary"><Wand2 size={18} strokeWidth={3} /></div>
              <p className="h-display text-xl leading-tight">Add evolution stage</p>
            </div>
            <button type="button" data-testid="evolutions-randomize" onClick={randomize} className="btn-outline !text-sm !py-2 !px-4"><Sparkles size={14} strokeWidth={3} /> Randomize</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Base companion" full>
              <SearchSelect
                testid="evolutions-input-base"
                value={draft.baseCompanionId ?? ""}
                onChange={(id) => { const c = companions.find((x) => x.id === id); update("baseCompanionId", id); if (c) update("baseCompanionName", c.name); }}
                options={companions.map((c) => ({ id: c.id, label: c.name, sublabel: `${c.affinity} · ${c.rarity}` }))}
                placeholder="Search companions…"
              />
            </Field>
            <Field label="Stage"><SelectField testid="evolutions-input-stage" value={String(draft.stageNumber)} options={["1","2","3"]} onChange={(v) => update("stageNumber", parseInt(v) as 1|2|3)} /></Field>
            <Field label="Evolution name"><TextField testid="evolutions-input-name" value={draft.evolutionName ?? ""} onChange={(v) => update("evolutionName", v)} placeholder="e.g. Bloomling" /></Field>
            <Field label="Unlock condition" full><TextField testid="evolutions-input-unlock" value={draft.unlockCondition ?? ""} onChange={(v) => update("unlockCondition", v)} placeholder="e.g. Answer 50 of academy correctly" /></Field>
            <Field label="Academy influence"><TextField testid="evolutions-input-academy" value={draft.academyInfluence ?? ""} onChange={(v) => update("academyInfluence", v)} placeholder="addition / rhyming / …" /></Field>
            <Field label="Visual notes" full><TextArea testid="evolutions-input-visual" value={draft.visualNotes ?? ""} onChange={(v) => update("visualNotes", v)} placeholder="Petal armor, antlers, glow cape…" /></Field>
            <Field label="Stat growth notes" full><TextField testid="evolutions-input-stats" value={draft.statGrowthNotes ?? ""} onChange={(v) => update("statGrowthNotes", v)} placeholder="+10 HP, +4 ATK…" /></Field>
            <Field label="Lore" full><TextArea testid="evolutions-input-lore" value={draft.lore ?? ""} onChange={(v) => update("lore", v)} placeholder="Short backstory" /></Field>
          </div>
          <button type="button" data-testid="evolutions-generate-btn" onClick={submit} disabled={!draft.baseCompanionId} className="btn-primary mt-4 !text-base !py-3 !px-6 disabled:opacity-40">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioEvolution) => (
        <div>
          <p className="h-display text-lg">{i.evolutionName} <span className="text-xs font-extrabold uppercase text-ink-muted">Stage {i.stageNumber}</span></p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">Base: {i.baseCompanionName} · Academy: {i.academyInfluence}</p>
          <p className="text-xs text-ink-muted mt-2 line-clamp-2">{i.lore}</p>
          <p className="text-[10px] font-bold text-primary mt-2">Unlock: {i.unlockCondition}</p>
          <p className="text-[10px] font-bold text-primary">Visual: {i.visualNotes}</p>
          <p className="text-[10px] font-bold text-primary">Stats: {i.statGrowthNotes}</p>
        </div>
      )}
    />
  );
};

// ============================================================================
// COMPANION ART
// ============================================================================
const ArtsTab: React.FC = () => {
  const items = useStudio((s) => s.arts);
  const companions = useStudio((s) => s.companions);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioArt>>({ stylePresetId: "sp-cozy-chibi" });
  const update = <K extends keyof StudioArt>(k: K, v: StudioArt[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    if (!draft.companionId) return;
    const c = companions.find((x) => x.id === draft.companionId);
    const item = mockCompanionArt(
      draft.companionId,
      c?.name || draft.companionName || "Unnamed",
      draft.prompt || randomVisualPrompt(),
      draft.styleNotes ?? "",
    );
    item.title = draft.title;
    item.stylePresetId = draft.stylePresetId;
    addItem("arts", item);
  };

  return (
    <StudioPanel
      testId="arts"
      collection="arts"
      items={items}
      generator={
        <div className="rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6" data-testid="arts-generator">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary"><Wand2 size={18} strokeWidth={3} /></div>
            <div><p className="h-display text-xl leading-tight">Generate companion art</p><p className="text-sm text-ink-muted">Mocked Nano Banana — returns a styled placeholder. TODO(api): replace with backend Gemini.</p></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Companion" full>
              <SearchSelect
                testid="arts-input-companionId"
                value={draft.companionId ?? ""}
                onChange={(id) => { const c = companions.find((x) => x.id === id); update("companionId", id); if (c) update("companionName", c.name); }}
                options={companions.map((c) => ({ id: c.id, label: c.name, sublabel: `${c.affinity} · ${c.rarity}` }))}
                placeholder="Search companions…"
              />
            </Field>
            <Field label="Title / name">
              <TextField testid="arts-input-title" value={draft.title ?? ""} onChange={(v) => update("title", v)} placeholder="e.g. Spriggle hero shot"
                onRandomize={() => update("title", `${randomAvatarName("hat")} debut`)} />
            </Field>
            <Field label="Style preset"><StylePresetPicker testid="arts-style-preset" value={draft.stylePresetId} onChange={(id) => update("stylePresetId", id)} /></Field>
            <Field label="Prompt" full>
              <TextArea testid="arts-input-prompt" value={draft.prompt ?? ""} onChange={(v) => update("prompt", v)} placeholder="cozy chibi nature companion, soft pastel" onRandomize={() => update("prompt", randomVisualPrompt())} />
            </Field>
            <Field label="Style notes" full>
              <TextArea testid="arts-input-style" value={draft.styleNotes ?? ""} onChange={(v) => update("styleNotes", v)} placeholder="Ghibli x Pokemon, soft round shapes" onRandomize={() => update("styleNotes", "Ghibli x Pokemon, soft round shapes, gentle pastel palette")} />
            </Field>
          </div>
          <button type="button" data-testid="arts-generate-btn" onClick={submit} disabled={!draft.companionId} className="btn-primary mt-4 !text-base !py-3 !px-6 disabled:opacity-40">
            <Wand2 size={16} strokeWidth={3} /> Generate with Nano Banana
          </button>
        </div>
      }
      renderItem={(i: StudioArt) => (
        <div>
          {i.previewUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={i.previewUrl} className="w-full h-40 object-cover rounded-xl border-2 border-white" />
          )}
          <p className="h-display text-lg mt-2 truncate">{i.title || i.companionName}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">id {i.companionId}</p>
          <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.prompt}</p>
          {i.styleNotes && <p className="text-[10px] font-extrabold text-primary mt-1">Style: {i.styleNotes}</p>}
        </div>
      )}
    />
  );
};

// ============================================================================
// ASSETS
// ============================================================================
const AssetsTab: React.FC = () => {
  const items = useStudio((s) => s.assets);
  const addItem = useStudio((s) => s.addItem);
  const addPalette = useStudio((s) => s.addPalette);
  const [draft, setDraft] = useState<Partial<StudioAsset>>({ kind: "icon", previewColor: "#9D8DF1" });
  const update = <K extends keyof StudioAsset>(k: K, v: StudioAsset[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const handleSavePalette = (hex: string) =>
    addPalette({ id: "pal-user-" + Date.now(), name: `Saved ${hex}`, colors: [hex], createdAt: new Date().toISOString() });

  const submit = () => {
    const item: StudioAsset = {
      ...baseMeta("user"),
      id: "as-" + Date.now(),
      name: draft.name?.trim() || `Untitled ${draft.kind}`,
      kind: (draft.kind as AssetKind) ?? "icon",
      previewColor: draft.previewColor ?? "#9D8DF1",
      description: draft.description,
      egg: draft.egg, badge: draft.badge,
    };
    addItem("assets", item);
  };

  const k = draft.kind as AssetKind | undefined;

  return (
    <StudioPanel
      testId="assets"
      collection="assets"
      items={items}
      generator={
        <div className="rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6" data-testid="assets-generator">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary"><Wand2 size={18} strokeWidth={3} /></div>
            <p className="h-display text-xl leading-tight">Add asset</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name"><TextField testid="assets-input-name" value={draft.name ?? ""} onChange={(v) => update("name", v)} placeholder="e.g. Aqua Egg Art" /></Field>
            <Field label="Kind"><SelectField testid="assets-input-kind" value={draft.kind ?? ""} options={ASSET_KINDS} onChange={(v) => update("kind", v as AssetKind)} /></Field>
            <Field label="Preview color"><ColorField testid="assets-input-color" value={draft.previewColor ?? "#9D8DF1"} onChange={(v) => update("previewColor", v)} onSave={handleSavePalette} /></Field>
            <Field label="Notes"><TextField testid="assets-input-desc" value={draft.description ?? ""} onChange={(v) => update("description", v)} placeholder="Short description" /></Field>
            {k === "egg" && <>
              <Field label="Rarity"><SelectField testid="assets-egg-rarity" value={draft.egg?.rarity ?? ""} options={RARITIES} onChange={(v) => update("egg", { ...(draft.egg ?? {}), rarity: v as Rarity })} placeholder="—" /></Field>
              <Field label="Base color"><ColorField testid="assets-egg-base" value={draft.egg?.baseColor ?? "#DCEEF7"} onChange={(v) => update("egg", { ...(draft.egg ?? {}), baseColor: v })} onSave={handleSavePalette} /></Field>
              <Field label="Accent color"><ColorField testid="assets-egg-accent" value={draft.egg?.accentColor ?? "#7BB7D6"} onChange={(v) => update("egg", { ...(draft.egg ?? {}), accentColor: v })} onSave={handleSavePalette} /></Field>
              <Field label="Shiny chance (0-100)"><NumberField testid="assets-egg-shiny" value={draft.egg?.shinyChance ?? 4} onChange={(n) => update("egg", { ...(draft.egg ?? {}), shinyChance: n })} min={0} max={100} /></Field>
              <Field label="Hatch category"><TextField testid="assets-egg-hatch" value={draft.egg?.hatchCategory ?? ""} onChange={(v) => update("egg", { ...(draft.egg ?? {}), hatchCategory: v })} placeholder="water / fire / nature" /></Field>
              <Field label="Glow effect"><SelectField testid="assets-egg-glow" value={draft.egg?.glowEffect ?? ""} options={["none","soft","pulse","shimmer"]} onChange={(v) => update("egg", { ...(draft.egg ?? {}), glowEffect: v as "none"|"soft"|"pulse"|"shimmer" })} placeholder="—" /></Field>
              <Field label="Companion family"><TextField testid="assets-egg-family" value={draft.egg?.companionFamily ?? ""} onChange={(v) => update("egg", { ...(draft.egg ?? {}), companionFamily: v })} placeholder="water-pups" /></Field>
              <Field label="Event tag"><TextField testid="assets-egg-event" value={draft.egg?.eventTag ?? ""} onChange={(v) => update("egg", { ...(draft.egg ?? {}), eventTag: v })} placeholder="optional" /></Field>
            </>}
            {(k === "badge" || k === "sticker") && <>
              <Field label="Badge type"><SelectField testid="assets-badge-type" value={draft.badge?.badgeType ?? ""} options={["achievement","milestone","event","rank"]} onChange={(v) => update("badge", { ...(draft.badge ?? {}), badgeType: v as any })} placeholder="—" /></Field>
              <Field label="Category"><TextField testid="assets-badge-category" value={draft.badge?.achievementCategory ?? ""} onChange={(v) => update("badge", { ...(draft.badge ?? {}), achievementCategory: v })} placeholder="first-correct" /></Field>
              <Field label="Icon shape"><SelectField testid="assets-badge-icon" value={draft.badge?.iconShape ?? ""} options={["circle","star","shield","leaf","heart"]} onChange={(v) => update("badge", { ...(draft.badge ?? {}), iconShape: v as any })} placeholder="—" /></Field>
              <Field label="Rarity"><SelectField testid="assets-badge-rarity" value={draft.badge?.rarity ?? ""} options={RARITIES} onChange={(v) => update("badge", { ...(draft.badge ?? {}), rarity: v as Rarity })} placeholder="—" /></Field>
            </>}
          </div>
          <button type="button" data-testid="assets-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioAsset) => (
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-2xl border-4 border-white shrink-0" style={{ background: i.previewColor }} aria-hidden />
          <div className="min-w-0">
            <p className="h-display text-lg truncate">{i.name}</p>
            <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.kind.replace(/-/g," ")}</p>
            {i.egg && <p className="text-[10px] font-bold text-primary mt-1">{i.egg.rarity} · shiny {i.egg.shinyChance}% · {i.egg.glowEffect} glow</p>}
            {i.badge && <p className="text-[10px] font-bold text-primary mt-1">{i.badge.badgeType} · {i.badge.iconShape}</p>}
            {i.description && <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>}
          </div>
        </div>
      )}
    />
  );
};

// ============================================================================
// REALMS
// ============================================================================
const RealmsTab: React.FC = () => {
  const items = useStudio((s) => s.realms);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioRealm>>({ subjects: ["math"], grades: ["K","1","2"], buildings: ["town-hub","hatchery"] });
  const update = <K extends keyof StudioRealm>(k: K, v: StudioRealm[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const randomize = () => {
    setDraft((d) => ({
      ...d,
      name: randomRealmName(),
      biome: randomBiome(),
      tone: SCENE_MOODS[Math.floor(Math.random() * SCENE_MOODS.length)],
      description: `A ${randomBiome()} for ${["K-2","2-5","3-7"][Math.floor(Math.random()*3)]} learners.`,
      buildings: ["town-hub","hatchery","learning-academy","shop","quest-board"].slice(0, 3 + Math.floor(Math.random()*3)) as RealmBuilding[],
      mapNotes: "Soft central plaza with paths to all hubs.",
    }));
  };

  const submit = () => {
    const m = mockRealmConcept(draft.description);
    const item: StudioRealm = {
      ...m,
      name: draft.name?.trim() || m.name,
      biome: draft.biome ?? m.biome,
      tone: draft.tone,
      description: draft.description ?? m.description,
      buildings: draft.buildings ?? [],
      mapNotes: draft.mapNotes,
      battleBackgroundSet: draft.battleBackgroundSet,
      stylePresetId: draft.stylePresetId,
      grades: draft.grades ?? m.grades,
      subjects: draft.subjects ?? m.subjects,
    };
    addItem("realms", item);
  };

  return (
    <StudioPanel
      testId="realms"
      collection="realms"
      items={items}
      generator={
        <div className="rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6" data-testid="realms-generator">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary"><Wand2 size={18} strokeWidth={3} /></div>
              <p className="h-display text-xl leading-tight">Generate realm concept</p>
            </div>
            <button type="button" data-testid="realms-randomize" onClick={randomize} className="btn-outline !text-sm !py-2 !px-4"><Sparkles size={14} strokeWidth={3} /> Randomize</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Realm name"><TextField testid="realms-input-name" value={draft.name ?? ""} onChange={(v) => update("name", v)} placeholder="e.g. Frostpine Hollow" onRandomize={() => update("name", randomRealmName())} /></Field>
            <Field label="Biome"><TextField testid="realms-input-biome" value={draft.biome ?? ""} onChange={(v) => update("biome", v)} placeholder="snowy pine forest" onRandomize={() => update("biome", randomBiome())} /></Field>
            <Field label="Tone"><SelectField testid="realms-input-tone" value={draft.tone ?? ""} options={SCENE_MOODS} onChange={(v) => update("tone", v as SceneMood)} placeholder="—" /></Field>
            <Field label="Style preset"><StylePresetPicker testid="realms-style-preset" value={draft.stylePresetId} onChange={(id) => update("stylePresetId", id)} /></Field>
            <Field label="Buildings / hubs" full>
              <MultiSelectChips
                testid="realms-buildings"
                values={draft.buildings ?? []}
                onChange={(v) => update("buildings", v as RealmBuilding[])}
                options={REALM_BUILDINGS.map((b) => ({ id: b, label: b.replace(/-/g, " ") }))}
              />
            </Field>
            <Field label="Map notes" full><TextArea testid="realms-input-map" value={draft.mapNotes ?? ""} onChange={(v) => update("mapNotes", v)} placeholder="Layout, key landmarks" /></Field>
            <Field label="Description" full><TextArea testid="realms-input-description" value={draft.description ?? ""} onChange={(v) => update("description", v)} placeholder="What kids feel when they arrive." /></Field>
          </div>
          <button type="button" data-testid="realms-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioRealm) => (
        <div>
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.biome} {i.tone && `· ${i.tone}`}</p>
          <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>
          {i.buildings && i.buildings.length > 0 && (
            <p className="text-[10px] font-extrabold text-primary mt-2">Hubs: {i.buildings.map((b) => b.replace(/-/g," ")).join(" · ")}</p>
          )}
          {i.mapNotes && <p className="text-[10px] font-bold text-ink-muted">{i.mapNotes}</p>}
        </div>
      )}
    />
  );
};

// ============================================================================
// BATTLE BACKGROUNDS
// ============================================================================
const BattleBgsTab: React.FC = () => {
  const items = useStudio((s) => s.battleBgs);
  const realms = useStudio((s) => s.realms);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioBattleBg>>({});
  const update = <K extends keyof StudioBattleBg>(k: K, v: StudioBattleBg[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    const realm = realms.find((r) => r.id === draft.realmId);
    const m = mockBattleBackground(draft.prompt || randomScenePrompt(), realm?.name || draft.realm || "Meadowfall Grove");
    const item: StudioBattleBg = {
      ...m,
      realmId: realm?.id,
      timeOfDay: draft.timeOfDay,
      mood: draft.mood,
      environment: draft.environment ?? m.environment,
      stylePresetId: draft.stylePresetId,
    };
    addItem("battleBgs", item);
  };

  return (
    <StudioPanel
      testId="battleBgs"
      collection="battleBgs"
      items={items}
      generator={
        <div className="rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6" data-testid="battleBgs-generator">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary"><Wand2 size={18} strokeWidth={3} /></div>
            <p className="h-display text-xl leading-tight">Generate battle background</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Realm" full>
              <SearchSelect
                testid="battleBgs-input-realm"
                value={draft.realmId ?? ""}
                onChange={(id) => { const r = realms.find((x) => x.id === id); update("realmId", id); if (r) update("realm", r.name); }}
                options={realms.map((r) => ({ id: r.id, label: r.name, sublabel: r.biome }))}
                placeholder="Choose realm…"
              />
            </Field>
            <Field label="Environment"><TextField testid="battleBgs-input-environment" value={draft.environment ?? ""} onChange={(v) => update("environment", v)} placeholder="sunlit meadow path" /></Field>
            <Field label="Time of day"><SelectField testid="battleBgs-input-time" value={draft.timeOfDay ?? ""} options={TIMES_OF_DAY} onChange={(v) => update("timeOfDay", v as TimeOfDay)} placeholder="—" /></Field>
            <Field label="Mood"><SelectField testid="battleBgs-input-mood" value={draft.mood ?? ""} options={SCENE_MOODS} onChange={(v) => update("mood", v as SceneMood)} placeholder="—" /></Field>
            <Field label="Style preset"><StylePresetPicker testid="battleBgs-style-preset" value={draft.stylePresetId} onChange={(id) => update("stylePresetId", id)} /></Field>
            <Field label="Scene prompt" full><TextArea testid="battleBgs-input-prompt" value={draft.prompt ?? ""} onChange={(v) => update("prompt", v)} placeholder="soft pastel meadow, late afternoon" onRandomize={() => update("prompt", randomScenePrompt())} /></Field>
          </div>
          <button type="button" data-testid="battleBgs-generate-btn" onClick={submit} disabled={!draft.realmId} className="btn-primary mt-4 !text-base !py-3 !px-6 disabled:opacity-40">
            <Wand2 size={16} strokeWidth={3} /> Generate with Nano Banana
          </button>
        </div>
      }
      renderItem={(i: StudioBattleBg) => (
        <div>
          {i.previewUrl && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={i.previewUrl} className="w-full h-32 object-cover rounded-xl border-2 border-white" />
          )}
          <p className="h-display text-lg mt-2">{i.realm}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.environment}{i.timeOfDay && ` · ${i.timeOfDay}`}{i.mood && ` · ${i.mood}`}</p>
          <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.prompt}</p>
        </div>
      )}
    />
  );
};

// ============================================================================
// SCENES
// ============================================================================
const ScenesTab: React.FC = () => {
  const items = useStudio((s) => s.scenes);
  const realms = useStudio((s) => s.realms);
  const npcs = useStudio((s) => s.npcs);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioScene>>({ purpose: "town-hub", npcIds: [] });
  const update = <K extends keyof StudioScene>(k: K, v: StudioScene[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    const realm = realms.find((r) => r.id === draft.realmId);
    const linkedNpcs = (draft.npcIds ?? []).map((id) => npcs.find((n) => n.id === id)?.name ?? "").filter(Boolean);
    const item: StudioScene = {
      ...baseMeta("user"),
      id: "sc-" + Date.now(),
      name: draft.name?.trim() || `Scene ${Date.now()}`,
      purpose: (draft.purpose as ScenePurpose) ?? "town-hub",
      realmId: realm?.id,
      realm: realm?.name ?? draft.realm ?? "Meadowfall Grove",
      npcIds: draft.npcIds ?? [],
      npcs: linkedNpcs,
      visualPrompt: draft.visualPrompt ?? randomVisualPrompt(),
      stylePresetId: draft.stylePresetId,
    };
    addItem("scenes", item);
  };

  return (
    <StudioPanel
      testId="scenes"
      collection="scenes"
      items={items}
      generator={
        <div className="rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6" data-testid="scenes-generator">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary"><Wand2 size={18} strokeWidth={3} /></div>
            <p className="h-display text-xl leading-tight">Add scene / town</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Scene name"><TextField testid="scenes-input-name" value={draft.name ?? ""} onChange={(v) => update("name", v)} placeholder="e.g. Sticker Shop" onRandomize={() => update("name", `${randomAvatarName("hat")} Hall`)} /></Field>
            <Field label="Purpose"><SelectField testid="scenes-input-purpose" value={draft.purpose ?? ""} options={SCENE_PURPOSES} onChange={(v) => update("purpose", v as ScenePurpose)} /></Field>
            <Field label="Realm" full>
              <SearchSelect testid="scenes-input-realm" value={draft.realmId ?? ""}
                onChange={(id) => { const r = realms.find((x) => x.id === id); update("realmId", id); if (r) update("realm", r.name); }}
                options={realms.map((r) => ({ id: r.id, label: r.name, sublabel: r.biome }))} placeholder="Choose realm…" />
            </Field>
            <Field label="NPCs (multi)" full>
              <MultiSelectChips testid="scenes-input-npcs" values={draft.npcIds ?? []} onChange={(v) => update("npcIds", v)}
                options={npcs.map((n) => ({ id: n.id, label: n.name }))} />
            </Field>
            <Field label="Style preset"><StylePresetPicker testid="scenes-style-preset" value={draft.stylePresetId} onChange={(id) => update("stylePresetId", id)} /></Field>
            <Field label="Visual prompt" full><TextArea testid="scenes-input-prompt" value={draft.visualPrompt ?? ""} onChange={(v) => update("visualPrompt", v)} placeholder="warm cottage interior, glowing eggs on shelves" onRandomize={() => update("visualPrompt", randomVisualPrompt())} /></Field>
          </div>
          <button type="button" data-testid="scenes-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioScene) => (
        <div>
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.purpose.replace(/-/g," ")} · {i.realm}</p>
          <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.visualPrompt}</p>
          {!!i.npcs.length && <p className="text-[10px] font-extrabold text-primary mt-1">NPCs: {i.npcs.join(", ")}</p>}
        </div>
      )}
    />
  );
};

// ============================================================================
// NPCs
// ============================================================================
const NpcsTab: React.FC = () => {
  const items = useStudio((s) => s.npcs);
  const realms = useStudio((s) => s.realms);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioNPC>>({
    role: "teacher", tone: "cheerful", temperament: "patient", teachingStyle: "encouraging",
    humorLevel: "light", formality: "casual", encouragementStyle: "praise",
  });
  const update = <K extends keyof StudioNPC>(k: K, v: StudioNPC[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    const realm = realms.find((r) => r.id === draft.realmId);
    const item: StudioNPC = {
      ...baseMeta("user"),
      id: "npc-" + Date.now(),
      name: draft.name?.trim() || randomNPCName(),
      role: (draft.role as NPCRole) ?? "teacher",
      customRole: draft.customRole,
      realmId: realm?.id,
      realm: realm?.name ?? draft.realm ?? "Meadowfall Grove",
      dialogue: draft.dialogue ?? "Welcome!",
      tone: (draft.tone as NPCTone) ?? "cheerful",
      temperament: (draft.temperament as NPCTemperament) ?? "patient",
      teachingStyle: (draft.teachingStyle as NPCTeachingStyle) ?? "encouraging",
      humorLevel: (draft.humorLevel as NPCHumorLevel) ?? "light",
      formality: (draft.formality as NPCFormality) ?? "casual",
      encouragementStyle: (draft.encouragementStyle as NPCEncouragement) ?? "praise",
      safetyNotes: draft.safetyNotes ?? "Always kind, never urgent. No personal info asks.",
    };
    addItem("npcs", item);
  };

  return (
    <StudioPanel
      testId="npcs"
      collection="npcs"
      items={items}
      generator={
        <div className="rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6" data-testid="npcs-generator">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary"><Wand2 size={18} strokeWidth={3} /></div>
            <p className="h-display text-xl leading-tight">Add NPC + persona</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name"><TextField testid="npcs-input-name" value={draft.name ?? ""} onChange={(v) => update("name", v)} placeholder="Linden the Keeper" onRandomize={() => update("name", randomNPCName())} /></Field>
            <Field label="Role"><SelectField testid="npcs-input-role" value={draft.role ?? ""} options={NPC_ROLES} onChange={(v) => update("role", v as NPCRole)} /></Field>
            <Field label="Custom role override" full><TextField testid="npcs-input-customRole" value={draft.customRole ?? ""} onChange={(v) => update("customRole", v)} placeholder="(optional) — e.g. 'librarian-mentor'" /></Field>
            <Field label="Realm" full>
              <SearchSelect testid="npcs-input-realm" value={draft.realmId ?? ""}
                onChange={(id) => { const r = realms.find((x) => x.id === id); update("realmId", id); if (r) update("realm", r.name); }}
                options={realms.map((r) => ({ id: r.id, label: r.name, sublabel: r.biome }))} placeholder="Choose realm…" />
            </Field>
            <Field label="Tone"><SelectField testid="npcs-input-tone" value={draft.tone ?? ""} options={NPC_TONES} onChange={(v) => update("tone", v as NPCTone)} /></Field>
            <Field label="Temperament"><SelectField testid="npcs-input-temperament" value={draft.temperament ?? ""} options={NPC_TEMPERAMENTS} onChange={(v) => update("temperament", v as NPCTemperament)} /></Field>
            <Field label="Teaching style"><SelectField testid="npcs-input-teaching" value={draft.teachingStyle ?? ""} options={NPC_TEACHING_STYLES} onChange={(v) => update("teachingStyle", v as NPCTeachingStyle)} /></Field>
            <Field label="Humor"><SelectField testid="npcs-input-humor" value={draft.humorLevel ?? ""} options={NPC_HUMOR_LEVELS} onChange={(v) => update("humorLevel", v as NPCHumorLevel)} /></Field>
            <Field label="Formality"><SelectField testid="npcs-input-formality" value={draft.formality ?? ""} options={NPC_FORMALITIES} onChange={(v) => update("formality", v as NPCFormality)} /></Field>
            <Field label="Encouragement"><SelectField testid="npcs-input-encouragement" value={draft.encouragementStyle ?? ""} options={NPC_ENCOURAGEMENT} onChange={(v) => update("encouragementStyle", v as NPCEncouragement)} /></Field>
            <Field label="Sample line" full><TextArea testid="npcs-input-dialogue" value={draft.dialogue ?? ""} onChange={(v) => update("dialogue", v)} placeholder="Welcome, little scholar!" onRandomize={() => update("dialogue", randomDialogueLine(draft.role ?? "teacher"))} /></Field>
            <Field label="Safety notes" full><TextArea testid="npcs-input-safety" value={draft.safetyNotes ?? ""} onChange={(v) => update("safetyNotes", v)} placeholder="No urgency, no info collection" /></Field>
          </div>
          <button type="button" data-testid="npcs-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioNPC) => (
        <div>
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.role}{i.customRole && ` · ${i.customRole}`} · {i.realm}</p>
          <p className="text-sm italic mt-2">“{i.dialogue}”</p>
          <div className="grid grid-cols-2 gap-1 mt-2">
            <p className="text-[10px] font-bold text-ink-muted">Tone: <b className="text-primary">{i.tone}</b></p>
            <p className="text-[10px] font-bold text-ink-muted">Temperament: <b className="text-primary">{i.temperament}</b></p>
            <p className="text-[10px] font-bold text-ink-muted">Teaching: <b className="text-primary">{i.teachingStyle}</b></p>
            <p className="text-[10px] font-bold text-ink-muted">Humor: <b className="text-primary">{i.humorLevel}</b></p>
            <p className="text-[10px] font-bold text-ink-muted">Formality: <b className="text-primary">{i.formality}</b></p>
            <p className="text-[10px] font-bold text-ink-muted">Encouragement: <b className="text-primary">{i.encouragementStyle}</b></p>
          </div>
          <p className="text-[10px] font-extrabold text-sage mt-2">Safety: {i.safetyNotes}</p>
        </div>
      )}
    />
  );
};

// ============================================================================
// QUESTS (kept lightweight per spec)
// ============================================================================
const QuestsTab: React.FC = () => {
  const items = useStudio((s) => s.quests);
  const npcs = useStudio((s) => s.npcs);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioQuest>>({});
  const update = <K extends keyof StudioQuest>(k: K, v: StudioQuest[K]) => setDraft((d) => ({ ...d, [k]: v }));
  // TODO(roadmap): Quest structure will be revisited after RPG systems mature (chains, branching, multi-NPC, gated rewards).

  const submit = () => {
    const giver = npcs.find((n) => n.id === draft.npcGiverId);
    const m = mockQuestChain(draft.objective);
    const item: StudioQuest = {
      ...m,
      title: draft.title?.trim() || m.title,
      objective: draft.objective ?? m.objective,
      subject: draft.subject ?? m.subject,
      npcGiverId: giver?.id,
      npcGiver: giver?.name ?? draft.npcGiver ?? m.npcGiver,
      rewards: draft.rewards ?? m.rewards,
    };
    addItem("quests", item);
  };

  return (
    <StudioPanel
      testId="quests"
      collection="quests"
      items={items}
      generator={
        <div className="rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6" data-testid="quests-generator">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary"><Wand2 size={18} strokeWidth={3} /></div>
            <div><p className="h-display text-xl leading-tight">Add quest</p><p className="text-sm text-ink-muted">Lightweight for now — chain structure will mature later (TODO).</p></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Quest title"><TextField testid="quests-input-title" value={draft.title ?? ""} onChange={(v) => update("title", v)} placeholder="The Lost Acorn" onRandomize={() => update("title", randomQuestTitle())} /></Field>
            <Field label="Subject / topic"><TextField testid="quests-input-subject" value={draft.subject ?? ""} onChange={(v) => update("subject", v)} placeholder="addition / rhyming" /></Field>
            <Field label="NPC giver" full>
              <SearchSelect testid="quests-input-giver" value={draft.npcGiverId ?? ""}
                onChange={(id) => { const n = npcs.find((x) => x.id === id); update("npcGiverId", id); if (n) update("npcGiver", n.name); }}
                options={npcs.map((n) => ({ id: n.id, label: n.name, sublabel: n.role }))} placeholder="Choose NPC…" />
            </Field>
            <Field label="Objective" full><TextArea testid="quests-input-objective" value={draft.objective ?? ""} onChange={(v) => update("objective", v)} placeholder="Help the meadow keeper recover something lost." /></Field>
            <Field label="Reward" full><TextField testid="quests-input-rewards" value={draft.rewards ?? ""} onChange={(v) => update("rewards", v)} placeholder="20 XP, 10 coins" /></Field>
          </div>
          <button type="button" data-testid="quests-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioQuest) => (
        <div>
          <p className="h-display text-lg">{i.title}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">Subject: {i.subject} · Giver: {i.npcGiver}</p>
          <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.objective}</p>
          {i.steps?.length > 0 && (
            <ul className="text-xs mt-2 list-disc pl-4 space-y-0.5">
              {i.steps.map((s, idx) => <li key={idx}>{s}</li>)}
            </ul>
          )}
          <p className="text-[10px] font-extrabold text-primary mt-2">Rewards: {i.rewards}</p>
        </div>
      )}
    />
  );
};

// ============================================================================
// EVENTS
// ============================================================================
const EventsTab: React.FC = () => {
  const items = useStudio((s) => s.events);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioEvent>>({});
  const update = <K extends keyof StudioEvent>(k: K, v: StudioEvent[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    const item: StudioEvent = {
      ...baseMeta("user"),
      id: "ev-" + Date.now(),
      name: draft.name?.trim() || `Event ${Date.now()}`,
      startDate: draft.startDate || nowISO().slice(0, 10),
      endDate: draft.endDate || nowISO().slice(0, 10),
      rewardType: draft.rewardType ?? "Cosmetic",
      special: draft.special ?? "—",
      community: draft.community ?? "Classroom",
    };
    addItem("events", item);
  };

  return (
    <StudioPanel
      testId="events"
      collection="events"
      items={items}
      generator={
        <div className="rounded-card border-4 border-primary/20 bg-gradient-to-br from-[#F6F1FF] to-[#FFF8DD] p-5 md:p-6" data-testid="events-generator">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white grid place-items-center shadow-btn-primary"><Wand2 size={18} strokeWidth={3} /></div>
            <p className="h-display text-xl leading-tight">Add live event</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Event name"><TextField testid="events-input-name" value={draft.name ?? ""} onChange={(v) => update("name", v)} placeholder="Spring Sparkle Week" /></Field>
            <Field label="Start (YYYY-MM-DD)"><TextField testid="events-input-startDate" value={draft.startDate ?? ""} onChange={(v) => update("startDate", v)} placeholder="2026-04-01" /></Field>
            <Field label="End (YYYY-MM-DD)"><TextField testid="events-input-endDate" value={draft.endDate ?? ""} onChange={(v) => update("endDate", v)} placeholder="2026-04-08" /></Field>
            <Field label="Reward type"><TextField testid="events-input-reward" value={draft.rewardType ?? ""} onChange={(v) => update("rewardType", v)} placeholder="Cosmetic + Egg" /></Field>
            <Field label="Special" full><TextField testid="events-input-special" value={draft.special ?? ""} onChange={(v) => update("special", v)} placeholder="Twinklet egg drop boost" /></Field>
            <Field label="Community / classroom" full><TextField testid="events-input-community" value={draft.community ?? ""} onChange={(v) => update("community", v)} placeholder="Classroom shared sticker board" /></Field>
          </div>
          <button type="button" data-testid="events-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
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

// ============================================================================
// PUBLISH QUEUE
// ============================================================================
const PublishQueueTab: React.FC = () => {
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

  const queue = useMemo(() => [
    { collection: "templates"  as StudioCollectionKey, items: templates.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Template · ${i.templateId}` })) },
    { collection: "avatars"    as StudioCollectionKey, items: avatars.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Avatar · ${i.name}` })) },
    { collection: "companions" as StudioCollectionKey, items: companions.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Companion · ${i.name}` })) },
    { collection: "evolutions" as StudioCollectionKey, items: evolutions.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Evolution · ${i.baseCompanionName} → ${i.evolutionName}` })) },
    { collection: "arts"       as StudioCollectionKey, items: arts.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Art · ${i.companionName}` })) },
    { collection: "assets"     as StudioCollectionKey, items: assets.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Asset · ${i.name}` })) },
    { collection: "realms"     as StudioCollectionKey, items: realms.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Realm · ${i.name}` })) },
    { collection: "battleBgs"  as StudioCollectionKey, items: battleBgs.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Battle BG · ${i.realm}` })) },
    { collection: "scenes"     as StudioCollectionKey, items: scenes.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Scene · ${i.name}` })) },
    { collection: "npcs"       as StudioCollectionKey, items: npcs.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `NPC · ${i.name}` })) },
    { collection: "quests"     as StudioCollectionKey, items: quests.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Quest · ${i.title}` })) },
    { collection: "events"     as StudioCollectionKey, items: events.filter((i) => i.status === "approved").map((i) => ({ id: i.id, label: `Event · ${i.name}` })) },
  ], [templates, avatars, companions, evolutions, arts, assets, realms, battleBgs, scenes, npcs, quests, events]);

  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  const toggle = (col: StudioCollectionKey, id: string) => {
    setSelected((s) => { const next = { ...s }; const set = new Set(next[col] ?? []); if (set.has(id)) set.delete(id); else set.add(id); next[col] = set; return next; });
  };

  const totalApproved = queue.reduce((acc, g) => acc + g.items.length, 0);
  const totalSelected = Object.values(selected).reduce((acc, s) => acc + (s ? s.size : 0), 0);

  const act = (status: StudioStatus) => {
    Object.entries(selected).forEach(([col, set]) => { if (set && set.size) bulk(col as StudioCollectionKey, Array.from(set), status); });
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
            <button data-testid="queue-publish-selected" disabled={totalSelected === 0} onClick={() => act("published")} className="btn-primary !text-sm !py-2 !px-4 disabled:opacity-40">
              <Send size={14} strokeWidth={3} /> Publish selected
            </button>
            <button data-testid="queue-archive-selected" disabled={totalSelected === 0} onClick={() => act("archived")} className="btn-ghost !text-sm !py-2 !px-4 disabled:opacity-40">
              Archive selected
            </button>
          </div>
        </div>
      </Card>

      {queue.every((g) => g.items.length === 0) ? (
        <Card className="text-center"><p className="h-display text-xl">No approved items waiting.</p><p className="text-ink-muted text-sm">Approve items in any tab to queue them.</p></Card>
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
                    <label key={it.id} data-testid={`queue-item-${it.id}`}
                      className={cn("flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition",
                        isSel ? "bg-primary/10 border-primary/40" : "bg-bg border-white hover:border-primary/40")}>
                      <input type="checkbox" data-testid={`queue-check-${it.id}`} checked={!!isSel} onChange={() => toggle(g.collection, it.id)} className="w-5 h-5 accent-primary" />
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
