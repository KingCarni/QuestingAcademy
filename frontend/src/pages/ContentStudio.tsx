import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { Card } from "../components/Card";
import { StudioPanel } from "../components/studio/StudioPanel";
import { StatusChip } from "../components/studio/StatusChip";
import {
  Field, TextField, TextArea, SelectField, NumberField, ColorField,
  SearchSelect, MultiSelectChips, StylePresetPicker,
} from "../components/studio/FormFields";
import { useStudio } from "../lib/studioStore";
import { ALL_TEMPLATES, generateQuestion } from "../lib/questionEngine";
import {
  mockRealmConcept, mockQuestChain,
  mockBattleBackground, mockCompanionArt, mockNanoBananaGenerateImage, baseMeta, nowISO,
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


type StudioViewEditButtonProps = {
  collection: StudioCollectionKey;
  item: any;
  title: string;
  imageUrl?: string;
};

const getEditableStudioFields = (collection: StudioCollectionKey, item: any): { key: string; label: string; multiline?: boolean }[] => {
  const common = [{ key: "notes", label: "Internal notes", multiline: true }];

  if (collection === "avatars") return [
    { key: "name", label: "Name" },
    { key: "description", label: "Description", multiline: true },
    { key: "promptUsed", label: "Prompt used", multiline: true },
    ...common,
  ];

  if (collection === "companions") return [
    { key: "name", label: "Name" },
    { key: "personality", label: "Personality" },
    { key: "lore", label: "Lore", multiline: true },
    { key: "academyAffinity", label: "Academy affinity" },
    { key: "promptUsed", label: "Prompt used", multiline: true },
    ...common,
  ];

  if (collection === "evolutions") return [
    { key: "evolutionName", label: "Evolution name" },
    { key: "lore", label: "Lore", multiline: true },
    { key: "unlockCondition", label: "Unlock condition" },
    { key: "academyInfluence", label: "Academy influence" },
    { key: "visualNotes", label: "Visual notes", multiline: true },
    { key: "statGrowthNotes", label: "Stat growth notes" },
    { key: "promptUsed", label: "Prompt used", multiline: true },
    ...common,
  ];

  if (collection === "assets") return [
    { key: "name", label: "Name" },
    { key: "description", label: "Description", multiline: true },
    { key: "promptUsed", label: "Prompt used", multiline: true },
    ...common,
  ];

  if (collection === "realms") return [
    { key: "name", label: "Realm name" },
    { key: "biome", label: "Biome" },
    { key: "description", label: "Description", multiline: true },
    { key: "mapNotes", label: "Map notes", multiline: true },
    { key: "battleBackgroundSet", label: "Battle background set" },
    { key: "promptUsed", label: "Prompt used", multiline: true },
    ...common,
  ];

  if (collection === "battleBgs") return [
    { key: "realm", label: "Realm display name" },
    { key: "environment", label: "Environment" },
    { key: "prompt", label: "Scene prompt", multiline: true },
    { key: "promptUsed", label: "Prompt used", multiline: true },
    ...common,
  ];

  if (collection === "scenes") return [
    { key: "name", label: "Scene name" },
    { key: "realm", label: "Realm display name" },
    { key: "visualPrompt", label: "Visual prompt", multiline: true },
    { key: "promptUsed", label: "Prompt used", multiline: true },
    ...common,
  ];

  if (collection === "npcs") return [
    { key: "name", label: "Name" },
    { key: "customRole", label: "Custom role" },
    { key: "realm", label: "Realm display name" },
    { key: "dialogue", label: "Sample dialogue", multiline: true },
    { key: "safetyNotes", label: "Safety notes", multiline: true },
    { key: "promptUsed", label: "Prompt used", multiline: true },
    ...common,
  ];

  return common;
};

const getStudioItemTitle = (item: any): string =>
  item.name || item.title || item.evolutionName || item.realm || item.companionName || item.id || "Studio item";

const StudioViewEditButton: React.FC<StudioViewEditButtonProps> = ({ collection, item, title, imageUrl }) => {
  const updateItem = useStudio((s) => s.updateItem);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const editableFields = useMemo(() => getEditableStudioFields(collection, item), [collection, item]);
  const [form, setForm] = useState<Record<string, string>>({});

  const resetForm = () => {
    const next: Record<string, string> = {};
    editableFields.forEach((f) => {
      const value = item[f.key];
      next[f.key] = value === undefined || value === null ? "" : String(value);
    });
    setForm(next);
  };

  const openModal = () => {
    resetForm();
    setEdit(false);
    setOpen(true);
  };

  const save = () => {
    const patch: Record<string, string> = {};
    editableFields.forEach((f) => {
      patch[f.key] = form[f.key] ?? "";
    });
    updateItem(collection, item.id, { ...patch, updatedAt: new Date().toISOString() });
    setEdit(false);
  };

  const startEdit = () => {
    resetForm();
    setEdit(true);
  };

  const cancelEdit = () => {
    resetForm();
    setEdit(false);
  };

  const displayTitle = getStudioItemTitle({ ...item, ...form }) || title;

  return (
    <>
      <button type="button" onClick={openModal} className="btn-outline !text-xs !py-1.5 !px-3 mt-3 w-full">
        <Eye size={13} strokeWidth={3} /> View / Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl border-4 border-white shadow-2xl max-w-4xl w-full max-h-[88vh] overflow-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-primary">Studio card preview</p>
                <h3 className="h-display text-2xl leading-tight">{displayTitle}</h3>
                <p className="text-xs font-extrabold uppercase text-ink-muted">{collection} · {item.status}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost !text-sm !py-2 !px-4">Close</button>
            </div>

            {imageUrl && (
              <div className="mt-4">
                <button type="button" onClick={() => setFullscreenImage(true)} className="group block w-full text-left">
                  <img src={imageUrl} alt={`${displayTitle} full preview`} className="w-full max-h-[420px] object-cover rounded-2xl border-4 border-white shadow-lg transition group-hover:brightness-95" />
                </button>
                <button type="button" onClick={() => setFullscreenImage(true)} className="btn-outline !text-xs !py-1.5 !px-3 mt-2">
                  <Eye size={13} strokeWidth={3} /> View image fullscreen
                </button>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-3 mt-4">
              <div className="rounded-2xl bg-bg border-2 border-white p-3">
                <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-1">Core metadata</p>
                <p className="text-xs"><b>ID:</b> {item.id}</p>
                <p className="text-xs"><b>Status:</b> {item.status}</p>
                <p className="text-xs"><b>Provider:</b> {item.imageProvider ?? "—"}</p>
                <p className="text-xs"><b>Created:</b> {item.createdAt ?? "—"}</p>
                <p className="text-xs"><b>Updated:</b> {item.updatedAt ?? "—"}</p>
              </div>

              <div className="rounded-2xl bg-bg border-2 border-white p-3">
                <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-1">Safe editable fields</p>
                <p className="text-xs text-ink-muted">
                  IDs, statuses, timestamps, linked relationships, and generated provenance stay locked for now.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-bg border-2 border-white p-3 mt-3">
              <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-2">{edit ? "Edit fields" : "Editable content"}</p>
              <div className="grid md:grid-cols-2 gap-3">
                {editableFields.map((f) => (
                  <div key={f.key} className={f.multiline ? "md:col-span-2" : ""}>
                    <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-1">{f.label}</p>
                    {edit ? (
                      f.multiline ? (
                        <TextArea
                          testid={`view-edit-${item.id}-${f.key}`}
                          value={form[f.key] ?? ""}
                          onChange={(v) => setForm((m) => ({ ...m, [f.key]: v }))}
                          placeholder={f.label}
                        />
                      ) : (
                        <TextField
                          testid={`view-edit-${item.id}-${f.key}`}
                          value={form[f.key] ?? ""}
                          onChange={(v) => setForm((m) => ({ ...m, [f.key]: v }))}
                          placeholder={f.label}
                        />
                      )
                    ) : (
                      <p className="text-xs text-ink-muted whitespace-pre-wrap">{String(item[f.key] ?? "") || "—"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-bg border-2 border-white p-3 mt-3">
              <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-1">Raw card data</p>
              <pre className="text-[10px] overflow-auto max-h-48 whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {edit ? (
                <>
                  <button type="button" onClick={save} className="btn-primary !text-sm !py-2 !px-4">Save edits</button>
                  <button type="button" onClick={cancelEdit} className="btn-ghost !text-sm !py-2 !px-4">Cancel</button>
                </>
              ) : (
                <button type="button" onClick={startEdit} className="btn-primary !text-sm !py-2 !px-4">Edit fields</button>
              )}
            </div>
          </div>
        </div>
      )}

      {fullscreenImage && imageUrl && (
        <div className="fixed inset-0 z-[60] bg-black/85 p-4 flex items-center justify-center" role="dialog" aria-modal="true">
          <button type="button" onClick={() => setFullscreenImage(false)} className="absolute top-4 right-4 btn-ghost !bg-white !text-ink !text-sm !py-2 !px-4">Close</button>
          <img src={imageUrl} alt={`${displayTitle} fullscreen`} className="max-w-[95vw] max-h-[92vh] object-contain rounded-2xl shadow-2xl" />
        </div>
      )}
    </>
  );
};



type GeneratedImagePreview = {
  url: string;
  prompt: string;
  provider: string;
};

type ImageLoadStatus = "idle" | "generating" | "loading" | "ready" | "error";

const ImagePreviewWorkflow: React.FC<{
  testid: string;
  title: string;
  helper: string;
  generatedPreview: GeneratedImagePreview | null;
  savedPreview: GeneratedImagePreview | null;
  onGenerate: () => void;
  onSave: () => void;
  onDiscard: () => void;
  disabled?: boolean;
  imageClassName?: string;
}> = ({ testid, title, helper, generatedPreview, savedPreview, onGenerate, onSave, onDiscard, disabled, imageClassName }) => {
  const [status, setStatus] = useState<ImageLoadStatus>("idle");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!generatedPreview?.url) {
      setStatus("idle");
      setAttempt(0);
      return;
    }
    setStatus("generating");
    setAttempt(1);
  }, [generatedPreview?.url]);

  useEffect(() => {
    if (!generatedPreview?.url || attempt <= 0) return;
    let cancelled = false;
    const loadingTimeout = window.setTimeout(() => {
      if (!cancelled && status !== "ready") setStatus("loading");
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimeout);
    };
  }, [generatedPreview?.url, attempt, status]);

  const scheduleRetry = () => {
    if (attempt >= 8) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    window.setTimeout(() => setAttempt((n) => n + 1), 900);
  };

  const retryLoad = () => {
    if (!generatedPreview?.url) return;
    setStatus("loading");
    setAttempt((n) => n + 1);
  };

  const handleGenerate = () => {
    setStatus("generating");
    setAttempt(0);
    onGenerate();
  };

  const handleDiscard = () => {
    setStatus("idle");
    setAttempt(0);
    onDiscard();
  };

  const isBusy = status === "generating" || status === "loading";
  const isReady = status === "ready";
  const cacheBustedUrl = generatedPreview?.url ? `${generatedPreview.url}${generatedPreview.url.includes("?") ? "&" : "?"}qaRetry=${attempt}` : "";

  return (
    <div className="mt-4 rounded-3xl bg-white/70 border-4 border-white p-4" data-testid={testid}>
      <div className="flex flex-wrap justify-between gap-3 items-start">
        <div>
          <p className="h-display text-lg leading-tight">{title}</p>
          <p className="text-xs text-ink-muted">{helper}</p>
          {savedPreview && (
            <p className="text-[10px] font-extrabold uppercase text-sage mt-2">Image saved to draft — it will attach when this item is sent to review.</p>
          )}
        </div>
        <button type="button" data-testid={`${testid}-generate`} onClick={handleGenerate} disabled={disabled || isBusy} className="btn-outline !text-sm !py-2 !px-4 disabled:opacity-40">
          <Wand2 size={14} strokeWidth={3} /> {isBusy ? "Generating..." : "Generate image preview"}
        </button>
      </div>

      {generatedPreview ? (
        <div className="mt-4 grid md:grid-cols-[260px,1fr] gap-4 items-start">
          <div className="relative w-full max-w-[260px]">
            {status !== "ready" && (
              <div className="absolute inset-0 z-10 rounded-2xl bg-white/85 border-4 border-white shadow-lg grid place-items-center text-center p-4">
                <div>
                  <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto" />
                  <p className="text-xs font-extrabold text-ink mt-3">{status === "error" ? "Image still queued" : "Generating preview..."}</p>
                  <p className="text-[10px] text-ink-muted mt-1">The provider may need a few seconds before the image is ready.</p>
                  {status === "error" && (
                    <button type="button" onClick={retryLoad} className="btn-outline !text-xs !py-1.5 !px-3 mt-3">Retry image load</button>
                  )}
                </div>
              </div>
            )}
            <img
              key={`${generatedPreview.url}-${attempt}`}
              src={cacheBustedUrl}
              alt="Generated preview"
              onLoad={() => setStatus("ready")}
              onError={scheduleRetry}
              className={cn("w-full object-cover rounded-2xl border-4 border-white shadow-lg", imageClassName ?? "aspect-square")}
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-1">Prompt used</p>
            <p className="text-xs text-ink-muted bg-bg border-2 border-white rounded-2xl p-3 max-h-32 overflow-auto">{generatedPreview.prompt}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {isReady && <button type="button" data-testid={`${testid}-save`} onClick={onSave} className="btn-primary !text-sm !py-2 !px-4">Save image to draft</button>}
              {status === "error" && <button type="button" onClick={handleGenerate} className="btn-outline !text-sm !py-2 !px-4">Regenerate</button>}
              <button type="button" data-testid={`${testid}-discard`} onClick={handleDiscard} className="btn-ghost !text-sm !py-2 !px-4">Discard</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-bg border-2 border-white p-4 text-sm text-ink-muted">
          No generated image yet. Generate a preview when the fields are ready. Nothing is saved automatically.
        </div>
      )}
    </div>
  );
};

// ============================================================================
// AVATARS
// ============================================================================
// ============================================================================
// AVATARS
// ============================================================================
type AvatarGeneratedPreview = {
  url: string;
  prompt: string;
  provider: string;
};

const buildAvatarImagePrompt = (draft: Partial<StudioAvatar>): string => {
  const name = draft.name?.trim() || "unnamed avatar asset";
  const category = draft.category || "accessory";
  const rarity = draft.rarity || "common";
  const previewColor = draft.previewColor || "#9D8DF1";
  const description = draft.description || "A cheerful Questing Academy avatar customization item.";

  const categoryDetails =
    category === "hair"
      ? `Hair details: ${draft.hair?.length || "medium"} length, ${draft.hair?.style || "soft fantasy"} style, ${draft.hair?.texture || "wavy"} texture, color ${draft.hair?.color || previewColor}.`
      : category === "outfit"
        ? `Outfit details: ${draft.outfit?.outfitType || "academy outfit"}, theme ${draft.outfit?.theme || "cozy magical"}, primary color ${draft.outfit?.primaryColor || previewColor}, secondary color ${draft.outfit?.secondaryColor || "#F4C753"}, trim ${draft.outfit?.trim || "soft decorative trim"}.`
        : category === "accessory"
          ? `Accessory details: ${draft.accessory?.accessoryType || "fantasy accessory"}, placement ${draft.accessory?.placement || "head"}, material ${draft.accessory?.material || "crystal"}, color ${draft.accessory?.color || previewColor}.`
          : `Avatar part details: ${category}, color ${previewColor}.`;

  return [
    `Create a Questing Academy avatar asset concept for ${name}.`,
    `Asset category: ${category}. Rarity: ${rarity}.`,
    categoryDetails,
    `Description: ${description}.`,
    "Style rules: cute chibi educational fantasy RPG avatar customization item, centered in frame, clean readable silhouette, soft rounded shapes, cozy storybook watercolor, pastel colors, child-safe for ages 5-12, simple light background, game UI asset presentation.",
    "For hair/outfit/cape/back-item categories, show the item clearly as a wearable avatar part, not a full scene. For accessories, show the item large enough to read with clear shape language.",
    "Negative rules: no text, no watermark, no cropped object, no realistic violence, no horror, no weapons, no dark scary mood, no photorealism.",
  ].join(" ");
};

const AvatarsTab: React.FC = () => {
  const items = useStudio((s) => s.avatars);
  const addItem = useStudio((s) => s.addItem);
  const addPalette = useStudio((s) => s.addPalette);
  const [draft, setDraft] = useState<Partial<StudioAvatar>>({ category: "hair", rarity: "common", previewColor: "#9D8DF1" });
  const [generatedPreview, setGeneratedPreview] = useState<AvatarGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<AvatarGeneratedPreview | null>(null);

  const update = <K extends keyof StudioAvatar>(k: K, v: StudioAvatar[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSavePalette = (hex: string) => {
    addPalette({ id: "pal-user-" + Date.now(), name: `Saved ${hex}`, colors: [hex], createdAt: new Date().toISOString() });
  };

  const generateImagePreview = () => {
    const prompt = buildAvatarImagePrompt(draft);
    const url = mockNanoBananaGenerateImage(prompt, { from: draft.previewColor ?? "#9D8DF1", to: "#FFF8DD" });
    setGeneratedPreview({ url, prompt, provider: "prototype-generator" });
    setSavedPreview(null);
  };

  const saveGeneratedPreview = () => {
    if (!generatedPreview) return;
    setSavedPreview(generatedPreview);
  };

  const discardGeneratedPreview = () => {
    setGeneratedPreview(null);
    setSavedPreview(null);
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
      previewUrl: savedPreview?.url,
      promptUsed: savedPreview?.prompt,
      imageProvider: savedPreview?.provider,
      hair: draft.hair,
      outfit: draft.outfit,
      accessory: draft.accessory,
    };
    addItem("avatars", item);
    setGeneratedPreview(null);
    setSavedPreview(null);
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

          <div className="mt-4 flex flex-wrap items-start gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-1">Standard preview</p>
              <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg" style={{ background: draft.previewColor ?? "#9D8DF1" }} aria-hidden />
            </div>
            {savedPreview && (
              <div className="rounded-2xl bg-sage/10 border-2 border-sage/30 px-3 py-2">
                <p className="text-[10px] font-extrabold uppercase text-sage">Image saved to draft</p>
                <p className="text-xs text-ink-muted">It will attach when you add this avatar asset.</p>
              </div>
            )}
          </div>

          <ImagePreviewWorkflow
            testid="avatars-image-generator"
            title="Generated avatar image preview"
            helper="Generate from this avatar draft, then save or discard before adding it to review."
            generatedPreview={generatedPreview}
            savedPreview={savedPreview}
            onGenerate={generateImagePreview}
            onSave={saveGeneratedPreview}
            onDiscard={discardGeneratedPreview}
            disabled={false}
            imageClassName="aspect-square"
          />

          <button type="button" data-testid="avatars-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Add to review
          </button>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted mt-3">New items enter <span className="text-primary">Pending Review</span> — never live.</p>
        </div>
      }
      renderItem={(i: StudioAvatar) => (
        <div className="flex gap-3">
          {i.previewUrl ? (
            <img src={i.previewUrl} alt={`${i.name} avatar asset`} className="w-16 h-16 object-cover rounded-2xl border-4 border-white shrink-0 shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-2xl border-4 border-white shrink-0" style={{ background: i.previewColor }} aria-hidden />
          )}
          <div className="min-w-0">
            <p className="h-display text-lg truncate">{i.name}</p>
            <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.category.replace("-"," ")} · {i.rarity}</p>
            {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {i.imageProvider ?? "prototype"}</p>}
            {i.description && <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>}
            {i.hair?.style && <p className="text-[10px] font-bold text-primary mt-1">Hair: {i.hair.style}, {i.hair.length}, {i.hair.texture}</p>}
            {i.outfit?.outfitType && <p className="text-[10px] font-bold text-primary mt-1">Outfit: {i.outfit.outfitType} · {i.outfit.theme}</p>}
            {i.accessory?.accessoryType && <p className="text-[10px] font-bold text-primary mt-1">Acc: {i.accessory.accessoryType} @ {i.accessory.placement}</p>}
            <StudioViewEditButton collection="avatars" item={i} title={i.name} imageUrl={i.previewUrl} />
          </div>
        </div>
      )}
    />
  );
};

// ============================================================================
// COMPANIONS (Pets)
// ============================================================================
type CompanionGeneratedPreview = {
  url: string;
  prompt: string;
  provider: string;
};

const buildCompanionImagePrompt = (draft: Partial<StudioCompanion>): string => {
  const name = draft.name?.trim() || "unnamed companion";
  const affinity = draft.affinity || "nature";
  const rarity = draft.rarity || "common";
  const role = draft.role || "balanced";
  const academy = draft.academyAffinity || "addition";
  const personality = draft.personality || "friendly, brave, emotionally appealing";
  const lore = draft.lore || "A kind companion who helps kids feel excited to learn.";
  const moves = (draft.moves ?? ["Pat", "Hug", "Shield"]).join(", ");
  const palette = draft.palette ?? { from: "#E8F4E1", to: "#86A789" };
  const shiny = draft.shinyEnabled && draft.shinyPalette
    ? `Optional shiny recolor palette ${draft.shinyPalette.from} to ${draft.shinyPalette.to}; same design, no stat or shape changes.`
    : "No shiny variant needed for this image.";

  return [
    `Create a Questing Academy companion concept for ${name}.`,
    `Creature type: cute chibi educational fantasy RPG pet companion, not a human.`,
    `Affinity/element: ${affinity}. Rarity: ${rarity}. Battle role: ${role}. Academy learning affinity: ${academy}.`,
    `Personality: ${personality}.`,
    `Lore: ${lore}.`,
    `Move inspirations: ${moves}.`,
    `Use palette from ${palette.from} to ${palette.to}.`,
    shiny,
    "Style rules: full body visible, centered in frame, big expressive eyes, rounded soft shapes, cozy storybook watercolor, pastel colors, child-safe for ages 5-12, friendly expression, clean readable silhouette, simple light background.",
    "Negative rules: no text, no watermark, no cropped character, no realistic animal violence, no horror, no weapons, no dark scary mood, no photorealism.",
  ].join(" ");
};

const CompanionsTab: React.FC = () => {
  const items = useStudio((s) => s.companions);
  const addItem = useStudio((s) => s.addItem);
  const [generatedPreview, setGeneratedPreview] = useState<CompanionGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<CompanionGeneratedPreview | null>(null);
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
    setGeneratedPreview(null);
    setSavedPreview(null);
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

  const generateImagePreview = () => {
    const prompt = buildCompanionImagePrompt(draft);
    const url = mockNanoBananaGenerateImage(prompt, draft.palette);
    setGeneratedPreview({ url, prompt, provider: "prototype-generator" });
    setSavedPreview(null);
  };

  const saveGeneratedPreview = () => {
    if (!generatedPreview) return;
    setSavedPreview(generatedPreview);
  };

  const discardGeneratedPreview = () => {
    setGeneratedPreview(null);
    setSavedPreview(null);
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
      previewUrl: savedPreview?.url,
      promptUsed: savedPreview?.prompt,
      imageProvider: savedPreview?.provider,
    };
    addItem("companions", item);
    setGeneratedPreview(null);
    setSavedPreview(null);
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
            <Field label="Personality" full><TextField testid="companions-input-personality" value={draft.personality ?? ""} onChange={(v) => update("personality", v)} placeholder="friendly support / bold defender / playful trickster" /></Field>
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
          <div className="mt-4 flex flex-wrap items-start gap-4">
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
            {savedPreview && (
              <div className="rounded-2xl bg-sage/10 border-2 border-sage/30 px-3 py-2">
                <p className="text-[10px] font-extrabold uppercase text-sage">Image saved to draft</p>
                <p className="text-xs text-ink-muted">It will attach when you add this companion concept.</p>
              </div>
            )}
          </div>

          <ImagePreviewWorkflow
            testid="companions-image-generator"
            title="Generated image preview"
            helper="Generate from this companion draft, then save or discard before adding it to review."
            generatedPreview={generatedPreview}
            savedPreview={savedPreview}
            onGenerate={generateImagePreview}
            onSave={saveGeneratedPreview}
            onDiscard={discardGeneratedPreview}
            disabled={false}
            imageClassName="aspect-square"
          />

          <button type="button" data-testid="companions-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Add companion concept
          </button>
        </div>
      }
      renderItem={(i: StudioCompanion) => (
        <div>
          <div className="flex items-start gap-3">
            {i.previewUrl ? (
              <img src={i.previewUrl} alt={`${i.name} companion art`} className="w-16 h-16 object-cover rounded-2xl border-4 border-white shrink-0 shadow-lg" />
            ) : (
              <CompanionDot emoji={i.emoji} palette={i.palette} size={64} />
            )}
            <div className="min-w-0 flex-1">
              <p className="h-display text-lg truncate">{i.name}</p>
              <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.affinity} · {i.role} · {i.rarity}</p>
              <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.lore}</p>
              {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {i.imageProvider ?? "prototype"}</p>}
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
          <StudioViewEditButton collection="companions" item={i} title={i.name} imageUrl={i.previewUrl} />
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
type EvolutionGeneratedPreview = {
  url: string;
  prompt: string;
  provider: string;
};

const buildEvolutionImagePrompt = (draft: Partial<StudioEvolution>, baseCompanion?: StudioCompanion): string => {
  const baseName = baseCompanion?.name || draft.baseCompanionName || "unnamed base companion";
  const evolutionName = draft.evolutionName?.trim() || `${baseName} evolved form`;
  const stage = draft.stageNumber ?? 2;
  const affinity = baseCompanion?.affinity || "fantasy";
  const role = baseCompanion?.role || "balanced";
  const rarity = baseCompanion?.rarity || "common";
  const academy = draft.academyInfluence || baseCompanion?.academyAffinity || "addition";
  const lore = draft.lore || `As ${baseName} grows, its powers bloom into a new friendly form.`;
  const unlock = draft.unlockCondition || "Unlocked through steady learning progress.";
  const visual = draft.visualNotes || "Keep the same cute companion family, but slightly more advanced and magical.";
  const stats = draft.statGrowthNotes || "Stronger, more confident, but still approachable and child-safe.";
  const palette = baseCompanion?.palette;
  const paletteText = palette ? `Use a related palette from ${palette.from} to ${palette.to}, preserving visual ancestry from the base companion.` : "Use a soft pastel palette that clearly relates to the base companion.";
  const basePrompt = baseCompanion?.promptUsed ? `Base companion image prompt context: ${baseCompanion.promptUsed}` : "";

  return [
    `Create a Questing Academy evolution concept for ${evolutionName}.`,
    `This is stage ${stage} evolved form of ${baseName}; keep recognizable visual ancestry from the base companion, not a totally unrelated creature.`,
    `Base companion context: affinity/element ${affinity}, rarity ${rarity}, battle role ${role}. Academy learning influence: ${academy}.`,
    `Evolution lore: ${lore}.`,
    `Unlock condition inspiration: ${unlock}.`,
    `Visual direction: ${visual}.`,
    `Stat growth feeling: ${stats}.`,
    paletteText,
    basePrompt,
    "Style rules: cute chibi educational fantasy RPG pet companion, full body visible, centered in frame, big expressive eyes, rounded soft shapes, slightly more mature and magical than the base form but still friendly, cozy storybook watercolor, pastel colors, child-safe for ages 5-12, clean readable silhouette, simple light background.",
    "Negative rules: no text, no watermark, no cropped character, no realistic animal violence, no horror, no weapons, no dark scary mood, no photorealism.",
  ].filter(Boolean).join(" ");
};

const EvolutionsTab: React.FC = () => {
  const items = useStudio((s) => s.evolutions);
  const companions = useStudio((s) => s.companions);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioEvolution>>({ stageNumber: 2 });
  const [generatedPreview, setGeneratedPreview] = useState<EvolutionGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<EvolutionGeneratedPreview | null>(null);
  const update = <K extends keyof StudioEvolution>(k: K, v: StudioEvolution[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const baseCompanion = companions.find((c) => c.id === draft.baseCompanionId);

  const randomize = () => {
    const c = companions[Math.floor(Math.random() * companions.length)];
    if (!c) return;
    setGeneratedPreview(null);
    setSavedPreview(null);
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

  const generateImagePreview = () => {
    if (!baseCompanion && !draft.baseCompanionName) return;
    const prompt = buildEvolutionImagePrompt(draft, baseCompanion);
    const url = mockNanoBananaGenerateImage(prompt, baseCompanion?.palette);
    setGeneratedPreview({ url, prompt, provider: "prototype-generator" });
    setSavedPreview(null);
  };

  const saveGeneratedPreview = () => {
    if (!generatedPreview) return;
    setSavedPreview(generatedPreview);
  };

  const discardGeneratedPreview = () => {
    setGeneratedPreview(null);
    setSavedPreview(null);
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
      previewUrl: savedPreview?.url,
      promptUsed: savedPreview?.prompt,
      imageProvider: savedPreview?.provider,
    };
    addItem("evolutions", item);
    setDraft({ stageNumber: 2 });
    setGeneratedPreview(null);
    setSavedPreview(null);
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
                onChange={(id) => { const c = companions.find((x) => x.id === id); setGeneratedPreview(null); setSavedPreview(null); update("baseCompanionId", id); if (c) update("baseCompanionName", c.name); }}
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

          <ImagePreviewWorkflow
            testid="evolutions-image-generator"
            title="Generated evolution image preview"
            helper="Generate from this evolution draft, then save or discard before sending it to review."
            generatedPreview={generatedPreview}
            savedPreview={savedPreview}
            onGenerate={generateImagePreview}
            onSave={saveGeneratedPreview}
            onDiscard={discardGeneratedPreview}
            disabled={!draft.baseCompanionId && !draft.baseCompanionName}
            imageClassName="aspect-square"
          />

          <button type="button" data-testid="evolutions-generate-btn" onClick={submit} disabled={!draft.baseCompanionId} className="btn-primary mt-4 !text-base !py-3 !px-6 disabled:opacity-40">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioEvolution) => (
        <div>
          {i.previewUrl && (
            <img src={i.previewUrl} alt={`${i.evolutionName} evolution art`} className="w-full h-40 object-cover rounded-xl border-2 border-white mb-2" />
          )}
          <p className="h-display text-lg">{i.evolutionName} <span className="text-xs font-extrabold uppercase text-ink-muted">Stage {i.stageNumber}</span></p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">Base: {i.baseCompanionName} · Academy: {i.academyInfluence}</p>
          {i.previewUrl && (
            <p className="text-[10px] font-extrabold text-sage mt-1">
              Generated image attached · {i.imageProvider ?? "prototype"}
            </p>
          )}
          <p className="text-xs text-ink-muted mt-2 line-clamp-2">{i.lore}</p>
          <p className="text-[10px] font-bold text-primary mt-2">Unlock: {i.unlockCondition}</p>
          <p className="text-[10px] font-bold text-primary">Visual: {i.visualNotes}</p>
          <p className="text-[10px] font-bold text-primary">Stats: {i.statGrowthNotes}</p>
          <StudioViewEditButton collection="evolutions" item={i} title={i.evolutionName} imageUrl={i.previewUrl} />
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
type AssetGeneratedPreview = {
  url: string;
  prompt: string;
  provider: string;
};

const buildAssetImagePrompt = (draft: Partial<StudioAsset>): string => {
  const name = draft.name?.trim() || `unnamed ${draft.kind || "asset"}`;
  const kind = draft.kind || "icon";
  const previewColor = draft.previewColor || "#9D8DF1";
  const description = draft.description || "A cheerful Questing Academy visual game asset.";

  const baseStyle =
    "Style rules: cute chibi educational fantasy RPG game asset, centered in frame, clean readable silhouette, soft rounded shapes, cozy storybook watercolor, pastel colors, child-safe for ages 5-12, simple light background, game UI asset presentation.";

  const negativeRules =
    "Negative rules: no text, no watermark, no cropped object, no realistic violence, no horror, no weapons, no dark scary mood, no photorealism.";

  if (kind === "egg") {
    return [
      `Create a Questing Academy collectible companion egg concept for ${name}.`,
      "Asset kind: egg.",
      `Egg details: rarity ${draft.egg?.rarity || "common"}, base color ${draft.egg?.baseColor || previewColor}, accent color ${draft.egg?.accentColor || "#7BB7D6"}, glow effect ${draft.egg?.glowEffect || "soft"}, hatch category ${draft.egg?.hatchCategory || "friendly companion"}, companion family ${draft.egg?.companionFamily || "academy pets"}, event tag ${draft.egg?.eventTag || "none"}, shiny chance ${draft.egg?.shinyChance ?? 4} percent.`,
      `Description: ${description}.`,
      "Show one single full egg object only, large and centered, with decorative markings and a readable silhouette. Do not show a sheet of multiple eggs unless the name specifically asks for a set.",
      baseStyle,
      negativeRules,
    ].join(" ");
  }

  if (kind === "badge" || kind === "sticker") {
    return [
      `Create a Questing Academy ${kind} concept for ${name}.`,
      `Asset kind: ${kind}.`,
      `Badge/sticker details: badge type ${draft.badge?.badgeType || "achievement"}, achievement category ${draft.badge?.achievementCategory || "learning milestone"}, icon shape ${draft.badge?.iconShape || "star"}, rarity ${draft.badge?.rarity || "common"}.`,
      `Description: ${description}.`,
      `Depict the named ${kind} directly. Show one clear ${kind}, large and centered, readable at small UI size. Do not show eggs, currencies, props, or a multi-item sheet.`,
      baseStyle,
      negativeRules,
    ].join(" ");
  }

  if (kind === "icon") {
    return [
      `Create a Questing Academy game UI icon concept for ${name}.`,
      "Asset kind: icon.",
      `Icon object/concept to depict: ${name}.`,
      `Primary color direction: ${previewColor}.`,
      `Description: ${description}.`,
      "Depict the named object or concept directly as one single readable icon. Make the object large, centered, and easy to recognize at small UI size",
      baseStyle,
      negativeRules,
    ].join(" ");
  }

  if (kind === "currency") {
    return [
      `Create a Questing Academy currency icon concept for ${name}.`,
      "Asset kind: currency.",
      `Currency color direction: ${previewColor}.`,
      `Description: ${description}.`,
      "Show one single collectible reward currency object, large and centered, readable at game UI size. It may look like a coin, gem, token, star shard, or magical currency based on the name. Do not show eggs, badges, stickers, props, or a multi-item sheet.",
      baseStyle,
      negativeRules,
    ].join(" ");
  }

  if (kind === "academy-room-prop") {
    return [
      `Create a Questing Academy room prop concept for ${name}.`,
      "Asset kind: academy-room-prop.",
      `Prop color direction: ${previewColor}.`,
      `Description: ${description}.`,
      "Show one cozy academy classroom or town-room object, large and centered, clearly separated from any background scene. Do not show eggs, badges, stickers, currencies, characters, or a multi-item sheet.",
      baseStyle,
      negativeRules,
    ].join(" ");
  }

  if (kind === "cosmetic") {
    return [
      `Create a Questing Academy cosmetic item concept for ${name}.`,
      "Asset kind: cosmetic.",
      `Cosmetic color direction: ${previewColor}.`,
      `Description: ${description}.`,
      "Show one wearable or decorative player customization item, large and centered, with a clear silhouette. Do not show eggs, badges, stickers, currencies, characters wearing the item, or a multi-item sheet.",
      baseStyle,
      negativeRules,
    ].join(" ");
  }

  if (kind === "ui-decoration") {
    return [
      `Create a Questing Academy UI decoration concept for ${name}.`,
      "Asset kind: ui-decoration.",
      `Decoration color direction: ${previewColor}.`,
      `Description: ${description}.`,
      "Show one polished interface ornament or decorative UI element, large and centered, readable at small size. Do not show eggs, badges, stickers, currencies, props, characters, or a multi-item sheet.",
      baseStyle,
      negativeRules,
    ].join(" ");
  }

  return [
    `Create a Questing Academy visual asset concept for ${name}.`,
    `Asset kind: ${kind}.`,
    `Primary color direction: ${previewColor}.`,
    `Description: ${description}.`,
    "Depict the named asset directly as one single clear object, large and centered, readable at small UI size. Do not show unrelated asset categories or a multi-item sheet.",
    baseStyle,
    negativeRules,
  ].join(" ");
};

const AssetsTab: React.FC = () => {
  const items = useStudio((s) => s.assets);
  const addItem = useStudio((s) => s.addItem);
  const addPalette = useStudio((s) => s.addPalette);
  const [draft, setDraft] = useState<Partial<StudioAsset>>({ kind: "icon", previewColor: "#9D8DF1" });
  const [generatedPreview, setGeneratedPreview] = useState<AssetGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<AssetGeneratedPreview | null>(null);
  const update = <K extends keyof StudioAsset>(k: K, v: StudioAsset[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const handleSavePalette = (hex: string) =>
    addPalette({ id: "pal-user-" + Date.now(), name: `Saved ${hex}`, colors: [hex], createdAt: new Date().toISOString() });

  const generateImagePreview = () => {
    const prompt = buildAssetImagePrompt(draft);
    const from = draft.egg?.baseColor || draft.badge?.rarity || draft.previewColor || "#9D8DF1";
    const to = draft.egg?.accentColor || "#FFF8DD";
    const url = mockNanoBananaGenerateImage(prompt, { from: String(from), to: String(to) });
    setGeneratedPreview({ url, prompt, provider: "prototype-generator" });
    setSavedPreview(null);
  };

  const saveGeneratedPreview = () => {
    if (!generatedPreview) return;
    setSavedPreview(generatedPreview);
  };

  const discardGeneratedPreview = () => {
    setGeneratedPreview(null);
    setSavedPreview(null);
  };

  const submit = () => {
    const item: StudioAsset = {
      ...baseMeta("user"),
      id: "as-" + Date.now(),
      name: draft.name?.trim() || `Untitled ${draft.kind}`,
      kind: (draft.kind as AssetKind) ?? "icon",
      previewColor: draft.previewColor ?? "#9D8DF1",
      description: draft.description,
      previewUrl: savedPreview?.url,
      promptUsed: savedPreview?.prompt,
      imageProvider: savedPreview?.provider,
      egg: draft.egg, badge: draft.badge,
    };
    addItem("assets", item);
    setGeneratedPreview(null);
    setSavedPreview(null);
    setDraft({ kind: "icon", previewColor: "#9D8DF1" });
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
            <Field label="Kind"><SelectField testid="assets-input-kind" value={draft.kind ?? ""} options={ASSET_KINDS} onChange={(v) => { update("kind", v as AssetKind); setGeneratedPreview(null); setSavedPreview(null); }} /></Field>
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

          <div className="mt-4 flex flex-wrap items-start gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-1">Standard preview</p>
              <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg" style={{ background: draft.previewColor ?? "#9D8DF1" }} aria-hidden />
            </div>
            {savedPreview && (
              <div className="rounded-2xl bg-sage/10 border-2 border-sage/30 px-3 py-2">
                <p className="text-[10px] font-extrabold uppercase text-sage">Image saved to draft</p>
                <p className="text-xs text-ink-muted">It will attach when you send this asset to review.</p>
              </div>
            )}
          </div>

          <ImagePreviewWorkflow
            testid="assets-image-generator"
            title="Generated asset image preview"
            helper="Generate from this asset draft, then save or discard before sending it to review."
            generatedPreview={generatedPreview}
            savedPreview={savedPreview}
            onGenerate={generateImagePreview}
            onSave={saveGeneratedPreview}
            onDiscard={discardGeneratedPreview}
            disabled={false}
            imageClassName="aspect-square"
          />

          <button type="button" data-testid="assets-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioAsset) => (
        <div className="flex gap-3">
          {i.previewUrl ? (
            <img src={i.previewUrl} alt={`${i.name} asset art`} className="w-16 h-16 object-cover rounded-2xl border-4 border-white shrink-0 shadow-lg" />
          ) : (
            <div className="w-16 h-16 rounded-2xl border-4 border-white shrink-0" style={{ background: i.previewColor }} aria-hidden />
          )}
          <div className="min-w-0">
            <p className="h-display text-lg truncate">{i.name}</p>
            <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.kind.replace(/-/g," ")}</p>
            {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {i.imageProvider ?? "prototype"}</p>}
            {i.egg && <p className="text-[10px] font-bold text-primary mt-1">{i.egg.rarity} · shiny {i.egg.shinyChance}% · {i.egg.glowEffect} glow</p>}
            {i.badge && <p className="text-[10px] font-bold text-primary mt-1">{i.badge.badgeType} · {i.badge.iconShape}</p>}
            {i.description && <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>}
            <StudioViewEditButton collection="assets" item={i} title={i.name} imageUrl={i.previewUrl} />
          </div>
        </div>
      )}
    />
  );
};

// ============================================================================
// REALMS
// ============================================================================
type RealmGeneratedPreview = {
  url: string;
  prompt: string;
  provider: string;
};

const buildRealmImagePrompt = (draft: Partial<StudioRealm>): string => {
  const name = draft.name?.trim() || "unnamed realm";
  const biome = draft.biome || "friendly fantasy biome";
  const tone = draft.tone || "cozy";
  const buildings = (draft.buildings ?? ["town-hub", "hatchery"]).map((b) => b.replace(/-/g, " ")).join(", ");
  const grades = (draft.grades ?? ["K", "1", "2"]).join(", ");
  const subjects = (draft.subjects ?? ["math"]).join(", ");
  const description = draft.description || "A welcoming learning realm for young adventurers.";
  const mapNotes = draft.mapNotes || "Soft central plaza with readable paths to learning hubs.";

  return [
    `Create a Questing Academy realm concept image for ${name}.`,
    `Biome: ${biome}. Mood/tone: ${tone}.`,
    `Learning audience: grades ${grades}. Supported subjects: ${subjects}.`,
    `Buildings and hubs to suggest visually: ${buildings}.`,
    `Realm description: ${description}.`,
    `Map/layout notes: ${mapNotes}.`,
    "Style rules: cute chibi educational fantasy RPG realm concept art, wide establishing view, cozy readable map-like environment, soft rounded shapes, whimsical architecture, clear central pathing, pastel colors, storybook watercolor, child-safe for ages 5-12, simple inviting composition, no UI labels.",
    "Show the environment and key hubs clearly, not a character portrait. Keep it friendly, magical, bright, and safe.",
    "Negative rules: no text, no watermark, no realistic violence, no horror, no weapons, no dark scary mood, no photorealism.",
  ].join(" ");
};

const RealmsTab: React.FC = () => {
  const items = useStudio((s) => s.realms);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioRealm>>({ subjects: ["math"], grades: ["K","1","2"], buildings: ["town-hub","hatchery"] });
  const [generatedPreview, setGeneratedPreview] = useState<RealmGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<RealmGeneratedPreview | null>(null);
  const update = <K extends keyof StudioRealm>(k: K, v: StudioRealm[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const randomize = () => {
    setGeneratedPreview(null);
    setSavedPreview(null);
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

  const generateImagePreview = () => {
    const prompt = buildRealmImagePrompt(draft);
    const url = mockNanoBananaGenerateImage(prompt, { from: "#E8F4E1", to: "#9D8DF1" });
    setGeneratedPreview({ url, prompt, provider: "prototype-generator" });
    setSavedPreview(null);
  };

  const saveGeneratedPreview = () => {
    if (!generatedPreview) return;
    setSavedPreview(generatedPreview);
  };

  const discardGeneratedPreview = () => {
    setGeneratedPreview(null);
    setSavedPreview(null);
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
      previewUrl: savedPreview?.url,
      promptUsed: savedPreview?.prompt,
      imageProvider: savedPreview?.provider,
    };
    addItem("realms", item);
    setGeneratedPreview(null);
    setSavedPreview(null);
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

          <ImagePreviewWorkflow
            testid="realms-image-generator"
            title="Generated realm image preview"
            helper="Generate from this realm draft, then save or discard before sending it to review."
            generatedPreview={generatedPreview}
            savedPreview={savedPreview}
            onGenerate={generateImagePreview}
            onSave={saveGeneratedPreview}
            onDiscard={discardGeneratedPreview}
            disabled={false}
            imageClassName="aspect-[4/3]"
          />

          <button type="button" data-testid="realms-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioRealm) => (
        <div>
          {i.previewUrl && (
            <img src={i.previewUrl} alt={`${i.name} realm concept`} className="w-full h-36 object-cover rounded-xl border-2 border-white mb-2" />
          )}
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.biome} {i.tone && `· ${i.tone}`}</p>
          {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {i.imageProvider ?? "prototype"}</p>}
          <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>
          {i.buildings && i.buildings.length > 0 && (
            <p className="text-[10px] font-extrabold text-primary mt-2">Hubs: {i.buildings.map((b) => b.replace(/-/g," ")).join(" · ")}</p>
          )}
          {i.mapNotes && <p className="text-[10px] font-bold text-ink-muted">{i.mapNotes}</p>}
          <StudioViewEditButton collection="realms" item={i} title={i.name} imageUrl={i.previewUrl} />
        </div>
      )}
    />
  );
};

// ============================================================================
// BATTLE BACKGROUNDS
// ============================================================================
type BattleBgGeneratedPreview = {
  url: string;
  prompt: string;
  provider: string;
};

const buildBattleBgImagePrompt = (draft: Partial<StudioBattleBg>, realm?: StudioRealm): string => {
  const realmName = realm?.name || draft.realm || "unnamed realm";
  const biome = realm?.biome || "friendly fantasy environment";
  const realmTone = realm?.tone || "cozy";
  const environment = draft.environment || "readable battle path";
  const timeOfDay = draft.timeOfDay || "midday";
  const mood = draft.mood || realmTone || "cozy";
  const scenePrompt = draft.prompt || "soft pastel battle background with clear foreground, midground, and background layers";

  return [
    `Create a Questing Academy battle background concept for ${realmName}.`,
    `Realm context: biome ${biome}, realm tone ${realmTone}.`,
    `Battle environment: ${environment}. Time of day: ${timeOfDay}. Mood: ${mood}.`,
    `Scene direction: ${scenePrompt}.`,
    "Style rules: cute chibi educational fantasy RPG battle background, wide horizontal environment, no characters, no UI, clear readable combat stage with foreground floor/path, midground landmarks, and soft background depth, cozy storybook watercolor, pastel colors, child-safe for ages 5-12, bright inviting mood.",
    "Make it suitable as a turn-based battle backdrop: enough open space for player and enemy sprites, but still visually connected to the selected realm.",
    "Negative rules: no text, no watermark, no characters, no realistic violence, no horror, no weapons, no dark scary mood, no photorealism.",
  ].join(" ");
};

const BattleBgsTab: React.FC = () => {
  const items = useStudio((s) => s.battleBgs);
  const realms = useStudio((s) => s.realms);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioBattleBg>>({});
  const [generatedPreview, setGeneratedPreview] = useState<BattleBgGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<BattleBgGeneratedPreview | null>(null);
  const update = <K extends keyof StudioBattleBg>(k: K, v: StudioBattleBg[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const selectedRealm = realms.find((r) => r.id === draft.realmId);

  const generateImagePreview = () => {
    if (!selectedRealm && !draft.realm) return;
    const prompt = buildBattleBgImagePrompt(draft, selectedRealm);
    const url = mockNanoBananaGenerateImage(prompt, { from: "#7BB7D6", to: "#FFF8DD" });
    setGeneratedPreview({ url, prompt, provider: "prototype-generator" });
    setSavedPreview(null);
  };

  const saveGeneratedPreview = () => {
    if (!generatedPreview) return;
    setSavedPreview(generatedPreview);
  };

  const discardGeneratedPreview = () => {
    setGeneratedPreview(null);
    setSavedPreview(null);
  };

  const submit = () => {
    const realm = realms.find((r) => r.id === draft.realmId);
    const m = mockBattleBackground(draft.prompt || randomScenePrompt(), realm?.name || draft.realm || "Meadowfall Grove");
    const item: StudioBattleBg = {
      ...m,
      realmId: realm?.id,
      realm: realm?.name || draft.realm || m.realm,
      timeOfDay: draft.timeOfDay,
      mood: draft.mood,
      environment: draft.environment ?? m.environment,
      prompt: draft.prompt || m.prompt,
      stylePresetId: draft.stylePresetId,
      previewUrl: savedPreview?.url,
      promptUsed: savedPreview?.prompt,
      imageProvider: savedPreview?.provider,
    };
    addItem("battleBgs", item);
    setGeneratedPreview(null);
    setSavedPreview(null);
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
                onChange={(id) => { const r = realms.find((x) => x.id === id); setGeneratedPreview(null); setSavedPreview(null); update("realmId", id); if (r) update("realm", r.name); }}
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

          <ImagePreviewWorkflow
            testid="battleBgs-image-generator"
            title="Generated battle background preview"
            helper="Generate from this battle background draft, then save or discard before sending it to review."
            generatedPreview={generatedPreview}
            savedPreview={savedPreview}
            onGenerate={generateImagePreview}
            onSave={saveGeneratedPreview}
            onDiscard={discardGeneratedPreview}
            disabled={!draft.realmId && !draft.realm}
            imageClassName="aspect-video"
          />

          <button type="button" data-testid="battleBgs-generate-btn" onClick={submit} disabled={!draft.realmId} className="btn-primary mt-4 !text-base !py-3 !px-6 disabled:opacity-40">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioBattleBg) => (
        <div>
          {i.previewUrl && (
            <img src={i.previewUrl} alt={`${i.realm} battle background`} className="w-full h-32 object-cover rounded-xl border-2 border-white" />
          )}
          <p className="h-display text-lg mt-2">{i.realm}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.environment}{i.timeOfDay && ` · ${i.timeOfDay}`}{i.mood && ` · ${i.mood}`}</p>
          {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {i.imageProvider ?? "prototype"}</p>}
          <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.prompt}</p>
          <StudioViewEditButton collection="battleBgs" item={i} title={i.realm} imageUrl={i.previewUrl} />
        </div>
      )}
    />
  );
};

// ============================================================================
// SCENES
// ============================================================================
type SceneGeneratedPreview = {
  url: string;
  prompt: string;
  provider: string;
};

const buildSceneImagePrompt = (draft: Partial<StudioScene>, realm?: StudioRealm, linkedNpcs: StudioNPC[] = []): string => {
  const name = draft.name?.trim() || "unnamed scene";
  const purpose = draft.purpose || "town-hub";
  const realmName = realm?.name || draft.realm || "Questing Academy realm";
  const realmBiome = realm?.biome || "friendly fantasy biome";
  const realmTone = realm?.tone || "cozy";
  const visualPrompt = draft.visualPrompt || "A warm, inviting learning scene with clear paths and friendly fantasy details.";
  const npcText = linkedNpcs.length
    ? linkedNpcs.map((n) => `${n.name} (${n.role}, ${n.tone}, ${n.temperament})`).join("; ")
    : "No specific NPCs required; keep the space ready for friendly characters later.";

  return [
    `Create a Questing Academy scene/town concept image for ${name}.`,
    `Scene purpose: ${purpose.replace(/-/g, " ")}.`,
    `Realm context: ${realmName}, biome ${realmBiome}, tone ${realmTone}.`,
    `NPCs to consider for staging: ${npcText}.`,
    `Visual direction: ${visualPrompt}.`,
    "Style rules: cute chibi educational fantasy RPG environment concept, wide readable scene, cozy storybook watercolor, pastel colors, soft rounded shapes, whimsical architecture, child-safe for ages 5-12, simple inviting composition, clear focal area for gameplay.",
    "Show the scene/town location itself, not a character portrait. Include environmental storytelling and enough open space for UI/gameplay. Avoid complex clutter.",
    "Negative rules: no text, no watermark, no realistic violence, no horror, no weapons, no dark scary mood, no photorealism.",
  ].join(" ");
};

const ScenesTab: React.FC = () => {
  const items = useStudio((s) => s.scenes);
  const realms = useStudio((s) => s.realms);
  const npcs = useStudio((s) => s.npcs);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioScene>>({ purpose: "town-hub", npcIds: [] });
  const [generatedPreview, setGeneratedPreview] = useState<SceneGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<SceneGeneratedPreview | null>(null);
  const update = <K extends keyof StudioScene>(k: K, v: StudioScene[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const selectedRealm = realms.find((r) => r.id === draft.realmId);
  const linkedNpcItems = (draft.npcIds ?? []).map((id) => npcs.find((n) => n.id === id)).filter(Boolean) as StudioNPC[];

  const generateImagePreview = () => {
    const prompt = buildSceneImagePrompt(draft, selectedRealm, linkedNpcItems);
    const url = mockNanoBananaGenerateImage(prompt, { from: "#FFF8DD", to: "#9D8DF1" });
    setGeneratedPreview({ url, prompt, provider: "prototype-generator" });
    setSavedPreview(null);
  };

  const saveGeneratedPreview = () => {
    if (!generatedPreview) return;
    setSavedPreview(generatedPreview);
  };

  const discardGeneratedPreview = () => {
    setGeneratedPreview(null);
    setSavedPreview(null);
  };

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
      previewUrl: savedPreview?.url,
      promptUsed: savedPreview?.prompt,
      imageProvider: savedPreview?.provider,
    };
    addItem("scenes", item);
    setGeneratedPreview(null);
    setSavedPreview(null);
    setDraft({ purpose: "town-hub", npcIds: [] });
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
                onChange={(id) => { const r = realms.find((x) => x.id === id); setGeneratedPreview(null); setSavedPreview(null); update("realmId", id); if (r) update("realm", r.name); }}
                options={realms.map((r) => ({ id: r.id, label: r.name, sublabel: r.biome }))} placeholder="Choose realm…" />
            </Field>
            <Field label="NPCs (multi)" full>
              <MultiSelectChips testid="scenes-input-npcs" values={draft.npcIds ?? []} onChange={(v) => { setGeneratedPreview(null); setSavedPreview(null); update("npcIds", v); }}
                options={npcs.map((n) => ({ id: n.id, label: n.name }))} />
            </Field>
            <Field label="Style preset"><StylePresetPicker testid="scenes-style-preset" value={draft.stylePresetId} onChange={(id) => update("stylePresetId", id)} /></Field>
            <Field label="Visual prompt" full><TextArea testid="scenes-input-prompt" value={draft.visualPrompt ?? ""} onChange={(v) => update("visualPrompt", v)} placeholder="warm cottage interior, glowing eggs on shelves" onRandomize={() => update("visualPrompt", randomVisualPrompt())} /></Field>
          </div>

          <ImagePreviewWorkflow
            testid="scenes-image-generator"
            title="Generated scene image preview"
            helper="Generate from this scene draft, then save or discard before sending it to review."
            generatedPreview={generatedPreview}
            savedPreview={savedPreview}
            onGenerate={generateImagePreview}
            onSave={saveGeneratedPreview}
            onDiscard={discardGeneratedPreview}
            disabled={false}
            imageClassName="aspect-[4/3]"
          />

          <button type="button" data-testid="scenes-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioScene) => (
        <div>
          {i.previewUrl && (
            <img src={i.previewUrl} alt={`${i.name} scene concept`} className="w-full h-36 object-cover rounded-xl border-2 border-white mb-2" />
          )}
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.purpose.replace(/-/g," ")} · {i.realm}</p>
          {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {i.imageProvider ?? "prototype"}</p>}
          <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.visualPrompt}</p>
          {!!i.npcs.length && <p className="text-[10px] font-extrabold text-primary mt-1">NPCs: {i.npcs.join(", ")}</p>}
          <StudioViewEditButton collection="scenes" item={i} title={i.name} imageUrl={i.previewUrl} />
        </div>
      )}
    />
  );
};

// ============================================================================
// NPCs
// ============================================================================
type NPCGeneratedPreview = {
  url: string;
  prompt: string;
  provider: string;
};

const buildNPCImagePrompt = (draft: Partial<StudioNPC>, realm?: StudioRealm): string => {
  const name = draft.name?.trim() || "unnamed academy mentor";
  const role = draft.customRole?.trim() || draft.role || "teacher";
  const realmName = realm?.name || draft.realm || "Questing Academy";
  const realmContext = realm ? `Realm context: ${realm.name}, biome ${realm.biome}${realm.tone ? `, tone ${realm.tone}` : ""}.` : `Realm context: ${realmName}.`;
  const dialogue = draft.dialogue || "Welcome, little scholar!";
  const tone = draft.tone || "cheerful";
  const temperament = draft.temperament || "patient";
  const teachingStyle = draft.teachingStyle || "encouraging";
  const humor = draft.humorLevel || "light";
  const formality = draft.formality || "casual";
  const encouragement = draft.encouragementStyle || "praise";
  const safety = draft.safetyNotes || "Always kind, never urgent. No personal info asks.";

  return [
    `Create a Questing Academy NPC portrait/concept image for ${name}.`,
    `NPC role: ${role}.`,
    realmContext,
    `Persona: tone ${tone}, temperament ${temperament}, teaching style ${teachingStyle}, humor level ${humor}, formality ${formality}, encouragement style ${encouragement}.`,
    `Sample dialogue inspiration: ${dialogue}.`,
    `Safety and behavior notes: ${safety}.`,
    "Style rules: cute chibi educational fantasy RPG mentor NPC, friendly non-threatening expression, half-body or three-quarter portrait, centered in frame, clear readable silhouette, soft rounded shapes, cozy storybook watercolor, pastel colors, child-safe for ages 5-12, warm academy guide energy, simple light background with subtle realm-inspired details.",
    "Do not make this an enemy, boss, combat unit, or scary fantasy villain. This should feel like a helpful teacher, guide, shopkeeper, caretaker, or quest giver for children.",
    "Negative rules: no text, no watermark, no cropped face, no realistic violence, no horror, no weapons, no dark scary mood, no photorealism.",
  ].join(" ");
};

const NpcsTab: React.FC = () => {
  const items = useStudio((s) => s.npcs);
  const realms = useStudio((s) => s.realms);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioNPC>>({
    role: "teacher", tone: "cheerful", temperament: "patient", teachingStyle: "encouraging",
    humorLevel: "light", formality: "casual", encouragementStyle: "praise",
  });
  const [generatedPreview, setGeneratedPreview] = useState<NPCGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<NPCGeneratedPreview | null>(null);
  const update = <K extends keyof StudioNPC>(k: K, v: StudioNPC[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const selectedRealm = realms.find((r) => r.id === draft.realmId);

  const generateImagePreview = () => {
    const prompt = buildNPCImagePrompt(draft, selectedRealm);
    const url = mockNanoBananaGenerateImage(prompt, { from: "#FFF8DD", to: "#9D8DF1" });
    setGeneratedPreview({ url, prompt, provider: "prototype-generator" });
    setSavedPreview(null);
  };

  const saveGeneratedPreview = () => {
    if (!generatedPreview) return;
    setSavedPreview(generatedPreview);
  };

  const discardGeneratedPreview = () => {
    setGeneratedPreview(null);
    setSavedPreview(null);
  };

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
      previewUrl: savedPreview?.url,
      promptUsed: savedPreview?.prompt,
      imageProvider: savedPreview?.provider,
    };
    addItem("npcs", item);
    setGeneratedPreview(null);
    setSavedPreview(null);
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

          <ImagePreviewWorkflow
            testid="npcs-image-generator"
            title="Generated NPC image preview"
            helper="Generate from this NPC persona, then save or discard before sending it to review."
            generatedPreview={generatedPreview}
            savedPreview={savedPreview}
            onGenerate={generateImagePreview}
            onSave={saveGeneratedPreview}
            onDiscard={discardGeneratedPreview}
            disabled={false}
            imageClassName="aspect-square"
          />

          <button type="button" data-testid="npcs-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioNPC) => (
        <div>
          {i.previewUrl && (
            <img src={i.previewUrl} alt={`${i.name} NPC portrait`} className="w-full h-40 object-cover rounded-xl border-2 border-white mb-2" />
          )}
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.role}{i.customRole && ` · ${i.customRole}`} · {i.realm}</p>
          {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {i.imageProvider ?? "prototype"}</p>}
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
          <StudioViewEditButton collection="npcs" item={i} title={i.name} imageUrl={i.previewUrl} />
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
