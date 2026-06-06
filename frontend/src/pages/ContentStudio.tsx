import React, { useEffect, useMemo, useRef, useState } from "react";
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
  mockBattleBackground, mockCompanionArt, baseMeta, nowISO,
} from "../lib/mockGen";
import {
  randomAvatarName, randomCompanionName, randomCompanionLore, randomMoveSet,
  randomStats, randomBiome, randomQuestTitle, randomScenePrompt,
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
import { ShieldCheck, Library, Lock, Send, Eye, ChevronDown, ChevronRight, Wand2, Sparkles, Download, Archive, Trash2, Undo2, XCircle, MapPin, Link2, Unlink, UserRound } from "lucide-react";
import { cn } from "../lib/cn";

const STUDIO_PIN = "2580";
const STUDIO_BACKEND_ORIGIN = "http://localhost:5050";

const normalizeStudioImageUrl = (url?: string): string => {
  if (!url) return "";

  const trimmed = url.trim();

  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  if (trimmed.startsWith("/api/studio/image")) {
    return `${STUDIO_BACKEND_ORIGIN}${trimmed}`;
  }

  if (trimmed.startsWith("api/studio/image")) {
    return `${STUDIO_BACKEND_ORIGIN}/${trimmed}`;
  }

  if (trimmed.startsWith("/studio/image")) {
    return `${STUDIO_BACKEND_ORIGIN}/api${trimmed}`;
  }

  if (trimmed.startsWith("studio/image")) {
    return `${STUDIO_BACKEND_ORIGIN}/api/${trimmed}`;
  }

  if (trimmed.startsWith("/image?")) {
    return `${STUDIO_BACKEND_ORIGIN}/api/studio${trimmed}`;
  }

  if (trimmed.startsWith("image?")) {
    return `${STUDIO_BACKEND_ORIGIN}/api/studio/${trimmed}`;
  }

  return trimmed;
};

const MAX_STORED_IMAGE_DATA_URL_LENGTH = 650_000;
const MAX_INLINE_IMAGE_DATA_URL_LENGTH = 180_000;
const isImageDataUrl = (value?: string): boolean => !!value && value.startsWith("data:image/");
const shouldPersistImageUrl = (value?: string): boolean => !!value && (!isImageDataUrl(value) || value.length <= MAX_INLINE_IMAGE_DATA_URL_LENGTH);
const getPersistableImageUrl = (value?: string): string | undefined => shouldPersistImageUrl(value) ? value : undefined;

type StudioStorageImageRef = { url?: string; storage?: "inline" | "external" | "session-only"; note?: string };
const createImageRef = (url?: string): StudioStorageImageRef | undefined => {
  if (!url) return undefined;
  if (shouldPersistImageUrl(url)) return { url, storage: isImageDataUrl(url) ? "inline" : "external" };
  return { storage: "session-only", note: "Large generated image data was not persisted to localStorage. Export or regenerate this asset when needed." };
};
const isOversizedDataUrl = (value?: string): boolean => !!value && value.startsWith("data:image/") && value.length > MAX_STORED_IMAGE_DATA_URL_LENGTH;
const slugifyForDownload = (value: string): string =>
  (value || "questing-academy-image")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "questing-academy-image";

const inferImageExtension = (url: string): string => {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "jpg";
  if (clean.endsWith(".webp")) return "webp";
  return "png";
};

const downloadImageFromUrl = async (url: string, filenameBase: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
    const blob = await response.blob();
    const ext = blob.type.includes("jpeg") ? "jpg" : blob.type.includes("webp") ? "webp" : inferImageExtension(url);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${slugifyForDownload(filenameBase)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    console.error(err);
    window.open(url, "_blank", "noopener,noreferrer");
  }
};



const exportTransparentPngFromUrl = async (url: string, filenameBase: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas is not available");
    ctx.drawImage(bitmap, 0, 0);

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    const width = canvas.width;
    const height = canvas.height;
    const total = width * height;

    const samplePixel = (x: number, y: number): readonly [number, number, number] => {
      const idx = (y * width + x) * 4;
      return [data[idx], data[idx + 1], data[idx + 2]] as const;
    };

    const edgeSamples: (readonly [number, number, number])[] = [];
    const sampleEvery = Math.max(1, Math.floor(Math.min(width, height) / 24));
    for (let x = 0; x < width; x += sampleEvery) {
      edgeSamples.push(samplePixel(x, 0), samplePixel(x, height - 1));
    }
    for (let y = 0; y < height; y += sampleEvery) {
      edgeSamples.push(samplePixel(0, y), samplePixel(width - 1, y));
    }

    const bg = edgeSamples.reduce<readonly [number, number, number]>(
      (acc, c) => [
        acc[0] + c[0] / edgeSamples.length,
        acc[1] + c[1] / edgeSamples.length,
        acc[2] + c[2] / edgeSamples.length,
      ] as const,
      [0, 0, 0] as const
    );

    const distanceFromBg = (idx: number) => {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      return Math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2);
    };

    // Only remove pixels that are connected to the outside background.
    // This preserves white/bright pixels inside the character/object.
    const hard = 34;
    const soft = 96;
    const visited = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    const tryPush = (pixelIndex: number) => {
      if (pixelIndex < 0 || pixelIndex >= total || visited[pixelIndex]) return;
      const idx = pixelIndex * 4;
      if (data[idx + 3] === 0 || distanceFromBg(idx) < soft) {
        visited[pixelIndex] = 1;
        queue[tail++] = pixelIndex;
      }
    };

    for (let x = 0; x < width; x++) {
      tryPush(x);
      tryPush((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
      tryPush(y * width);
      tryPush(y * width + width - 1);
    }

    while (head < tail) {
      const p = queue[head++];
      const x = p % width;
      const y = Math.floor(p / width);
      if (x > 0) tryPush(p - 1);
      if (x < width - 1) tryPush(p + 1);
      if (y > 0) tryPush(p - width);
      if (y < height - 1) tryPush(p + width);
    }

    const alpha = new Uint8ClampedArray(total);
    for (let p = 0; p < total; p++) alpha[p] = data[p * 4 + 3];

    for (let p = 0; p < total; p++) {
      if (!visited[p]) continue;
      const idx = p * 4;
      const d = distanceFromBg(idx);
      alpha[p] = d < hard ? 0 : Math.round(alpha[p] * Math.max(0, Math.min(1, (d - hard) / (soft - hard))));
    }

    // Feather the cut edge by slightly softening removed pixels next to kept pixels.
    for (let p = 0; p < total; p++) {
      if (!visited[p]) continue;
      const x = p % width;
      const y = Math.floor(p / width);
      let touchesKept = false;
      for (let dy = -1; dy <= 1 && !touchesKept; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const np = ny * width + nx;
          if (!visited[np] && data[np * 4 + 3] > 0) {
            touchesKept = true;
            break;
          }
        }
      }
      if (touchesKept) alpha[p] = Math.max(alpha[p], 24);
    }

    for (let p = 0; p < total; p++) {
      data[p * 4 + 3] = alpha[p];
    }

    ctx.putImageData(image, 0, 0);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((out) => out ? resolve(out) : reject(new Error("PNG export failed")), "image/png");
    });
    const objectUrl = URL.createObjectURL(pngBlob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${slugifyForDownload(filenameBase)}-transparent.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    console.error(err);
    alert("Transparent export failed. Try Export image, or regenerate with a plainer background.");
  }
};


const createTransparentPngDataUrlFromUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(bitmap, 0, 0);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const width = canvas.width;
  const height = canvas.height;
  const total = width * height;
  const samplePixel = (x: number, y: number): readonly [number, number, number] => {
    const idx = (y * width + x) * 4;
    return [data[idx], data[idx + 1], data[idx + 2]] as const;
  };
  const edgeSamples: (readonly [number, number, number])[] = [];
  const sampleEvery = Math.max(1, Math.floor(Math.min(width, height) / 24));
  for (let x = 0; x < width; x += sampleEvery) edgeSamples.push(samplePixel(x, 0), samplePixel(x, height - 1));
  for (let y = 0; y < height; y += sampleEvery) edgeSamples.push(samplePixel(0, y), samplePixel(width - 1, y));
  const bg = edgeSamples.reduce<readonly [number, number, number]>(
    (acc, c) => [
      acc[0] + c[0] / edgeSamples.length,
      acc[1] + c[1] / edgeSamples.length,
      acc[2] + c[2] / edgeSamples.length,
    ] as const,
    [0, 0, 0] as const
  );
  const distanceFromBg = (idx: number) => {
    const r = data[idx]; const g = data[idx + 1]; const b = data[idx + 2];
    return Math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2);
  };
  const hard = 34;
  const soft = 96;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const tryPush = (pixelIndex: number) => {
    if (pixelIndex < 0 || pixelIndex >= total || visited[pixelIndex]) return;
    const idx = pixelIndex * 4;
    if (data[idx + 3] === 0 || distanceFromBg(idx) < soft) {
      visited[pixelIndex] = 1;
      queue[tail++] = pixelIndex;
    }
  };
  for (let x = 0; x < width; x++) { tryPush(x); tryPush((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { tryPush(y * width); tryPush(y * width + width - 1); }
  while (head < tail) {
    const px = queue[head++];
    const x = px % width;
    const y = Math.floor(px / width);
    if (x > 0) tryPush(px - 1);
    if (x < width - 1) tryPush(px + 1);
    if (y > 0) tryPush(px - width);
    if (y < height - 1) tryPush(px + width);
  }
  const alpha = new Uint8ClampedArray(total);
  for (let px = 0; px < total; px++) alpha[px] = data[px * 4 + 3];
  for (let px = 0; px < total; px++) {
    if (!visited[px]) continue;
    const idx = px * 4;
    const d = distanceFromBg(idx);
    alpha[px] = d < hard ? 0 : Math.round(alpha[px] * Math.max(0, Math.min(1, (d - hard) / (soft - hard))));
  }
  for (let px = 0; px < total; px++) data[px * 4 + 3] = alpha[px];
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
};


type VisualReferenceInput = {
  kind: string;
  label: string;
  url: string;
};

type StudioGenerateImageRequest = {
  prompt: string;
  contentType?: string;
  stylePreset?: string;
  linkedEntityId?: string;
  palette?: { from?: string; to?: string };
  visualReferences?: VisualReferenceInput[];
};

const generateStudioImagePreview = async (request: StudioGenerateImageRequest): Promise<GeneratedImagePreview> => {
  const response = await fetch(`${STUDIO_BACKEND_ORIGIN}/api/studio/generate-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok || !data?.imageDataUrl) {
    throw new Error(data?.error || `Image generation failed (${response.status})`);
  }

  return {
    url: data.imageDataUrl,
    prompt: data.promptUsed || request.prompt,
    provider: data.provider ? `${data.provider}${data.model ? `:${data.model}` : ""}` : "studio-generate-image",
  };
};

const generateStudioImagePreviewWithReferences = async (
  prompt: string,
  palette?: { from?: string; to?: string },
  visualReferences: VisualReferenceInput[] = [],
  contentType = "companion-art"
): Promise<GeneratedImagePreview> => {
  const referenceBlock = visualReferences.length
    ? `\n\nVISUAL REFERENCES PASSED SEPARATELY:\n${visualReferences.map((r, idx) => `${idx + 1}. ${r.kind}: ${r.label}`).join("\n")}`
    : "";

  return generateStudioImagePreview({
    prompt: `${prompt}${referenceBlock}`,
    contentType,
    palette,
    visualReferences,
  });
};


type TabKey =
  | "questions" | "avatars" | "companions" | "evolutions" | "arts" | "assets"
  | "realms" | "battleBgs" | "scenes" | "sceneComposer" | "npcs" | "quests" | "events" | "queue" | "assetLibrary";

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "questions",  label: "Questions",     emoji: "📝" },
  { key: "avatars",    label: "Avatars",       emoji: "🧑" },
  { key: "companions", label: "Pets",          emoji: "🐾" },
  { key: "evolutions", label: "Evolutions",    emoji: "🌱" },
  { key: "arts",       label: "Companion Art", emoji: "🎨" },
  { key: "assets",     label: "Assets",        emoji: "🎒" },
  { key: "assetLibrary", label: "Asset Library", emoji: "🗂️" },
  { key: "realms",     label: "Realms",        emoji: "🗺️" },
  { key: "battleBgs",  label: "Battle BGs",    emoji: "⚔️" },
  { key: "scenes",     label: "Scenes",        emoji: "🏠" },
  { key: "sceneComposer", label: "Scene Composer", emoji: "🖼️" },
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
        <TopBar back="/admin" title="Edu-Mates Academy" />
        <main className="max-w-md mx-auto px-4 md:px-8 py-10">
          <Card className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary text-white grid place-items-center mx-auto shadow-btn-primary">
              <Lock strokeWidth={3} />
            </div>
            <h1 className="h-display text-3xl mt-3">Edu-Mates Academy</h1>
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
      <TopBar back="/admin" title="Edu-Mates Academy" />
      <main className={cn("mx-auto px-4 md:px-8 py-6 space-y-5", tab === "sceneComposer" ? "max-w-[1900px]" : "max-w-7xl")}>
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
        {tab === "assetLibrary" && <AssetLibraryTab />}
        {tab === "realms"     && <RealmsTab />}
        {tab === "battleBgs"  && <BattleBgsTab />}
        {tab === "scenes"     && <ScenesTab />}
        {tab === "sceneComposer" && <SceneComposerTab />}
        {tab === "npcs"       && <NpcsTab />}
        {tab === "quests"     && <QuestsTab />}
        {tab === "events"     && <EventsTab />}
        {tab === "queue"      && <PublishQueueTab />}
      </main>
    </div>
  );
};
type SceneComposerLayer = {
  id: string;
  assetId: string;
  sourceCollection: StudioCollectionKey;
  sourceId: string;
  name: string;
  kind: string;
  assetType: LibraryAssetType;
  previewColor?: string;
  previewUrl?: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  flip: boolean;
  rotation: number;
  zIndex: number;
};

type SceneComposerBackgroundMode = "blank" | "transparent" | "scene" | "realm" | "battleBg";

type SceneZoneType = "walkable" | "blocked" | "water" | "tall-grass" | "interaction";
type SceneZonePoint = { x: number; y: number };
type SceneComposerZone = {
  id: string;
  name: string;
  type: SceneZoneType;
  points: SceneZonePoint[];
  closed: boolean;
};

type SceneMarkerType = "player-start" | "npc-anchor" | "companion-anchor" | "quest-object" | "shop-point" | "door" | "exit" | "fast-travel" | "point-of-interest";
type SceneComposerMarker = {
  id: string;
  name: string;
  type: SceneMarkerType;
  x: number;
  y: number;
  linkedCollection?: StudioCollectionKey | "";
  linkedId?: string;
  linkedLabel?: string;
};

const SCENE_MARKER_TYPES: SceneMarkerType[] = ["player-start", "npc-anchor", "companion-anchor", "quest-object", "shop-point", "door", "exit", "fast-travel", "point-of-interest"];

const MARKER_LINK_COLLECTIONS: (StudioCollectionKey | "")[] = ["", "npcs", "companions", "quests", "assets", "scenes", "realms", "battleBgs"];
const PLAYER_START_LINK_LABEL = "Player";
const markerLinkCollectionLabel = (collection?: StudioCollectionKey | ""): string => {
  if (!collection) return "No linked card";
  if (collection === "battleBgs") return "Battle BGs";
  return collection.charAt(0).toUpperCase() + collection.slice(1);
};

const getComposerImageUrl = (item?: any, preferTransparent = false): string => {
  if (!item) return "";

  const url =
    (preferTransparent ? item.transparentUrl || item.transparentPreviewUrl : "") ||
    item.thumbnailUrl ||
    item.previewUrl ||
    item.imageUrl ||
    item.generatedImageUrl ||
    item.url ||
    item.backgroundUrl ||
    item.companionPreviewUrl ||
    item.manualComposition?.backgroundUrl ||
    "";

  return normalizeStudioImageUrl(url);
};

const getComposerBackgroundImageUrl = (item?: any): string => getComposerImageUrl(item, false);

const getManualCompositionLayerImageUrl = (layer: any): string =>
  normalizeStudioImageUrl(layer?.url || layer?.previewUrl || layer?.imageRef?.url || "");

const sceneComposerLayerToManualLayer = (layer: SceneComposerLayer): ManualCompositionLayer => ({
  id: layer.id,
  kind: layer.assetType === "companion" ? "pet" : "npc",
  label: layer.name,
  url: layer.previewUrl ? normalizeStudioImageUrl(layer.previewUrl) : "",
  x: layer.x,
  y: layer.y,
  scale: layer.scale,
  flip: layer.flip,
  shadow: true,
  opacity: layer.opacity,
  zIndex: layer.zIndex,
  rotation: layer.rotation,
  sourceMode: "scene-composer",
});

const getSceneCompositionDisplayUrl = (item: any, fallbackUrl?: string): string => {
  const mc = item?.manualComposition;
  if (mc?.createdFrom === "scene-composer" && mc?.previewCompositeUrl) return normalizeStudioImageUrl(mc.previewCompositeUrl);
  return normalizeStudioImageUrl(fallbackUrl || item?.previewUrl || mc?.backgroundUrl || "");
};

const exportSavedSceneComposerComposition = async (item: any, filenameBase: string) => {
  const mc = item?.manualComposition;
  if (!mc?.layers?.length) {
    alert("No saved scene composer layers found on this card.");
    return;
  }

  const manualLayers = mc.layers.map((layer: any) => ({
    id: layer.id || layer.assetId || `${layer.name}-${layer.zIndex}`,
    kind: layer.assetType === "companion" ? "pet" : "npc",
    label: layer.name || "Scene layer",
    url: getManualCompositionLayerImageUrl(layer),
    x: Number(layer.x ?? 50),
    y: Number(layer.y ?? 50),
    scale: Number(layer.scale ?? 1),
    flip: !!layer.flip,
    shadow: false,
    opacity: Number(layer.opacity ?? 100),
    zIndex: Number(layer.zIndex ?? 1),
    rotation: Number(layer.rotation ?? 0),
  })).filter((layer: ManualCompositionLayer) => !!layer.url);

  if (!manualLayers.length) {
    alert("Saved scene layers do not have usable image URLs.");
    return;
  }

  await exportManualCompositionPng(
    mc.backgroundUrl || "",
    manualLayers,
    filenameBase,
    mc.canvasRatio || item.canvasRatio || "16:9",
    !!mc.transparentBackground
  );
};

const SceneComposerTab: React.FC = () => {
  const studio = useStudio();
  const scenes = useStudio((s) => s.scenes);
  const realms = useStudio((s) => s.realms);
  const battleBgs = useStudio((s) => s.battleBgs);
  const [query, setQuery] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<LibraryAssetType | "all">("all");
  const [backgroundMode, setBackgroundMode] = useState<SceneComposerBackgroundMode>("blank");
  const [backgroundId, setBackgroundId] = useState("");
  const [layers, setLayers] = useState<SceneComposerLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const addItem = useStudio((s) => s.addItem);
  const [saveName, setSaveName] = useState("");
  const [saveRealm, setSaveRealm] = useState("Questing Academy");
  const [savePurpose, setSavePurpose] = useState<ScenePurpose>("cutscene");
  const [saveNotes, setSaveNotes] = useState("");
  const [lastSavedSceneId, setLastSavedSceneId] = useState("");
  const [zoneMode, setZoneMode] = useState(false);
  const [zoneType, setZoneType] = useState<SceneZoneType>("walkable");
  const [zones, setZones] = useState<SceneComposerZone[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [markerMode, setMarkerMode] = useState(false);
  const [markerType, setMarkerType] = useState<SceneMarkerType>("player-start");
  const [markers, setMarkers] = useState<SceneComposerMarker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);


  const libraryAssets = useMemo(() => buildStudioAssetLibrary(studio), [studio]);

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return libraryAssets.filter((asset) => {
      if (asset.assetType === "background") return false;
      if (assetTypeFilter !== "all" && asset.assetType !== assetTypeFilter) return false;
      if (!q) return true;
      return [asset.name, asset.sourceCollection, asset.assetType, asset.description, ...asset.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [libraryAssets, query, assetTypeFilter]);

  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;

  const backgroundOptions = useMemo(() => {
    const importedBackgroundAssets = libraryAssets
      .filter((asset) => asset.assetType === "background" && !!getComposerBackgroundImageUrl(asset))
      .map((asset) => ({
        id: `asset:${asset.id}`,
        label: asset.name,
        sublabel: `Imported background · ${asset.sourceCollection}${asset.status ? ` · ${asset.status}` : ""}`,
        url: getComposerBackgroundImageUrl(asset),
      }));

    if (backgroundMode === "scene") {
      return scenes
        .map((sc) => ({ id: sc.id, label: sc.name, sublabel: `${sc.purpose} · ${sc.realm}`, url: getComposerBackgroundImageUrl(sc) }))
        .filter((x) => !!x.url);
    }
    if (backgroundMode === "realm") {
      return realms
        .map((r) => ({ id: r.id, label: r.name, sublabel: `${r.biome || "realm"} · ${r.status}`, url: getComposerBackgroundImageUrl(r) }))
        .filter((x) => !!x.url);
    }
    if (backgroundMode === "battleBg") {
      const sourceBattleBackgrounds = battleBgs
        .map((b) => ({ id: b.id, label: b.realm || b.environment || "Battle background", sublabel: `${b.environment || "battle bg"} · ${b.status}`, url: getComposerBackgroundImageUrl(b) }))
        .filter((x) => !!x.url);

      return [...sourceBattleBackgrounds, ...importedBackgroundAssets];
    }
    return [];
  }, [backgroundMode, scenes, realms, battleBgs, libraryAssets]);

  const selectedBackground = backgroundOptions.find((bg) => bg.id === backgroundId) ?? null;

  useEffect(() => {
    setBackgroundId("");
  }, [backgroundMode]);

  const addAssetToCanvas = (asset: LibraryAsset) => {
    const layer: SceneComposerLayer = {
      id: `scene-layer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      assetId: asset.id,
      sourceCollection: asset.sourceCollection,
      sourceId: asset.sourceId,
      name: asset.name,
      kind: asset.sourceCollection,
      assetType: asset.assetType,
      previewUrl: getComposerImageUrl(asset, true),
      x: 50,
      y: 50,
      scale: 1,
      opacity: 100,
      flip: false,
      rotation: 0,
      zIndex: layers.length ? Math.max(...layers.map((l) => l.zIndex)) + 1 : 1,
    };

    setLayers((current) => [...current, layer]);
    setSelectedLayerId(layer.id);
  };

  const updateLayer = (layerId: string, patch: Partial<SceneComposerLayer>) => {
    setLayers((current) => current.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer)));
  };

  const removeSelectedLayer = () => {
    if (!selectedLayerId) return;
    setLayers((current) => current.filter((layer) => layer.id !== selectedLayerId));
    setSelectedLayerId(null);
  };

  const duplicateSelectedLayer = () => {
    if (!selectedLayer) return;
    const copy: SceneComposerLayer = {
      ...selectedLayer,
      id: `scene-layer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${selectedLayer.name} copy`,
      x: Math.min(100, selectedLayer.x + 4),
      y: Math.min(100, selectedLayer.y + 4),
      zIndex: layers.length ? Math.max(...layers.map((l) => l.zIndex)) + 1 : selectedLayer.zIndex + 1,
    };
    setLayers((current) => [...current, copy]);
    setSelectedLayerId(copy.id);
  };

  const nudgeLayerZ = (direction: "up" | "down") => {
    if (!selectedLayer) return;
    const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((layer) => layer.id === selectedLayer.id);
    const swapIdx = direction === "up" ? idx + 1 : idx - 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    updateLayer(selectedLayer.id, { zIndex: other.zIndex });
    updateLayer(other.id, { zIndex: selectedLayer.zIndex });
  };

  const moveLayerFromPointer = (layerId: string, clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const nextX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const nextY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    updateLayer(layerId, { x: nextX, y: nextY });
  };

  const addZonePointFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point: SceneZonePoint = {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
    setZones((current) => {
      const active = activeZoneId ? current.find((zone) => zone.id === activeZoneId && !zone.closed) : null;
      if (active) return current.map((zone) => zone.id === active.id ? { ...zone, points: [...zone.points, point] } : zone);
      const zone: SceneComposerZone = {
        id: `scene-zone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${zoneType.replace("-", " ")} zone ${current.length + 1}`,
        type: zoneType,
        points: [point],
        closed: false,
      };
      setActiveZoneId(zone.id);
      setSelectedZoneId(zone.id);
      return [...current, zone];
    });
  };

  const closeActiveZone = () => {
    if (!activeZoneId) return;
    setZones((current) => current.map((zone) => zone.id === activeZoneId && zone.points.length >= 3 ? { ...zone, closed: true } : zone));
    setActiveZoneId(null);
  };

  const deleteSelectedZone = () => {
    if (!selectedZoneId) return;
    setZones((current) => current.filter((zone) => zone.id !== selectedZoneId));
    if (activeZoneId === selectedZoneId) setActiveZoneId(null);
    setSelectedZoneId(null);
  };

  const undoLastZonePoint = () => {
    if (!activeZoneId) return;
    setZones((current) => {
      const active = current.find((zone) => zone.id === activeZoneId && !zone.closed);
      if (!active) return current;
      if (active.points.length <= 1) {
        setActiveZoneId(null);
        setSelectedZoneId(null);
        return current.filter((zone) => zone.id !== active.id);
      }
      return current.map((zone) => zone.id === active.id ? { ...zone, points: zone.points.slice(0, -1) } : zone);
    });
  };

  const cancelActiveZone = () => {
    if (!activeZoneId) return;
    setZones((current) => current.filter((zone) => zone.id !== activeZoneId));
    setActiveZoneId(null);
    if (selectedZoneId === activeZoneId) setSelectedZoneId(null);
  };

  const clearZones = () => {
    setZones([]);
    setActiveZoneId(null);
    setSelectedZoneId(null);
  };

  const zoneColorClass = (type: SceneZoneType): string => {
    if (type === "walkable") return "stroke-sage fill-sage/20";
    if (type === "blocked") return "stroke-danger fill-danger/20";
    if (type === "water") return "stroke-sky-400 fill-sky-300/25";
    if (type === "tall-grass") return "stroke-green-500 fill-green-300/25";
    return "stroke-primary fill-primary/20";
  };

  const addMarkerFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    const marker: SceneComposerMarker = {
      id: `scene-marker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${markerType.replace(/-/g, " ")} ${markers.length + 1}`,
      type: markerType,
      x,
      y,
      linkedCollection: markerType === "player-start" ? "avatars" : "",
      linkedId: markerType === "player-start" ? "player" : "",
      linkedLabel: markerType === "player-start" ? PLAYER_START_LINK_LABEL : "",
    };
    setMarkers((current) => [...current, marker]);
    setSelectedMarkerId(marker.id);
  };

  const moveMarkerFromPointer = (markerId: string, clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setMarkers((current) => current.map((marker) => marker.id === markerId ? { ...marker, x, y } : marker));
  };

  const updateSelectedMarker = (patch: Partial<SceneComposerMarker>) => {
    if (!selectedMarkerId) return;
    setMarkers((current) => current.map((marker) => marker.id === selectedMarkerId ? { ...marker, ...patch } : marker));
  };

  const deleteSelectedMarker = () => {
    if (!selectedMarkerId) return;
    setMarkers((current) => current.filter((marker) => marker.id !== selectedMarkerId));
    setSelectedMarkerId(null);
    if (draggingMarkerId === selectedMarkerId) setDraggingMarkerId(null);
  };

  const clearMarkers = () => {
    setMarkers([]);
    setSelectedMarkerId(null);
    setDraggingMarkerId(null);
  };

  const markerLabel = (type: SceneMarkerType): string => type.replace(/-/g, " ");
  const selectedMarker = selectedMarkerId ? markers.find((marker) => marker.id === selectedMarkerId) ?? null : null;
  const markerLinkOptions = useMemo(() => {
    const collection = selectedMarker?.linkedCollection;
    if (!collection) return [];
    const sourceItems = ((studio as any)[collection] || []) as any[];
    return sourceItems.map((item) => ({
      id: item.id,
      label: getStudioItemTitle(item),
      sublabel: [item.status, item.realm, item.purpose, item.kind, item.role, item.name === getStudioItemTitle(item) ? "" : item.name].filter(Boolean).join(" · "),
    }));
  }, [selectedMarker?.linkedCollection, studio]);

  const updateSelectedMarkerLinkCollection = (collection: StudioCollectionKey | "") => {
    updateSelectedMarker({ linkedCollection: collection, linkedId: "", linkedLabel: "" });
  };

  const updateSelectedMarkerLinkId = (linkedId: string) => {
    const linked = markerLinkOptions.find((option) => option.id === linkedId);
    updateSelectedMarker({ linkedId, linkedLabel: linked?.label || "" });
  };

  const unlinkSelectedMarker = () => {
    updateSelectedMarker({ linkedCollection: "", linkedId: "", linkedLabel: "" });
  };

  const sortedLayers = useMemo(() => [...layers].sort((a, b) => a.zIndex - b.zIndex), [layers]);

  const saveCompositionAsScene = async () => {
    const sceneName = saveName.trim() || `Scene Composition ${new Date().toLocaleTimeString()}`;
    const bgUrl = selectedBackground?.url ? normalizeStudioImageUrl(selectedBackground.url) : "";
    const manualLayers = layers.map(sceneComposerLayerToManualLayer).filter((layer) => !!layer.url);
    let previewCompositeUrl = bgUrl;

    if (manualLayers.length || bgUrl || backgroundMode === "transparent") {
      try {
        const compositeBlob = await renderManualCompositionToBlob(bgUrl, manualLayers, "16:9", backgroundMode === "transparent");
        const compositeDataUrl = await blobToDataUrl(compositeBlob);
        if (!isOversizedDataUrl(compositeDataUrl)) {
          previewCompositeUrl = compositeDataUrl;
        }
      } catch (err) {
        console.error(err);
        alert("Scene card saved with layer metadata, but the composite preview could not be rendered. Export may still work from saved layers.");
      }
    }

    const sceneNpcNames = layers.filter((layer) => layer.assetType === "npc").map((layer) => layer.name);
    const newScene: StudioScene & Record<string, any> = {
      ...baseMeta("user"),
      id: `scene-composer-${Date.now()}`,
      name: sceneName,
      realm: saveRealm.trim() || "Questing Academy",
      purpose: savePurpose,
      mood: "cozy" as SceneMood,
      timeOfDay: "morning" as TimeOfDay,
      npcs: sceneNpcNames,
      visualPrompt: saveNotes.trim() || "Saved from Scene Composer.",
      previewUrl: previewCompositeUrl || bgUrl || undefined,
      backgroundUrl: bgUrl || undefined,
      promptUsed: "Scene Composer manual composition save.",
      imageProvider: "scene-composer",
      manualComposition: {
        createdFrom: "scene-composer",
        backgroundMode,
        backgroundId,
        backgroundUrl: bgUrl,
        backgroundLabel: selectedBackground?.label || "",
        transparentBackground: backgroundMode === "transparent",
        canvasRatio: "16:9",
        previewCompositeUrl: previewCompositeUrl || "",
        layers: layers.map((layer) => ({
          id: layer.id,
          assetId: layer.assetId,
          sourceCollection: layer.sourceCollection,
          sourceId: layer.sourceId,
          name: layer.name,
          assetType: layer.assetType,
          previewUrl: layer.previewUrl ? normalizeStudioImageUrl(layer.previewUrl) : "",
          url: layer.previewUrl ? normalizeStudioImageUrl(layer.previewUrl) : "",
          imageRef: createImageRef(layer.previewUrl ? normalizeStudioImageUrl(layer.previewUrl) : ""),
          x: layer.x,
          y: layer.y,
          scale: layer.scale,
          opacity: layer.opacity,
          flip: layer.flip,
          rotation: layer.rotation,
          zIndex: layer.zIndex,
          sourceMode: "scene-composer",
        })),
        markers: markers.map((marker) => ({
          ...marker,
          linkedCollection: marker.type === "player-start" ? "avatars" : (marker.linkedCollection || ""),
          linkedId: marker.type === "player-start" ? "player" : (marker.linkedId || ""),
          linkedLabel: marker.type === "player-start" ? PLAYER_START_LINK_LABEL : (marker.linkedLabel || ""),
          x: Number(marker.x.toFixed(3)),
          y: Number(marker.y.toFixed(3)),
        })),
        zones: zones.map((zone) => ({
          ...zone,
          points: zone.points.map((point) => ({
            x: Number(point.x.toFixed(3)),
            y: Number(point.y.toFixed(3)),
          })),
        })),
      },
      compositionLayerCount: layers.length,
      zoneCount: zones.length,
      markerCount: markers.length,
      compositionSourceAssets: layers.map((layer) => ({
        assetId: layer.assetId,
        sourceCollection: layer.sourceCollection,
        sourceId: layer.sourceId,
        name: layer.name,
      })),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    addItem("scenes", newScene);
    setLastSavedSceneId(newScene.id);
  };

  const activeZonePointCount = activeZoneId ? (zones.find((zone) => zone.id === activeZoneId)?.points.length ?? 0) : 0;

  return (
    <div className="grid xl:grid-cols-[300px,minmax(900px,1fr),300px] 2xl:grid-cols-[330px,minmax(1200px,1fr),330px] gap-4">
      <Card className="!p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="h-display text-2xl">Scene Composer</h2>
            <p className="text-xs text-ink-muted">
              Phase 2: choose backgrounds, use library assets, and manage layers locally.
            </p>
          </div>
          <span className="chip">Local only</span>
        </div>

        <div className="mt-4 rounded-2xl bg-bg border-2 border-white p-3 space-y-3">
          <Field label="Background">
            <SelectField
              testid="scene-composer-background-mode"
              value={backgroundMode}
              onChange={(v) => setBackgroundMode(v as SceneComposerBackgroundMode)}
              options={["blank", "transparent", "scene", "realm", "battleBg"]}
            />
          </Field>
          {(backgroundMode === "scene" || backgroundMode === "realm" || backgroundMode === "battleBg") && (
            <Field label="Choose background">
              <SearchSelect
                testid="scene-composer-background-id"
                value={backgroundId}
                onChange={setBackgroundId}
                options={backgroundOptions.map((bg) => ({ id: bg.id, label: bg.label, sublabel: bg.sublabel }))}
                placeholder="Search image-backed backgrounds..."
              />
            </Field>
          )}
        </div>

        <div className="mt-4">
          <Field label="Find asset">
            <TextField
              testid="scene-composer-search"
              value={query}
              onChange={setQuery}
              placeholder="Search props, pets, NPCs, art..."
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["all", "npc", "companion", "prop", "art"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setAssetTypeFilter(k)}
              className={cn(
                "px-2.5 py-1 rounded-full border-2 text-[10px] font-extrabold capitalize",
                assetTypeFilter === k ? "bg-primary text-white border-primary" : "bg-white text-ink-muted border-white hover:border-primary/40"
              )}
            >
              {k}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2 max-h-[560px] overflow-auto pr-1">
          {filteredAssets.length === 0 && (
            <div className="rounded-2xl bg-bg border-2 border-white p-4 text-sm text-ink-muted">
              No usable library assets found. Generate/save images first, or clear the filters.
            </div>
          )}

          {filteredAssets.map((asset) => {
            const imageUrl = getComposerImageUrl(asset, true);
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => addAssetToCanvas(asset)}
                className="w-full text-left rounded-2xl bg-white border-2 border-white hover:border-primary/40 p-3 shadow-sm transition"
              >
                <div className="flex gap-3 items-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={asset.name}
                      className="w-14 h-14 rounded-xl object-contain border-2 border-white shadow-sm bg-bg"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl border-2 border-white shadow-sm grid place-items-center text-xl bg-bg">🎒</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-extrabold text-sm truncate">{asset.name}</p>
                    <p className="text-[10px] font-extrabold uppercase text-ink-muted">
                      {asset.assetType} · {asset.sourceCollection}
                    </p>
                    {asset.transparentUrl && <p className="text-[10px] font-extrabold text-sage">Transparent available</p>}
                    {asset.description && <p className="text-xs text-ink-muted line-clamp-2 mt-0.5">{asset.description}</p>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="!p-4 min-h-[760px]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="h-display text-xl">Canvas</h3>
            <p className="text-xs text-ink-muted">
              {backgroundMode === "transparent" ? "Transparent composition canvas." : selectedBackground ? `Background: ${selectedBackground.label}` : "Blank 16:9 composition canvas."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLayers([]);
              setSelectedLayerId(null);
              clearZones();
              clearMarkers();
            }}
            className="btn-ghost !text-xs !py-1.5 !px-3"
            disabled={layers.length === 0 && zones.length === 0 && markers.length === 0}
          >
            Clear canvas
          </button>
        </div>

        <div
          ref={canvasRef}
          data-testid="scene-composer-canvas"
          className={cn(
            "relative w-full aspect-video min-h-[620px] rounded-3xl border-4 border-white shadow-inner overflow-hidden select-none touch-none",
            backgroundMode === "transparent" ? "bg-white" : "bg-gradient-to-br from-[#EAF7FF] to-[#FFF8DD]"
          )}
          onPointerMove={(event) => {
            if (draggingMarkerId) {
              moveMarkerFromPointer(draggingMarkerId, event.clientX, event.clientY);
              return;
            }
            if (!draggingLayerId) return;
            moveLayerFromPointer(draggingLayerId, event.clientX, event.clientY);
          }}
          onPointerUp={() => { setDraggingLayerId(null); setDraggingMarkerId(null); }}
          onPointerLeave={() => { setDraggingLayerId(null); setDraggingMarkerId(null); }}
          onClick={(event) => {
            if (zoneMode) {
              addZonePointFromPointer(event.clientX, event.clientY);
              return;
            }
            if (markerMode) {
              addMarkerFromPointer(event.clientX, event.clientY);
              return;
            }
            setSelectedLayerId(null);
            setSelectedZoneId(null);
            setSelectedMarkerId(null);
          }}
        >
          {backgroundMode === "transparent" && (
            <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)", backgroundSize: "24px 24px", backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px", backgroundColor: "#fff" }} />
          )}
          {selectedBackground?.url && (
            <img src={normalizeStudioImageUrl(selectedBackground.url)} alt={selectedBackground.label} className="absolute inset-0 w-full h-full object-cover" />
          )}
          {backgroundMode === "blank" && (
            <div className="absolute inset-0 opacity-30 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.8)_1px,transparent_1px)] bg-[size:48px_48px]" />
          )}

          {sortedLayers.map((layer) => {
            const selected = layer.id === selectedLayerId;
            return (
              <div
                key={layer.id}
                role="button"
                tabIndex={0}
                aria-label={`Scene layer ${layer.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedLayerId(layer.id);
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setSelectedLayerId(layer.id);
                  setDraggingLayerId(layer.id);
                  moveLayerFromPointer(layer.id, event.clientX, event.clientY);
                }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing select-none",
                  selected ? "ring-4 ring-primary rounded-2xl" : ""
                )}
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  zIndex: layer.zIndex,
                  opacity: Math.max(0, Math.min(100, layer.opacity)) / 100,
                  transform: `translate(-50%, -50%) scale(${layer.scale}) rotate(${layer.rotation}deg) scaleX(${layer.flip ? -1 : 1})`,
                }}
              >
                {layer.previewUrl ? (
                  <img
                    src={normalizeStudioImageUrl(layer.previewUrl)}
                    alt={layer.name}
                    draggable={false}
                    className="w-40 h-40 object-contain drop-shadow-xl pointer-events-none"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-2xl border-4 border-white shadow-xl grid place-items-center text-4xl pointer-events-none bg-bg">🎒</div>
                )}
              </div>
            );
          })}

          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {zones.map((zone) => {
              const points = zone.points.map((p) => `${p.x},${p.y}`).join(" ");
              const isSelected = zone.id === selectedZoneId;
              return (
                <g key={zone.id}>
                  {zone.closed && zone.points.length >= 3 ? (
                    <polygon points={points} className={cn(zoneColorClass(zone.type), isSelected ? "stroke-[0.8]" : "stroke-[0.45]")} />
                  ) : (
                    <polyline points={points} fill="none" className={cn(zoneColorClass(zone.type), "stroke-[0.65]")} />
                  )}
                  {zone.points.map((point, index) => (
                    <circle key={`${zone.id}-${index}`} cx={point.x} cy={point.y} r={1.05} className="fill-white stroke-primary stroke-[0.35]" />
                  ))}
                </g>
              );
            })}
          </svg>

          {zones.map((zone) => zone.points[0] ? (
            <button
              key={`zone-label-${zone.id}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedZoneId(zone.id);
              }}
              className={cn(
                "absolute z-[90] -translate-x-1/2 -translate-y-full rounded-full px-2 py-1 text-[10px] font-extrabold shadow-sm border-2",
                zone.id === selectedZoneId ? "bg-primary text-white border-primary" : "bg-white/90 text-ink border-white"
              )}
              style={{ left: `${zone.points[0].x}%`, top: `${zone.points[0].y}%`, pointerEvents: zoneMode ? "auto" : "none" }}
            >
              {zone.type}
            </button>
          ) : null)}

          

          {markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedMarkerId(marker.id);
                setSelectedLayerId(null);
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                setSelectedMarkerId(marker.id);
                setSelectedLayerId(null);
                setDraggingMarkerId(marker.id);
                moveMarkerFromPointer(marker.id, event.clientX, event.clientY);
              }}
              className={cn(
                "absolute z-[95] -translate-x-1/2 -translate-y-full rounded-full px-2 py-1 text-[10px] font-extrabold shadow-md border-2 bg-white/95 cursor-grab active:cursor-grabbing",
                selectedMarkerId === marker.id ? "border-primary text-primary ring-4 ring-primary/25" : "border-white text-ink"
              )}
              style={{ left: `${marker.x}%`, top: `${marker.y}%`, pointerEvents: markerMode ? "auto" : "none" }}
              title={`${marker.name} · ${markerLabel(marker.type)}`}
            >
              <span className="inline-flex items-center gap-1"><MapPin size={11} strokeWidth={3} /> {markerLabel(marker.type)}</span>
            </button>
          ))}

          {layers.length === 0 && !selectedBackground && backgroundMode !== "transparent" && (
            <div className="absolute inset-0 grid place-items-center text-center p-6 pointer-events-none">
              <div className="rounded-3xl bg-white/80 border-4 border-white p-5 shadow-lg">
                <p className="h-display text-2xl">Blank scene canvas</p>
                <p className="text-sm text-ink-muted mt-1">Choose a background or add assets from the left.</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="!p-4">
        <h3 className="h-display text-xl">Layer tools</h3>
        {!selectedLayer ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted mt-2">Select a layer on the canvas to adjust it.</p>
            {layers.length > 0 && (
              <div className="rounded-2xl bg-bg border-2 border-white p-3">
                <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-2">Layer stack</p>
                <div className="space-y-1">
                  {[...layers].sort((a, b) => b.zIndex - a.zIndex).map((layer) => (
                    <button key={layer.id} type="button" onClick={() => setSelectedLayerId(layer.id)} className="w-full text-left rounded-xl bg-white px-3 py-2 text-xs font-bold hover:ring-2 hover:ring-primary/40">
                      {layer.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="rounded-2xl bg-bg border-2 border-white p-3">
              <p className="text-[10px] font-extrabold uppercase text-ink-muted">Selected layer</p>
              <p className="font-extrabold">{selectedLayer.name}</p>
              <p className="text-xs text-ink-muted">{selectedLayer.assetType} · {selectedLayer.sourceCollection}</p>
              <p className="text-[10px] text-ink-muted mt-1">
                X {selectedLayer.x.toFixed(1)}% · Y {selectedLayer.y.toFixed(1)}% · Z {selectedLayer.zIndex}
              </p>
            </div>

            <Field label={`Scale ${selectedLayer.scale.toFixed(2)}x`}>
              <input data-testid="scene-composer-scale" type="range" min="0.3" max="3.5" step="0.05" value={selectedLayer.scale} onChange={(event) => updateLayer(selectedLayer.id, { scale: Number(event.target.value) })} className="w-full" />
            </Field>
            <Field label={`Opacity ${selectedLayer.opacity}%`}>
              <input data-testid="scene-composer-opacity" type="range" min="0" max="100" step="1" value={selectedLayer.opacity} onChange={(event) => updateLayer(selectedLayer.id, { opacity: Number(event.target.value) })} className="w-full" />
            </Field>
            <Field label={`Rotation ${selectedLayer.rotation}°`}>
              <input data-testid="scene-composer-rotation" type="range" min="-180" max="180" step="1" value={selectedLayer.rotation} onChange={(event) => updateLayer(selectedLayer.id, { rotation: Number(event.target.value) })} className="w-full" />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => updateLayer(selectedLayer.id, { scale: Math.max(0.3, selectedLayer.scale - 0.1) })} className="btn-outline !text-xs !py-1.5 !px-3">− Smaller</button>
              <button type="button" onClick={() => updateLayer(selectedLayer.id, { scale: Math.min(3.5, selectedLayer.scale + 0.1) })} className="btn-outline !text-xs !py-1.5 !px-3">+ Bigger</button>
              <button type="button" onClick={() => updateLayer(selectedLayer.id, { flip: !selectedLayer.flip })} className={cn("btn-outline !text-xs !py-1.5 !px-3", selectedLayer.flip ? "!bg-primary !text-white" : "")}>Flip X</button>
              <button type="button" onClick={duplicateSelectedLayer} className="btn-outline !text-xs !py-1.5 !px-3">Duplicate</button>
              <button type="button" onClick={() => nudgeLayerZ("down")} className="btn-outline !text-xs !py-1.5 !px-3">Send back</button>
              <button type="button" onClick={() => nudgeLayerZ("up")} className="btn-outline !text-xs !py-1.5 !px-3">Bring front</button>
            </div>

            <div className="rounded-2xl bg-bg border-2 border-white p-3">
              <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-2">Layer stack</p>
              <div className="space-y-1">
                {[...layers].sort((a, b) => b.zIndex - a.zIndex).map((layer) => (
                  <button key={layer.id} type="button" onClick={() => setSelectedLayerId(layer.id)} className={cn("w-full text-left rounded-xl px-3 py-2 text-xs font-bold", layer.id === selectedLayerId ? "bg-primary text-white" : "bg-white text-ink hover:ring-2 hover:ring-primary/40")}>{layer.name}</button>
                ))}
              </div>
            </div>

            <button type="button" onClick={removeSelectedLayer} className="btn-ghost !text-sm !py-2 !px-4 text-danger w-full">
              <Trash2 size={14} strokeWidth={3} /> Delete selected layer
            </button>
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-bg border-2 border-white p-3 space-y-3">
          <div>
            <p className="h-display text-lg">Walkable zones</p>
            <p className="text-xs text-ink-muted">Click the canvas to add polygon points. Coordinates save as percentages.</p>
          </div>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border-2 border-white text-xs font-extrabold">
            <input type="checkbox" checked={zoneMode} onChange={(event) => { setZoneMode(event.target.checked); if (event.target.checked) setMarkerMode(false); }} className="accent-primary" />
            Zone edit mode
          </label>
          <Field label="Zone type">
            <SelectField testid="scene-composer-zone-type" value={zoneType} onChange={(v) => setZoneType(v as SceneZoneType)} options={["walkable", "blocked", "water", "tall-grass", "interaction"]} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={closeActiveZone} disabled={!activeZoneId || activeZonePointCount < 3} className="btn-outline !text-xs !py-1.5 !px-3 disabled:opacity-40">Close zone</button>
            <button type="button" onClick={undoLastZonePoint} disabled={!activeZoneId || activeZonePointCount === 0} className="btn-outline !text-xs !py-1.5 !px-3 disabled:opacity-40"><Undo2 size={12} strokeWidth={3} /> Undo point</button>
            <button type="button" onClick={cancelActiveZone} disabled={!activeZoneId} className="btn-outline !text-xs !py-1.5 !px-3 disabled:opacity-40"><XCircle size={12} strokeWidth={3} /> Cancel zone</button>
            <button type="button" onClick={deleteSelectedZone} disabled={!selectedZoneId} className="btn-outline !text-xs !py-1.5 !px-3 disabled:opacity-40">Delete zone</button>
          </div>
          {zones.length > 0 && (
            <div className="rounded-2xl bg-white border-2 border-white p-2 space-y-1 max-h-40 overflow-auto">
              {zones.map((zone) => (
                <button key={zone.id} type="button" onClick={() => setSelectedZoneId(zone.id)} className={cn("w-full text-left rounded-xl px-3 py-2 text-xs font-bold", selectedZoneId === zone.id ? "bg-primary text-white" : "bg-bg text-ink")}>
                  {zone.name} · {zone.points.length} pts {zone.closed ? "· closed" : "· open"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-bg border-2 border-white p-3 space-y-3">
          <div>
            <p className="h-display text-lg">Gameplay markers</p>
            <p className="text-xs text-ink-muted">Click the canvas to place gameplay anchors. Coordinates save as percentages.</p>
          </div>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border-2 border-white text-xs font-extrabold">
            <input type="checkbox" checked={markerMode} onChange={(event) => { setMarkerMode(event.target.checked); if (event.target.checked) setZoneMode(false); }} className="accent-primary" />
            Marker edit mode
          </label>
          <Field label="Marker type">
            <SelectField testid="scene-composer-marker-type" value={markerType} onChange={(v) => setMarkerType(v as SceneMarkerType)} options={SCENE_MARKER_TYPES} />
          </Field>
          {selectedMarker && (
            <div className="rounded-2xl bg-white border-2 border-white p-3 space-y-2">
              <p className="text-[10px] font-extrabold uppercase text-ink-muted">Selected marker</p>
              <Field label="Marker name">
                <TextField testid="scene-composer-marker-name" value={selectedMarker.name} onChange={(v) => updateSelectedMarker({ name: v })} placeholder="Marker name" />
              </Field>
              <Field label="Type">
                <SelectField testid="scene-composer-selected-marker-type" value={selectedMarker.type} onChange={(v) => { const nextType = v as SceneMarkerType; updateSelectedMarker(nextType === "player-start" ? { type: nextType, linkedCollection: "avatars", linkedId: "player", linkedLabel: PLAYER_START_LINK_LABEL } : { type: nextType }); }} options={SCENE_MARKER_TYPES} />
              </Field>
              {selectedMarker.type === "player-start" ? (
                <div className="rounded-2xl bg-bg border-2 border-white px-3 py-2 text-xs font-extrabold text-primary inline-flex items-center gap-2">
                  <UserRound size={13} strokeWidth={3} /> Player start is automatically linked to the player.
                </div>
              ) : (
                <Field label="Linked card type">
                  <SelectField
                    testid="scene-composer-marker-linked-collection"
                    value={selectedMarker.linkedCollection || ""}
                    onChange={(v) => updateSelectedMarkerLinkCollection(v as StudioCollectionKey | "")}
                    options={MARKER_LINK_COLLECTIONS}
                    placeholder="No linked card"
                  />
                </Field>
              )}
              {selectedMarker.type !== "player-start" && selectedMarker.linkedCollection && (
                <Field label={`Linked ${markerLinkCollectionLabel(selectedMarker.linkedCollection)}`}>
                  <SearchSelect
                    testid="scene-composer-marker-linked-id"
                    value={selectedMarker.linkedId || ""}
                    onChange={updateSelectedMarkerLinkId}
                    options={markerLinkOptions}
                    placeholder="Search Studio card..."
                  />
                </Field>
              )}
              {selectedMarker.linkedLabel && (
                <p className="text-[10px] font-extrabold text-sage inline-flex items-center gap-1"><Link2 size={11} strokeWidth={3} /> Linked: {selectedMarker.linkedLabel}</p>
              )}
              <p className="text-[10px] text-ink-muted font-bold">X {selectedMarker.x.toFixed(1)}% · Y {selectedMarker.y.toFixed(1)}%</p>
              <button type="button" onClick={unlinkSelectedMarker} disabled={selectedMarker.type === "player-start" || (!selectedMarker.linkedCollection && !selectedMarker.linkedId)} className="btn-outline !text-xs !py-1.5 !px-3 w-full disabled:opacity-40"><Unlink size={12} strokeWidth={3} /> Clear linked card</button>
              <button type="button" onClick={deleteSelectedMarker} className="btn-outline !text-xs !py-1.5 !px-3 w-full text-danger"><Trash2 size={12} strokeWidth={3} /> Delete marker</button>
            </div>
          )}
          {markers.length > 0 && (
            <div className="rounded-2xl bg-white border-2 border-white p-2 space-y-1 max-h-40 overflow-auto">
              {markers.map((marker) => (
                <button key={marker.id} type="button" onClick={() => setSelectedMarkerId(marker.id)} className={cn("w-full text-left rounded-xl px-3 py-2 text-xs font-bold", selectedMarkerId === marker.id ? "bg-primary text-white" : "bg-bg text-ink")}> 
                  {marker.name} · {markerLabel(marker.type)} · {marker.x.toFixed(1)}%, {marker.y.toFixed(1)}%
                  {marker.linkedLabel ? <span className="block text-[10px] text-sage">Linked: {marker.linkedLabel}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>


        <div className="mt-4 rounded-2xl bg-bg border-2 border-white p-3 space-y-3">
          <div>
            <p className="h-display text-lg">Save composition</p>
            <p className="text-xs text-ink-muted">Creates a reusable Scene card with the selected background and layer metadata.</p>
          </div>
          <Field label="Scene name">
            <TextField testid="scene-composer-save-name" value={saveName} onChange={setSaveName} placeholder="e.g. Snowy Grove Lesson Scene" />
          </Field>
          <Field label="Realm">
            <TextField testid="scene-composer-save-realm" value={saveRealm} onChange={setSaveRealm} placeholder="Questing Academy" />
          </Field>
          <Field label="Purpose">
            <SelectField testid="scene-composer-save-purpose" value={savePurpose} onChange={(v) => setSavePurpose(v as ScenePurpose)} options={SCENE_PURPOSES} />
          </Field>
          <Field label="Notes">
            <TextArea testid="scene-composer-save-notes" value={saveNotes} onChange={setSaveNotes} placeholder="Short note for this saved scene..." />
          </Field>
          <button type="button" onClick={saveCompositionAsScene} className="btn-primary !text-sm !py-2 !px-4 w-full">
            Save as Scene card
          </button>
          {lastSavedSceneId && <p className="text-[10px] font-extrabold text-sage">Saved scene card: {lastSavedSceneId}</p>}
        </div>
      </Card>
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
    { key: "stats.hp", label: "HP" },
    { key: "stats.attack", label: "Attack" },
    { key: "stats.defense", label: "Defense" },
    { key: "stats.speed", label: "Speed" },
    { key: "promptUsed", label: "Prompt used", multiline: true },
    ...common,
  ];

  if (collection === "evolutions") return [
    { key: "evolutionName", label: "Evolution name" },
    { key: "lore", label: "Lore", multiline: true },
    { key: "unlockCondition", label: "Unlock condition" },
    { key: "academyInfluence", label: "Academy influence" },
    { key: "evolutionType", label: "Evolution type" },
    { key: "visualNotes", label: "Visual notes", multiline: true },
    { key: "statGrowth.hp", label: "HP growth" },
    { key: "statGrowth.attack", label: "Attack growth" },
    { key: "statGrowth.defense", label: "Defense growth" },
    { key: "statGrowth.speed", label: "Speed growth" },
    { key: "evolvedStats.hp", label: "Evolved HP" },
    { key: "evolvedStats.attack", label: "Evolved Attack" },
    { key: "evolvedStats.defense", label: "Evolved Defense" },
    { key: "evolvedStats.speed", label: "Evolved Speed" },
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
    { key: "hairColor", label: "Hair color" },
    { key: "hairStyle", label: "Hair style" },
    { key: "eyeColor", label: "Eye color" },
    { key: "outfitColors", label: "Outfit colors" },
    { key: "outfitDetails", label: "Outfit details", multiline: true },
    { key: "accessories", label: "Accessories" },
    { key: "speciesDetails", label: "Species details" },
    { key: "mustPreserve", label: "Must preserve / identity lock", multiline: true },
    { key: "visualNotes", label: "Visual notes", multiline: true },
    { key: "dialogue", label: "Sample dialogue", multiline: true },
    { key: "safetyNotes", label: "Safety notes", multiline: true },
    { key: "promptUsed", label: "Prompt used", multiline: true },
    ...common,
  ];

  return common;
};

const getStudioItemTitle = (item: any): string =>
  item.name || item.title || item.evolutionName || item.realm || item.companionName || item.id || "Studio item";

const getNestedValue = (item: any, key: string): any =>
  key.split(".").reduce((acc, part) => (acc == null ? undefined : acc[part]), item);

const setNestedValue = (target: any, key: string, value: any) => {
  const parts = key.split(".");
  let cursor = target;
  parts.slice(0, -1).forEach((part) => {
    if (!cursor[part] || typeof cursor[part] !== "object") cursor[part] = {};
    cursor = cursor[part];
  });
  cursor[parts[parts.length - 1]] = value;
};



const getManualCompositionDisplayUrl = (item: any, fallbackUrl?: string): string => {
  if (item?.manualComposition?.backgroundUrl) return normalizeStudioImageUrl(item.manualComposition.backgroundUrl);
  return normalizeStudioImageUrl(fallbackUrl || item?.previewUrl || "");
};

const exportSavedManualComposition = async (item: any, filenameBase: string) => {
  const mc = item?.manualComposition;
  if (!mc?.layers?.length) {
    alert("No saved manual composition layers found on this card.");
    return;
  }
  await exportManualCompositionPng(
    mc.backgroundUrl || "",
    mc.layers,
    filenameBase,
    mc.canvasRatio || item.canvasRatio || "16:9",
    !!mc.transparentBackground
  );
};




const scenePreviewZoneColorClass = (type?: string): string => {
  if (type === "walkable") return "stroke-sage fill-sage/20";
  if (type === "blocked") return "stroke-danger fill-danger/20";
  if (type === "water") return "stroke-sky-400 fill-sky-300/25";
  if (type === "tall-grass") return "stroke-green-500 fill-green-300/25";
  return "stroke-primary fill-primary/20";
};

const formatSceneMarkerLabel = (marker: any): string => {
  const typeLabel = String(marker?.type || "marker").replace(/-/g, " ");
  return marker?.linkedLabel ? `${typeLabel}: ${marker.linkedLabel}` : typeLabel;
};

const SceneComposerLayeredPreview: React.FC<{ item: any; className?: string; alt?: string; showAssets?: boolean; showZones?: boolean; showMarkers?: boolean }> = ({ item, className, alt, showAssets = true, showZones = false, showMarkers = false }) => {
  const mc = item?.manualComposition;
  const backgroundUrl = normalizeStudioImageUrl(mc?.backgroundUrl || item?.backgroundUrl || item?.previewUrl || "");
  const layers = Array.isArray(mc?.layers) ? [...mc.layers].sort((a: any, b: any) => Number(a?.zIndex ?? 1) - Number(b?.zIndex ?? 1)) : [];
  const zones = Array.isArray(mc?.zones) ? mc.zones : [];
  const markers = Array.isArray(mc?.markers) ? mc.markers : [];
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border-4 border-white shadow-lg bg-bg aspect-video", className)}>
      {backgroundUrl ? (
        <img src={backgroundUrl} alt={alt || item?.name || "Scene background"} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#EAF7FF] to-[#FFF8DD]" />
      )}
      {showAssets && layers.map((layer: any) => {
        const url = getManualCompositionLayerImageUrl(layer);
        if (!url) return null;
        const scale = Number(layer?.scale ?? 1);
        const displayWidthPercent = Math.max(8, Math.min(45, 12.5 * scale));
        return (
          <img
            key={layer?.id || `${layer?.name}-${layer?.zIndex}`}
            src={url}
            alt={layer?.name || "Scene layer"}
            className="absolute object-contain drop-shadow-xl pointer-events-none select-none"
            style={{
              left: `${Number(layer?.x ?? 50)}%`,
              top: `${Number(layer?.y ?? 50)}%`,
              width: `${displayWidthPercent}%`,
              transform: `translate(-50%, -50%) rotate(${Number(layer?.rotation ?? 0)}deg) scaleX(${layer?.flip ? -1 : 1})`,
              opacity: Math.max(0, Math.min(100, Number(layer?.opacity ?? 100))) / 100,
              zIndex: Number(layer?.zIndex ?? 1),
            }}
          />
        );
      })}
      {showZones && zones.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[80]" viewBox="0 0 100 100" preserveAspectRatio="none">
          {zones.map((zone: any) => {
            const points = Array.isArray(zone?.points) ? zone.points.map((p: any) => `${Number(p?.x ?? 0)},${Number(p?.y ?? 0)}`).join(" ") : "";
            if (!points) return null;
            return zone?.closed && zone.points.length >= 3 ? (
              <polygon key={zone.id || zone.name} points={points} className={cn(scenePreviewZoneColorClass(zone.type), "stroke-[0.45]")} />
            ) : (
              <polyline key={zone.id || zone.name} points={points} fill="none" className={cn(scenePreviewZoneColorClass(zone.type), "stroke-[0.65]")} />
            );
          })}
        </svg>
      )}
      {showMarkers && markers.map((marker: any) => (
        <div
          key={marker?.id || marker?.name}
          className="absolute z-[90] -translate-x-1/2 -translate-y-full rounded-full px-2 py-1 text-[10px] font-extrabold shadow-md border-2 border-white bg-white/95 text-ink pointer-events-none"
          style={{ left: `${Number(marker?.x ?? 50)}%`, top: `${Number(marker?.y ?? 50)}%` }}
          title={marker?.name || formatSceneMarkerLabel(marker)}
        >
          <span className="inline-flex items-center gap-1"><MapPin size={11} strokeWidth={3} /> {formatSceneMarkerLabel(marker)}</span>
        </div>
      ))}
    </div>
  );
};



type ScenePackageWarning = {
  code: string;
  message: string;
  path?: string;
};

const sanitizeScenePackageUrl = (value: unknown, path: string, warnings: ScenePackageWarning[]): string => {
  if (typeof value !== "string") return "";
  const normalized = normalizeStudioImageUrl(value);
  if (!normalized) return "";
  if (normalized.startsWith("data:image/")) {
    warnings.push({
      code: "inline-image-stripped",
      path,
      message: "Inline data:image URL was stripped from the runtime scene package. Export/import the image as a file-backed asset before runtime use.",
    });
    return "";
  }
  return normalized;
};

const downloadJsonFile = (payload: unknown, filenameBase: string) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `${slugifyForDownload(filenameBase)}.scene.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const buildScenePackageJson = (item: any) => {
  const mc = item?.manualComposition || {};
  const warnings: ScenePackageWarning[] = [];
  const layers = Array.isArray(mc.layers) ? mc.layers : [];
  const zones = Array.isArray(mc.zones) ? mc.zones : [];
  const markers = Array.isArray(mc.markers) ? mc.markers : [];
  const backgroundUrl = sanitizeScenePackageUrl(mc.backgroundUrl || item?.backgroundUrl || item?.previewUrl || "", "background.url", warnings);

  const assets = layers.map((layer: any, index: number) => {
    const layerUrl = sanitizeScenePackageUrl(layer?.url || layer?.previewUrl || layer?.imageRef?.url || "", `assets[${index}].url`, warnings);
    if (!layerUrl) {
      warnings.push({
        code: "missing-asset-url",
        path: `assets[${index}].url`,
        message: `Scene layer ${layer?.name || layer?.id || index + 1} has no portable image URL.`,
      });
    }
    return {
      id: layer?.id || `layer-${index + 1}`,
      assetId: layer?.assetId || "",
      sourceCollection: layer?.sourceCollection || "",
      sourceId: layer?.sourceId || "",
      name: layer?.name || layer?.label || `Layer ${index + 1}`,
      assetType: layer?.assetType || layer?.kind || "asset",
      url: layerUrl,
      transform: {
        x: Number(layer?.x ?? 50),
        y: Number(layer?.y ?? 50),
        scale: Number(layer?.scale ?? 1),
        opacity: Number(layer?.opacity ?? 100),
        flip: !!layer?.flip,
        rotation: Number(layer?.rotation ?? 0),
        zIndex: Number(layer?.zIndex ?? index + 1),
      },
    };
  });

  if (!backgroundUrl && (mc.backgroundUrl || item?.backgroundUrl || item?.previewUrl)) {
    warnings.push({
      code: "missing-background-url",
      path: "background.url",
      message: "Scene background is not portable because it is missing or was stored as inline image data.",
    });
  }

  return {
    schemaVersion: "questing-academy.scene-package.v1",
    exportedAt: new Date().toISOString(),
    scene: {
      id: item?.id || "",
      name: item?.name || "Untitled Scene",
      realm: item?.realm || "",
      purpose: item?.purpose || "",
      mood: item?.mood || "",
      timeOfDay: item?.timeOfDay || "",
      status: item?.status || "",
      visualPrompt: item?.visualPrompt || "",
    },
    canvas: {
      ratio: mc.canvasRatio || item?.canvasRatio || "16:9",
      backgroundMode: mc.backgroundMode || "",
      transparentBackground: !!mc.transparentBackground,
    },
    background: {
      id: mc.backgroundId || "",
      label: mc.backgroundLabel || "",
      url: backgroundUrl,
    },
    assets,
    zones: zones.map((zone: any, index: number) => ({
      id: zone?.id || `zone-${index + 1}`,
      name: zone?.name || `Zone ${index + 1}`,
      type: zone?.type || "interaction",
      closed: !!zone?.closed,
      points: Array.isArray(zone?.points) ? zone.points.map((point: any) => ({ x: Number(point?.x ?? 0), y: Number(point?.y ?? 0) })) : [],
    })),
    markers: markers.map((marker: any, index: number) => ({
      id: marker?.id || `marker-${index + 1}`,
      name: marker?.name || `Marker ${index + 1}`,
      type: marker?.type || "point-of-interest",
      x: Number(marker?.x ?? 50),
      y: Number(marker?.y ?? 50),
      linkedCollection: marker?.linkedCollection || "",
      linkedId: marker?.linkedId || "",
      linkedLabel: marker?.linkedLabel || "",
    })),
    references: {
      compositionSourceAssets: Array.isArray(item?.compositionSourceAssets) ? item.compositionSourceAssets : [],
      previewCompositeUrl: sanitizeScenePackageUrl(mc.previewCompositeUrl || "", "references.previewCompositeUrl", warnings),
    },
    counts: {
      assets: assets.length,
      zones: zones.length,
      markers: markers.length,
      warnings: warnings.length,
    },
    warnings,
  };
};

const exportScenePackageJson = (item: any, filenameBase: string) => {
  const scenePackage = buildScenePackageJson(item);
  downloadJsonFile(scenePackage, filenameBase);
};

const StudioViewEditButton: React.FC<StudioViewEditButtonProps> = ({ collection, item, title, imageUrl }) => {
  const exportFilename = `${collection}-${getStudioItemTitle(item)}-${item.outputMode || item.zonePurpose || item.id || "image"}`;
  const hasArtManualComposition = collection === "arts" && !!item?.manualComposition?.layers?.length;
  const hasSceneComposerComposition =
    collection === "scenes" &&
    item?.manualComposition?.createdFrom === "scene-composer" &&
    (
      !!item?.manualComposition?.layers?.length ||
      !!item?.manualComposition?.markers?.length ||
      !!item?.manualComposition?.zones?.length
    );
  const sceneCompositionLayers = Array.isArray(item?.manualComposition?.layers) ? item.manualComposition.layers : [];
  const sceneCompositionMarkers = Array.isArray(item?.manualComposition?.markers) ? item.manualComposition.markers : [];
  const sceneCompositionZones = Array.isArray(item?.manualComposition?.zones) ? item.manualComposition.zones : [];
  const missingSceneLayers = sceneCompositionLayers.filter((layer: any) => !getManualCompositionLayerImageUrl(layer));
  const hasMissingSceneAssets = missingSceneLayers.length > 0;
  const displayImageUrl = hasSceneComposerComposition
    ? getSceneCompositionDisplayUrl(item, imageUrl)
    : normalizeStudioImageUrl(hasArtManualComposition ? getManualCompositionDisplayUrl(item, imageUrl) : imageUrl);
  const updateItem = useStudio((s) => s.updateItem);
  const setStatus = useStudio((s) => s.setStatus);
  const removeItem = useStudio((s) => s.removeItem);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [showSceneAssets, setShowSceneAssets] = useState(true);
  const [showSceneZones, setShowSceneZones] = useState(false);
  const [showSceneMarkers, setShowSceneMarkers] = useState(false);
  const editableFields = useMemo(() => getEditableStudioFields(collection, item), [collection, item.id]);
  const [form, setForm] = useState<Record<string, string>>({});

  const resetForm = () => {
    const next: Record<string, string> = {};
    editableFields.forEach((f) => {
      const value = getNestedValue(item, f.key);
      next[f.key] = value === undefined || value === null ? "" : String(value);
    });
    setForm(next);
  };

  const openModal = () => {
    resetForm();
    setEdit(false);
    setOpen(true);
  };

  const archiveCard = () => {
    setStatus(collection, item.id, "archived");
    setOpen(false);
  };

  const deleteCard = () => {
    const ok = window.confirm(`Delete ${getStudioItemTitle(item)} permanently from ${collection}? This cannot be undone.`);
    if (!ok) return;
    removeItem(collection, item.id);
    setOpen(false);
  };

  const save = () => {
    const patch: Record<string, string> = {};
    editableFields.forEach((f) => {
      setNestedValue(patch, f.key, form[f.key] ?? "");
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

            {(displayImageUrl || hasSceneComposerComposition) && (
              <div className="mt-4">
                <button type="button" onClick={() => setFullscreenImage(true)} className="group block w-full text-left">
                  {hasSceneComposerComposition ? (
                    <SceneComposerLayeredPreview item={item} alt={`${displayTitle} full preview`} className="w-full max-h-[420px] transition group-hover:brightness-95" showAssets={showSceneAssets} showZones={showSceneZones} showMarkers={showSceneMarkers} />
                  ) : (
                    <img src={displayImageUrl} alt={`${displayTitle} full preview`} className="w-full max-h-[420px] object-contain rounded-2xl border-4 border-white shadow-lg transition group-hover:brightness-95 bg-bg" />
                  )}
                </button>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button type="button" onClick={() => setFullscreenImage(true)} className="btn-outline !text-xs !py-1.5 !px-3">
                    <Eye size={13} strokeWidth={3} /> View image fullscreen
                  </button>
                  {hasSceneComposerComposition && (
                    <>
                      <button type="button" onClick={() => setShowSceneAssets((v) => !v)} className={cn("btn-outline !text-xs !py-1.5 !px-3", showSceneAssets ? "!bg-primary !text-white" : "")}>Assets {showSceneAssets ? "On" : "Off"}</button>
                      <button type="button" onClick={() => setShowSceneZones((v) => !v)} className={cn("btn-outline !text-xs !py-1.5 !px-3", showSceneZones ? "!bg-primary !text-white" : "")}>Zones {showSceneZones ? "On" : "Off"}</button>
                      <button type="button" onClick={() => setShowSceneMarkers((v) => !v)} className={cn("btn-outline !text-xs !py-1.5 !px-3", showSceneMarkers ? "!bg-primary !text-white" : "")}><MapPin size={13} strokeWidth={3} /> Markers {showSceneMarkers ? "On" : "Off"}</button>
                    </>
                  )}
                  {!hasSceneComposerComposition && (
                    <button type="button" onClick={() => downloadImageFromUrl(displayImageUrl, exportFilename)} className="btn-outline !text-xs !py-1.5 !px-3">
                      <Download size={13} strokeWidth={3} /> Export image
                    </button>
                  )}
                  {hasArtManualComposition && (
                    <button type="button" onClick={() => exportSavedManualComposition(item, exportFilename)} className="btn-outline !text-xs !py-1.5 !px-3">
                      <Download size={13} strokeWidth={3} /> Export saved composition PNG
                    </button>
                  )}
                  {hasSceneComposerComposition && (
                    <button type="button" onClick={() => exportSavedSceneComposerComposition(item, exportFilename)} className="btn-outline !text-xs !py-1.5 !px-3">
                      <Download size={13} strokeWidth={3} /> Export saved scene PNG
                    </button>
                  )}
                  {hasSceneComposerComposition && (
                    <button type="button" onClick={() => exportScenePackageJson(item, exportFilename)} className="btn-outline !text-xs !py-1.5 !px-3">
                      <Download size={13} strokeWidth={3} /> Export scene package JSON
                    </button>
                  )}
                  {/^(assets|companions|arts|avatars|evolutions|npcs)$/.test(collection) && (
                    <>
                      <button type="button" onClick={() => exportTransparentPngFromUrl(displayImageUrl, exportFilename)} className="btn-outline !text-xs !py-1.5 !px-3">
                        <Download size={13} strokeWidth={3} /> Export transparent PNG
                      </button>
                      <button type="button" onClick={async () => {
                        try {
                          const transparentPreviewUrl = await createTransparentPngDataUrlFromUrl(displayImageUrl);
                          if (isOversizedDataUrl(transparentPreviewUrl)) {
                            alert("Transparent variant is too large for browser storage. Export the transparent PNG and import/use it locally instead.");
                            return;
                          }
                          updateItem(collection, item.id, { transparentPreviewUrl, updatedAt: new Date().toISOString() } as any);
                          alert("Transparent variant saved to this card.");
                        } catch (err) {
                          console.error(err);
                          alert("Could not save transparent variant. Try exporting transparent PNG first.");
                        }
                      }} className="btn-outline !text-xs !py-1.5 !px-3">
                        <Download size={13} strokeWidth={3} /> Save transparent variant
                      </button>
                    </>
                  )}
                </div>
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
                      <p className="text-xs text-ink-muted whitespace-pre-wrap">{String(getNestedValue(item, f.key) ?? "") || "—"}</p>
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
                <>
                  <button type="button" onClick={startEdit} className="btn-primary !text-sm !py-2 !px-4">Edit fields</button>
                  <button type="button" onClick={archiveCard} className="btn-ghost !text-sm !py-2 !px-4 text-ink-muted"><Archive size={14} strokeWidth={3} /> Archive card</button>
                  <button type="button" onClick={deleteCard} className="btn-ghost !text-sm !py-2 !px-4 text-danger"><Trash2 size={14} strokeWidth={3} /> Delete card</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {fullscreenImage && (displayImageUrl || hasSceneComposerComposition) && (
        <div className="fixed inset-0 z-[60] bg-black/85 p-4 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute top-4 right-4 flex flex-wrap gap-2 justify-end">
            {hasSceneComposerComposition && (
              <>
                <button type="button" onClick={() => setShowSceneAssets((v) => !v)} className="btn-ghost !bg-white !text-ink !text-sm !py-2 !px-4">Assets {showSceneAssets ? "On" : "Off"}</button>
                <button type="button" onClick={() => setShowSceneZones((v) => !v)} className="btn-ghost !bg-white !text-ink !text-sm !py-2 !px-4">Zones {showSceneZones ? "On" : "Off"}</button>
                <button type="button" onClick={() => setShowSceneMarkers((v) => !v)} className="btn-ghost !bg-white !text-ink !text-sm !py-2 !px-4">Markers {showSceneMarkers ? "On" : "Off"}</button>
              </>
            )}
            <button type="button" onClick={() => downloadImageFromUrl(displayImageUrl, exportFilename)} className="btn-ghost !bg-white !text-ink !text-sm !py-2 !px-4"><Download size={14} strokeWidth={3} /> Export</button>
            {hasSceneComposerComposition && (
              <button type="button" onClick={() => exportScenePackageJson(item, exportFilename)} className="btn-ghost !bg-white !text-ink !text-sm !py-2 !px-4"><Download size={14} strokeWidth={3} /> Scene JSON</button>
            )}
            {/^(assets|companions|arts|avatars|evolutions|npcs)$/.test(collection) && (
              <button type="button" onClick={() => exportTransparentPngFromUrl(displayImageUrl, exportFilename)} className="btn-ghost !bg-white !text-ink !text-sm !py-2 !px-4"><Download size={14} strokeWidth={3} /> Transparent PNG</button>
            )}
            <button type="button" onClick={() => setFullscreenImage(false)} className="btn-ghost !bg-white !text-ink !text-sm !py-2 !px-4">Close</button>
          </div>
          {hasSceneComposerComposition ? (
            <SceneComposerLayeredPreview item={item} alt={`${displayTitle} fullscreen`} className="w-[95vw] max-w-[1400px] max-h-[92vh] rounded-2xl shadow-2xl" showAssets={showSceneAssets} showZones={showSceneZones} showMarkers={showSceneMarkers} />
          ) : (
            <img src={displayImageUrl} alt={`${displayTitle} fullscreen`} className="max-w-[95vw] max-h-[92vh] object-contain rounded-2xl shadow-2xl" />
          )}
        </div>
      )}
    </>
  );
};




const makeDurableImagePreview = async (preview: GeneratedImagePreview): Promise<GeneratedImagePreview> => {
  if (!preview?.url) return preview;
  if (preview.url.startsWith("data:image/")) return preview;

  const normalizedUrl = normalizeStudioImageUrl(preview.url);
  const response = await fetch(normalizedUrl);
  if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);

  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error(`Expected image response, got ${blob.type || "unknown content type"}`);
  }

  const dataUrl = await blobToDataUrl(blob);
  if (isOversizedDataUrl(dataUrl)) {
    throw new Error("Generated image is too large for local browser storage. Export it instead, or move to backend image storage next.");
  }

  return { ...preview, url: dataUrl, provider: `${preview.provider || "generator"}-inline` };
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
  onGenerate: () => void | Promise<void>;
  onSave: () => void;
  onDiscard: () => void;
  disabled?: boolean;
  imageClassName?: string;
  exportFilename?: string;
}> = ({ testid, title, helper, generatedPreview, savedPreview, onGenerate, onSave, onDiscard, disabled, imageClassName, exportFilename }) => {
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

  const handleGenerate = async () => {
    setStatus("generating");
    setAttempt(0);
    try {
      await onGenerate();
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const handleDiscard = () => {
    setStatus("idle");
    setAttempt(0);
    onDiscard();
  };

  const isBusy = status === "generating" || status === "loading";
  const isReady = status === "ready";
  const canExportTransparent = /assets|companions|arts|avatars|evolutions|npcs/i.test(testid);
  const cacheBustedUrl = generatedPreview?.url
    ? generatedPreview.url.startsWith("data:image/")
      ? generatedPreview.url
      : `${generatedPreview.url}${generatedPreview.url.includes("?") ? "&" : "?"}qaRetry=${attempt}`
    : "";

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
              {isReady && <button type="button" data-testid={`${testid}-export`} onClick={() => downloadImageFromUrl(generatedPreview.url, exportFilename || `${testid}-generated-preview`)} className="btn-outline !text-sm !py-2 !px-4"><Download size={14} strokeWidth={3} /> Export image</button>}
              {isReady && canExportTransparent && <button type="button" data-testid={`${testid}-export-transparent`} onClick={() => exportTransparentPngFromUrl(generatedPreview.url, exportFilename || `${testid}-generated-preview`)} className="btn-outline !text-sm !py-2 !px-4"><Download size={14} strokeWidth={3} /> Export transparent PNG</button>}
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

  const generateImagePreview = async () => {
    const prompt = buildAvatarImagePrompt(draft);
    setSavedPreview(null);
    try {
      const preview = await generateStudioImagePreview({
        prompt,
        contentType: "avatar",
        palette: { from: draft.previewColor ?? "#9D8DF1", to: "#FFF8DD" },
      });
      setGeneratedPreview(preview);
    } catch (err) {
      console.error(err);
      setGeneratedPreview(null);
      alert(err instanceof Error ? err.message : "Image generation failed.");
    }
  };

  const saveGeneratedPreview = async () => {
    if (!generatedPreview) return;
    try {
      const durablePreview = await makeDurableImagePreview(generatedPreview);
      setSavedPreview(durablePreview);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not save generated image to local storage.");
    }
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
            <img src={getImageUrl(i)} alt={`${i.name} avatar asset`} className="w-16 h-16 object-contain rounded-2xl border-4 border-white shrink-0 shadow-lg bg-bg" />
          ) : (
            <div className="w-16 h-16 rounded-2xl border-4 border-white shrink-0" style={{ background: i.previewColor }} aria-hidden />
          )}
          <div className="min-w-0">
            <p className="h-display text-lg truncate">{i.name}</p>
            <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.category.replace("-"," ")} · {i.rarity}</p>
            {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {(i as any).outputMode ?? "Walking Map"} · {i.imageProvider ?? "prototype"}</p>}
            {i.description && <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>}
            {i.hair?.style && <p className="text-[10px] font-bold text-primary mt-1">Hair: {i.hair.style}, {i.hair.length}, {i.hair.texture}</p>}
            {i.outfit?.outfitType && <p className="text-[10px] font-bold text-primary mt-1">Outfit: {i.outfit.outfitType} · {i.outfit.theme}</p>}
            {i.accessory?.accessoryType && <p className="text-[10px] font-bold text-primary mt-1">Acc: {i.accessory.accessoryType} @ {i.accessory.placement}</p>}
            <StudioViewEditButton collection="avatars" item={i} title={i.name} imageUrl={getImageUrl(i)} />
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

const COMPANION_MOVE_CATEGORIES = ["attack", "support", "defense", "utility"];
const COMPANION_MOVE_DB = [
  { name: "Pat", affinity: "all", category: "support", defaultLevel: 1, flavor: "gentle comfort move" },
  { name: "Warm Hug", affinity: "all", category: "support", defaultLevel: 3, flavor: "friendly encouragement move" },
  { name: "Spark Hop", affinity: "star", category: "attack", defaultLevel: 99, flavor: "small cheerful sparkle attack" },
  { name: "Pebble Shield", affinity: "earth", category: "defense", defaultLevel: 99, flavor: "protective stone shield" },
  { name: "Bubble Bop", affinity: "water", category: "attack", defaultLevel: 99, flavor: "soft bouncing water attack" },
  { name: "Leaf Twirl", affinity: "nature", category: "attack", defaultLevel: 99, flavor: "gentle leafy spin" },
  { name: "Ember Pat", affinity: "fire", category: "attack", defaultLevel: 99, flavor: "tiny warm ember tap" },
  { name: "Breeze Veil", affinity: "air", category: "support", defaultLevel: 99, flavor: "soft wind support veil" },
  { name: "Glow Guard", affinity: "star", category: "defense", defaultLevel: 99, flavor: "friendly glowing guard" },
  { name: "Snack Cheer", affinity: "all", category: "utility", defaultLevel: 99, flavor: "happy utility boost" },
];

const DEFAULT_COMPANION_MOVE_ROWS = [
  { moveName: "Pat", unlockLevel: 1, category: "support" },
  { moveName: "Warm Hug", unlockLevel: 3, category: "support" },
  { moveName: "Spark Hop", unlockLevel: 99, category: "attack" },
  { moveName: "Pebble Shield", unlockLevel: 99, category: "defense" },
  { moveName: "Bubble Bop", unlockLevel: 99, category: "attack" },
  { moveName: "Leaf Twirl", unlockLevel: 99, category: "attack" },
  { moveName: "Breeze Veil", unlockLevel: 99, category: "support" },
  { moveName: "Snack Cheer", unlockLevel: 99, category: "utility" },
];

const normalizeCompanionMoveRows = (moves?: string[]) => {
  const source = moves && moves.length ? moves : DEFAULT_COMPANION_MOVE_ROWS.map((m) => `Lv ${m.unlockLevel} · ${m.category} · ${m.moveName}`);
  return source.slice(0, 8).map((line, index) => {
    const parts = String(line).split("·").map((p) => p.trim());
    const levelMatch = parts[0]?.match(/\d+/);
    const category = (parts[1] || (index < 2 ? "support" : "attack")).toLowerCase();
    const moveName = parts[2] || parts[0]?.replace(/^Lv\s*\d+/i, "").trim() || DEFAULT_COMPANION_MOVE_ROWS[index]?.moveName || "Pat";
    return {
      moveName,
      unlockLevel: levelMatch ? Number(levelMatch[0]) : (index === 0 ? 1 : index === 1 ? 3 : 99),
      category: COMPANION_MOVE_CATEGORIES.includes(category as any) ? category : "attack",
    };
  });
};

const formatCompanionMoveRows = (rows: { moveName: string; unlockLevel: number; category: string }[]) =>
  rows.slice(0, 8).map((m, index) => {
    const level = index === 0 ? 1 : Math.max(2, Math.min(99, Number(m.unlockLevel) || 99));
    const category = COMPANION_MOVE_CATEGORIES.includes(m.category as any) ? m.category : "attack";
    return `Lv ${level} · ${category} · ${m.moveName || "Pat"}`;
  });

const buildCompanionImagePrompt = (draft: Partial<StudioCompanion>): string => {
  const name = draft.name?.trim() || "unnamed companion";
  const affinity = draft.affinity || "nature";
  const rarity = draft.rarity || "common";
  const role = draft.role || "balanced";
  const academy = draft.academyAffinity || "addition";
  const personality = draft.personality || "friendly, brave, emotionally appealing";
  const lore = draft.lore || "A kind companion who helps kids feel excited to learn.";
  const moveRows = normalizeCompanionMoveRows(draft.moves);
  const moves = moveRows.slice(0, 4).map((m) => `Lv ${m.unlockLevel} ${m.category} ${m.moveName}`).join(", ");
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
    "Style rules: full body visible, centered in frame, big expressive eyes, rounded soft shapes, cozy storybook watercolor, pastel colors, child-safe for ages 5-12, friendly expression, clean readable silhouette, isolated companion cutout, flat pure white removable background, no scenery behind the pet.",
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
    moves: formatCompanionMoveRows([...DEFAULT_COMPANION_MOVE_ROWS]),
  });
  const update = <K extends keyof StudioCompanion>(k: K, v: StudioCompanion[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const moveRows = normalizeCompanionMoveRows(draft.moves);
  const updateMoveRow = (index: number, patch: Partial<{ moveName: string; unlockLevel: number; category: string }>) => {
    const next = moveRows.map((row, i) => i === index ? { ...row, ...patch } : row);
    update("moves", formatCompanionMoveRows(next));
  };
  const addMoveRow = () => {
    if (moveRows.length >= 8) return;
    update("moves", formatCompanionMoveRows([...moveRows, { moveName: "Spark Hop", unlockLevel: 99, category: "attack" }]));
  };
  const removeMoveRow = (index: number) => {
    if (moveRows.length <= 1) return;
    update("moves", formatCompanionMoveRows(moveRows.filter((_, i) => i !== index)));
  };

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
      moves: formatCompanionMoveRows([
        { moveName: "Pat", unlockLevel: 1, category: "support" },
        { moveName: "Warm Hug", unlockLevel: 3, category: "support" },
        ...randomMoveSet(aff).slice(0, 6).map((move) => ({ moveName: move, unlockLevel: 99, category: "attack" })),
      ]),
      stats: randomStats(),
      palette: { from: randomHex(), to: randomHex() },
      shinyPalette: { from: randomHex(), to: randomHex() },
      emoji: ({ nature: "🌱", fire: "🔥", earth: "🪨", water: "🫧", air: "🌬️", star: "✨" } as any)[aff],
    }));
  };

  const generateImagePreview = async () => {
    const prompt = buildCompanionImagePrompt(draft);
    setSavedPreview(null);
    try {
      const preview = await generateStudioImagePreview({
        prompt,
        contentType: "companion",
        palette: draft.palette,
      });
      setGeneratedPreview(preview);
    } catch (err) {
      console.error(err);
      setGeneratedPreview(null);
      alert(err instanceof Error ? err.message : "Image generation failed.");
    }
  };

  const saveGeneratedPreview = async () => {
    if (!generatedPreview) return;
    try {
      const durablePreview = await makeDurableImagePreview(generatedPreview);
      setSavedPreview(durablePreview);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not save generated image to local storage.");
    }
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
      moves: draft.moves ?? formatCompanionMoveRows([...DEFAULT_COMPANION_MOVE_ROWS]),
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
            <Field label="Emoji glyph"><SelectField testid="companions-input-emoji" value={draft.emoji ?? ""} onChange={(v) => update("emoji", v)} options={["🌱","🔥","💧","🪨","🌬️","✨","🐾","🐣","🦊","🐰","🐢","🐉","🦉","🦋","🫧","🌸"]} placeholder="—" /></Field>
            <Field label="HP"><NumberField testid="companions-stat-hp" value={draft.stats?.hp ?? 0} onChange={(n) => update("stats", { ...(draft.stats!), hp: n })} min={1} max={300} /></Field>
            <Field label="Attack"><NumberField testid="companions-stat-attack" value={draft.stats?.attack ?? 0} onChange={(n) => update("stats", { ...(draft.stats!), attack: n })} min={1} max={120} /></Field>
            <Field label="Defense"><NumberField testid="companions-stat-defense" value={draft.stats?.defense ?? 0} onChange={(n) => update("stats", { ...(draft.stats!), defense: n })} min={1} max={120} /></Field>
            <Field label="Speed"><NumberField testid="companions-stat-speed" value={draft.stats?.speed ?? 0} onChange={(n) => update("stats", { ...(draft.stats!), speed: n })} min={1} max={120} /></Field>
            <Field label="Color from"><ColorField testid="companions-palette-from" value={draft.palette?.from ?? "#E8F4E1"} onChange={(v) => update("palette", { ...(draft.palette!), from: v })} onSave={() => {}} /></Field>
            <Field label="Color to"><ColorField testid="companions-palette-to" value={draft.palette?.to ?? "#86A789"} onChange={(v) => update("palette", { ...(draft.palette!), to: v })} onSave={() => {}} /></Field>
            <Field label="Personality" full><TextField testid="companions-input-personality" value={draft.personality ?? ""} onChange={(v) => update("personality", v)} placeholder="friendly support / bold defender / playful trickster" /></Field>
            <Field label="Lore" full><TextArea testid="companions-input-lore" value={draft.lore ?? ""} onChange={(v) => update("lore", v)} placeholder="Short, kid-friendly backstory" onRandomize={() => update("lore", randomCompanionLore())} /></Field>
            <Field label="Moves / spells (up to 8, level locked)" full>
              <div className="space-y-2">
                {moveRows.map((move, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr,110px,130px,auto] gap-2 items-center rounded-2xl bg-white/80 border-2 border-white p-2">
                    <SelectField
                      testid={`companions-move-name-${idx}`}
                      value={move.moveName}
                      options={COMPANION_MOVE_DB.map((m) => m.name)}
                      onChange={(v) => updateMoveRow(idx, { moveName: v })}
                    />
                    <NumberField
                      testid={`companions-move-level-${idx}`}
                      value={idx === 0 ? 1 : move.unlockLevel}
                      min={idx === 0 ? 1 : 2}
                      max={99}
                      onChange={(n) => updateMoveRow(idx, { unlockLevel: idx === 0 ? 1 : n })}
                    />
                    <SelectField
                      testid={`companions-move-category-${idx}`}
                      value={move.category}
                      options={COMPANION_MOVE_CATEGORIES}
                      onChange={(v) => updateMoveRow(idx, { category: v })}
                    />
                    <button type="button" onClick={() => removeMoveRow(idx)} disabled={idx === 0} className="btn-ghost !text-xs !py-1.5 !px-2 disabled:opacity-30">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={addMoveRow} disabled={moveRows.length >= 8} className="btn-outline !text-xs !py-1.5 !px-3 disabled:opacity-40">
                  + Add move slot
                </button>
                <p className="text-[10px] font-bold text-ink-muted">Slot 1 is always level 1. Slot 2 defaults early. Extra move slots default/should stay locked at level 99 until manually tuned.</p>
              </div>
            </Field>
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
              <img src={getImageUrl(i)} alt={`${i.name} companion art`} className="w-16 h-16 object-contain rounded-2xl border-4 border-white shrink-0 shadow-lg bg-bg" />
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
          <StudioViewEditButton collection="companions" item={i} title={i.name} imageUrl={getImageUrl(i)} />
          <button type="button" onClick={() => useStudio.getState().setStatus("companions", i.id, "archived")} className="btn-ghost !text-xs !py-1.5 !px-3 mt-2 w-full">Archive card</button>
          <button type="button" onClick={() => useStudio.getState().removeItem("companions", i.id)} className="btn-ghost !text-xs !py-1.5 !px-3 mt-2 w-full text-danger"><Trash2 size={12} strokeWidth={3} /> Delete card</button>
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

const EVOLUTION_TYPES = ["minor", "major", "final", "alternate", "shiny-only"];
const EVOLUTION_BACKGROUND_MODES = ["transparent-ready", "plain removable background", "simple light background", "game UI presentation"];
const EVOLUTION_PALETTE_RELATIONSHIPS = ["preserve base palette", "darker / stronger version", "lighter / angelic version", "shiny alternate", "complementary colors", "custom palette"];
const EVOLUTION_INTENSITIES = ["subtle first evolution", "clear second form", "final form", "alternate form"];

const getEvolutionStatGrowth = (stage: number, evolutionType?: string) => {
  if (evolutionType === "shiny-only") return { hp: 0, attack: 0, defense: 0, speed: 0 };
  if (evolutionType === "alternate") return { hp: 6, attack: 3, defense: 3, speed: 3 };
  if (evolutionType === "minor" || stage === 2) return { hp: 10, attack: 4, defense: 4, speed: 3 };
  if (evolutionType === "final" || stage === 3) return { hp: 20, attack: 8, defense: 6, speed: 5 };
  return { hp: 12, attack: 5, defense: 5, speed: 4 };
};

const calculateEvolvedStats = (base?: StudioCompanion, growth?: any) => ({
  hp: (base?.stats?.hp ?? 0) + Number(growth?.hp ?? 0),
  attack: (base?.stats?.attack ?? 0) + Number(growth?.attack ?? 0),
  defense: (base?.stats?.defense ?? 0) + Number(growth?.defense ?? 0),
  speed: (base?.stats?.speed ?? 0) + Number(growth?.speed ?? 0),
});

const compactPromptText = (value?: string, fallback = ""): string =>
  (value || fallback || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

const inferBaseVisualSummary = (baseCompanion?: StudioCompanion): string => {
  if (!baseCompanion) return "cute rounded fantasy pet companion with friendly big eyes";
  const lore = compactPromptText(baseCompanion.lore, "friendly fantasy pet companion");
  const palette = baseCompanion.palette ? ` Palette ${baseCompanion.palette.from} to ${baseCompanion.palette.to}.` : "";
  return compactPromptText(`${lore}.${palette}`, "cute rounded fantasy pet companion with friendly big eyes");
};

const buildEvolutionImagePrompt = (draft: Partial<StudioEvolution> & Record<string, any>, baseCompanion?: StudioCompanion, previousEvolutions: StudioEvolution[] = []): string => {
  const baseName = baseCompanion?.name || draft.baseCompanionName || "base pet";
  const evolutionName = draft.evolutionName?.trim() || `${baseName} evolved form`;
  const stage = Number(draft.stageNumber ?? 2);
  const evolutionType = draft.evolutionType || (stage >= 3 ? "final" : "major");
  const evolutionIntensity = draft.evolutionIntensity || (stage >= 3 ? "final form" : "subtle first evolution");
  const speciesFamily = compactPromptText(draft.speciesFamily, inferBaseVisualSummary(baseCompanion));
  const baseVisualSummary = compactPromptText(draft.baseVisualSummary, inferBaseVisualSummary(baseCompanion));
  const visual = compactPromptText(draft.visualNotes, "make it slightly bigger, more confident, and clearly related to the base pet");
  const affinity = baseCompanion?.affinity || "fantasy";
  const palette = baseCompanion?.palette;
  const useBasePalette = draft.useBasePalette !== false;
  const paletteRelationship = draft.paletteRelationship || "preserve base palette";
  const evolutionPalette = draft.evolutionPalette || { from: palette?.from || "#9D8DF1", to: palette?.to || "#F4C753" };
  const paletteLine = useBasePalette
    ? (palette ? `${palette.from} and ${palette.to}; ${paletteRelationship}` : `soft pastel related colors; ${paletteRelationship}`)
    : `${evolutionPalette.from} and ${evolutionPalette.to}; ${paletteRelationship}`;
  const previous = previousEvolutions.length
    ? compactPromptText(previousEvolutions[previousEvolutions.length - 1]?.visualNotes || previousEvolutions[previousEvolutions.length - 1]?.evolutionName || "previous form exists")
    : "none";

  return [
    "Create one single game-ready evolved pet asset for Questing Academy.",
    `Pet name: ${evolutionName}.`,
    `Base pet: ${baseName}.`,
    `Evolution: stage ${stage}, ${evolutionType}, ${evolutionIntensity}.`,
    stage <= 2 ? "This is a modest first evolution, not a final mega form." : "This is a stronger later evolution while preserving the base identity.",
    `Species/body family: ${speciesFamily}.`,
    `Base visual DNA: ${baseVisualSummary}.`,
    previous !== "none" ? `Previous evolution note: ${previous}.` : "",
    `Change direction: ${visual}.`,
    `Affinity cue: ${affinity}.`,
    `Color palette: ${paletteLine}.`,
    "Keep the same creature family, face feel, body rhythm, and cute friendly emotional tone.",
    "Show exactly one creature only, centered, full body visible, clean readable silhouette.",
    "Style: cute chibi fantasy RPG pet, soft pastel storybook game art, rounded shapes, big expressive eyes, child-safe, polished game asset.",
    "Background: flat pure white removable background for transparent PNG export.",
    "Negative: no text, no labels, no watermark, no logo, no UI, no concept sheet, no design sheet, no side sketches, no alternate poses, no duplicate creatures, no extra creatures, no parchment, no poster, no border, no scenery, no props, no cropped body, no photorealism, no horror, no weapons."
  ].filter(Boolean).join("\n");
};

const EvolutionsTab: React.FC = () => {
  const items = useStudio((s) => s.evolutions);
  const companions = useStudio((s) => s.companions);
  const addItem = useStudio((s) => s.addItem);
  const approvedCompanions = companions.filter((c) => c.status === "approved" || c.status === "published");
  const [draft, setDraft] = useState<Partial<StudioEvolution> & Record<string, any>>({
    stageNumber: 2,
    evolutionType: "major",
    statGrowth: getEvolutionStatGrowth(2, "major"),
    backgroundMode: "transparent-ready",
    transparentIntent: true,
    useBasePalette: true,
    paletteRelationship: "preserve base palette",
    evolutionPalette: { from: "#9D8DF1", to: "#F4C753" },
    speciesFamily: "",
    baseVisualSummary: "",
  });
  const [generatedPreview, setGeneratedPreview] = useState<EvolutionGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<EvolutionGeneratedPreview | null>(null);
  const update = <K extends keyof StudioEvolution>(k: K, v: StudioEvolution[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const updateAny = (k: string, v: any) => setDraft((d) => ({ ...d, [k]: v }));

  const baseCompanion = companions.find((c) => c.id === draft.baseCompanionId);
  const previousEvolutions = items
    .filter((e) => e.baseCompanionId === draft.baseCompanionId && Number(e.stageNumber) < Number(draft.stageNumber ?? 2) && (e.status === "approved" || e.status === "published"))
    .sort((a, b) => Number(a.stageNumber) - Number(b.stageNumber));
  const evolvedStats = calculateEvolvedStats(baseCompanion, draft.statGrowth);

  const randomize = () => {
    const c = approvedCompanions[Math.floor(Math.random() * approvedCompanions.length)];
    if (!c) return;
    setGeneratedPreview(null);
    setSavedPreview(null);
    const stage = Math.random() < 0.5 ? 2 : 3;
    const evolutionType = stage === 3 ? "final" : "major";
    const statGrowth = getEvolutionStatGrowth(stage, evolutionType);
    setDraft({
      baseCompanionId: c.id,
      baseCompanionName: c.name,
      stageNumber: stage as 2 | 3,
      evolutionType,
      evolutionName: `${c.name} ${stage === 2 ? "Bloom" : "Apex"}`,
      lore: `As ${c.name} grows, its ${c.affinity} powers bloom while keeping its kind heart.`,
      unlockCondition: stage === 2 ? `Answer 30 ${c.academyAffinity} questions correctly` : `Reach Academy mastery 80% with ${c.name}`,
      academyInfluence: c.academyAffinity,
      visualNotes: stage === 2 ? "Slightly taller, more confident pose, stronger markings, same friendly face family." : "Final form with clearer magical accents, stronger silhouette, and preserved base companion traits.",
      statGrowth,
      evolvedStats: calculateEvolvedStats(c, statGrowth),
      statGrowthNotes: `HP +${statGrowth.hp}, ATK +${statGrowth.attack}, DEF +${statGrowth.defense}, SPD +${statGrowth.speed}`,
      backgroundMode: "transparent-ready",
      transparentIntent: true,
      useBasePalette: true,
      paletteRelationship: stage === 3 ? "darker / stronger version" : "preserve base palette",
      evolutionPalette: { from: c.palette?.from || "#9D8DF1", to: c.palette?.to || "#F4C753" },
    });
  };

  const handleBaseCompanionChange = (id: string) => {
    const c = companions.find((x) => x.id === id);
    const stage = Number(draft.stageNumber ?? 2);
    const evolutionType = draft.evolutionType || (stage >= 3 ? "final" : "major");
    const statGrowth = draft.statGrowth || getEvolutionStatGrowth(stage, evolutionType);
    setGeneratedPreview(null);
    setSavedPreview(null);
    setDraft((d) => ({
      ...d,
      baseCompanionId: id,
      baseCompanionName: c?.name || "",
      academyInfluence: d.academyInfluence || c?.academyAffinity,
      statGrowth,
      evolvedStats: calculateEvolvedStats(c, statGrowth),
      statGrowthNotes: `HP +${statGrowth.hp}, ATK +${statGrowth.attack}, DEF +${statGrowth.defense}, SPD +${statGrowth.speed}`,
      evolutionPalette: d.evolutionPalette || { from: c?.palette?.from || "#9D8DF1", to: c?.palette?.to || "#F4C753" },
    }));
  };

  const handleStageOrTypeChange = (stageNumber?: number, evolutionType?: string) => {
    const stage = stageNumber ?? Number(draft.stageNumber ?? 2);
    const type = evolutionType ?? draft.evolutionType ?? (stage >= 3 ? "final" : "major");
    const statGrowth = getEvolutionStatGrowth(stage, type);
    setDraft((d) => ({
      ...d,
      stageNumber: stage as 1 | 2 | 3,
      evolutionType: type,
      statGrowth,
      evolvedStats: calculateEvolvedStats(baseCompanion, statGrowth),
      statGrowthNotes: `HP +${statGrowth.hp}, ATK +${statGrowth.attack}, DEF +${statGrowth.defense}, SPD +${statGrowth.speed}`,
    }));
  };

  const updateGrowth = (key: "hp" | "attack" | "defense" | "speed", value: number) => {
    const statGrowth = { ...(draft.statGrowth || getEvolutionStatGrowth(Number(draft.stageNumber ?? 2), draft.evolutionType)), [key]: value };
    setDraft((d) => ({
      ...d,
      statGrowth,
      evolvedStats: calculateEvolvedStats(baseCompanion, statGrowth),
      statGrowthNotes: `HP +${statGrowth.hp}, ATK +${statGrowth.attack}, DEF +${statGrowth.defense}, SPD +${statGrowth.speed}`,
    }));
  };

  const generateImagePreview = async () => {
    if (!baseCompanion && !draft.baseCompanionName) return;
    const prompt = buildEvolutionImagePrompt({ ...draft, evolvedStats }, baseCompanion, previousEvolutions);
    const paletteForGeneration = draft.useBasePalette !== false
      ? (baseCompanion?.palette || draft.evolutionPalette)
      : draft.evolutionPalette;
    setSavedPreview(null);
    try {
      const preview = await generateStudioImagePreview({
        prompt,
        contentType: "evolution",
        linkedEntityId: draft.baseCompanionId,
        palette: paletteForGeneration,
      });
      setGeneratedPreview(preview);
    } catch (err) {
      console.error(err);
      setGeneratedPreview(null);
      alert(err instanceof Error ? err.message : "Image generation failed.");
    }
  };

  const saveGeneratedPreview = async () => {
    if (!generatedPreview) return;
    try {
      const durablePreview = await makeDurableImagePreview(generatedPreview);
      setSavedPreview(durablePreview);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not save generated image to local storage.");
    }
  };

  const discardGeneratedPreview = () => {
    setGeneratedPreview(null);
    setSavedPreview(null);
  };

  const submit = () => {
    if (!draft.baseCompanionId) return;
    const statGrowth = draft.statGrowth || getEvolutionStatGrowth(Number(draft.stageNumber ?? 2), draft.evolutionType);
    const finalStats = calculateEvolvedStats(baseCompanion, statGrowth);
    const item: StudioEvolution = {
      ...baseMeta("user"),
      id: "evo-" + Date.now(),
      baseCompanionId: draft.baseCompanionId,
      baseCompanionName: baseCompanion?.name || draft.baseCompanionName || "",
      stageNumber: (draft.stageNumber as 1 | 2 | 3) ?? 2,
      evolutionName: draft.evolutionName ?? `${baseCompanion?.name || "Companion"} evolved form`,
      lore: draft.lore ?? "—",
      unlockCondition: draft.unlockCondition ?? "—",
      academyInfluence: draft.academyInfluence ?? baseCompanion?.academyAffinity ?? "addition",
      visualNotes: draft.visualNotes ?? "—",
      statGrowthNotes: `HP +${statGrowth.hp}, ATK +${statGrowth.attack}, DEF +${statGrowth.defense}, SPD +${statGrowth.speed}`,
      previewUrl: savedPreview?.url,
      promptUsed: savedPreview?.prompt,
      imageProvider: savedPreview?.provider,
      evolutionType: draft.evolutionType,
      statGrowth,
      evolvedStats: finalStats,
      backgroundMode: draft.backgroundMode,
      transparentIntent: draft.transparentIntent,
      useBasePalette: draft.useBasePalette,
      paletteRelationship: draft.paletteRelationship,
      evolutionPalette: draft.evolutionPalette,
      basePreviewUrl: baseCompanion?.previewUrl,
      speciesFamily: draft.speciesFamily,
      baseVisualSummary: draft.baseVisualSummary,
      previousEvolutionContext: previousEvolutions.map((e) => ({ id: e.id, name: e.evolutionName, stage: e.stageNumber, visualNotes: e.visualNotes, promptUsed: (e as any).promptUsed })),
    } as StudioEvolution;
    addItem("evolutions", item);
    setDraft({ stageNumber: 2, evolutionType: "major", statGrowth: getEvolutionStatGrowth(2, "major"), backgroundMode: "transparent-ready", transparentIntent: true, useBasePalette: true, paletteRelationship: "preserve base palette", evolutionPalette: { from: "#9D8DF1", to: "#F4C753" }, speciesFamily: "", baseVisualSummary: "" });
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
              <div><p className="h-display text-xl leading-tight">Add evolution stage</p><p className="text-sm text-ink-muted">Uses approved/published pets only. Evolutions inherit base stats + editable growth.</p></div>
            </div>
            <button type="button" data-testid="evolutions-randomize" onClick={randomize} disabled={approvedCompanions.length === 0} className="btn-outline !text-sm !py-2 !px-4 disabled:opacity-40"><Sparkles size={14} strokeWidth={3} /> Randomize</button>
          </div>
          {approvedCompanions.length === 0 && <div className="mb-3 rounded-2xl bg-white/70 border-2 border-white p-3 text-xs font-bold text-ink-muted">Approve at least one pet before creating evolutions.</div>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Base companion" full>
              <SearchSelect
                testid="evolutions-input-base"
                value={draft.baseCompanionId ?? ""}
                onChange={handleBaseCompanionChange}
                options={approvedCompanions.map((c) => ({ id: c.id, label: c.name, sublabel: `${c.status} · ${c.affinity} · ${c.rarity}` }))}
                placeholder="Search approved pets…"
              />
            </Field>
            <Field label="Stage"><SelectField testid="evolutions-input-stage" value={String(draft.stageNumber)} options={["1","2","3"]} onChange={(v) => handleStageOrTypeChange(parseInt(v) as 1|2|3, undefined)} /></Field>
            <Field label="Evolution type"><SelectField testid="evolutions-input-type" value={draft.evolutionType ?? "major"} options={EVOLUTION_TYPES} onChange={(v) => handleStageOrTypeChange(undefined, v)} /></Field>
            <Field label="Evolution intensity"><SelectField testid="evolutions-input-intensity" value={draft.evolutionIntensity ?? "subtle first evolution"} options={EVOLUTION_INTENSITIES} onChange={(v) => updateAny("evolutionIntensity", v)} /></Field>
            <Field label="Species/body family"><TextField testid="evolutions-input-species-family" value={draft.speciesFamily ?? ""} onChange={(v) => updateAny("speciesFamily", v)} placeholder="e.g. blue bubble bumblebee" /></Field>
            <Field label="Base visual summary" full><TextArea testid="evolutions-input-base-visual" value={draft.baseVisualSummary ?? ""} onChange={(v) => updateAny("baseVisualSummary", v)} placeholder="Short visual DNA only: round blue bubble head, small bee body, tiny wings, yellow belly, friendly eyes" /></Field>
            <Field label="Evolution name"><TextField testid="evolutions-input-name" value={draft.evolutionName ?? ""} onChange={(v) => update("evolutionName", v)} placeholder="e.g. Bloomling" /></Field>
            <Field label="Unlock condition" full><TextField testid="evolutions-input-unlock" value={draft.unlockCondition ?? ""} onChange={(v) => update("unlockCondition", v)} placeholder="e.g. Answer 50 academy questions correctly" /></Field>
            <Field label="Academy influence"><TextField testid="evolutions-input-academy" value={draft.academyInfluence ?? ""} onChange={(v) => update("academyInfluence", v)} placeholder="addition / rhyming / …" /></Field>
            <Field label="Background mode"><SelectField testid="evolutions-background-mode" value={draft.backgroundMode ?? "transparent-ready"} options={EVOLUTION_BACKGROUND_MODES} onChange={(v) => updateAny("backgroundMode", v)} /></Field>
            <Field label="Transparent/removal-ready?">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border-2 border-white">
                <input type="checkbox" data-testid="evolutions-transparent-intent" checked={draft.transparentIntent !== false} onChange={(e) => updateAny("transparentIntent", e.target.checked)} className="w-5 h-5 accent-primary" />
                <span className="text-sm font-extrabold">Prepare transparent PNG export</span>
              </label>
            </Field>
            <Field label="Use base palette?">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border-2 border-white">
                <input type="checkbox" data-testid="evolutions-use-base-palette" checked={draft.useBasePalette !== false} onChange={(e) => updateAny("useBasePalette", e.target.checked)} className="w-5 h-5 accent-primary" />
                <span className="text-sm font-extrabold">Inherit base colors</span>
              </label>
            </Field>
            <Field label="Palette relationship"><SelectField testid="evolutions-palette-relationship" value={draft.paletteRelationship ?? "preserve base palette"} options={EVOLUTION_PALETTE_RELATIONSHIPS} onChange={(v) => updateAny("paletteRelationship", v)} /></Field>
            <Field label="Primary evolution color"><ColorField testid="evolutions-palette-from" value={draft.evolutionPalette?.from ?? baseCompanion?.palette?.from ?? "#9D8DF1"} onChange={(v) => updateAny("evolutionPalette", { ...(draft.evolutionPalette ?? { from: "#9D8DF1", to: "#F4C753" }), from: v })} /></Field>
            <Field label="Accent evolution color"><ColorField testid="evolutions-palette-to" value={draft.evolutionPalette?.to ?? baseCompanion?.palette?.to ?? "#F4C753"} onChange={(v) => updateAny("evolutionPalette", { ...(draft.evolutionPalette ?? { from: "#9D8DF1", to: "#F4C753" }), to: v })} /></Field>
            <Field label="Visual notes" full><TextArea testid="evolutions-input-visual" value={draft.visualNotes ?? ""} onChange={(v) => update("visualNotes", v)} placeholder="Preserve base face shape, add stronger markings, bigger leaf ears…" /></Field>
            <Field label="Lore" full><TextArea testid="evolutions-input-lore" value={draft.lore ?? ""} onChange={(v) => update("lore", v)} placeholder="Short backstory" /></Field>
            <Field label="HP growth"><NumberField testid="evolutions-growth-hp" value={Number(draft.statGrowth?.hp ?? 0)} onChange={(n) => updateGrowth("hp", n)} min={0} max={200} /></Field>
            <Field label="Attack growth"><NumberField testid="evolutions-growth-attack" value={Number(draft.statGrowth?.attack ?? 0)} onChange={(n) => updateGrowth("attack", n)} min={0} max={100} /></Field>
            <Field label="Defense growth"><NumberField testid="evolutions-growth-defense" value={Number(draft.statGrowth?.defense ?? 0)} onChange={(n) => updateGrowth("defense", n)} min={0} max={100} /></Field>
            <Field label="Speed growth"><NumberField testid="evolutions-growth-speed" value={Number(draft.statGrowth?.speed ?? 0)} onChange={(n) => updateGrowth("speed", n)} min={0} max={100} /></Field>
          </div>

          {baseCompanion && (
            <div className="mt-4 grid md:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/70 border-2 border-white p-3">
                <p className="text-[10px] font-extrabold uppercase text-primary mb-1">Base form</p>
                <div className="flex gap-3 items-start">
                  {baseCompanion.previewUrl ? <img src={getImageUrl(baseCompanion)} alt={`${baseCompanion.name} base pet`} className="w-16 h-16 object-cover rounded-2xl border-4 border-white shadow-lg" /> : <CompanionDot emoji={baseCompanion.emoji} palette={baseCompanion.palette} size={64} />}
                  <div className="min-w-0">
                    <p className="h-display text-lg truncate">{baseCompanion.name}</p>
                    <p className="text-[10px] font-extrabold uppercase text-ink-muted">{baseCompanion.affinity} · {baseCompanion.role} · {baseCompanion.rarity}</p>
                    <p className="text-xs text-ink-muted line-clamp-2 mt-1">{baseCompanion.lore}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white/70 border-2 border-white p-3">
                <p className="text-[10px] font-extrabold uppercase text-primary mb-1">Calculated evolved stats</p>
                <div className="grid grid-cols-4 gap-1.5">
                  <Stat label="HP" v={evolvedStats.hp} /><Stat label="ATK" v={evolvedStats.attack} /><Stat label="DEF" v={evolvedStats.defense} /><Stat label="SPD" v={evolvedStats.speed} />
                </div>
                <p className="text-[10px] font-bold text-ink-muted mt-2">Base + growth. These values are saved on the evolution card.</p>
              </div>
            </div>
          )}

          {previousEvolutions.length > 0 && (
            <div className="mt-3 rounded-2xl bg-white/70 border-2 border-white p-3">
              <p className="text-[10px] font-extrabold uppercase text-primary mb-1">Previous approved evolution context</p>
              <div className="space-y-1">
                {previousEvolutions.map((e) => <p key={e.id} className="text-xs text-ink-muted"><b>Stage {e.stageNumber}:</b> {e.evolutionName} · {e.visualNotes}</p>)}
              </div>
            </div>
          )}

          <ImagePreviewWorkflow
            testid="evolutions-image-generator"
            title="Generated evolution image preview"
            helper="Generate from the selected approved pet and previous evolution context, then save/export/discard before sending it to review."
            generatedPreview={generatedPreview}
            savedPreview={savedPreview}
            onGenerate={generateImagePreview}
            onSave={saveGeneratedPreview}
            onDiscard={discardGeneratedPreview}
            disabled={!draft.baseCompanionId || !baseCompanion}
            imageClassName="aspect-square"
            exportFilename={`evolution-${baseCompanion?.name || draft.baseCompanionName || "base"}-stage-${draft.stageNumber || 2}-${draft.evolutionName || "evolved-form"}`}
            
          />

          <button type="button" data-testid="evolutions-generate-btn" onClick={submit} disabled={!draft.baseCompanionId} className="btn-primary mt-4 !text-base !py-3 !px-6 disabled:opacity-40">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioEvolution) => (
        <div>
          {i.previewUrl && (
            <img src={getImageUrl(i)} alt={`${i.evolutionName} evolution art`} className="w-full h-40 object-contain rounded-xl border-2 border-white mb-2 bg-bg" />
          )}
          <p className="h-display text-lg">{i.evolutionName} <span className="text-xs font-extrabold uppercase text-ink-muted">Stage {i.stageNumber}</span></p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">Base: {i.baseCompanionName} · Academy: {i.academyInfluence}</p>
          {(i as any).evolutionType && <p className="text-[10px] font-extrabold text-primary mt-1">Type: {(i as any).evolutionType}{(i as any).evolutionIntensity ? ` · ${(i as any).evolutionIntensity}` : ""}</p>}
          {(i as any).paletteRelationship && <p className="text-[10px] font-bold text-primary mt-1">Palette: {(i as any).useBasePalette === false ? "custom" : "base"} · {(i as any).paletteRelationship}{(i as any).evolutionPalette ? ` · ${(i as any).evolutionPalette.from} → ${(i as any).evolutionPalette.to}` : ""}</p>}
          {i.previewUrl && (
            <p className="text-[10px] font-extrabold text-sage mt-1">
              Generated image attached · {i.imageProvider ?? "prototype"}
            </p>
          )}
          <p className="text-xs text-ink-muted mt-2 line-clamp-2">{i.lore}</p>
          <p className="text-[10px] font-bold text-primary mt-2">Unlock: {i.unlockCondition}</p>
          <p className="text-[10px] font-bold text-primary">Visual: {i.visualNotes}</p>
          <p className="text-[10px] font-bold text-primary">Stats: {i.statGrowthNotes}</p>
          {(i as any).evolvedStats && <div className="grid grid-cols-4 gap-1.5 mt-2"><Stat label="HP" v={(i as any).evolvedStats.hp} /><Stat label="ATK" v={(i as any).evolvedStats.attack} /><Stat label="DEF" v={(i as any).evolvedStats.defense} /><Stat label="SPD" v={(i as any).evolvedStats.speed} /></div>}
          <StudioViewEditButton collection="evolutions" item={i} title={i.evolutionName} imageUrl={getImageUrl(i)} />
          <button type="button" onClick={() => useStudio.getState().setStatus("evolutions", i.id, "archived")} className="btn-ghost !text-xs !py-1.5 !px-3 mt-2 w-full">Archive card</button>
          <button type="button" onClick={() => useStudio.getState().removeItem("evolutions", i.id)} className="btn-ghost !text-xs !py-1.5 !px-3 mt-2 w-full text-danger"><Trash2 size={12} strokeWidth={3} /> Delete card</button>
        </div>
      )}
    />
  );
};

// ============================================================================
// COMPANION ART
// ============================================================================
type ArtGeneratedPreview = { url: string; prompt: string; provider: string };

const ART_SUBJECT_TYPES = ["pet", "npc", "pet + npc", "two npcs", "scene moment", "realm vignette"];
const ART_COMPOSITION_TYPES = ["buddy pose", "teaching moment", "quest handoff", "shop interaction", "celebration", "portrait card", "scene vignette"];
const ART_OUTPUT_MODES = ["manual composition", "transparent character group", "full scene illustration", "square promo art", "banner/key art"];
const ART_CANVAS_RATIOS = ["16:9", "1:1", "4:5", "3:4"];

type ManualCompositionLayer = {
  id: string;
  kind: "pet" | "npc";
  label: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  flip: boolean;
  shadow: boolean;
  opacity: number;
  zIndex: number;
  rotation?: number;
  sourceMode?: "scene-composer" | "manual-composition";
};

const buildNpcIdentityLock = (n?: StudioNPC): string => {
  if (!n) return "";
  const anyNpc = n as any;
  const lines = [
    `${n.name} identity lock:`,
    `- Role/read: ${n.customRole || n.role || "NPC"}; ${anyNpc.speciesType || "human"}; ${anyNpc.ageRead || "adult"}; ${anyNpc.silhouette || "cozy"} silhouette.`,
    anyNpc.hairColor || anyNpc.hairStyle ? `- Hair: ${anyNpc.hairStyle || "saved hairstyle"}, ${anyNpc.hairColor || "saved hair color"}.` : "",
    anyNpc.eyeColor ? `- Eyes: ${anyNpc.eyeColor}.` : "",
    anyNpc.outfitColors || anyNpc.outfitDetails || anyNpc.outfitStyle ? `- Outfit: ${anyNpc.outfitStyle || "saved outfit style"}; colors ${anyNpc.outfitColors || `${anyNpc.primaryColor || "primary"} and ${anyNpc.accentColor || "accent"}`}; details ${anyNpc.outfitDetails || "match saved visual reference"}.` : "",
    anyNpc.accessories ? `- Accessories: ${anyNpc.accessories}.` : "",
    anyNpc.speciesDetails ? `- Species/body details: ${anyNpc.speciesDetails}.` : "",
    anyNpc.mustPreserve ? `- Must preserve: ${anyNpc.mustPreserve}.` : "",
    anyNpc.visualNotes ? `- Visual notes: ${compactPromptText(anyNpc.visualNotes, "")}.` : "",
    n.previewUrl ? `- Saved reference image exists and should be treated as source identity.` : "",
  ];
  return lines.filter(Boolean).join("\n");
};

const buildPetIdentityLock = (c?: StudioCompanion): string => {
  if (!c) return "";
  const anyPet = c as any;
  const lines = [
    `${c.name} pet identity lock:`,
    `- Affinity/role/read: ${c.affinity} ${c.role} companion; ${c.rarity}.`,
    `- Palette: ${c.palette?.from || "primary"} to ${c.palette?.to || "accent"}.`,
    anyPet.bodyShape ? `- Body shape: ${anyPet.bodyShape}.` : "",
    anyPet.markings ? `- Markings: ${anyPet.markings}.` : "",
    anyPet.eyeColor || anyPet.eyes ? `- Eyes: ${anyPet.eyeColor || anyPet.eyes}.` : "",
    anyPet.visualNotes ? `- Visual notes: ${compactPromptText(anyPet.visualNotes, "")}.` : "",
    anyPet.mustPreserve ? `- Must preserve: ${anyPet.mustPreserve}.` : "",
    `- Lore visual cue: ${compactPromptText(c.lore, "cute friendly academy pet")}.`,
    c.previewUrl ? `- Saved reference image exists and should be treated as source identity.` : "",
  ];
  return lines.filter(Boolean).join("\n");
};

const summarizeNpcForArt = (n?: StudioNPC) => n ? buildNpcIdentityLock(n) : "";
const summarizePetForArt = (c?: StudioCompanion) => c ? buildPetIdentityLock(c) : "";
const summarizeSceneForArt = (sc?: StudioScene) => sc ? `${sc.name}, ${sc.purpose}, ${sc.realm}. Visual: ${compactPromptText(sc.visualPrompt, "cozy academy scene")}. ${getImageUrl(sc) ? "A saved scene visual reference is available for environment style and setting." : ""}` : "";
const summarizeRealmForArt = (r?: StudioRealm) => r ? `${r.name}, ${r.biome}, ${r.tone || "cozy"}. ${compactPromptText(r.description || r.mapNotes, "friendly Questing Academy realm")}. ${getImageUrl(r) ? "A saved realm visual reference is available for color/style/world identity." : ""}` : "";

const getImageUrl = (item?: any, preferTransparent = false): string => {
  if (!item) return "";
  const url =
    (preferTransparent ? item.transparentPreviewUrl || item.transparentUrl : "") ||
    item.previewUrl ||
    item.imageUrl ||
    item.generatedImageUrl ||
    item.url ||
    item.backgroundUrl ||
    item.manualComposition?.backgroundUrl ||
    "";
  return normalizeStudioImageUrl(url);
};

const hasUsablePreview = (item?: any): boolean => !!getImageUrl(item, false);

const buildCompanionArtPrompt = (draft: Partial<StudioArt> & Record<string, any>, ctx: { companion?: StudioCompanion; npcs: StudioNPC[]; scene?: StudioScene; realm?: StudioRealm }): string => {
  const title = draft.title?.trim() || "Questing Academy companion art";
  const subjectType = draft.subjectType || "pet + npc";
  const compositionType = draft.compositionType || "buddy pose";
  const outputMode = draft.outputMode || "transparent character group";
  const primary = draft.primaryColor || "#9D8DF1";
  const accent = draft.accentColor || "#F4C753";
  const visual = compactPromptText(draft.prompt, "warm friendly Questing Academy character art");
  const styleNotes = compactPromptText(draft.styleNotes, "soft pastel storybook game art, cute chibi fantasy RPG");
  const transparent = outputMode === "transparent character group";
  return [
    "Create one polished Questing Academy companion art image.",
    "REFERENCE PRIORITY: selected source images are the identity source. Preserve each selected NPC/pet hair, face feel, outfit, silhouette, species/body type, age read, and palette. Do not replace them with generic children or new characters.",
    `Title: ${title}.`,
    `Primary subject type: ${subjectType}.`,
    `Composition: ${compositionType}.`,
    `Output mode: ${outputMode}.`,
    ctx.companion ? `PET CHARACTER LOCK:\n${summarizePetForArt(ctx.companion)}` : "",
    ctx.npcs.length ? `NPC CHARACTER LOCKS:\n${ctx.npcs.map(summarizeNpcForArt).join("\n\n")}` : "",
    ctx.scene ? `Scene setting summary: ${summarizeSceneForArt(ctx.scene)}` : "",
    ctx.realm ? `Realm flavor summary: ${summarizeRealmForArt(ctx.realm)}` : "",
    `Color direction: ${primary} with ${accent} accents.`,
    `Visual direction: ${visual}.`,
    `Style notes: ${styleNotes}.`,
    "IDENTITY LOCK RULE: preserve every listed hair color, hair style, eye color, outfit color, outfit detail, accessory, species detail, and silhouette. Do not redesign, replace, age-swap, gender-swap, species-swap, recolor, or change clothing palette unless explicitly requested.",
    "Compose the selected sources into one clear focal moment, not a reference sheet.",
    transparent ? "Background: flat pure white removable background for transparent PNG export. No room, shop, landscape, or detailed scene background." : "Background: simple clean game illustration background, no UI.",
    "Style: cute chibi educational fantasy RPG, soft pastel storybook game art, rounded shapes, warm safe mood, child-safe, polished game asset.",
    "Negative: no text, no labels, no watermark, no logo, no UI, no concept sheet, no design sheet, no side sketches, no alternate poses, no duplicates, no crowded cast, no horror, no photorealism, no weapons."
  ].filter(Boolean).join("\n");
};

const loadImageForCanvas = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

const getManualCanvasSize = (canvasRatio = "16:9") => {
  if (canvasRatio === "1:1") return { width: 1024, height: 1024 };
  if (canvasRatio === "4:5") return { width: 1024, height: 1280 };
  if (canvasRatio === "3:4") return { width: 1024, height: 1365 };
  return { width: 1280, height: 720 };
};

const renderManualCompositionToBlob = async (
  backgroundUrl: string,
  layers: ManualCompositionLayer[],
  canvasRatio = "16:9",
  transparentBackground = false
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  const size = getManualCanvasSize(canvasRatio);
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  if (backgroundUrl && !transparentBackground) {
    const bg = await loadImageForCanvas(backgroundUrl);
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  } else if (!transparentBackground) {
    ctx.fillStyle = "#FFF8DD";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const sortedLayers = [...layers].sort((a, b) => (a.zIndex ?? 1) - (b.zIndex ?? 1));
  for (const layer of sortedLayers) {
    const img = await loadImageForCanvas(layer.url);
    const layerScale = Number(layer.scale ?? 1);
    const isSceneComposerLayer = (layer as any).sourceMode === "scene-composer" || layerScale <= 4;
    const drawW = isSceneComposerLayer
      ? Math.max(48, canvas.width * 0.125 * layerScale)
      : Math.max(48, layerScale * 1.35);
    const ratio = img.height / Math.max(1, img.width);
    const drawH = drawW * ratio;
    const x = (layer.x / 100) * canvas.width - drawW / 2;
    const y = (layer.y / 100) * canvas.height - drawH / 2;

    ctx.save();
    ctx.globalAlpha = layer.opacity == null ? 1 : Math.max(0, Math.min(1, layer.opacity / 100));
    if (layer.shadow) {
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.beginPath();
      ctx.ellipse((layer.x / 100) * canvas.width, y + drawH - 4, drawW * 0.34, drawH * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const centerX = (layer.x / 100) * canvas.width;
    const centerY = (layer.y / 100) * canvas.height;
    ctx.translate(centerX, centerY);
    ctx.rotate(((layer as any).rotation || 0) * Math.PI / 180);
    ctx.scale(layer.flip ? -1 : 1, 1);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((out) => out ? resolve(out) : reject(new Error("Composite PNG export failed")), "image/png");
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const exportManualCompositionPng = async (backgroundUrl: string, layers: ManualCompositionLayer[], filenameBase: string, canvasRatio = "16:9", transparentBackground = false) => {
  try {
    const pngBlob = await renderManualCompositionToBlob(backgroundUrl, layers, canvasRatio, transparentBackground);
    const objectUrl = URL.createObjectURL(pngBlob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${slugifyForDownload(filenameBase)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    console.error(err);
    alert("Composite export failed. This can happen if one of the image URLs blocks canvas export.");
  }
};

const ArtsTab: React.FC = () => {
  const items = useStudio((s) => s.arts);
  const companions = useStudio((s) => s.companions);
  const npcs = useStudio((s) => s.npcs);
  const scenes = useStudio((s) => s.scenes);
  const realms = useStudio((s) => s.realms);
  const battleBgs = useStudio((s) => s.battleBgs);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioArt> & Record<string, any>>({ builderMode: "manual composition", stylePresetId: "sp-cozy-chibi", npcIds: [], subjectType: "pet + npc", compositionType: "buddy pose", outputMode: "manual composition", backgroundMode: "transparent", canvasRatio: "16:9", primaryColor: "#9D8DF1", accentColor: "#F4C753" });
  const [generatedPreview, setGeneratedPreview] = useState<ArtGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<ArtGeneratedPreview | null>(null);
  const [manualLayers, setManualLayers] = useState<ManualCompositionLayer[]>([]);
  const compositionCanvasRef = useRef<HTMLDivElement | null>(null);
  const [selectedManualLayerId, setSelectedManualLayerId] = useState<string>("");
  const [draggingLayerId, setDraggingLayerId] = useState<string>("");
  const update = <K extends keyof StudioArt>(k: K, v: StudioArt[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const updateAny = (k: string, v: any) => setDraft((d) => ({ ...d, [k]: v }));

  const selectedCompanion = companions.find((x) => x.id === draft.companionId);
  const selectedNpcs = (draft.npcIds ?? []).map((id: string) => npcs.find((n) => n.id === id)).filter(Boolean).slice(0, 2) as StudioNPC[];
  const selectedScene = scenes.find((x) => x.id === draft.sceneId);
  const selectedRealm = realms.find((x) => x.id === draft.realmId);
  const selectedBattleBg = battleBgs.find((x) => x.id === draft.battleBgId);
  const backgroundSource = draft.backgroundSource || "transparent";
  const transparentManualBackground = backgroundSource === "transparent" || draft.backgroundMode === "transparent" || draft.backgroundMode === "no background";
  const backgroundUrl = transparentManualBackground ? "" : backgroundSource === "battleBg" ? getImageUrl(selectedBattleBg) : backgroundSource === "scene" ? getImageUrl(selectedScene) : backgroundSource === "realm" ? getImageUrl(selectedRealm) : "";
  const hasValidManualComposition = manualLayers.length > 0 && (transparentManualBackground || !!backgroundUrl);
  const selectedLayerKey = [selectedCompanion?.id || "none", selectedCompanion?.previewUrl || "none", ...selectedNpcs.map((n) => `${n.id}:${n.previewUrl || "none"}`)].join("|");

  const loadedVisualReferences = [
    getImageUrl(selectedCompanion, true) ? { label: selectedCompanion!.name, url: getImageUrl(selectedCompanion, true), kind: "Pet" } : null,
    ...selectedNpcs.map((n) => getImageUrl(n, true) ? { label: n.name, url: getImageUrl(n, true), kind: "NPC" } : null),
    getImageUrl(selectedScene) ? { label: selectedScene!.name, url: getImageUrl(selectedScene), kind: "Scene" } : null,
    getImageUrl(selectedRealm) ? { label: selectedRealm!.name, url: getImageUrl(selectedRealm), kind: "Realm" } : null,
    getImageUrl(selectedBattleBg) ? { label: selectedBattleBg!.realm || selectedBattleBg!.environment || "Battle BG", url: getImageUrl(selectedBattleBg), kind: "Battle BG" } : null,
  ].filter(Boolean) as { label: string; url: string; kind: string }[];

  const getLayerUrl = (item?: any): string => getImageUrl(item, true);

  useEffect(() => {
    const companionLayerUrl = getLayerUrl(selectedCompanion);

    const sourceLayers: ManualCompositionLayer[] = [
      companionLayerUrl && selectedCompanion ? {
        id: `pet-${selectedCompanion.id}`,
        kind: "pet",
        label: selectedCompanion.name,
        url: companionLayerUrl,
        x: 50,
        y: 82,
        scale: 85,
        flip: false,
        shadow: true,
        opacity: 100,
        zIndex: 20,
      } : null,
      ...selectedNpcs.map((n, idx) => {
        const npcLayerUrl = getLayerUrl(n);
        return npcLayerUrl ? {
          id: `npc-${n.id}`,
          kind: "npc" as const,
          label: n.name,
          url: npcLayerUrl,
          x: selectedNpcs.length === 1 ? 50 : idx === 0 ? 38 : 62,
          y: 84,
          scale: 88,
          flip: idx === 1,
          shadow: true,
          opacity: 100,
          zIndex: 10 + idx,
        } : null;
      }),
    ].filter(Boolean) as ManualCompositionLayer[];

    setManualLayers((current: ManualCompositionLayer[]) => {
      const byId = new Map(current.map((l) => [l.id, l]));
      return sourceLayers.map((layer) => ({ ...layer, ...(byId.get(layer.id) || {}) }));
    });
  }, [selectedLayerKey]);

  const updateManualLayer = (id: string, patch: Partial<ManualCompositionLayer>) => {
    setManualLayers((layers: ManualCompositionLayer[]) => layers.map((layer) => layer.id === id ? { ...layer, ...patch } : layer));
  };

  const moveLayerToPointer = (layerId: string, clientX: number, clientY: number) => {
    const rect = compositionCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    updateManualLayer(layerId, { x: Math.round(x), y: Math.round(y) });
  };

  const handleLayerPointerDown = (e: React.PointerEvent<HTMLDivElement>, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedManualLayerId(layerId);
    setDraggingLayerId(layerId);
    e.currentTarget.setPointerCapture(e.pointerId);
    moveLayerToPointer(layerId, e.clientX, e.clientY);
  };

  const handleLayerPointerMove = (e: React.PointerEvent<HTMLDivElement>, layerId: string) => {
    if (draggingLayerId !== layerId) return;
    e.preventDefault();
    moveLayerToPointer(layerId, e.clientX, e.clientY);
  };

  const stopLayerDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    setDraggingLayerId("");
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const generateImagePreview = async () => {
    const prompt = buildCompanionArtPrompt(draft, { companion: selectedCompanion, npcs: selectedNpcs, scene: selectedScene, realm: selectedRealm });
    const visualReferenceUrls = loadedVisualReferences.map((r) => ({ kind: r.kind, label: r.label, url: r.url }));
    setSavedPreview(null);
    try {
      const preview = await generateStudioImagePreviewWithReferences(
        prompt,
        { from: draft.primaryColor || "#9D8DF1", to: draft.accentColor || "#F4C753" },
        visualReferenceUrls,
        "companion-art"
      );
      setGeneratedPreview(preview);
    } catch (err) {
      console.error(err);
      setGeneratedPreview(null);
      alert(err instanceof Error ? err.message : "Image generation failed.");
    }
  };
  const saveGeneratedPreview = async () => {
    if (!generatedPreview) return;
    try {
      const durablePreview = await makeDurableImagePreview(generatedPreview);
      setSavedPreview(durablePreview);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not save generated image to local storage.");
    }
  };
  const discardGeneratedPreview = () => { setGeneratedPreview(null); setSavedPreview(null); };

  const submit = async () => {
    const manualMode = draft.builderMode === "manual composition" || draft.outputMode === "manual composition";
    const item = mockCompanionArt(
      draft.companionId || "art-context",
      selectedCompanion?.name || selectedNpcs.map((n) => n.name).join(" + ") || selectedScene?.name || selectedRealm?.name || "Companion Art",
      draft.prompt || randomVisualPrompt(),
      draft.styleNotes ?? "",
    ) as StudioArt & Record<string, any>;
    item.title = draft.title || item.title || (manualMode ? "Manual Companion Composition" : "Companion Art");
    item.stylePresetId = draft.stylePresetId;
    if (manualMode) {
      if (!hasValidManualComposition) return;
      try {
        const compositeBlob = await renderManualCompositionToBlob(backgroundUrl, manualLayers, draft.canvasRatio || "16:9", transparentManualBackground);
        const compositeDataUrl = await blobToDataUrl(compositeBlob);
        if (isOversizedDataUrl(compositeDataUrl)) {
          item.previewUrl = getPersistableImageUrl(backgroundUrl) || getPersistableImageUrl(getImageUrl(selectedCompanion, true)) || getPersistableImageUrl(getImageUrl(selectedNpcs[0], true)) || undefined;
          item.previewImageRef = createImageRef(compositeDataUrl);
          item.previewStorageNote = "Composite preview was too large for localStorage. Saved lightweight scene metadata only.";
        } else {
          item.previewUrl = compositeDataUrl;
          item.previewImageRef = createImageRef(compositeDataUrl);
        }
      } catch (err) {
        console.error(err);
        alert("Could not save the composite preview. Try exporting the composite first or use images from the same source.");
        return;
      }
    } else {
      item.previewUrl = savedPreview?.url || item.previewUrl;
    }
    item.promptUsed = manualMode ? "Manual composition builder: saved scene/realm background with selected NPC/pet overlay placement data." : savedPreview?.prompt;
    item.imageProvider = manualMode ? "manual-composition" : (savedPreview?.provider || item.imageProvider);
    item.companionName = selectedCompanion?.name || item.companionName || selectedNpcs.map((n) => n.name).join(" + ") || selectedScene?.name || selectedRealm?.name || "Companion Art";
    item.npcIds = draft.npcIds || [];
    item.npcs = selectedNpcs.map((n) => n.name);
    item.companionPreviewUrl = getPersistableImageUrl(getImageUrl(selectedCompanion, true)) || "";
    item.companionImageRef = createImageRef(getImageUrl(selectedCompanion, true));
    item.npcPreviewUrls = selectedNpcs.map((n) => ({ id: n.id, name: n.name, url: getPersistableImageUrl(getImageUrl(n, true)) || "", imageRef: createImageRef(getImageUrl(n, true)) })).filter((n) => n.url || n.imageRef);
    item.sceneId = draft.sceneId || "";
    item.sceneName = selectedScene?.name || "";
    item.realmId = draft.realmId || "";
    item.realmName = selectedRealm?.name || "";
    item.battleBgId = draft.battleBgId || "";
    item.battleBgName = selectedBattleBg?.realm || selectedBattleBg?.environment || "";
    item.subjectType = draft.subjectType;
    item.compositionType = draft.compositionType;
    item.outputMode = manualMode ? "manual composition" : draft.outputMode;
    item.primaryColor = draft.primaryColor;
    item.accentColor = draft.accentColor;
    item.canvasRatio = draft.canvasRatio || "16:9";
    item.manualComposition = manualMode ? {
      backgroundUrl: getPersistableImageUrl(backgroundUrl) || "",
      backgroundImageRef: createImageRef(backgroundUrl),
      transparentBackground: transparentManualBackground,
      canvasRatio: draft.canvasRatio || "16:9",
      layers: manualLayers.map((layer) => ({ ...layer, url: getPersistableImageUrl(layer.url) || "", imageRef: createImageRef(layer.url) })),
      battleBgId: draft.battleBgId || ""
    } : undefined;
    item.visualReferenceUrls = loadedVisualReferences.map((r) => ({ kind: r.kind, label: r.label, url: getPersistableImageUrl(r.url) || "", imageRef: createImageRef(r.url) }));
    item.visualReferenceSummary = loadedVisualReferences.map((r) => `${r.kind}: ${r.label}`).join(" | ");
    item.identityLocks = [selectedCompanion ? buildPetIdentityLock(selectedCompanion) : "", ...selectedNpcs.map(buildNpcIdentityLock)].filter(Boolean);
    addItem("arts", item);
    setGeneratedPreview(null);
    setSavedPreview(null);
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
            <div><p className="h-display text-xl leading-tight">Companion Art / Composition Builder</p><p className="text-sm text-ink-muted">Compose approved characters over saved scenes, or use prompt generation when needed.</p></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Builder mode"><SelectField testid="arts-input-builder-mode" value={draft.builderMode ?? "manual composition"} options={["manual composition", "prompt generation"]} onChange={(v) => updateAny("builderMode", v)} /></Field>
            <Field label="Output mode"><SelectField testid="arts-input-output-mode" value={draft.outputMode ?? "manual composition"} options={ART_OUTPUT_MODES} onChange={(v) => updateAny("outputMode", v)} /></Field>
            <Field label="Manual background source"><SelectField testid="arts-input-background-source" value={draft.backgroundSource ?? "transparent"} options={["transparent", "scene", "realm", "battleBg"]} onChange={(v) => { updateAny("backgroundSource", v); updateAny("backgroundMode", v === "transparent" ? "transparent" : "scene / realm background"); }} /></Field>
            <Field label="Subject type"><SelectField testid="arts-input-subject-type" value={draft.subjectType ?? "pet + npc"} options={ART_SUBJECT_TYPES} onChange={(v) => updateAny("subjectType", v)} /></Field>
            <Field label="Composition"><SelectField testid="arts-input-composition" value={draft.compositionType ?? "buddy pose"} options={ART_COMPOSITION_TYPES} onChange={(v) => updateAny("compositionType", v)} /></Field>
            <Field label="Canvas ratio"><SelectField testid="arts-input-canvas-ratio" value={draft.canvasRatio ?? "16:9"} options={ART_CANVAS_RATIOS} onChange={(v) => updateAny("canvasRatio", v)} /></Field>
            <Field label="Title / name"><TextField testid="arts-input-title" value={draft.title ?? ""} onChange={(v) => update("title", v)} placeholder="e.g. Lantern Guide and Bubbee" onRandomize={() => update("title", `${randomAvatarName("hat")} moment`)} /></Field>
            <Field label="Pet / companion" full>
              <SearchSelect testid="arts-input-companionId" value={draft.companionId ?? ""} onChange={(id) => { const c = companions.find((x) => x.id === id); update("companionId", id); if (c) update("companionName", c.name); }} options={companions.map((c) => ({ id: c.id, label: c.name, sublabel: `${c.status} · ${c.affinity} · ${c.rarity}` }))} placeholder="Search pets…" />
            </Field>
            <Field label="NPCs (up to 2)" full>
              <MultiSelectChips testid="arts-input-npcs" values={draft.npcIds ?? []} onChange={(v) => updateAny("npcIds", v.slice(0, 2))} options={npcs.map((n) => ({ id: n.id, label: n.name }))} />
              <p className="text-[10px] font-bold text-ink-muted mt-1">Manual mode works best with transparent NPC/pet PNG-style previews.</p>
            </Field>
            {backgroundSource === "scene" && <Field label="Scene background"><SearchSelect testid="arts-input-scene" value={draft.sceneId ?? ""} onChange={(id) => updateAny("sceneId", id)} options={scenes.filter(hasUsablePreview).map((sc) => ({ id: sc.id, label: sc.name, sublabel: `${sc.purpose} · ${sc.realm} · image` }))} placeholder="Choose image-backed scene…" /></Field>}
            {backgroundSource === "realm" && <Field label="Realm background"><SearchSelect testid="arts-input-realm" value={draft.realmId ?? ""} onChange={(id) => updateAny("realmId", id)} options={realms.filter(hasUsablePreview).map((r) => ({ id: r.id, label: r.name, sublabel: `${r.biome} · image` }))} placeholder="Choose image-backed realm…" /></Field>}
            {backgroundSource === "battleBg" && <Field label="Battle BG background"><SearchSelect testid="arts-input-battle-bg" value={draft.battleBgId ?? ""} onChange={(id) => updateAny("battleBgId", id)} options={battleBgs.filter(hasUsablePreview).map((b) => ({ id: b.id, label: b.realm || b.environment || b.id, sublabel: `${b.environment || "battle bg"} · image` }))} placeholder="Choose image-backed battle BG…" /></Field>}
            <Field label="Primary color"><ColorField testid="arts-input-primary-color" value={draft.primaryColor ?? "#9D8DF1"} onChange={(v) => updateAny("primaryColor", v)} /></Field>
            <Field label="Accent color"><ColorField testid="arts-input-accent-color" value={draft.accentColor ?? "#F4C753"} onChange={(v) => updateAny("accentColor", v)} /></Field>
            <Field label="Style preset"><StylePresetPicker testid="arts-style-preset" value={draft.stylePresetId} onChange={(id) => update("stylePresetId", id)} /></Field>
            <Field label="Visual direction" full><TextArea testid="arts-input-prompt" value={draft.prompt ?? ""} onChange={(v) => update("prompt", v)} placeholder="Sage teaching Bubbee how to follow glowing math fireflies" onRandomize={() => update("prompt", randomVisualPrompt())} /></Field>
            <Field label="Style notes" full><TextArea testid="arts-input-style" value={draft.styleNotes ?? ""} onChange={(v) => update("styleNotes", v)} placeholder="soft round shapes, cozy browser RPG promo art" onRandomize={() => update("styleNotes", "soft round shapes, gentle pastel palette, polished game asset")} /></Field>
          </div>

          {(draft.builderMode === "manual composition" || draft.outputMode === "manual composition") && (
            <div className="mt-4 rounded-3xl bg-white/70 border-4 border-white p-4">
              <p className="h-display text-lg leading-tight">Manual composition builder</p>
              <p className="text-xs text-ink-muted">Use a saved scene/realm as the background, then position selected NPC/pet images on top.</p>
              {!backgroundUrl && !transparentManualBackground ? (
                <div className="mt-3 rounded-2xl bg-bg border-2 border-white p-3 text-xs text-ink-muted">Choose a scene/realm background, or switch Manual background to transparent.</div>
              ) : (
                <>
                  <div ref={compositionCanvasRef} className={cn("relative mt-3 w-full overflow-hidden rounded-3xl border-4 border-white shadow-lg bg-bg select-none touch-none", draft.canvasRatio === "1:1" ? "aspect-square" : draft.canvasRatio === "4:5" ? "aspect-[4/5]" : draft.canvasRatio === "3:4" ? "aspect-[3/4]" : "aspect-video")}>
                    {backgroundUrl && !transparentManualBackground ? (
                      <img src={backgroundUrl} alt="Composition background" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)", backgroundSize: "24px 24px", backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px", backgroundColor: "#fff" }} />
                    )}
                    {manualLayers.map((layer) => (
                      <div key={layer.id} onPointerDown={(e) => handleLayerPointerDown(e, layer.id)} onPointerMove={(e) => handleLayerPointerMove(e, layer.id)} onPointerUp={stopLayerDrag} onPointerCancel={stopLayerDrag} className={cn("absolute cursor-grab active:cursor-grabbing rounded-2xl", selectedManualLayerId === layer.id ? "ring-4 ring-primary/70" : "")} style={{ left: `${layer.x}%`, top: `${layer.y}%`, transform: `translate(-50%, -100%) scaleX(${layer.flip ? -1 : 1})`, width: `${layer.scale * 1.35}px`, filter: layer.shadow ? "drop-shadow(0 14px 10px rgba(0,0,0,0.22))" : undefined, opacity: Math.max(0, Math.min(100, layer.opacity ?? 100)) / 100, zIndex: layer.zIndex }}>
                        <img src={layer.url} alt={layer.label} className="w-full h-auto object-contain" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-3">
                    {manualLayers.length === 0 ? (
                      <div className="rounded-2xl bg-bg border-2 border-white p-3 text-xs text-ink-muted">Select NPCs or a pet with saved preview images to add layers.</div>
                    ) : manualLayers.map((layer) => (
                      <div key={layer.id} className="rounded-2xl bg-bg border-2 border-white p-3">
                        <p className="text-xs font-extrabold text-primary mb-2">{layer.kind.toUpperCase()} · {layer.label}</p>
                        <div className="grid sm:grid-cols-6 gap-3 items-end">
                          <Field label="X"><NumberField testid={`arts-layer-${layer.id}-x`} value={layer.x} min={0} max={100} onChange={(n) => updateManualLayer(layer.id, { x: n })} /></Field>
                          <Field label="Y"><NumberField testid={`arts-layer-${layer.id}-y`} value={layer.y} min={0} max={100} onChange={(n) => updateManualLayer(layer.id, { y: n })} /></Field>
                          <Field label="Scale"><NumberField testid={`arts-layer-${layer.id}-scale`} value={layer.scale} min={20} max={180} onChange={(n) => updateManualLayer(layer.id, { scale: n })} /></Field>
                          <Field label="Opacity"><NumberField testid={`arts-layer-${layer.id}-opacity`} value={layer.opacity ?? 100} min={0} max={100} onChange={(n) => updateManualLayer(layer.id, { opacity: n })} /></Field>
                          <Field label="Layer"><NumberField testid={`arts-layer-${layer.id}-z`} value={layer.zIndex ?? 10} min={0} max={99} onChange={(n) => updateManualLayer(layer.id, { zIndex: n })} /></Field>
                          <div className="flex flex-wrap gap-2">
                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border-2 border-white text-xs font-extrabold">
                              <input type="checkbox" checked={layer.flip} onChange={(e) => updateManualLayer(layer.id, { flip: e.target.checked })} className="accent-primary" /> Flip
                            </label>
                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border-2 border-white text-xs font-extrabold">
                              <input type="checkbox" checked={layer.shadow} onChange={(e) => updateManualLayer(layer.id, { shadow: e.target.checked })} className="accent-primary" /> Shadow
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button type="button" onClick={() => exportManualCompositionPng(backgroundUrl, manualLayers, `companion-composition-${draft.title || selectedCompanion?.name || selectedNpcs[0]?.name || "questing-academy"}`, draft.canvasRatio || "16:9", transparentManualBackground)} disabled={!hasValidManualComposition} className="btn-outline !text-sm !py-2 !px-4 disabled:opacity-40"><Download size={14} strokeWidth={3} /> Export composite PNG</button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-4 rounded-3xl bg-white/70 border-4 border-white p-4">
            <p className="h-display text-lg leading-tight">Loaded visual references</p>
            <p className="text-xs text-ink-muted">These saved source images are carried into provenance. Manual mode reuses them directly as layers.</p>
            {loadedVisualReferences.length ? (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {loadedVisualReferences.map((ref) => (
                  <div key={`${ref.kind}-${ref.label}-${ref.url}`} className="w-28 shrink-0">
                    <img src={ref.url} alt={`${ref.kind} reference ${ref.label}`} className="w-28 h-28 object-cover rounded-2xl border-4 border-white shadow-lg" />
                    <p className="text-[10px] font-extrabold uppercase text-primary mt-1">{ref.kind}</p>
                    <p className="text-[10px] font-bold text-ink-muted truncate">{ref.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl bg-bg border-2 border-white p-3 text-xs text-ink-muted">No saved source images loaded yet. Select NPCs, pets, scenes, or realms that have generated previews.</div>
            )}
          </div>

          <div className="mt-4 rounded-3xl bg-white/70 border-4 border-white p-4">
            <p className="h-display text-lg leading-tight">Identity lock sent to generator</p>
            <p className="text-xs text-ink-muted">These details still help prompt generation and provenance, but manual composition preserves exact source art.</p>
            {(selectedCompanion || selectedNpcs.length) ? (
              <pre className="mt-3 text-[11px] text-ink-muted bg-bg border-2 border-white rounded-2xl p-3 max-h-52 overflow-auto whitespace-pre-wrap">{[selectedCompanion ? buildPetIdentityLock(selectedCompanion) : "", ...selectedNpcs.map(buildNpcIdentityLock)].filter(Boolean).join("\n\n")}</pre>
            ) : (
              <div className="mt-3 rounded-2xl bg-bg border-2 border-white p-3 text-xs text-ink-muted">Select a pet or NPC to see the identity lock.</div>
            )}
          </div>

          {draft.builderMode !== "manual composition" && (
            <ImagePreviewWorkflow
              testid="arts-image-generator"
              title="Generated companion art preview"
              helper="Generate from linked pets/NPCs/scenes/realms, then save, export, or discard before sending it to review."
              generatedPreview={generatedPreview}
              savedPreview={savedPreview}
              onGenerate={generateImagePreview}
              onSave={saveGeneratedPreview}
              onDiscard={discardGeneratedPreview}
              disabled={false}
              imageClassName={draft.outputMode === "banner/key art" ? "aspect-video" : "aspect-square"}
              exportFilename={`companion-art-${draft.title || selectedCompanion?.name || selectedNpcs[0]?.name || "questing-academy"}-${draft.outputMode || "art"}`}
            />
          )}

          <button type="button" data-testid="arts-generate-btn" onClick={submit} disabled={(draft.builderMode === "manual composition" || draft.outputMode === "manual composition") && !hasValidManualComposition} className="btn-primary mt-4 !text-base !py-3 !px-6 disabled:opacity-40">
            <Wand2 size={16} strokeWidth={3} /> {(draft.builderMode === "manual composition" || draft.outputMode === "manual composition") ? "Save composition card" : "Send to review"}
          </button>
        </div>
      }
      renderItem={(i: StudioArt & Record<string, any>) => (
        <div>
          {(i.previewUrl || i.manualComposition?.backgroundUrl) && <img src={getImageUrl(i) || normalizeStudioImageUrl(i.manualComposition?.backgroundUrl)} alt={`${i.title || i.companionName} companion art`} className="w-full h-40 object-contain rounded-xl border-2 border-white bg-bg" />}
          <p className="h-display text-lg mt-2 truncate">{i.title || i.companionName}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.subjectType || "companion art"}{i.outputMode ? ` · ${i.outputMode}` : ""}</p>
          {i.npcs?.length > 0 && <p className="text-[10px] font-bold text-primary mt-1">NPCs: {i.npcs.join(" · ")}</p>}
          {i.sceneName && <p className="text-[10px] font-bold text-primary mt-1">Scene: {i.sceneName}</p>}
          {i.realmName && <p className="text-[10px] font-bold text-primary mt-1">Realm: {i.realmName}</p>}
          {i.battleBgName && <p className="text-[10px] font-bold text-primary mt-1">Battle BG: {i.battleBgName}</p>}
          {i.visualReferenceSummary && <p className="text-[10px] font-bold text-sage mt-1">Visual refs: {i.visualReferenceSummary}</p>}
          {i.manualComposition?.layers?.length > 0 && <p className="text-[10px] font-bold text-primary mt-1">Manual layers: {i.manualComposition.layers.length} · export rebuilds from layer data</p>}
          {i.identityLocks?.length > 0 && <p className="text-[10px] font-bold text-primary mt-1">Identity locks: {i.identityLocks.length}</p>}
          <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.prompt}</p>
          {i.styleNotes && <p className="text-[10px] font-extrabold text-primary mt-1">Style: {i.styleNotes}</p>}
          <StudioViewEditButton collection="arts" item={i} title={i.title || i.companionName || "Companion art"} imageUrl={getImageUrl(i)} />
          <button type="button" onClick={() => useStudio.getState().removeItem("arts", i.id)} className="btn-ghost !text-xs !py-1.5 !px-3 mt-2 w-full text-danger"><Trash2 size={12} strokeWidth={3} /> Delete card</button>
        </div>
      )}
    />
  );
};


// ============================================================================
// ASSET LIBRARY — unified catalog for Studio + future Land Editor
// ============================================================================
type LibraryAssetType = "npc" | "companion" | "prop" | "background" | "art" | "ui" | "avatar" | "quest" | "misc";
type AssetConsumerMode = "library" | "companion-art" | "land-editor" | "character-sprites";
type LibraryAsset = {
  id: string;
  sourceCollection: StudioCollectionKey;
  sourceId: string;
  assetType: LibraryAssetType;
  name: string;
  thumbnailUrl?: string;
  transparentUrl?: string;
  tags: string[];
  status?: StudioStatus;
  description?: string;
  useHint?: string;
};



type PromptBuilderAssetType =
  | "npc-full-body" | "npc-portrait" | "companion" | "companion-evolution"
  | "avatar-asset" | "ui-icon" | "prop" | "quest-item"
  | "battle-background" | "realm-overview" | "scene-environment" | "walking-map-environment"
  | "walkable-sprite-sheet" | "four-direction-character-sheet" | "idle-walk-frames" | "runtime-12-frame-sprite-sheet";

type CharacterSpriteOutputType = "walkable-sprite-sheet" | "four-direction-character-sheet" | "idle-walk-frames" | "runtime-12-frame-sprite-sheet";
const CHARACTER_SPRITE_OUTPUT_TYPES: CharacterSpriteOutputType[] = ["walkable-sprite-sheet", "four-direction-character-sheet", "idle-walk-frames", "runtime-12-frame-sprite-sheet"];

const PROMPT_BUILDER_TYPES: PromptBuilderAssetType[] = [
  "npc-full-body", "npc-portrait", "companion", "companion-evolution",
  "avatar-asset", "ui-icon", "prop", "quest-item",
  "battle-background", "realm-overview", "scene-environment", "walking-map-environment",
  "walkable-sprite-sheet", "four-direction-character-sheet", "idle-walk-frames", "runtime-12-frame-sprite-sheet",
];

const ENVIRONMENT_PROMPT_TYPES: PromptBuilderAssetType[] = ["battle-background", "realm-overview", "scene-environment", "walking-map-environment"];
const OBJECT_PROMPT_TYPES: PromptBuilderAssetType[] = ["avatar-asset", "ui-icon", "prop", "quest-item"];

const LOCATION_PRESETS = ["sunlit meadow path", "library interior", "snowy grove", "crystal pond", "academy courtyard", "book bridge", "floating classroom ruins", "custom"];
const MOOD_PRESETS = ["cozy", "magical", "calm", "adventurous", "mysterious", "celebratory", "warm", "custom"];
const TIME_OF_DAY_PRESETS = ["morning", "afternoon", "golden hour", "sunset", "night", "twilight", "custom"];
const SILHOUETTE_PRESETS = ["cozy", "round", "scholarly", "tiny", "heroic", "soft", "custom"];
const POSE_PRESETS = ["friendly wave", "standing calmly", "holding a book", "gentle teaching pose", "cheerful idle pose", "custom"];
const RARITY_PRESETS = ["common", "uncommon", "rare", "epic", "legendary", "custom"];
const ELEMENT_PRESETS = ["nature", "fire", "water", "earth", "air", "star", "custom"];

const isEnvironmentPromptType = (assetType: PromptBuilderAssetType): boolean => ENVIRONMENT_PROMPT_TYPES.includes(assetType);
const isNpcPromptType = (assetType: PromptBuilderAssetType): boolean => assetType === "npc-full-body" || assetType === "npc-portrait";
const isCompanionPromptType = (assetType: PromptBuilderAssetType): boolean => assetType === "companion" || assetType === "companion-evolution";
const isObjectPromptType = (assetType: PromptBuilderAssetType): boolean => OBJECT_PROMPT_TYPES.includes(assetType);
const isCharacterSpritePromptType = (assetType: PromptBuilderAssetType): boolean =>
  assetType === "walkable-sprite-sheet" || assetType === "four-direction-character-sheet" || assetType === "idle-walk-frames" || assetType === "runtime-12-frame-sprite-sheet";

const cleanPromptText = (value?: string, fallback = ""): string => {
  const raw = (value || fallback || "").trim().replace(/\s+/g, " ");
  return raw.replace(/[\s.-]+$/g, "");
};

const withPeriod = (value?: string, fallback = ""): string => {
  const clean = cleanPromptText(value, fallback);
  return clean ? `${clean}.` : "";
};

const presetSelectValue = (value: string | undefined, options: readonly string[]): string =>
  value && options.includes(value) ? value : "custom";

const getPromptBuilderDefaultFields = (assetType: PromptBuilderAssetType): Record<string, string> => {
  const base = {
    name: "Sage the Cozy",
    realm: "Questing Academy",
    theme: "Questing Academy",
    primaryColor: "#9D8DF1",
    accentColor: "#F4C753",
  };

  if (assetType === "battle-background") return {
    ...base,
    name: "Battle BG 1",
    purpose: "battle encounter backdrop",
    location: "sunlit meadow path",
    mood: "cozy",
    timeOfDay: "morning",
    landmarks: "glowing classroom tower, book bridge, crystal pond",
    visualNotes: "Wide 16:9 background with clear open battle space. No UI or text.",
  };

  if (assetType === "realm-overview") return {
    ...base,
    name: "Meadowfall Grove",
    biome: "sunlit meadow academy grove",
    mood: "magical",
    landmarks: "academy tower, book bridge, crystal pond, gentle forest paths",
    visualNotes: "Wide realm overview with clear landmarks and a strong sense of place. No labels or UI.",
  };

  if (assetType === "scene-environment") return {
    ...base,
    name: "Sticker Shop",
    purpose: "town hub interior",
    location: "cozy academy shop interior",
    mood: "cozy",
    timeOfDay: "afternoon",
    landmarks: "display shelves, warm counter, glowing jars, soft classroom decor",
    visualNotes: "Wide 16:9 scene environment with usable empty space for NPCs and props. No UI or text.",
  };

  if (assetType === "walking-map-environment") return {
    ...base,
    name: "Town Hub Walking Map A-1",
    purpose: "walkable town hub map for exploration",
    location: "cozy academy town hub",
    mood: "cozy",
    timeOfDay: "afternoon",
    landmarks: "clear main path, soft academy landmarks, shop entrance, quest board, readable blocked edges",
    visualNotes: "Wide 16:9 walking map environment with clear walkable ground, readable collision boundaries, usable empty space for NPCs and props, and obvious interaction points. No UI or text.",
  };

  if (isCharacterSpritePromptType(assetType)) return {
    ...base,
    name: assetType === "runtime-12-frame-sprite-sheet" ? "Runtime 12-Frame Sprite Sheet" : assetType === "four-direction-character-sheet" ? "Character 4-Direction Sheet" : assetType === "idle-walk-frames" ? "Character Idle Walk Frames" : "Walkable Character Sprite Sheet",
    role: "walkable RPG character",
    species: "same as attached reference image",
    ageRead: "same as attached reference image",
    outfit: "preserve outfit from attached reference image",
    pose: "front/back/left/right walkable sprite poses",
    personality: "friendly, cozy, child-safe",
    visualNotes: "Use the attached/imported character image as the source of truth. Preserve identity, outfit, hair, colors, proportions, and silhouette exactly.",
  };

  if (assetType === "companion" || assetType === "companion-evolution") return {
    ...base,
    name: assetType === "companion-evolution" ? "Bubbee Bloom" : "Bubbee",
    species: "friendly fantasy creature",
    element: "nature",
    rarity: "common",
    personality: "friendly, brave, emotionally appealing",
    abilities: "gentle support ability, learning encouragement, soft magical glow",
    visualNotes: "Single centered companion asset. Transparent background preferred.",
  };

  if (assetType === "ui-icon") return {
    ...base,
    name: "XP Sparkle",
    purpose: "reward icon",
    theme: "Questing Academy rewards",
    visualNotes: "Single readable icon shape. Transparent background.",
  };

  if (assetType === "avatar-asset") return {
    ...base,
    name: "Scholar Hat",
    category: "hat",
    theme: "cozy academy outfit",
    visualNotes: "Single wearable avatar asset. Transparent background preferred.",
  };

  if (assetType === "quest-item") return {
    ...base,
    name: "Glowing Lesson Key",
    category: "quest item",
    visualNotes: "Single centered quest item. Transparent background preferred.",
  };

  return {
    ...base,
    name: "Academy Prop",
    category: "prop",
    visualNotes: "Single centered prop asset. Transparent background preferred.",
  };
};

const getPromptBuilderRecommendedSpec = (assetType: PromptBuilderAssetType): string => {
  if (assetType === "ui-icon") return "Recommended output: PNG, 512x512, transparent background.";
  if (assetType === "battle-background") return "Recommended output: PNG or WebP, 1920x1080, wide 16:9 battle background.";
  if (assetType === "realm-overview") return "Recommended output: PNG or WebP, 2048x1152, wide 16:9 realm overview.";
  if (assetType === "scene-environment") return "Recommended output: PNG or WebP, 1920x1080, wide 16:9 scene environment.";
  if (assetType === "walking-map-environment") return "Recommended output: PNG or WebP, 1920x1080, wide 16:9 walking map environment.";
  if (assetType === "walkable-sprite-sheet") return "Recommended output: transparent PNG sprite sheet, clean grid, front/back/left/right with idle + 2 walk frames per direction.";
  if (assetType === "four-direction-character-sheet") return "Recommended output: transparent PNG, clean 4-direction character sheet: front, back, left, right.";
  if (assetType === "idle-walk-frames") return "Recommended output: transparent PNG sprite sheet with idle and walk frames, consistent scale and padding.";
  if (assetType === "runtime-12-frame-sprite-sheet") return "Recommended output: transparent PNG runtime sprite sheet, strict 4 rows x 3 columns, 12 equal-size cells.";
  return "Recommended output: PNG, 1024x1024, transparent background preferred. If transparency is unavailable, use flat pure white removable background.";
};

const buildAssetPromptOnly = (assetType: PromptBuilderAssetType, fields: Record<string, string>): string => {
  const name = cleanPromptText(fields.name, "[NAME]");
  const primary = fields.primaryColor || "#9D8DF1";
  const accent = fields.accentColor || "#F4C753";
  const notes = cleanPromptText(fields.visualNotes, "");
  const style = "Style: cute chibi educational fantasy RPG, soft pastel storybook game art, rounded shapes, friendly expression, child-safe, polished game asset, readable at small game UI size.";
  const transparent = "Background: transparent background preferred. If transparent output is unavailable, use a flat pure white removable background for transparent PNG export.";
  const negative = "Negative: no text, no labels, no watermark, no logo, no UI mockup, no concept sheet, no duplicate subjects, no extra characters, no weapons, no combat pose, no villain, no horror, no photorealism.";

  if (isCharacterSpritePromptType(assetType)) {
    const outputType = assetType as CharacterSpriteOutputType;
    return buildCharacterSpritePrompt(
      outputType,
      undefined,
      [
        `Character name/output name: ${name}`,
        `Role/use case: ${cleanPromptText(fields.role || fields.purpose, "walkable RPG character")}`,
        `Reference/body type: ${cleanPromptText(fields.species, "same as attached reference image")}`,
        `Age read: ${cleanPromptText(fields.ageRead, "same as attached reference image")}`,
        `Outfit preservation: ${cleanPromptText(fields.outfit, "preserve outfit from attached reference image")}`,
        `Pose/animation direction: ${cleanPromptText(fields.pose, "simple readable walk cycle poses")}`,
        `Personality/tone: ${cleanPromptText(fields.personality, "friendly, cozy, child-safe")}`,
        notes ? `Additional visual notes: ${notes}` : "",
      ].filter(Boolean).join(". ")
    );
  }

  if (assetType === "npc-full-body" || assetType === "npc-portrait") {
    return [
      `Create one single game-ready Questing Academy NPC character asset: ${name}.`,
      `Role: ${cleanPromptText(fields.role, "[ROLE]")}. Species/body type: ${cleanPromptText(fields.species, "human")}. Age read: ${cleanPromptText(fields.ageRead, "[AGE READ]")}. Silhouette: ${cleanPromptText(fields.silhouette, "cozy")}.`,
      `Outfit: ${cleanPromptText(fields.outfit, "[OUTFIT]")}. Pose: ${cleanPromptText(fields.pose, "friendly wave")}. Personality: ${cleanPromptText(fields.personality, "cheerful, patient, encouraging")}.`,
      `Realm flavor: ${cleanPromptText(fields.realm, "Questing Academy")}. Color palette: ${primary} with ${accent} accents.`,
      notes ? `Visual notes: ${withPeriod(notes)}` : "",
      assetType === "npc-portrait" ? "Framing: centered clean portrait or bust, exactly one NPC only, readable at small UI size." : "Framing: centered full body or clean three-quarter body, exactly one NPC only, readable at game size.",
      style,
      getPromptBuilderRecommendedSpec(assetType),
      transparent,
      negative,
    ].filter(Boolean).join("\n");
  }

  if (assetType === "companion" || assetType === "companion-evolution") {
    return [
      `Create one single game-ready Questing Academy companion creature asset: ${name}.`,
      `Family/species: ${cleanPromptText(fields.species, "[CREATURE FAMILY]")}. Element/affinity: ${cleanPromptText(fields.element, "nature")}. Rarity: ${cleanPromptText(fields.rarity, "common")}.`,
      assetType === "companion-evolution" ? `Evolution stage: ${cleanPromptText(fields.stage, "[STAGE]")}. Base companion: ${cleanPromptText(fields.baseCompanion, "[BASE COMPANION]")}. Preserve recognizable family traits while clearly evolving the design.` : "Show the base companion form clearly.",
      `Personality: ${cleanPromptText(fields.personality, "friendly, brave, emotionally appealing")}. Ability notes: ${cleanPromptText(fields.abilities, "gentle support ability")}.`,
      notes ? `Visual notes: ${withPeriod(notes)} Color palette: ${primary} with ${accent} accents.` : `Color palette: ${primary} with ${accent} accents.`,
      "Framing: centered full body creature, exactly one companion only, readable at small game size.",
      style,
      getPromptBuilderRecommendedSpec(assetType),
      transparent,
      negative.replace("no extra characters", "no extra companions, no extra characters"),
    ].join("\n");
  }

  if (assetType === "ui-icon") {
    return [
      `Create one Questing Academy UI icon: ${name}.`,
      `Purpose: ${cleanPromptText(fields.purpose, "[PURPOSE]")}. Theme: ${cleanPromptText(fields.theme, "[THEME]")}.`,
      `Colors: ${primary} with ${accent} accents.${notes ? ` Visual notes: ${withPeriod(notes)}` : ""}`,
      "Framing: centered simple silhouette, readable at very small size, one icon only.",
      "Style: soft pastel Questing Academy UI icon, rounded shapes, polished child-safe game asset.",
      getPromptBuilderRecommendedSpec(assetType),
      "Background: transparent background.",
      "Negative: no text, no labels, no watermark, no logo, no UI mockup, no multiple icons, no photorealism, no horror.",
    ].join("\n");
  }

  if (assetType === "battle-background" || assetType === "realm-overview" || assetType === "scene-environment" || assetType === "walking-map-environment") {
    const environmentStyle = "Style: cute educational fantasy RPG environment art, soft pastel storybook rendering, cozy lighting, readable shapes, child-safe Questing Academy tone, polished game background.";
    const envNegative = "Negative: no text, no labels, no watermark, no logo, no UI, no characters unless explicitly requested, no scary mood, no horror, no photorealism.";
    const realm = cleanPromptText(fields.realm || fields.theme, "Questing Academy");
    const location = cleanPromptText(fields.location || fields.biome, assetType === "realm-overview" ? "sunlit academy grove" : assetType === "scene-environment" ? "cozy academy location" : assetType === "walking-map-environment" ? "cozy academy town hub" : "open academy training field");
    const mood = cleanPromptText(fields.mood, "cozy");
    const timeOfDay = cleanPromptText(fields.timeOfDay, "morning");
    const landmarks = cleanPromptText(fields.landmarks, assetType === "realm-overview" ? "academy tower, book bridge, crystal pond" : "soft academy landmarks and readable set pieces");

    if (assetType === "battle-background") {
      return [
        `Create one Questing Academy battle background: ${name}.`,
        `Realm: ${realm}.`,
        `Location: ${location}.`,
        `Mood: ${mood}.`,
        `Time of day: ${timeOfDay}.`,
        `Key set pieces / landmarks: ${landmarks}.`,
        notes ? `Visual notes: ${withPeriod(notes)}` : "",
        "Composition: wide 16:9 RPG battle background with clear open battle space, foreground/midground/background depth, readable at game size.",
        environmentStyle,
        getPromptBuilderRecommendedSpec(assetType),
        envNegative,
      ].filter(Boolean).join("\n");
    }

    if (assetType === "realm-overview") {
      return [
        `Create one Questing Academy realm overview illustration: ${name}.`,
        `Realm: ${realm}.`,
        `Biome/location: ${location}.`,
        `Mood: ${mood}.`,
        `Key landmarks: ${landmarks}.`,
        notes ? `Visual notes: ${withPeriod(notes)}` : "",
        "Composition: wide 16:9 storybook realm overview/world illustration, clear landmarks, strong sense of place, suitable for a realm selection card or map backdrop.",
        environmentStyle,
        getPromptBuilderRecommendedSpec(assetType),
        "Negative: no text, no labels, no map labels, no watermark, no logo, no UI, no horror, no photorealism.",
      ].filter(Boolean).join("\n");
    }

    if (assetType === "walking-map-environment") {
      return [
        `Create one Questing Academy walking map environment: ${name}.`,
        `Purpose/use case: ${cleanPromptText(fields.purpose, "walkable exploration map for town/location display")}.`,
        `Realm: ${realm}.`,
        `Location: ${location}.`,
        `Mood: ${mood}.`,
        `Time of day: ${timeOfDay}.`,
        `Key set pieces / landmarks: ${landmarks}.`,
        notes ? `Visual notes: ${withPeriod(notes)}` : "",
        "Composition: wide 16:9 storybook RPG walking map environment, clear readable walkable paths, obvious blocked/collision edges, clean open ground for NPCs and props, readable interaction points such as doors, signs, quest boards, bridges, paths, counters, or gates.",
        "Camera/view: slightly elevated RPG exploration view, not a battle arena, not a close-up illustration, with foreground/midground/background depth but no clutter blocking the main walkable area.",
        "Map-readability rules: make traversable ground visually obvious, keep obstacle boundaries readable at game size, leave enough empty placement space for Scene Composer assets and Walkable Zone Editor polygons.",
        environmentStyle,
        getPromptBuilderRecommendedSpec(assetType),
        envNegative,
      ].filter(Boolean).join("\n");
    }

    return [
      `Create one Questing Academy scene environment: ${name}.`,
      `Purpose/use case: ${cleanPromptText(fields.purpose, "town or story scene backdrop")}.`,
      `Realm: ${realm}.`,
      `Location: ${location}.`,
      `Mood: ${mood}.`,
      `Time of day: ${timeOfDay}.`,
      `Key set pieces / landmarks: ${landmarks}.`,
      notes ? `Visual notes: ${withPeriod(notes)}` : "",
      "Composition: wide 16:9 storybook RPG environment, clean usable scene space, readable props and background zones, suitable for Scene Composer or town/location display.",
      environmentStyle,
      getPromptBuilderRecommendedSpec(assetType),
      envNegative,
    ].filter(Boolean).join("\n");
  }

  if (assetType === "avatar-asset") {
    return [
      `Create one Questing Academy avatar customization asset: ${name}.`,
      `Category: ${cleanPromptText(fields.category, "hair / hat / outfit / accessory")}. Theme: ${cleanPromptText(fields.theme, "Questing Academy")}.`,
      `Colors: ${primary} with ${accent} accents.${notes ? ` Visual notes: ${withPeriod(notes)}` : ""}`,
      "Show only the wearable avatar asset or clean item presentation. No full character unless required for scale.",
      style,
      getPromptBuilderRecommendedSpec(assetType),
      transparent,
      negative,
    ].join("\n");
  }

  return [
    `Create one single game-ready Questing Academy ${assetType === "quest-item" ? "quest item" : "prop"} asset: ${name}.`,
    `Category: ${cleanPromptText(fields.category, "[CATEGORY]")}. Realm/theme: ${cleanPromptText(fields.realm || fields.theme, "Questing Academy")}.`,
    `Colors: ${primary} with ${accent} accents.${notes ? ` Visual notes: ${withPeriod(notes)}` : ""}`,
    "Framing: centered single object only, clean readable silhouette, no scene background.",
    style,
    getPromptBuilderRecommendedSpec(assetType),
    transparent,
    negative.replace("no extra characters", "no extra objects, no extra characters"),
  ].join("\n");
};



const buildCharacterSpritePrompt = (outputType: CharacterSpriteOutputType, reference?: LibraryAsset, customNotes = ""): string => {
  const name = reference?.name || "the selected character";
  const sourceKind = reference ? `${reference.assetType} from ${reference.sourceCollection}` : "attached reference image";
  const notes = cleanPromptText(customNotes, "");
  const shared = [
    `Create one Edu-Mates Academy 2D walkable RPG character asset based on the attached reference image: ${name}.`,
    `Reference source: ${sourceKind}. Use the attached/main reference image as the source of truth for identity and consistency.`,
    "IDENTITY LOCK: preserve the same face feel, hair shape, hair color, outfit colors, outfit details, accessories, silhouette, proportions, species/body type, and friendly child-safe personality from the reference. Do not redesign, recolor, age-swap, species-swap, or replace the character.",
    reference?.description ? `Reference notes: ${compactPromptText(reference.description, "")}.` : "",
    notes ? `Extra direction: ${withPeriod(notes)}` : "",
    "Style: cute educational fantasy RPG character art, soft pastel storybook rendering, rounded friendly shapes, cozy Edu-Mates Academy tone, readable at small game size, polished game-ready sprite art.",
    "Output rules: transparent PNG preferred, no background, no scenery, no UI, no text labels, no watermark, no logo, no extra characters, no props unless already part of the reference, no horror, no weapons, no photorealism.",
  ].filter(Boolean);

  if (outputType === "four-direction-character-sheet") {
    return [
      ...shared,
      "Output type: 4-direction character sheet.",
      "Create a clean grid with front, back, left, and right views. Use one neutral idle pose per direction. Keep proportions, outfit details, colors, and scale consistent across every direction. Leave padding between frames for easy slicing.",
    ].join("\n");
  }

  if (outputType === "idle-walk-frames") {
    return [
      ...shared,
      "Output type: idle + walk animation frames.",
      "Create a clean sprite sheet with idle, left-step, and right-step walking frames. Include front, back, left, and right directions if possible. Keep the character locked to the same design in every frame. Use simple readable foot/arm motion, not exaggerated action poses.",
    ].join("\n");
  }

  if (outputType === "runtime-12-frame-sprite-sheet") {
    return [
      ...shared,
      "Output type: runtime 12-frame sprite sheet.",
      "Create a strict transparent PNG sprite sheet with exactly 12 frames arranged in a clean 4 rows x 3 columns grid.",
      "Row 1: front idle, front left-step, front right-step.",
      "Row 2: back idle, back left-step, back right-step.",
      "Row 3: left idle, left walk A, left walk B.",
      "Row 4: right idle, right walk A, right walk B.",
      "Runtime rules: every cell must be the same size, the character must keep the same scale in every frame, feet must share the same baseline, body center/anchor must stay consistent, and padding must be even for easy slicing.",
      "Do not add shadows, labels, grid lines, frame numbers, background scenery, cropped body parts, extra poses, duplicate rows, or decorative effects.",
    ].join("\n");
  }

  return [
    ...shared,
    "Output type: walkable character sprite sheet.",
    "Create a transparent PNG sprite sheet in a clean grid. Include four directions: front, back, left, and right. For each direction, include one idle pose and two simple walking frames. Keep frame size consistent, character centered, feet aligned, and proportions identical across all frames. Leave clear spacing/padding for easy slicing into game sprites.",
  ].join("\n");
};
type ImportAssetType =
  | "npc-portrait" | "npc-full-body" | "companion" | "companion-evolution"
  | "avatar-part" | "avatar-hair" | "avatar-hat" | "avatar-outfit"
  | "battle-background" | "realm-background" | "scene-environment" | "walking-map-environment" | "scene-prop"
  | "building" | "tree" | "decoration" | "ui-icon" | "badge" | "sticker"
  | "quest-item" | "inventory-item" | "misc";

type ImportDestinationLibrary =
  | "NPC Library" | "Companion Library" | "Avatar Library" | "Asset Library"
  | "Realm Library" | "Battle BG Library" | "Scene Library" | "UI Library" | "Quest Library";

const IMPORT_ASSET_TYPES: ImportAssetType[] = [
  "npc-portrait", "npc-full-body", "companion", "companion-evolution",
  "avatar-part", "avatar-hair", "avatar-hat", "avatar-outfit",
  "battle-background", "realm-background", "scene-environment", "scene-prop",
  "building", "tree", "decoration", "ui-icon", "badge", "sticker",
  "quest-item", "inventory-item", "misc",
];

const IMPORT_DESTINATION_LIBRARIES: ImportDestinationLibrary[] = [
  "NPC Library", "Companion Library", "Avatar Library", "Asset Library",
  "Realm Library", "Battle BG Library", "Scene Library", "UI Library", "Quest Library",
];

const getImportAssetKind = (assetType: ImportAssetType): AssetKind => {
  if (assetType === "ui-icon") return "icon";
  if (assetType === "badge") return "badge";
  if (assetType === "sticker") return "sticker";
  if (assetType === "quest-item" || assetType === "inventory-item") return "item" as AssetKind;
  if (assetType === "avatar-part" || assetType === "avatar-hair" || assetType === "avatar-hat" || assetType === "avatar-outfit") return "cosmetic" as AssetKind;
  if (assetType === "battle-background" || assetType === "realm-background" || assetType === "scene-environment") return "background" as AssetKind;
  if (assetType === "companion" || assetType === "companion-evolution" || assetType.startsWith("npc")) return "character" as AssetKind;
  return "prop" as AssetKind;
};

const getLibraryAssetTypeFromImport = (assetType?: string): LibraryAssetType => {
  if (!assetType) return "prop";
  if (assetType.startsWith("npc")) return "npc";
  if (assetType === "companion") return "companion";
  if (assetType === "companion-evolution") return "companion";
  if (assetType.startsWith("avatar")) return "avatar";
  if (assetType.includes("background") || assetType.includes("scene-environment")) return "background";
  if (assetType.includes("ui") || assetType === "badge" || assetType === "sticker") return "ui";
  if (assetType.includes("quest") || assetType.includes("inventory")) return "quest";
  if (assetType === "misc") return "misc";
  return "prop";
};

const getImportRecommendedSpec = (assetType: ImportAssetType): string => {
  if (assetType === "ui-icon" || assetType === "badge" || assetType === "sticker") return "Recommended: PNG, 512x512, transparent background.";
  if (assetType === "battle-background") return "Recommended: PNG or WebP, 1920x1080, full background.";
  if (assetType === "realm-background") return "Recommended: PNG or WebP, 2048x1152, full background.";
  if (assetType === "scene-environment") return "Recommended: PNG or WebP, 1920x1080, full background.";
  return "Recommended: PNG, 1024x1024, transparent or flat white removable background.";
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });



type UploadedStudioAssetImage = {
  ok: boolean;
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

const uploadStudioAssetImage = async (payload: {
  dataUrl: string;
  originalName: string;
  assetName: string;
  assetType: ImportAssetType;
  destinationLibrary: ImportDestinationLibrary;
}): Promise<UploadedStudioAssetImage> => {
  const response = await fetch(`${STUDIO_BACKEND_ORIGIN}/api/studio/upload-asset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok || !data?.url) {
    throw new Error(data?.error || `Asset upload failed (${response.status})`);
  }

  return data as UploadedStudioAssetImage;
};

const getLibraryImageUrl = (item: any, preferTransparent = false): string =>
  normalizeStudioImageUrl(
    (preferTransparent ? item?.transparentPreviewUrl || item?.transparentUrl : "") ||
    item?.previewUrl ||
    item?.imageUrl ||
    item?.generatedImageUrl ||
    item?.url ||
    item?.backgroundUrl ||
    item?.manualComposition?.backgroundUrl ||
    ""
  );
const pushLibraryAsset = (out: LibraryAsset[], asset: LibraryAsset) => {
  if (!asset.thumbnailUrl && !asset.transparentUrl) return;
  out.push(asset);
};
const buildStudioAssetLibrary = (state: ReturnType<typeof useStudio.getState>): LibraryAsset[] => {
  const out: LibraryAsset[] = [];
  state.npcs.forEach((n: any) => pushLibraryAsset(out, { id: `npcs-${n.id}`, sourceCollection: "npcs", sourceId: n.id, assetType: "npc", name: n.name, thumbnailUrl: getLibraryImageUrl(n), transparentUrl: getLibraryImageUrl(n, true), status: n.status, description: n.dialogue || n.visualNotes, tags: ["npc", n.role, n.realm, n.status].filter(Boolean) }));
  state.companions.forEach((c: any) => pushLibraryAsset(out, { id: `companions-${c.id}`, sourceCollection: "companions", sourceId: c.id, assetType: "companion", name: c.name, thumbnailUrl: getLibraryImageUrl(c), transparentUrl: getLibraryImageUrl(c, true), status: c.status, description: c.lore, tags: ["pet", "companion", c.affinity, c.role, c.rarity, c.status].filter(Boolean) }));
  state.assets.forEach((a: any) => pushLibraryAsset(out, { id: `assets-${a.id}`, sourceCollection: "assets", sourceId: a.id, assetType: getLibraryAssetTypeFromImport(a.importAssetType) || "prop", name: a.name, thumbnailUrl: getLibraryImageUrl(a), transparentUrl: getLibraryImageUrl(a, true), status: a.status, description: a.description, tags: ["asset", a.kind, a.importAssetType, a.destinationLibrary, a.backgroundMode, a.status, ...(Array.isArray(a.importTags) ? a.importTags : [])].filter(Boolean) }));
  state.arts.forEach((a: any) => pushLibraryAsset(out, { id: `arts-${a.id}`, sourceCollection: "arts", sourceId: a.id, assetType: "art", name: a.title || a.companionName || "Companion art", thumbnailUrl: getLibraryImageUrl(a) || a.manualComposition?.backgroundUrl, transparentUrl: getLibraryImageUrl(a, true), status: a.status, description: a.prompt, tags: ["art", a.subjectType, a.outputMode, a.compositionType, a.status].filter(Boolean) }));
  state.scenes.forEach((sc: any) => pushLibraryAsset(out, { id: `scenes-${sc.id}`, sourceCollection: "scenes", sourceId: sc.id, assetType: "background", name: sc.name, thumbnailUrl: getLibraryImageUrl(sc), status: sc.status, description: sc.visualPrompt, tags: ["scene", sc.purpose, sc.realm, sc.status].filter(Boolean) }));
  state.realms.forEach((r: any) => pushLibraryAsset(out, { id: `realms-${r.id}`, sourceCollection: "realms", sourceId: r.id, assetType: "background", name: r.name, thumbnailUrl: getLibraryImageUrl(r), status: r.status, description: r.description || r.mapNotes, tags: ["realm", r.biome, r.tone, r.status].filter(Boolean) }));
  state.battleBgs.forEach((b: any) => pushLibraryAsset(out, { id: `battleBgs-${b.id}`, sourceCollection: "battleBgs", sourceId: b.id, assetType: "background", name: b.realm || b.environment || "Battle background", thumbnailUrl: getLibraryImageUrl(b), status: b.status, description: b.prompt, tags: ["battle-bg", b.environment, b.mood, b.timeOfDay, b.status].filter(Boolean) }));
  return out;
};
const AssetLibraryTab: React.FC = () => {
  const studio = useStudio();
  const addItem = useStudio((s) => s.addItem);
  const updateItem = useStudio((s) => s.updateItem);
  const removeItem = useStudio((s) => s.removeItem);
  const [consumerMode, setConsumerMode] = useState<AssetConsumerMode>("library");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const libraryAssets = useMemo(() => buildStudioAssetLibrary(studio), [studio]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LibraryAssetType | "all">("all");
  const [transparentOnly, setTransparentOnly] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importName, setImportName] = useState("");
  const [importDescription, setImportDescription] = useState("");
  const [importTags, setImportTags] = useState("");
  const [importAssetType, setImportAssetType] = useState<ImportAssetType>("npc-full-body");
  const [importDestinationLibrary, setImportDestinationLibrary] = useState<ImportDestinationLibrary>("Asset Library");
  const [importSource, setImportSource] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importImageDataUrl, setImportImageDataUrl] = useState("");
  const [importError, setImportError] = useState("");
  const [importUploading, setImportUploading] = useState(false);
  const [assignOpenAssetId, setAssignOpenAssetId] = useState<string>("");
  const [assignTargetCollection, setAssignTargetCollection] = useState<StudioCollectionKey>("npcs");
  const [assignTargetId, setAssignTargetId] = useState<string>("");
  const [assignSlot, setAssignSlot] = useState<"previewUrl" | "transparentPreviewUrl" | "imageUrl" | "backgroundUrl">("previewUrl");
  const [promptBuilderOpen, setPromptBuilderOpen] = useState(false);
  const [promptAssetType, setPromptAssetType] = useState<PromptBuilderAssetType>("npc-full-body");
  const [promptFields, setPromptFields] = useState<Record<string, string>>({
    name: "Sage the Cozy",
    role: "guide",
    species: "human",
    ageRead: "teen",
    silhouette: "cozy",
    outfit: "librarian cardigan",
    pose: "friendly wave",
    personality: "cheerful, patient, encouraging",
    realm: "Questing Academy",
    primaryColor: "#9D8DF1",
    accentColor: "#F4C753",
    visualNotes: "No background. Single centered game-ready asset.",
  });
  const [spriteReferenceAssetId, setSpriteReferenceAssetId] = useState("");
  const [spriteOutputType, setSpriteOutputType] = useState<CharacterSpriteOutputType>("walkable-sprite-sheet");
  const [spriteNotes, setSpriteNotes] = useState("Preserve the imported character exactly and make it suitable for a walkable RPG map.");
  const generatedPromptOnly = useMemo(() => buildAssetPromptOnly(promptAssetType, promptFields), [promptAssetType, promptFields]);
  const spriteReferenceOptions = useMemo(() => libraryAssets.filter((asset) => ["npc", "companion", "avatar", "art", "prop", "misc"].includes(asset.assetType) && !!(asset.transparentUrl || asset.thumbnailUrl)), [libraryAssets]);
  const selectedSpriteReference = useMemo(() => spriteReferenceOptions.find((asset) => asset.id === spriteReferenceAssetId) || null, [spriteReferenceOptions, spriteReferenceAssetId]);
  const generatedSpritePrompt = useMemo(() => buildCharacterSpritePrompt(spriteOutputType, selectedSpriteReference || undefined, spriteNotes), [spriteOutputType, selectedSpriteReference, spriteNotes]);
  const updatePromptField = (key: string, value: string) => setPromptFields((current) => ({ ...current, [key]: value }));
  const copyGeneratedPrompt = async () => {
    await navigator.clipboard?.writeText(generatedPromptOnly);
    alert("Prompt copied. Generate externally, then import the finished image here.");
  };
  const copyGeneratedSpritePrompt = async () => {
    await navigator.clipboard?.writeText(generatedSpritePrompt);
    alert("Sprite prompt copied. Attach the selected reference image in your image generator, then import the finished sprite sheet here.");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return libraryAssets.filter((asset) => {
      if (type !== "all" && asset.assetType !== type) return false;
      if (transparentOnly && !asset.transparentUrl) return false;
      if (!q) return true;
      return [asset.name, asset.sourceCollection, asset.assetType, asset.description, ...asset.tags].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [libraryAssets, query, type, transparentOnly]);
  const counts = libraryAssets.reduce((acc, asset) => ({ ...acc, [asset.assetType]: (acc[asset.assetType] || 0) + 1 }), {} as Record<string, number>);
  const selectedAssets = libraryAssets.filter((asset) => selectedAssetIds.includes(asset.id));

  const assignableCollections: { key: StudioCollectionKey; label: string }[] = [
    { key: "npcs", label: "NPCs" },
    { key: "companions", label: "Pets / Companions" },
    { key: "evolutions", label: "Evolutions" },
    { key: "avatars", label: "Avatars" },
    { key: "assets", label: "Assets / Props" },
    { key: "realms", label: "Realms" },
    { key: "battleBgs", label: "Battle BGs" },
    { key: "scenes", label: "Scenes" },
    { key: "quests", label: "Quests" },
  ];

  const getAssignableTargets = (collection: StudioCollectionKey): any[] => {
    const state: any = studio;
    const rows = Array.isArray(state[collection]) ? state[collection] : [];
    return rows;
  };

  const assignTargetOptions = useMemo(() => {
    return getAssignableTargets(assignTargetCollection).map((item: any) => ({
      id: item.id,
      label: getStudioItemTitle(item),
      sublabel: [item.status, item.realm, item.environment, item.kind, item.role, item.rarity].filter(Boolean).join(" · "),
    }));
  }, [studio, assignTargetCollection]);

  const openAssignAsset = (asset: LibraryAsset) => {
    setAssignOpenAssetId(asset.id);
    setAssignTargetCollection(asset.assetType === "background" ? "battleBgs" : asset.assetType === "npc" ? "npcs" : asset.assetType === "companion" ? "companions" : asset.assetType === "avatar" ? "avatars" : "assets");
    setAssignTargetId("");
    setAssignSlot(asset.transparentUrl && asset.assetType !== "background" ? "transparentPreviewUrl" : "previewUrl");
  };

  const applyAssetAssignment = (asset: LibraryAsset) => {
    if (!assignTargetId) {
      alert("Choose a target card first.");
      return;
    }

    const sourceUrl = assignSlot === "transparentPreviewUrl"
      ? (asset.transparentUrl || asset.thumbnailUrl)
      : (asset.thumbnailUrl || asset.transparentUrl);

    if (!sourceUrl) {
      alert("This asset has no usable image URL.");
      return;
    }

    const normalizedUrl = normalizeStudioImageUrl(sourceUrl);
    const patch: Record<string, any> = {
      [assignSlot]: normalizedUrl,
      assignedAssetId: asset.id,
      assignedAssetName: asset.name,
      assignedAssetSourceCollection: asset.sourceCollection,
      assignedAssetSourceId: asset.sourceId,
      assignedAssetType: asset.assetType,
      assignedAssetSlot: assignSlot,
      assignedAssetAssignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (assignSlot === "backgroundUrl") {
      patch.previewUrl = normalizedUrl;
    } else if (assignSlot === "previewUrl" || assignSlot === "imageUrl") {
      patch.imageUrl = normalizedUrl;
    }

    updateItem(assignTargetCollection, assignTargetId, patch as any);
    setAssignOpenAssetId("");
    setAssignTargetId("");
    alert(`Assigned ${asset.name} to ${assignTargetCollection}.`);
  };

  const toggleSelectedAsset = (asset: LibraryAsset) => setSelectedAssetIds((ids) => ids.includes(asset.id) ? ids.filter((id) => id !== asset.id) : [...ids, asset.id]);
  const copyAssetJson = async (asset: LibraryAsset) => {
    const payload = { sourceCollection: asset.sourceCollection, sourceId: asset.sourceId, assetType: asset.assetType, name: asset.name, url: asset.transparentUrl || asset.thumbnailUrl, transparentUrl: asset.transparentUrl, tags: asset.tags };
    await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    alert("Asset reference copied. Use this as lightweight scene/composition metadata.");
  };

  const deleteLibraryAsset = (asset: LibraryAsset) => {
    const ok = window.confirm(`Delete ${asset.name} from ${asset.sourceCollection}? This removes the source Studio card from the library. This cannot be undone.`);
    if (!ok) return;
    removeItem(asset.sourceCollection, asset.sourceId);
    setSelectedAssetIds((ids) => ids.filter((id) => id !== asset.id));
    if (assignOpenAssetId === asset.id) {
      setAssignOpenAssetId("");
      setAssignTargetId("");
    }
  };

  const resetImportForm = () => {
    setImportName("");
    setImportDescription("");
    setImportTags("");
    setImportAssetType("npc-full-body");
    setImportDestinationLibrary("Asset Library");
    setImportSource("");
    setImportFileName("");
    setImportImageDataUrl("");
    setImportError("");
  };

  const handleImportFile = async (file?: File) => {
    setImportError("");
    if (!file) return;
    const allowed = ["image/png", "image/webp", "image/jpeg"];
    if (!allowed.includes(file.type)) {
      setImportError("Unsupported file type. Import PNG, WebP, or JPG/JPEG only.");
      return;
    }
    if (file.type === "image/jpeg" && !["battle-background", "realm-background", "scene-environment", "walking-map-environment"].includes(importAssetType)) {
      setImportError("JPG/JPEG is best for full backgrounds only. Use PNG/WebP for characters, props, UI, and transparent assets.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setImportImageDataUrl(dataUrl);
    setImportFileName(file.name);
    if (!importName.trim()) setImportName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
  };

  const submitImportedAsset = async () => {
    if (!importImageDataUrl) {
      setImportError("Choose an image file first.");
      return;
    }

    setImportUploading(true);
    setImportError("");

    try {
      const safeName = importName.trim() || importFileName.replace(/\.[^.]+$/, "") || "Imported asset";
      const uploaded = await uploadStudioAssetImage({
        dataUrl: importImageDataUrl,
        originalName: importFileName || `${safeName}.png`,
        assetName: safeName,
        assetType: importAssetType,
        destinationLibrary: importDestinationLibrary,
      });

      const tags = importTags.split(",").map((tag) => tag.trim()).filter(Boolean);
      const assetUrl = normalizeStudioImageUrl(uploaded.url);
      const backgroundLike = ["battle-background", "realm-background", "scene-environment", "walking-map-environment"].includes(importAssetType);

      const item: StudioAsset = {
        ...baseMeta("user"),
        id: `as-import-${Date.now()}`,
        name: safeName,
        kind: getImportAssetKind(importAssetType),
        previewColor: "#9D8DF1",
        description: importDescription,
        previewUrl: assetUrl,
        transparentPreviewUrl: backgroundLike ? undefined : assetUrl,
        imageUrl: assetUrl,
        imageProvider: importSource ? `import:${importSource}` : "import:backend-upload",
        promptUsed: "Imported manually through Asset Library. Image stored by local backend asset storage. No image-generation provider required.",
        importAssetType,
        destinationLibrary: importDestinationLibrary,
        importFileName: uploaded.originalName || importFileName,
        storedFileName: uploaded.filename,
        uploadedUrl: assetUrl,
        uploadMimeType: uploaded.mimeType,
        uploadSizeBytes: uploaded.sizeBytes,
        importTags: tags,
        importRecommendedSpec: getImportRecommendedSpec(importAssetType),
      } as any;

      addItem("assets", item);
      resetImportForm();
      setImportOpen(false);
    } catch (err) {
      console.error(err);
      setImportError(err instanceof Error ? err.message : "Asset upload failed. Make sure the backend is running on http://localhost:5050.");
    } finally {
      setImportUploading(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="asset-library-tab">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="h-display text-2xl">Asset Library</h2>
            <p className="text-sm text-ink-muted">Unified catalog for Studio assets. Import external images, review them as cards, and reuse them across the Studio.</p>
          </div>
          {promptBuilderOpen && (
            <div className="mt-4 rounded-3xl bg-white/80 border-4 border-primary/20 p-4 w-full" data-testid="asset-library-prompt-builder">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="h-display text-xl leading-tight">Prompt Builder</p>
                  <p className="text-xs text-ink-muted">Prompt only. Copy this into any image generator, then import the finished PNG/WebP back into the Asset Library.</p>
                </div>
                <span className="chip">No API call</span>
              </div>

              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <Field label="Asset type">
                  <SelectField
                    testid="prompt-builder-asset-type"
                    value={promptAssetType}
                    onChange={(v) => {
                      const next = v as PromptBuilderAssetType;
                      const defaults = getPromptBuilderDefaultFields(next);
                      setPromptAssetType(next);
                      setPromptFields((current) => ({
                        ...defaults,
                        primaryColor: current.primaryColor || defaults.primaryColor,
                        accentColor: current.accentColor || defaults.accentColor,
                      }));
                    }}
                    options={PROMPT_BUILDER_TYPES}
                  />
                </Field>
                <Field label="Recommended output">
                  <div className="rounded-full bg-bg border-2 border-white px-4 py-3 text-xs font-extrabold text-ink-muted">
                    {getPromptBuilderRecommendedSpec(promptAssetType)}
                  </div>
                </Field>

                <Field label="Name">
                  <TextField testid="prompt-builder-name" value={promptFields.name || ""} onChange={(v) => updatePromptField("name", v)} placeholder={isCharacterSpritePromptType(promptAssetType) ? "Linden Walkable Sprite Sheet" : isEnvironmentPromptType(promptAssetType) ? "Battle BG 1 / Meadowfall Grove / Sticker Shop" : "Sage the Cozy"} />
                </Field>

                {isEnvironmentPromptType(promptAssetType) ? (
                  <>
                    {promptAssetType === "scene-environment" && (
                      <Field label="Purpose / use case">
                        <TextField testid="prompt-builder-purpose" value={promptFields.purpose || ""} onChange={(v) => updatePromptField("purpose", v)} placeholder="town hub interior / quest scene / classroom backdrop" />
                      </Field>
                    )}
                    <Field label="Realm">
                      <TextField testid="prompt-builder-realm" value={promptFields.realm || ""} onChange={(v) => { updatePromptField("realm", v); updatePromptField("theme", v); }} placeholder="Questing Academy / Meadowfall Grove" />
                    </Field>
                    <Field label={promptAssetType === "realm-overview" ? "Biome / location" : "Location"}>
                      <SelectField
                        testid="prompt-builder-location-preset"
                        value={presetSelectValue(promptFields.location || promptFields.biome, LOCATION_PRESETS)}
                        onChange={(v) => {
                          const next = v === "custom" ? "" : v;
                          updatePromptField("location", next);
                          updatePromptField("biome", next);
                        }}
                        options={LOCATION_PRESETS}
                      />
                      {(presetSelectValue(promptFields.location || promptFields.biome, LOCATION_PRESETS) === "custom" || !(promptFields.location || promptFields.biome)) && (
                        <TextField testid="prompt-builder-location-custom" value={promptFields.location || promptFields.biome || ""} onChange={(v) => { updatePromptField("location", v); updatePromptField("biome", v); }} placeholder="Custom location / biome" />
                      )}
                    </Field>
                    <Field label="Mood">
                      <SelectField testid="prompt-builder-mood-preset" value={presetSelectValue(promptFields.mood, MOOD_PRESETS)} onChange={(v) => updatePromptField("mood", v === "custom" ? "" : v)} options={MOOD_PRESETS} />
                      {(presetSelectValue(promptFields.mood, MOOD_PRESETS) === "custom" || !promptFields.mood) && <TextField testid="prompt-builder-mood-custom" value={promptFields.mood || ""} onChange={(v) => updatePromptField("mood", v)} placeholder="Custom mood" />}
                    </Field>
                    {promptAssetType !== "realm-overview" && (
                      <Field label="Time of day">
                        <SelectField testid="prompt-builder-time-of-day-preset" value={presetSelectValue(promptFields.timeOfDay, TIME_OF_DAY_PRESETS)} onChange={(v) => updatePromptField("timeOfDay", v === "custom" ? "" : v)} options={TIME_OF_DAY_PRESETS} />
                        {(presetSelectValue(promptFields.timeOfDay, TIME_OF_DAY_PRESETS) === "custom" || !promptFields.timeOfDay) && <TextField testid="prompt-builder-time-of-day-custom" value={promptFields.timeOfDay || ""} onChange={(v) => updatePromptField("timeOfDay", v)} placeholder="Custom time of day" />}
                      </Field>
                    )}
                    <Field label="Landmarks / set pieces" full>
                      <TextArea testid="prompt-builder-landmarks" value={promptFields.landmarks || ""} onChange={(v) => updatePromptField("landmarks", v)} placeholder="glowing classroom tower, book bridge, crystal pond" />
                    </Field>
                  </>
                ) : (
                  <>
                    {!isObjectPromptType(promptAssetType) && (
                      <Field label="Role / purpose">
                        <TextField testid="prompt-builder-role" value={promptFields.role || promptFields.purpose || ""} onChange={(v) => { updatePromptField("role", v); updatePromptField("purpose", v); }} placeholder="guide / support pet / reward item" />
                      </Field>
                    )}
                    {(isNpcPromptType(promptAssetType) || isCompanionPromptType(promptAssetType) || promptAssetType === "prop" || promptAssetType === "quest-item" || promptAssetType === "avatar-asset") && (
                      <Field label={isCompanionPromptType(promptAssetType) ? "Species / creature family" : "Species / category"}>
                        <TextField testid="prompt-builder-species" value={promptFields.species || promptFields.category || ""} onChange={(v) => { updatePromptField("species", v); updatePromptField("category", v); }} placeholder={isCompanionPromptType(promptAssetType) ? "friendly fantasy creature" : "human / prop category / item category"} />
                      </Field>
                    )}
                    <Field label="Theme / realm">
                      <TextField testid="prompt-builder-realm" value={promptFields.realm || promptFields.theme || ""} onChange={(v) => { updatePromptField("realm", v); updatePromptField("theme", v); }} placeholder="Questing Academy / Meadowfall Grove" />
                    </Field>
                  </>
                )}

                {!isEnvironmentPromptType(promptAssetType) && (
                  <>
                    <Field label="Primary color"><ColorField testid="prompt-builder-primary" value={promptFields.primaryColor || "#9D8DF1"} onChange={(v) => updatePromptField("primaryColor", v)} /></Field>
                    <Field label="Accent color"><ColorField testid="prompt-builder-accent" value={promptFields.accentColor || "#F4C753"} onChange={(v) => updatePromptField("accentColor", v)} /></Field>
                  </>
                )}

                {isNpcPromptType(promptAssetType) && (
                  <>
                    <Field label="Age read"><TextField testid="prompt-builder-age" value={promptFields.ageRead || ""} onChange={(v) => updatePromptField("ageRead", v)} placeholder="teen / adult / elder" /></Field>
                    <Field label="Silhouette">
                      <SelectField testid="prompt-builder-silhouette-preset" value={presetSelectValue(promptFields.silhouette, SILHOUETTE_PRESETS)} onChange={(v) => updatePromptField("silhouette", v === "custom" ? "" : v)} options={SILHOUETTE_PRESETS} />
                      {(presetSelectValue(promptFields.silhouette, SILHOUETTE_PRESETS) === "custom" || !promptFields.silhouette) && <TextField testid="prompt-builder-silhouette-custom" value={promptFields.silhouette || ""} onChange={(v) => updatePromptField("silhouette", v)} placeholder="Custom silhouette" />}
                    </Field>
                    <Field label="Outfit"><TextField testid="prompt-builder-outfit" value={promptFields.outfit || ""} onChange={(v) => updatePromptField("outfit", v)} placeholder="librarian cardigan" /></Field>
                    <Field label="Pose">
                      <SelectField testid="prompt-builder-pose-preset" value={presetSelectValue(promptFields.pose, POSE_PRESETS)} onChange={(v) => updatePromptField("pose", v === "custom" ? "" : v)} options={POSE_PRESETS} />
                      {(presetSelectValue(promptFields.pose, POSE_PRESETS) === "custom" || !promptFields.pose) && <TextField testid="prompt-builder-pose-custom" value={promptFields.pose || ""} onChange={(v) => updatePromptField("pose", v)} placeholder="Custom pose" />}
                    </Field>
                  </>
                )}

                {isCompanionPromptType(promptAssetType) && (
                  <>
                    <Field label="Element / affinity">
                      <SelectField testid="prompt-builder-element-preset" value={presetSelectValue(promptFields.element, ELEMENT_PRESETS)} onChange={(v) => updatePromptField("element", v === "custom" ? "" : v)} options={ELEMENT_PRESETS} />
                      {(presetSelectValue(promptFields.element, ELEMENT_PRESETS) === "custom" || !promptFields.element) && <TextField testid="prompt-builder-element-custom" value={promptFields.element || ""} onChange={(v) => updatePromptField("element", v)} placeholder="Custom element" />}
                    </Field>
                    <Field label="Rarity">
                      <SelectField testid="prompt-builder-rarity-preset" value={presetSelectValue(promptFields.rarity, RARITY_PRESETS)} onChange={(v) => updatePromptField("rarity", v === "custom" ? "" : v)} options={RARITY_PRESETS} />
                      {(presetSelectValue(promptFields.rarity, RARITY_PRESETS) === "custom" || !promptFields.rarity) && <TextField testid="prompt-builder-rarity-custom" value={promptFields.rarity || ""} onChange={(v) => updatePromptField("rarity", v)} placeholder="Custom rarity" />}
                    </Field>
                  </>
                )}

                {promptAssetType === "companion-evolution" && (
                  <>
                    <Field label="Base companion"><TextField testid="prompt-builder-base-companion" value={promptFields.baseCompanion || ""} onChange={(v) => updatePromptField("baseCompanion", v)} placeholder="Bubbee" /></Field>
                    <Field label="Evolution stage"><TextField testid="prompt-builder-stage" value={promptFields.stage || ""} onChange={(v) => updatePromptField("stage", v)} placeholder="Stage 2" /></Field>
                  </>
                )}

                {!isEnvironmentPromptType(promptAssetType) && (isNpcPromptType(promptAssetType) || isCompanionPromptType(promptAssetType)) && (
                  <Field label={isCompanionPromptType(promptAssetType) ? "Personality / ability notes" : "Personality"} full>
                    <TextArea testid="prompt-builder-personality" value={promptFields.personality || promptFields.abilities || ""} onChange={(v) => { updatePromptField("personality", v); updatePromptField("abilities", v); }} placeholder="cheerful, patient, encouraging" />
                  </Field>
                )}

                <Field label="Visual notes" full>
                  <TextArea
                    testid="prompt-builder-visual-notes"
                    value={promptFields.visualNotes || ""}
                    onChange={(v) => updatePromptField("visualNotes", v)}
                    placeholder={isEnvironmentPromptType(promptAssetType) ? "Wide 16:9 background. No UI or text. Clear readable environment." : "No background. Single centered asset. Transparent preferred."}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-1">Generated prompt</p>
                <pre className="text-xs text-ink-muted bg-bg border-2 border-white rounded-2xl p-3 max-h-72 overflow-auto whitespace-pre-wrap">{generatedPromptOnly}</pre>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button type="button" onClick={copyGeneratedPrompt} className="btn-primary !text-sm !py-2 !px-4" data-testid="prompt-builder-copy">Copy prompt</button>
                  <button type="button" onClick={() => setImportOpen(true)} className="btn-outline !text-sm !py-2 !px-4">Import finished image</button>
                </div>
              </div>
            </div>
          )}


        <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPromptBuilderOpen((v) => !v)} className="btn-outline !text-sm !py-2 !px-4" data-testid="asset-library-prompt-builder-toggle"><Wand2 size={14} strokeWidth={3} /> Prompt Builder</button>
            <button type="button" onClick={() => setImportOpen((v) => !v)} className="btn-primary !text-sm !py-2 !px-4" data-testid="asset-library-import-toggle">+ Import Asset</button>
            <span className="chip">{libraryAssets.length} usable image assets</span>
          </div>
        </div>
        <div className="grid md:grid-cols-[1fr,220px,220px,180px] gap-3 mt-4 items-end">
          <Field label="Search assets"><TextField testid="asset-library-search" value={query} onChange={setQuery} placeholder="Search NPCs, pets, props, scenes…" /></Field>
          <Field label="Category"><SelectField testid="asset-library-type" value={type} onChange={(v) => setType(v as any)} options={["all", "npc", "companion", "prop", "background", "art", "ui", "avatar", "quest", "misc"]} /></Field>
          <Field label="Use mode"><SelectField testid="asset-library-consumer-mode" value={consumerMode} onChange={(v) => setConsumerMode(v as AssetConsumerMode)} options={["library", "companion-art", "land-editor"]} /></Field>
          <label className="inline-flex items-center gap-2 px-3 py-3 rounded-full bg-white border-2 border-white text-sm font-extrabold">
            <input type="checkbox" checked={transparentOnly} onChange={(e) => setTransparentOnly(e.target.checked)} className="w-5 h-5 accent-primary" /> Transparent only
          </label>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-xs font-extrabold text-ink-muted">
          <span className="chip">NPCs {counts.npc || 0}</span><span className="chip">Pets {counts.companion || 0}</span><span className="chip">Props {counts.prop || 0}</span><span className="chip">Backgrounds {counts.background || 0}</span><span className="chip">Art {counts.art || 0}</span><span className="chip">UI {counts.ui || 0}</span><span className="chip">Avatar {counts.avatar || 0}</span>
        </div>
      </Card>

      {importOpen && (
        <Card data-testid="asset-library-import-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="h-display text-xl">Import image asset</h3>
              <p className="text-sm text-ink-muted">Bring in art generated elsewhere and save it as a reusable Studio asset card.</p>
            </div>
            <span className="chip">{getImportRecommendedSpec(importAssetType)}</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <Field label="Asset name"><TextField testid="asset-import-name" value={importName} onChange={setImportName} placeholder="e.g. Sage the Cozy" /></Field>
            <Field label="Asset type"><SelectField testid="asset-import-type" value={importAssetType} onChange={(v) => { setImportAssetType(v as ImportAssetType); setImportError(""); }} options={IMPORT_ASSET_TYPES} /></Field>
            <Field label="Destination library"><SelectField testid="asset-import-library" value={importDestinationLibrary} onChange={(v) => setImportDestinationLibrary(v as ImportDestinationLibrary)} options={IMPORT_DESTINATION_LIBRARIES} /></Field>
            <Field label="Source/provider note"><TextField testid="asset-import-source" value={importSource} onChange={setImportSource} placeholder="ChatGPT, Midjourney, artist, local file…" /></Field>
            <Field label="Tags" full><TextField testid="asset-import-tags" value={importTags} onChange={setImportTags} placeholder="guide, cozy, npc, academy" /></Field>
            <Field label="Description / notes" full><TextArea testid="asset-import-description" value={importDescription} onChange={setImportDescription} placeholder="Short notes, intended use, or source prompt summary." /></Field>
            <Field label="Image file" full>
              <input data-testid="asset-import-file" type="file" accept="image/png,image/webp,image/jpeg" onChange={(e) => handleImportFile(e.target.files?.[0])} className="block w-full text-sm font-bold text-ink file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-white" />
              <p className="text-xs text-ink-muted mt-2">PNG/WebP preferred. JPG/JPEG should only be used for full backgrounds.</p>
            </Field>
          </div>
          {importError && <div className="mt-3 rounded-2xl bg-danger/10 border-2 border-danger/30 p-3 text-sm font-bold text-danger">{importError}</div>}
          {importImageDataUrl && isOversizedDataUrl(importImageDataUrl) && !importError && (
            <div className="mt-3 rounded-2xl bg-sage/10 border-2 border-sage/30 p-3 text-sm font-bold text-sage">
              Large image detected. Good — TEA-105 will upload it to backend storage instead of saving it into browser localStorage.
            </div>
          )}
          {importImageDataUrl && (
            <div className="mt-4 grid md:grid-cols-[220px,1fr] gap-4 items-start">
              <img src={importImageDataUrl} alt="Import preview" className="w-full aspect-square object-contain rounded-2xl border-4 border-white bg-bg shadow-lg" />
              <div className="rounded-2xl bg-bg border-2 border-white p-3">
                <p className="text-[10px] font-extrabold uppercase text-ink-muted">Ready to import</p>
                <p className="font-extrabold mt-1">{importName || importFileName}</p>
                <p className="text-xs text-ink-muted mt-1">{importAssetType} → {importDestinationLibrary}</p>
                <p className="text-xs text-ink-muted mt-1">{getImportRecommendedSpec(importAssetType)}</p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <button type="button" onClick={submitImportedAsset} className="btn-primary !text-sm !py-2 !px-4" disabled={!importImageDataUrl || importUploading}>{importUploading ? "Uploading..." : "Save imported asset"}</button>
            <button type="button" onClick={resetImportForm} className="btn-ghost !text-sm !py-2 !px-4">Reset import</button>
          </div>
        </Card>
      )}

      {selectedAssets.length > 0 && <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="h-display text-xl">Selected asset references</h3><p className="text-sm text-ink-muted">Phase 2 handoff for Companion Art and the upcoming Land Editor. These are lightweight refs, not duplicated images.</p></div><button type="button" onClick={() => setSelectedAssetIds([])} className="btn-ghost !text-sm !py-2 !px-4">Clear selection</button></div><pre className="mt-3 text-[10px] overflow-auto max-h-48 whitespace-pre-wrap bg-bg border-2 border-white rounded-2xl p-3">{JSON.stringify(selectedAssets.map((asset) => ({ sourceCollection: asset.sourceCollection, sourceId: asset.sourceId, assetType: asset.assetType, name: asset.name, url: asset.transparentUrl || asset.thumbnailUrl, tags: asset.tags })), null, 2)}</pre></Card>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((asset) => {
          const displayUrl = asset.transparentUrl || asset.thumbnailUrl || "";
          return (
            <Card key={asset.id} className="!p-3" data-testid={`asset-library-card-${asset.id}`}>
              <div className="aspect-square rounded-2xl border-4 border-white bg-bg overflow-hidden grid place-items-center">
                {displayUrl ? <img src={normalizeStudioImageUrl(displayUrl)} alt={asset.name} className="w-full h-full object-contain" /> : <span className="text-xs text-ink-muted">No image</span>}
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2 justify-between">
                  <p className="h-display text-lg truncate">{asset.name}</p>
                  {asset.status && <StatusChip status={asset.status} />}
                </div>
                <p className="text-[10px] font-extrabold uppercase text-ink-muted">{asset.assetType} · {asset.sourceCollection}</p>
                {asset.transparentUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Transparent/imported variant available</p>}
                {asset.description && <p className="text-xs text-ink-muted line-clamp-2 mt-1">{asset.description}</p>}
                <div className="flex flex-wrap gap-1 mt-2">{asset.tags.slice(0, 5).map((tag) => <span key={tag} className="px-2 py-0.5 rounded-full bg-bg text-[10px] font-bold text-ink-muted">{tag}</span>)}</div>
                <div className="grid grid-cols-1 gap-2 mt-3">
                  <button type="button" onClick={() => toggleSelectedAsset(asset)} className={cn("btn-outline !text-xs !py-1.5 !px-3 w-full", selectedAssetIds.includes(asset.id) ? "!bg-primary !text-white" : "")}>{selectedAssetIds.includes(asset.id) ? "Selected for " : "Use in "}{consumerMode === "library" ? "builder" : consumerMode}</button>
                  <button type="button" onClick={() => openAssignAsset(asset)} className="btn-primary !text-xs !py-1.5 !px-3 w-full">Assign to source card</button>
                  <button type="button" onClick={() => copyAssetJson(asset)} className="btn-outline !text-xs !py-1.5 !px-3 w-full">Copy asset ref JSON</button>
                  {displayUrl && <button type="button" onClick={() => downloadImageFromUrl(displayUrl, `asset-library-${asset.name}`)} className="btn-outline !text-xs !py-1.5 !px-3 w-full"><Download size={13} strokeWidth={3} /> Export source image</button>}
                  <button type="button" onClick={() => deleteLibraryAsset(asset)} className="btn-ghost !text-xs !py-1.5 !px-3 w-full text-danger"><Trash2 size={13} strokeWidth={3} /> Delete asset card</button>
                </div>

                {assignOpenAssetId === asset.id && (
                  <div className="mt-3 rounded-2xl bg-bg border-2 border-white p-3 space-y-3">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-primary">TEA-106 assignment</p>
                      <p className="text-xs text-ink-muted">Attach this imported/library image to a real source record. The source card will display it immediately.</p>
                    </div>
                    <Field label="Target collection">
                      <SelectField
                        testid={`asset-assign-collection-${asset.id}`}
                        value={assignTargetCollection}
                        onChange={(v) => {
                          setAssignTargetCollection(v as StudioCollectionKey);
                          setAssignTargetId("");
                          setAssignSlot((v === "battleBgs" || v === "scenes" || v === "realms") && asset.assetType === "background" ? "previewUrl" : "previewUrl");
                        }}
                        options={assignableCollections.map((x) => x.key)}
                      />
                    </Field>
                    <Field label="Target card">
                      <SearchSelect
                        testid={`asset-assign-target-${asset.id}`}
                        value={assignTargetId}
                        onChange={setAssignTargetId}
                        options={assignTargetOptions}
                        placeholder="Search target card..."
                      />
                    </Field>
                    <Field label="Image slot">
                      <SelectField
                        testid={`asset-assign-slot-${asset.id}`}
                        value={assignSlot}
                        onChange={(v) => setAssignSlot(v as any)}
                        options={["previewUrl", "transparentPreviewUrl", "imageUrl", "backgroundUrl"]}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => applyAssetAssignment(asset)} className="btn-primary !text-xs !py-1.5 !px-3">Apply assignment</button>
                      <button type="button" onClick={() => { setAssignOpenAssetId(""); setAssignTargetId(""); }} className="btn-ghost !text-xs !py-1.5 !px-3">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && <Card><p className="text-sm text-ink-muted">No assets match those filters. Import art, generate/save images on cards, or clear filters.</p></Card>}
    </div>
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

const ASSET_BACKGROUND_MODES = ["transparent-ready", "plain removable background", "simple light background", "game UI presentation"];
const ASSET_UI_SIZES = ["small icon", "medium inventory icon", "large shop preview", "reward popup size"];
const ASSET_SHAPE_LANGUAGES = ["none", "round and soft", "star-like", "shield-like", "leaf-like", "gem-like", "book-like", "ribbon-like", "simple silhouette"];
const ASSET_TOKEN_TYPES = ["coin", "gem", "star shard", "crystal token", "leaf token", "moon token", "academy seal"];
const ASSET_MATERIALS = ["none", "soft fabric", "polished metal", "warm wood", "glowing crystal", "paper/card", "painted ceramic", "magical light"];
const ASSET_EFFECTS = ["none", "soft glow", "sparkle", "shimmer", "tiny floating motes", "gentle shine"];
const ASSET_COSMETIC_SLOTS = ["head", "face", "neck", "shoulder", "back", "hand", "outfit accent", "pet accessory"];
const ASSET_UI_PLACEMENTS = ["corner flourish", "button frame", "panel divider", "reward banner trim", "inventory slot frame", "quest card accent"];

const buildSection = (title: string, lines: string[]): string => [
  `${title}:`,
  ...lines.filter(Boolean).map((line) => `- ${line}`),
].join("\n");

const buildAssetImagePrompt = (draft: Partial<StudioAsset> & Record<string, any>): string => {
  const name = draft.name?.trim() || `unnamed ${draft.kind || "asset"}`;
  const kind = draft.kind || "icon";
  const primaryColor = draft.previewColor || "#9D8DF1";
  const accentColor = draft.accentColor || draft.egg?.accentColor || "#F4C753";
  const description = draft.description || "A cheerful Questing Academy visual game asset.";
  const backgroundMode = draft.backgroundMode || "transparent-ready";
  const transparentIntent = !!draft.transparentIntent || backgroundMode === "transparent-ready" || backgroundMode === "plain removable background";
  const iconSubject = draft.iconSubject || name;
  const uiSize = draft.uiSize || "medium inventory icon";
  const shapeLanguage = draft.shapeLanguage || "none";
  const tokenType = draft.tokenType || "coin";
  const material = draft.material || "none";
  const effect = draft.magicalEffect || draft.egg?.glowEffect || "soft glow";
  const propContext = draft.propContext || "academy room";
  const interactable = draft.interactable ? "yes" : "no";
  const cosmeticSlot = draft.cosmeticSlot || "head";
  const uiPlacement = draft.uiPlacement || "button frame";

  const positive = [
    `Create one Questing Academy ${String(kind).replace(/-/g, " ")} asset named ${name}.`,
    `Asset kind: ${kind}.`,
    `Asset description: ${description}.`,
    `Primary color: ${primaryColor}.`,
    `Accent color: ${accentColor}.`,
  ];

  const requirements: string[] = [];

  if (kind === "egg") {
    requirements.push(`Show one single full companion egg object only.`);
    requirements.push(`Egg rarity: ${draft.egg?.rarity || "common"}.`);
    requirements.push(`Base color: ${draft.egg?.baseColor || primaryColor}; accent color: ${draft.egg?.accentColor || accentColor}.`);
    requirements.push(`Glow effect: ${draft.egg?.glowEffect || effect}.`);
    requirements.push(`Hatch category: ${draft.egg?.hatchCategory || "friendly companion"}.`);
    requirements.push(`Companion family: ${draft.egg?.companionFamily || "academy pets"}.`);
    requirements.push(`Decorative markings should be large, simple, and readable.`);
  } else if (kind === "badge" || kind === "sticker") {
    requirements.push(`Show one single ${kind}, not a sheet.`);
    requirements.push(`Badge type: ${draft.badge?.badgeType || "achievement"}.`);
    requirements.push(`Achievement theme: ${draft.badge?.achievementCategory || "learning milestone"}.`);
    requirements.push(`Icon shape: ${draft.badge?.iconShape || (shapeLanguage !== "none" ? shapeLanguage : "simple readable silhouette")}.`);
    requirements.push(`Rarity: ${draft.badge?.rarity || "common"}.`);
    requirements.push(`Readable at small UI size with a bold central symbol.`);
  } else if (kind === "icon") {
    requirements.push(`Icon subject: ${iconSubject}.`);
    requirements.push(`UI size target: ${uiSize}.`);
    if (shapeLanguage !== "none") requirements.push(`Shape language: ${shapeLanguage}.`);
    requirements.push(`Depict the named object or concept directly as one single readable icon.`);
  } else if (kind === "currency") {
    requirements.push(`Currency token type: ${tokenType}.`);
    if (material !== "none") requirements.push(`Material: ${material}.`);
    requirements.push(`Magical effect: ${effect}.`);
    requirements.push(`Make it feel collectible, valuable, and readable as a reward currency.`);
  } else if (kind === "academy-room-prop") {
    requirements.push(`Prop context: ${propContext}.`);
    if (material !== "none") requirements.push(`Material: ${material}.`);
    requirements.push(`Interactable object: ${interactable}.`);
    requirements.push(`Show the prop itself, not a full room or scene.`);
  } else if (kind === "cosmetic") {
    requirements.push(`Cosmetic slot: ${cosmeticSlot}.`);
    if (material !== "none") requirements.push(`Material: ${material}.`);
    requirements.push(`Magical effect: ${effect}.`);
    requirements.push(`Show one wearable/customization item only, not a character wearing it.`);
  } else if (kind === "ui-decoration") {
    requirements.push(`UI placement: ${uiPlacement}.`);
    if (shapeLanguage !== "none") requirements.push(`Motif / shape language: ${shapeLanguage}.`);
    requirements.push(`Trim/material feel: ${material}.`);
    requirements.push(`Show a polished interface ornament, not a full UI mockup.`);
  } else {
    requirements.push(`Depict the named asset directly as one single clear object.`);
    if (shapeLanguage !== "none") requirements.push(`Shape language: ${shapeLanguage}.`);
    if (material !== "none") requirements.push(`Material: ${material}.`);
  }

  const style = [
    `Cute chibi educational fantasy RPG game asset style.`,
    `Centered in frame, full object visible, clean readable silhouette.`,
    `Soft rounded shapes, cozy Questing Academy warmth, pastel colors, child-safe for ages 5-12.`,
    `Crisp edges, readable at small game UI size, no blur, no complex scene.`
  ];

  const background = [
    `Background mode: ${backgroundMode}.`,
    transparentIntent
      ? `Prepare for background removal: isolated object, strong clean outer contour, no cast shadow touching the border, no scenery behind the asset.`
      : `Use only the selected simple presentation background, keeping the asset easy to crop or export.`,
    backgroundMode === "transparent-ready"
      ? `Use a plain flat near-white or checker-safe removable background style; asset should look suitable for transparent PNG conversion later.`
      : backgroundMode === "plain removable background"
        ? `Use a single flat plain background color with high separation from the asset.`
        : backgroundMode === "game UI presentation"
          ? `Use a simple game UI asset presentation with minimal framing, no extra objects.`
          : `Use a simple light background with no scene details.`,
  ];

  const negative = [
    `No text, fake writing, labels, watermark, logo, UI words, numbers, or symbols that look like letters.`,
    `No cropped object, no multi-item sheet, no extra duplicate objects, no unrelated asset categories.`,
    `No full scene, no room background, no landscape, no characters, no hands, no object being worn by a character.`,
    `No photorealism, realistic violence, horror, weapons, dark scary mood.`,
  ];

  if (kind !== "egg") negative.push(`No eggs or egg shapes unless the asset kind is egg.`);
  if (kind !== "currency") negative.push(`No coins, gems, or currency tokens unless the asset kind is currency.`);
  if (kind !== "badge" && kind !== "sticker") negative.push(`No badges, stickers, seals, or achievement medals unless requested.`);

  return [
    buildSection("POSITIVE PROMPT", positive),
    "",
    buildSection("ASSET REQUIREMENTS", requirements),
    "",
    buildSection("STYLE REQUIREMENTS", style),
    "",
    buildSection("BACKGROUND / EXPORT REQUIREMENTS", background),
    "",
    buildSection("STRICT NEGATIVE PROMPT", negative),
  ].join("\n");
};

const AssetsTab: React.FC = () => {
  const items = useStudio((s) => s.assets);
  const addItem = useStudio((s) => s.addItem);
  const addPalette = useStudio((s) => s.addPalette);
  const [draft, setDraft] = useState<Partial<StudioAsset> & Record<string, any>>({ kind: "icon", previewColor: "#9D8DF1", accentColor: "#F4C753", backgroundMode: "transparent-ready", transparentIntent: true, uiSize: "medium inventory icon", shapeLanguage: "none", material: "none", magicalEffect: "soft glow" });
  const [generatedPreview, setGeneratedPreview] = useState<AssetGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<AssetGeneratedPreview | null>(null);
  const update = <K extends keyof StudioAsset>(k: K, v: StudioAsset[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const updateAny = (k: string, v: any) => setDraft((d) => ({ ...d, [k]: v }));
  const handleSavePalette = (hex: string) =>
    addPalette({ id: "pal-user-" + Date.now(), name: `Saved ${hex}`, colors: [hex], createdAt: new Date().toISOString() });

  const generateImagePreview = async () => {
    const prompt = buildAssetImagePrompt(draft);
    const from = draft.egg?.baseColor || draft.previewColor || "#9D8DF1";
    const to = draft.egg?.accentColor || draft.accentColor || "#FFF8DD";
    setSavedPreview(null);
    try {
      const preview = await generateStudioImagePreview({
        prompt,
        contentType: "asset",
        palette: { from: String(from), to: String(to) },
      });
      setGeneratedPreview(preview);
    } catch (err) {
      console.error(err);
      setGeneratedPreview(null);
      alert(err instanceof Error ? err.message : "Image generation failed.");
    }
  };

  const saveGeneratedPreview = async () => {
    if (!generatedPreview) return;
    try {
      const durablePreview = await makeDurableImagePreview(generatedPreview);
      setSavedPreview(durablePreview);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not save generated image to local storage.");
    }
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
      egg: draft.egg,
      badge: draft.badge,
      accentColor: draft.accentColor,
      backgroundMode: draft.backgroundMode,
      transparentIntent: draft.transparentIntent,
      iconSubject: draft.iconSubject,
      uiSize: draft.uiSize,
      shapeLanguage: draft.shapeLanguage,
      tokenType: draft.tokenType,
      material: draft.material,
      magicalEffect: draft.magicalEffect,
      propContext: draft.propContext,
      interactable: draft.interactable,
      cosmeticSlot: draft.cosmeticSlot,
      uiPlacement: draft.uiPlacement,
    } as StudioAsset;
    addItem("assets", item);
    setGeneratedPreview(null);
    setSavedPreview(null);
    setDraft({ kind: "icon", previewColor: "#9D8DF1", accentColor: "#F4C753", backgroundMode: "transparent-ready", transparentIntent: true, uiSize: "medium inventory icon", shapeLanguage: "none", material: "none", magicalEffect: "soft glow" });
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
            <div><p className="h-display text-xl leading-tight">Add asset</p><p className="text-sm text-ink-muted">Generate isolated game assets that are easy to export and later background-remove.</p></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name"><TextField testid="assets-input-name" value={draft.name ?? ""} onChange={(v) => update("name", v)} placeholder="e.g. Sunberry Coin" /></Field>
            <Field label="Kind"><SelectField testid="assets-input-kind" value={draft.kind ?? ""} options={ASSET_KINDS} onChange={(v) => { update("kind", v as AssetKind); setGeneratedPreview(null); setSavedPreview(null); }} /></Field>
            <Field label="Primary color"><ColorField testid="assets-input-color" value={draft.previewColor ?? "#9D8DF1"} onChange={(v) => update("previewColor", v)} onSave={handleSavePalette} /></Field>
            <Field label="Accent color"><ColorField testid="assets-input-accent-color" value={draft.accentColor ?? "#F4C753"} onChange={(v) => updateAny("accentColor", v)} onSave={handleSavePalette} /></Field>
            <Field label="Background mode"><SelectField testid="assets-input-background-mode" value={draft.backgroundMode ?? "transparent-ready"} options={ASSET_BACKGROUND_MODES} onChange={(v) => updateAny("backgroundMode", v)} /></Field>
            <Field label="Transparent/removal-ready?">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border-2 border-white">
                <input type="checkbox" data-testid="assets-transparent-intent" checked={!!draft.transparentIntent} onChange={(e) => updateAny("transparentIntent", e.target.checked)} className="w-5 h-5 accent-primary" />
                <span className="text-sm font-extrabold">Prepare for background removal</span>
              </label>
            </Field>
            <Field label="Shape language"><SelectField testid="assets-input-shape-language" value={draft.shapeLanguage ?? "none"} options={ASSET_SHAPE_LANGUAGES} onChange={(v) => updateAny("shapeLanguage", v)} /></Field>
            <Field label="Material"><SelectField testid="assets-input-material" value={draft.material ?? "none"} options={ASSET_MATERIALS} onChange={(v) => updateAny("material", v)} /></Field>
            <Field label="Magical effect"><SelectField testid="assets-input-effect" value={draft.magicalEffect ?? "soft glow"} options={ASSET_EFFECTS} onChange={(v) => updateAny("magicalEffect", v)} /></Field>
            <Field label="Notes" full><TextArea testid="assets-input-desc" value={draft.description ?? ""} onChange={(v) => update("description", v)} placeholder="Short description / visual intent" /></Field>

            {k === "icon" && <>
              <Field label="Icon subject"><TextField testid="assets-icon-subject" value={draft.iconSubject ?? ""} onChange={(v) => updateAny("iconSubject", v)} placeholder="single book / compass / apple / star" /></Field>
              <Field label="UI size target"><SelectField testid="assets-icon-ui-size" value={draft.uiSize ?? "medium inventory icon"} options={ASSET_UI_SIZES} onChange={(v) => updateAny("uiSize", v)} /></Field>
            </>}

            {k === "currency" && <>
              <Field label="Token type"><SelectField testid="assets-currency-token-type" value={draft.tokenType ?? "coin"} options={ASSET_TOKEN_TYPES} onChange={(v) => updateAny("tokenType", v)} /></Field>
              <Field label="Currency motif"><TextField testid="assets-currency-motif" value={draft.iconSubject ?? ""} onChange={(v) => updateAny("iconSubject", v)} placeholder="sun, star, leaf, academy crest" /></Field>
            </>}

            {k === "academy-room-prop" && <>
              <Field label="Room/context"><TextField testid="assets-prop-context" value={draft.propContext ?? ""} onChange={(v) => updateAny("propContext", v)} placeholder="library, academy room, hatchery" /></Field>
              <Field label="Interactable?">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border-2 border-white">
                  <input type="checkbox" data-testid="assets-prop-interactable" checked={!!draft.interactable} onChange={(e) => updateAny("interactable", e.target.checked)} className="w-5 h-5 accent-primary" />
                  <span className="text-sm font-extrabold">Clickable/interactable prop</span>
                </label>
              </Field>
            </>}

            {k === "cosmetic" && <>
              <Field label="Cosmetic slot"><SelectField testid="assets-cosmetic-slot" value={draft.cosmeticSlot ?? "head"} options={ASSET_COSMETIC_SLOTS} onChange={(v) => updateAny("cosmeticSlot", v)} /></Field>
              <Field label="Wearable detail"><TextField testid="assets-cosmetic-detail" value={draft.iconSubject ?? ""} onChange={(v) => updateAny("iconSubject", v)} placeholder="wizard hat, cape clasp, ribbon" /></Field>
            </>}

            {k === "ui-decoration" && <>
              <Field label="UI placement"><SelectField testid="assets-ui-placement" value={draft.uiPlacement ?? "button frame"} options={ASSET_UI_PLACEMENTS} onChange={(v) => updateAny("uiPlacement", v)} /></Field>
              <Field label="Motif"><TextField testid="assets-ui-motif" value={draft.iconSubject ?? ""} onChange={(v) => updateAny("iconSubject", v)} placeholder="stars, leaves, academy crest" /></Field>
            </>}

            {k === "egg" && <>
              <Field label="Rarity"><SelectField testid="assets-egg-rarity" value={draft.egg?.rarity ?? ""} options={RARITIES} onChange={(v) => update("egg", { ...(draft.egg ?? {}), rarity: v as Rarity })} placeholder="—" /></Field>
              <Field label="Base color"><ColorField testid="assets-egg-base" value={draft.egg?.baseColor ?? draft.previewColor ?? "#DCEEF7"} onChange={(v) => update("egg", { ...(draft.egg ?? {}), baseColor: v })} onSave={handleSavePalette} /></Field>
              <Field label="Egg accent color"><ColorField testid="assets-egg-accent" value={draft.egg?.accentColor ?? draft.accentColor ?? "#7BB7D6"} onChange={(v) => update("egg", { ...(draft.egg ?? {}), accentColor: v })} onSave={handleSavePalette} /></Field>
              <Field label="Shiny chance (0-100)"><NumberField testid="assets-egg-shiny" value={draft.egg?.shinyChance ?? 4} onChange={(n) => update("egg", { ...(draft.egg ?? {}), shinyChance: n })} min={0} max={100} /></Field>
              <Field label="Hatch category"><TextField testid="assets-egg-hatch" value={draft.egg?.hatchCategory ?? ""} onChange={(v) => update("egg", { ...(draft.egg ?? {}), hatchCategory: v })} placeholder="water / fire / nature" /></Field>
              <Field label="Glow effect"><SelectField testid="assets-egg-glow" value={draft.egg?.glowEffect ?? ""} options={ASSET_EFFECTS} onChange={(v) => update("egg", { ...(draft.egg ?? {}), glowEffect: v as any })} placeholder="—" /></Field>
              <Field label="Companion family"><TextField testid="assets-egg-family" value={draft.egg?.companionFamily ?? ""} onChange={(v) => update("egg", { ...(draft.egg ?? {}), companionFamily: v })} placeholder="water-pups" /></Field>
              <Field label="Event tag"><TextField testid="assets-egg-event" value={draft.egg?.eventTag ?? ""} onChange={(v) => update("egg", { ...(draft.egg ?? {}), eventTag: v })} placeholder="optional" /></Field>
            </>}

            {(k === "badge" || k === "sticker") && <>
              <Field label="Badge type"><SelectField testid="assets-badge-type" value={draft.badge?.badgeType ?? ""} options={["achievement","milestone","event","rank"]} onChange={(v) => update("badge", { ...(draft.badge ?? {}), badgeType: v as any })} placeholder="—" /></Field>
              <Field label="Achievement theme"><TextField testid="assets-badge-category" value={draft.badge?.achievementCategory ?? ""} onChange={(v) => update("badge", { ...(draft.badge ?? {}), achievementCategory: v })} placeholder="first-correct / streak / kindness" /></Field>
              <Field label="Icon shape"><SelectField testid="assets-badge-icon" value={draft.badge?.iconShape ?? ""} options={["circle","star","shield","leaf","heart"]} onChange={(v) => update("badge", { ...(draft.badge ?? {}), iconShape: v as any })} placeholder="—" /></Field>
              <Field label="Rarity"><SelectField testid="assets-badge-rarity" value={draft.badge?.rarity ?? ""} options={RARITIES} onChange={(v) => update("badge", { ...(draft.badge ?? {}), rarity: v as Rarity })} placeholder="—" /></Field>
            </>}
          </div>

          <div className="mt-4 flex flex-wrap items-start gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-ink-muted mb-1">Color preview</p>
              <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg" style={{ background: `linear-gradient(135deg, ${draft.previewColor ?? "#9D8DF1"}, ${draft.accentColor ?? "#F4C753"})` }} aria-hidden />
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
            helper="Generate from this asset draft, then save, export, or discard before sending it to review. Background removal is planned as a later processing step."
            generatedPreview={generatedPreview}
            savedPreview={savedPreview}
            onGenerate={generateImagePreview}
            onSave={saveGeneratedPreview}
            onDiscard={discardGeneratedPreview}
            disabled={false}
            imageClassName="aspect-square"
            exportFilename={`asset-${draft.name || draft.kind || "item"}-${draft.kind || "asset"}-${draft.backgroundMode || "export"}`}
          />

          <button type="button" data-testid="assets-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioAsset) => (
        <div className="flex gap-3">
          {i.previewUrl ? (
            <img src={getImageUrl(i)} alt={`${i.name} asset art`} className="w-16 h-16 object-contain rounded-2xl border-4 border-white shrink-0 shadow-lg bg-bg" />
          ) : (
            <div className="w-16 h-16 rounded-2xl border-4 border-white shrink-0" style={{ background: `linear-gradient(135deg, ${i.previewColor}, ${(i as any).accentColor || "#F4C753"})` }} aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="h-display text-lg truncate">{i.name}</p>
            <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.kind.replace(/-/g," ")}{(i as any).backgroundMode ? ` · ${(i as any).backgroundMode}` : ""}</p>
            {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {i.imageProvider ?? "prototype"}</p>}
            {(i as any).accentColor && <p className="text-[10px] font-bold text-primary mt-1">Colors: {i.previewColor} → {(i as any).accentColor}</p>}
            {i.egg && <p className="text-[10px] font-bold text-primary mt-1">{i.egg.rarity} · shiny {i.egg.shinyChance}% · {i.egg.glowEffect} glow</p>}
            {i.badge && <p className="text-[10px] font-bold text-primary mt-1">{i.badge.badgeType} · {i.badge.iconShape}</p>}
            {i.description && <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>}
            <StudioViewEditButton collection="assets" item={i} title={i.name} imageUrl={getImageUrl(i)} />
          </div>
        </div>
      )}
    />
  );
};

// ============================================================================
// REALMS
// ============================================================================

const REALM_PREFIXES = ["Meadowfall", "Lullaby", "Starlit", "Sunberry", "Frostpine", "Moonpetal", "Pebblebrook", "Whisperwind", "Honeydew", "Brightbloom", "Cloudberry", "Willowwish"];
const REALM_TYPES = ["enchanted forest", "castle town", "mountain vale", "sky islands", "moonlit marsh", "crystal grotto", "desert oasis", "volcanic ridge", "snowfield", "coral lagoon", "academy grounds", "meadow village", "storybook kingdom", "river town", "sunlit plateau"];
const REALM_BUILDING_COUNTS = ["3", "5", "7", "10", "15", "20+"];
const REALM_CAMERA_OPTIONS = ["fixed 2D browser RPG screen", "orthographic oblique RPG screen", "top-down gameplay screen", "light isometric gameplay screen", "side-view scenic"];
const REALM_SCREEN_FORMATS = ["outdoor route", "outdoor town edge", "building entrance", "interior room", "plaza screen", "cave/dungeon room", "beach/water edge", "forest clearing"];
const REALM_CAMERA_DISTANCES = ["close", "medium", "overview"];
const REALM_BOUNDARY_STYLES = ["trees", "water", "fences", "room walls", "cliffs/rocks", "counters/shelves", "mixed natural edges"];
const REALM_BUILDING_MODES = ["none", "partial/cropped entrance", "one building edge", "multiple buildings"];
const REALM_MAP_SCALES = ["small room", "single-screen chunk", "town lane", "plaza chunk", "forest path", "building entrance", "cave room", "bridge crossing"];
const REALM_FANTASY_LEVELS = ["grounded", "magical", "high fantasy"];
const REALM_EXIT_OPTIONS = ["north gate", "south road", "east bridge", "west forest path", "secret portal", "boat dock", "mountain pass", "academy archway"];
const REALM_OUTPUT_MODES = ["Playable RPG Screen", "Map Chunk / Room", "Walking Map", "Realm Key Art"];
type RealmOutputMode = typeof REALM_OUTPUT_MODES[number];
const REALM_VISUAL_REFERENCE_STYLES = ["cozy browser RPG", "tilemap-inspired", "Prodigy-like outdoor route", "cozy indoor RPG room"];

const pickRealm = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const makeRealmName = (prefix?: string, type?: string) => `${prefix || pickRealm(REALM_PREFIXES)} ${type || pickRealm(REALM_TYPES)}`.replace(/\b\w/g, (c) => c.toUpperCase());
const parseCount = (count?: string): number => count === "20+" ? 20 : Math.max(3, parseInt(count || "5", 10) || 5);

type RealmGeneratedPreview = {
  url: string;
  prompt: string;
  provider: string;
};

const buildRealmImagePrompt = (draft: Partial<StudioRealm>): string => {
  const d = draft as any;
  const outputMode = (d.outputMode || "Playable RPG Screen") as RealmOutputMode;
  const prefix = d.realmPrefix || "Meadowfall";
  const type = d.realmType || "enchanted forest";
  const name = draft.name?.trim() || makeRealmName(prefix, type);
  const biome = draft.biome || `${type} fantasy biome`;
  const tone = draft.tone || "cozy";
  const fantasyLevel = d.fantasyLevel || "magical";
  const visualReferenceStyle = d.visualReferenceStyle || "cozy browser RPG";
  const screenFormat = d.screenFormat || "outdoor route";
  const mapCamera = d.mapCamera || "fixed 2D browser RPG screen";
  const cameraDistance = d.cameraDistance || "close";
  const boundaryStyle = d.boundaryStyle || "trees";
  const buildingMode = d.buildingMode || "none";
  const gridCell = d.gridCell || "A2";
  const zonePurpose = d.zonePurpose || "forest transition path";
  const exits = d.entryExits || "north, east";
  const zoneContents = d.zoneContents || "wide walkable path, open grass center, trees and flowers around the edges, one NPC spot, one pet spawn patch";
  const mapNotes = draft.mapNotes || "one playable screen with clear exits and edge boundaries";
  const inMapNotes = d.inMapNotes || "wide paths, readable NPC/pet zones, open touch/click movement space";
  const mapScale = d.mapScale || "single-screen chunk";
  const buildingCount = d.buildingCount || String((draft.buildings ?? []).length || 0);
  const buildings = (draft.buildings ?? []).map((b) => String(b).replace(/-/g, " ")).join(", ");
  const grades = (draft.grades ?? ["K", "1", "2"]).join(", ");
  const subjects = (draft.subjects ?? ["math"]).join(", ");
  const description = draft.description || `A ${tone} ${type} realm for young adventurers.`;

  const positive: string[] = [];
  const layout: string[] = [];
  const style: string[] = [];
  const negative: string[] = [];

  if (outputMode === "Playable RPG Screen" || outputMode === "Map Chunk / Room") {
    positive.push(`Create a crisp 1920x1080 Questing Academy playable RPG screen background.`);
    positive.push(`Scene: ${zonePurpose} in ${name}.`);
    positive.push(`Realm name: ${name}.`);
    positive.push(`Realm prefix/type: ${prefix} ${type}.`);
    positive.push(`Biome: ${biome}.`);
    positive.push(`Tone/mood: ${tone}.`);
    positive.push(`Fantasy level: ${fantasyLevel}.`);
    positive.push(`Learning audience: grades ${grades}; subjects ${subjects}.`);
    positive.push(`Visual reference style: ${visualReferenceStyle}.`);
    positive.push(`Output type: ${outputMode}.`);
    positive.push(`Screen format: ${screenFormat}.`);
    positive.push(`Camera: ${mapCamera}.`);
    positive.push(`Camera distance: ${cameraDistance}.`);
    positive.push(`Map scale: ${mapScale}.`);
    positive.push(`Grid cell: ${gridCell}.`);
    positive.push(`Boundary style: ${boundaryStyle}.`);
    positive.push(`Building mode: ${buildingMode}.`);

    layout.push(`Required exits: ${exits}.`);
    layout.push(`Zone contents: ${zoneContents}.`);
    layout.push(`Map notes: ${mapNotes}.`);
    layout.push(`In-map walking notes: ${inMapNotes}.`);
    layout.push(`Large walkable ground/path/floor space should dominate the image.`);
    layout.push(`Use clear collision-friendly boundaries around the screen edges.`);
    layout.push(`Leave open space for a small chibi player sprite, NPCs, pets, pickups, and click/touch movement.`);
    layout.push(`Make it feel like one playable local screen, not a whole realm, not a whole town, and not a distant map overview.`);

    if (buildingMode === "none") {
      layout.push(`Use natural boundaries only: trees, bushes, rocks, flowers, grass, water, fences, cliffs, or paths.`);
    } else {
      layout.push(`Building/structure direction: ${buildingMode}; building count target: ${buildingCount}.`);
      if (buildings) layout.push(`Allowed hubs/landmarks for this structured screen: ${buildings}.`);
    }

    style.push(`Clean colorful 2D/2.5D children's browser RPG background.`);
    style.push(`Player-scale environment with readable sprite-RPG/tilemap-inspired shapes.`);
    style.push(`Questing Academy warmth: cream sunlight, pastel greens, soft lavender accents, rounded cozy forms, cheerful kid-safe fantasy.`);
    style.push(`Crisp readable edges, game-ready background, no blur, no stretched look, no low-resolution texture.`);

    negative.push(`No text, labels, UI, logos, watermark, fake writing, signs, symbols, corner marks.`);
    negative.push(`No characters, battle scene, object sheet, cards, UI mockup, poster, character portrait.`);
    negative.push(`No aerial overview, world map, full town, full city, decorative board-game map, cinematic concept art, miniature model-map look.`);
    if (buildingMode === "none") negative.push(`No buildings, houses, rooftops, town hubs, shops, hatcheries, academies, landmarks, doors, windows, or structures.`);
    negative.push(`No photorealism, realistic violence, horror, weapons, dark scary mood.`);
  } else if (outputMode === "Walking Map") {
    positive.push(`Create a crisp 1920x1080 Questing Academy playable walking-region background for ${name}.`);
    positive.push(`Realm name: ${name}; biome: ${biome}; tone: ${tone}; fantasy level: ${fantasyLevel}.`);
    positive.push(`Visual reference style: ${visualReferenceStyle}.`);
    positive.push(`Camera: ${mapCamera}; camera distance: ${cameraDistance}; map scale: ${mapScale}.`);
    positive.push(`Broader explorable walking terrain with readable zones, clear navigation flow, and open paths.`);
    if (buildings) positive.push(`Suggested hubs/landmarks: ${buildings}.`);
    layout.push(`Entrances/exits: ${exits}.`);
    layout.push(`Map notes: ${mapNotes}.`);
    layout.push(`In-map walking notes: ${inMapNotes}.`);
    style.push(`Clean colorful 2D/2.5D RPG background for kids, Questing Academy warmth, pastel greens, lavender accents, crisp game art.`);
    negative.push(`No text, labels, UI, logos, watermark, characters, battle scene, object sheet, photorealism, horror, weapons, dark scary mood.`);
  } else {
    positive.push(`Create a crisp 1920x1080 Questing Academy realm key art scene for ${name}.`);
    positive.push(`Realm name: ${name}; prefix/type: ${prefix} ${type}; biome: ${biome}; tone: ${tone}; fantasy level: ${fantasyLevel}.`);
    positive.push(`Realm description: ${description}.`);
    positive.push(`Visual reference style: scenic cozy realm key art.`);
    layout.push(`Wide scenic world identity image for map cards and navigation.`);
    if (buildings) layout.push(`Landmark inspiration: ${buildings}.`);
    style.push(`Beautiful cozy fantasy realm overview, warm safe mood, pastel color, readable silhouettes, crisp high-resolution game art.`);
    negative.push(`No text, labels, UI, logos, watermark, characters, battle scene, object sheet, photorealism, horror, weapons, dark scary mood.`);
  }

  return [
    "POSITIVE PROMPT:",
    ...positive.map((line) => `- ${line}`),
    "",
    "LAYOUT REQUIREMENTS:",
    ...layout.map((line) => `- ${line}`),
    "",
    "STYLE REQUIREMENTS:",
    ...style.map((line) => `- ${line}`),
    "",
    "STRICT NEGATIVE PROMPT:",
    ...negative.map((line) => `- ${line}`),
  ].join("\n");
};

const RealmsTab: React.FC = () => {
  const items = useStudio((s) => s.realms);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioRealm> & Record<string, any>>({ subjects: ["math"], grades: ["K","1","2"], buildings: ["town-hub","hatchery"], realmPrefix: "Meadowfall", realmType: "meadow", outputMode: "Playable RPG Screen", visualReferenceStyle: "cozy browser RPG", fantasyLevel: "magical", screenFormat: "outdoor route", cameraDistance: "close", boundaryStyle: "trees", buildingMode: "none", buildingCount: "0", mapScale: "single-screen chunk", mapCamera: "fixed 2D browser RPG screen", gridCell: "B2", zonePurpose: "forest transition path", entryExits: "north, east", zoneContents: "wide walkable path, open grass center, trees and flowers only around the edges, one NPC spot, one pet spawn patch", inMapNotes: "Top-down walking terrain with clear paths, open plaza space, NPC interaction zones, pet spawn areas, and readable landmarks." });
  const [generatedPreview, setGeneratedPreview] = useState<RealmGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<RealmGeneratedPreview | null>(null);
  const update = <K extends keyof StudioRealm>(k: K, v: StudioRealm[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const randomize = () => {
    const prefix = pickRealm(REALM_PREFIXES);
    const realmType = pickRealm(REALM_TYPES);
    const buildingCount = pickRealm(REALM_BUILDING_COUNTS);
    const exits = Array.from(new Set(Array.from({ length: 4 }, () => pickRealm(REALM_EXIT_OPTIONS)))).join(", ");
    setGeneratedPreview(null);
    setSavedPreview(null);
    setDraft((d) => ({
      ...d,
      realmPrefix: prefix,
      realmType,
      buildingCount,
      outputMode: "Playable RPG Screen",
      screenFormat: pickRealm(REALM_SCREEN_FORMATS),
      cameraDistance: "close",
      boundaryStyle: pickRealm(REALM_BOUNDARY_STYLES),
      buildingMode: "none",
      gridCell: `${pickRealm(["A","B","C","D"])}${pickRealm(["1","2","3","4"])}`,
      zonePurpose: pickRealm(["forest transition path", "sunny grass route", "river edge path", "flower clearing", "rocky trail bend", "beach route", "cave mouth route", "woodland path intersection"]),
      mapScale: pickRealm(REALM_MAP_SCALES),
      mapCamera: "fixed 2D browser RPG screen",
      entryExits: exits,
      zoneContents: "one player-scale screen with large walkable ground, edge boundaries, readable exits, room for NPCs and pets",
      name: makeRealmName(prefix, realmType),
      biome: `${realmType} ${randomBiome()}`,
      tone: SCENE_MOODS[Math.floor(Math.random() * SCENE_MOODS.length)],
      description: `A cozy ${realmType} realm for ${["K-2","2-5","3-7"][Math.floor(Math.random()*3)]} learners.`,
      buildings: ["town-hub","hatchery","learning-academy","shop","quest-board","guild-hall","companion-habitat","boss-gate"].slice(0, Math.min(parseCount(buildingCount), 8)) as RealmBuilding[],
      mapNotes: "One playable screen with clear exits and edge boundaries.",
      inMapNotes: "Playable route screen with wide walking paths, natural boundaries, room for NPCs/pets, and no UI labels.",
    }));
  };

  const generateImagePreview = async () => {
    const prompt = buildRealmImagePrompt(draft);
    setSavedPreview(null);
    try {
      const preview = await generateStudioImagePreview({
        prompt,
        contentType: "studio-art",
      });
      setGeneratedPreview(preview);
    } catch (err) {
      console.error(err);
      setGeneratedPreview(null);
      alert(err instanceof Error ? err.message : "Image generation failed.");
    }
  };

  const saveGeneratedPreview = async () => {
    if (!generatedPreview) return;
    try {
      const durablePreview = await makeDurableImagePreview(generatedPreview);
      setSavedPreview(durablePreview);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not save generated image to local storage.");
    }
  };

  const discardGeneratedPreview = () => {
    setGeneratedPreview(null);
    setSavedPreview(null);
  };

  const submit = () => {
    const m = mockRealmConcept(draft.description);
    const item = {
  ...m,
  name: draft.name?.trim() || m.name,
  biome: draft.biome ?? m.biome,
  tone: draft.tone,
  description: draft.description ?? m.description,
  buildings: draft.buildings ?? [],
  mapNotes: draft.mapNotes,
  battleBackgroundSet: draft.battleBackgroundSet,
  stylePresetId: draft.stylePresetId,
  realmPrefix: (draft as any).realmPrefix,
  realmType: (draft as any).realmType,
  buildingCount: (draft as any).buildingCount,
  outputMode: (draft as any).outputMode,
  screenFormat: (draft as any).screenFormat,
  cameraDistance: (draft as any).cameraDistance,
  boundaryStyle: (draft as any).boundaryStyle,
  buildingMode: (draft as any).buildingMode,
  entryExits: (draft as any).entryExits,
  gridCell: (draft as any).gridCell,
  mapScale: (draft as any).mapScale,
  mapCamera: (draft as any).mapCamera,
  zonePurpose: (draft as any).zonePurpose,
  zoneContents: (draft as any).zoneContents,
  inMapNotes: (draft as any).inMapNotes,
  visualReferenceStyle: (draft as any).visualReferenceStyle,
  fantasyLevel: (draft as any).fantasyLevel,
  grades: draft.grades ?? m.grades,
  subjects: draft.subjects ?? m.subjects,
  previewUrl: savedPreview?.url,
  promptUsed: savedPreview?.prompt,
  imageProvider: savedPreview?.provider,
} as StudioRealm;
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
            <Field label="Realm prefix"><SelectField testid="realms-input-prefix" value={draft.realmPrefix ?? ""} options={REALM_PREFIXES} onChange={(v) => setDraft((d) => ({ ...d, realmPrefix: v, name: makeRealmName(v, d.realmType) }))} placeholder="—" /></Field>
            <Field label="Realm type"><SelectField testid="realms-input-type" value={draft.realmType ?? ""} options={REALM_TYPES} onChange={(v) => setDraft((d) => ({ ...d, realmType: v, name: makeRealmName(d.realmPrefix, v), biome: d.biome || `${v} fantasy biome` }))} placeholder="—" /></Field>
            <Field label="Output type"><SelectField testid="realms-input-output-mode" value={draft.outputMode ?? "Playable RPG Screen"} options={REALM_OUTPUT_MODES} onChange={(v) => setDraft((d) => ({ ...d, outputMode: v }))} /></Field>
            <Field label="Visual reference style"><SelectField testid="realms-input-visual-reference" value={draft.visualReferenceStyle ?? "cozy browser RPG"} options={REALM_VISUAL_REFERENCE_STYLES} onChange={(v) => setDraft((d) => ({ ...d, visualReferenceStyle: v }))} /></Field>
            <Field label="Screen format"><SelectField testid="realms-input-screen-format" value={draft.screenFormat ?? "outdoor route"} options={REALM_SCREEN_FORMATS} onChange={(v) => setDraft((d) => ({ ...d, screenFormat: v }))} /></Field>
            <Field label="Camera distance"><SelectField testid="realms-input-camera-distance" value={draft.cameraDistance ?? "close"} options={REALM_CAMERA_DISTANCES} onChange={(v) => setDraft((d) => ({ ...d, cameraDistance: v }))} /></Field>
            <Field label="Boundary style"><SelectField testid="realms-input-boundary-style" value={draft.boundaryStyle ?? "trees"} options={REALM_BOUNDARY_STYLES} onChange={(v) => setDraft((d) => ({ ...d, boundaryStyle: v }))} /></Field>
            <Field label="Building mode"><SelectField testid="realms-input-building-mode" value={draft.buildingMode ?? "none"} options={REALM_BUILDING_MODES} onChange={(v) => setDraft((d) => ({ ...d, buildingMode: v }))} /></Field>
            <Field label="Realm name"><TextField testid="realms-input-name" value={draft.name ?? ""} onChange={(v) => update("name", v)} placeholder="e.g. Frostpine Hollow" onRandomize={() => setDraft((d) => ({ ...d, name: makeRealmName(d.realmPrefix, d.realmType) }))} /></Field>
            <Field label="Biome"><TextField testid="realms-input-biome" value={draft.biome ?? ""} onChange={(v) => update("biome", v)} placeholder="snowy pine forest" onRandomize={() => update("biome", `${draft.realmType || "cozy"} ${randomBiome()}`)} /></Field>
            <Field label="Number of buildings"><SelectField testid="realms-input-building-count" value={draft.buildingCount ?? ""} options={REALM_BUILDING_COUNTS} onChange={(v) => setDraft((d) => ({ ...d, buildingCount: v, buildings: ["town-hub","hatchery","learning-academy","shop","quest-board","guild-hall","companion-habitat","boss-gate"].slice(0, Math.min(parseCount(v), 8)) as RealmBuilding[] }))} placeholder="—" /></Field>
            <Field label="Tone"><SelectField testid="realms-input-tone" value={draft.tone ?? ""} options={SCENE_MOODS} onChange={(v) => update("tone", v as SceneMood)} placeholder="—" /></Field>
            <Field label="Fantasy level"><SelectField testid="realms-input-fantasy-level" value={draft.fantasyLevel ?? "magical"} options={REALM_FANTASY_LEVELS} onChange={(v) => setDraft((d) => ({ ...d, fantasyLevel: v }))} /></Field>
            <Field label="Style preset"><StylePresetPicker testid="realms-style-preset" value={draft.stylePresetId} onChange={(id) => update("stylePresetId", id)} /></Field>
            <Field label="Buildings / hubs" full>
              <MultiSelectChips
                testid="realms-buildings"
                values={draft.buildings ?? []}
                onChange={(v) => update("buildings", v as RealmBuilding[])}
                options={REALM_BUILDINGS.map((b) => ({ id: b, label: b.replace(/-/g, " ") }))}
              />
            </Field>
            <Field label="Map scale"><SelectField testid="realms-input-map-scale" value={draft.mapScale ?? "single-screen chunk"} options={REALM_MAP_SCALES} onChange={(v) => setDraft((d) => ({ ...d, mapScale: v }))} /></Field>
            <Field label="Map camera"><SelectField testid="realms-input-map-camera" value={draft.mapCamera ?? "orthographic 3/4 game screen"} options={REALM_CAMERA_OPTIONS} onChange={(v) => setDraft((d) => ({ ...d, mapCamera: v }))} /></Field>
            <Field label="Grid cell"><TextField testid="realms-input-grid-cell" value={draft.gridCell ?? ""} onChange={(v) => setDraft((d) => ({ ...d, gridCell: v }))} placeholder="B2" /></Field>
            <Field label="Zone purpose"><TextField testid="realms-input-zone-purpose" value={draft.zonePurpose ?? ""} onChange={(v) => setDraft((d) => ({ ...d, zonePurpose: v }))} placeholder="academy courtyard / shop lane / cave entrance" /></Field>
            <Field label="Entry / exits" full><TextField testid="realms-input-entry-exits" value={draft.entryExits ?? ""} onChange={(v) => setDraft((d) => ({ ...d, entryExits: v }))} placeholder="north, east, south-west path" /></Field>
            <Field label="Zone contents / placement" full><TextArea testid="realms-input-zone-contents" value={draft.zoneContents ?? ""} onChange={(v) => setDraft((d) => ({ ...d, zoneContents: v }))} placeholder="two buildings on B2, clear path between them, one NPC spot near fountain" /></Field>
            <Field label="Map notes" full><TextArea testid="realms-input-map" value={draft.mapNotes ?? ""} onChange={(v) => update("mapNotes", v)} placeholder="Layout, key landmarks" /></Field>
            <Field label="In-map walking terrain" full><TextArea testid="realms-input-in-map" value={draft.inMapNotes ?? ""} onChange={(v) => setDraft((d) => ({ ...d, inMapNotes: v }))} placeholder="Top-down playable terrain, clear paths, NPC/pet zones, interactable landmarks." /></Field>
            <Field label="Description" full><TextArea testid="realms-input-description" value={draft.description ?? ""} onChange={(v) => update("description", v)} placeholder="What kids feel when they arrive." /></Field>
          </div>

          <ImagePreviewWorkflow
            testid="realms-image-generator"
            title={`Generated realm ${draft.outputMode === "Realm Key Art" ? "key art" : draft.outputMode === "Playable RPG Screen" ? "playable RPG screen" : "walking map"} preview`}
            helper={draft.outputMode === "Realm Key Art" ? "Generate scenic realm key art for navigation/world identity, then save or discard before sending it to review." : draft.outputMode === "Playable RPG Screen" ? "Generate one player-scale RPG screen, then save, export, or discard before sending it to review." : draft.outputMode === "Map Chunk / Room" ? "Generate one playable grid chunk/room, then save, export, or discard before sending it to review." : "Generate broader playable walking terrain, then save or discard before sending it to review."}
            generatedPreview={generatedPreview}
            savedPreview={savedPreview}
            onGenerate={generateImagePreview}
            onSave={saveGeneratedPreview}
            onDiscard={discardGeneratedPreview}
            disabled={false}
            imageClassName="aspect-video"
            exportFilename={`realm-${draft.name || makeRealmName(draft.realmPrefix, draft.realmType)}-${draft.outputMode || "map"}-${draft.gridCell || "chunk"}`}
          />

          <button type="button" data-testid="realms-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioRealm) => (
        <div>
          {i.previewUrl && (
            <img src={getImageUrl(i)} alt={`${i.name} realm concept`} className="w-full h-36 object-contain rounded-xl border-2 border-white mb-2 bg-bg" />
          )}
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.biome} {i.tone && `· ${i.tone}`}</p>
          <p className="text-[10px] font-extrabold text-primary mt-1">{((i as any).outputMode || "Map Chunk / Room")}{(i as any).gridCell ? ` · ${(i as any).gridCell}` : ""}{(i as any).zonePurpose ? ` · ${(i as any).zonePurpose}` : ""}</p>
          {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {i.imageProvider ?? "prototype"}</p>}
          <p className="text-xs text-ink-muted mt-1 line-clamp-2">{i.description}</p>
          {i.buildings && i.buildings.length > 0 && (
            <p className="text-[10px] font-extrabold text-primary mt-2">Hubs: {i.buildings.map((b) => b.replace(/-/g," ")).join(" · ")}</p>
          )}
          {i.mapNotes && <p className="text-[10px] font-bold text-ink-muted">{i.mapNotes}</p>}
          <StudioViewEditButton collection="realms" item={i} title={i.name} imageUrl={getImageUrl(i)} />
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

  const generateImagePreview = async () => {
    const prompt = buildBattleBgImagePrompt(draft, selectedRealm);
    setSavedPreview(null);
    try {
      const preview = await generateStudioImagePreview({
        prompt,
        contentType: "studio-art",
      });
      setGeneratedPreview(preview);
    } catch (err) {
      console.error(err);
      setGeneratedPreview(null);
      alert(err instanceof Error ? err.message : "Image generation failed.");
    }
  };

  const saveGeneratedPreview = async () => {
    if (!generatedPreview) return;
    try {
      const durablePreview = await makeDurableImagePreview(generatedPreview);
      setSavedPreview(durablePreview);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not save generated image to local storage.");
    }
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
            exportFilename={`battle-bg-${selectedRealm?.name || draft.realm || "realm"}-${draft.environment || "background"}`}
          />

          <button type="button" data-testid="battleBgs-generate-btn" onClick={submit} disabled={!draft.realmId} className="btn-primary mt-4 !text-base !py-3 !px-6 disabled:opacity-40">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioBattleBg) => (
        <div>
          {i.previewUrl && (
            <img src={getImageUrl(i)} alt={`${i.realm} battle background`} className="w-full h-32 object-contain rounded-xl border-2 border-white bg-bg" />
          )}
          <p className="h-display text-lg mt-2">{i.realm}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.environment}{i.timeOfDay && ` · ${i.timeOfDay}`}{i.mood && ` · ${i.mood}`}</p>
          {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {i.imageProvider ?? "prototype"}</p>}
          <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.prompt}</p>
          <StudioViewEditButton collection="battleBgs" item={i} title={i.realm} imageUrl={getImageUrl(i)} />
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

  const generateImagePreview = async () => {
    const prompt = buildSceneImagePrompt(draft, selectedRealm, linkedNpcItems);
    setSavedPreview(null);
    try {
      const preview = await generateStudioImagePreview({
        prompt,
        contentType: "studio-art",
      });
      setGeneratedPreview(preview);
    } catch (err) {
      console.error(err);
      setGeneratedPreview(null);
      alert(err instanceof Error ? err.message : "Image generation failed.");
    }
  };

  const saveGeneratedPreview = async () => {
    if (!generatedPreview) return;
    try {
      const durablePreview = await makeDurableImagePreview(generatedPreview);
      setSavedPreview(durablePreview);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not save generated image to local storage.");
    }
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
      renderItem={(i: StudioScene) => {
        const hasSceneComposerComposition = (i as any)?.manualComposition?.createdFrom === "scene-composer" && !!(i as any)?.manualComposition?.layers?.length;
        return (
        <div>
          {hasSceneComposerComposition ? (
            <SceneComposerLayeredPreview item={i} alt={`${i.name} scene composition`} className="w-full h-36 !aspect-auto mb-2" />
          ) : i.previewUrl ? (
            <img src={getImageUrl(i)} alt={`${i.name} scene concept`} className="w-full h-36 object-contain rounded-xl border-2 border-white mb-2 bg-bg" />
          ) : null}
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.purpose.replace(/-/g," ")} · {i.realm}</p>
          {i.previewUrl && <p className="text-[10px] font-extrabold text-sage mt-1">Generated image attached · {i.imageProvider ?? "prototype"}</p>}
          <p className="text-xs text-ink-muted line-clamp-2 mt-1">{i.visualPrompt}</p>
          {!!i.npcs.length && <p className="text-[10px] font-extrabold text-primary mt-1">NPCs: {i.npcs.join(", ")}</p>}
          <StudioViewEditButton collection="scenes" item={i} title={i.name} imageUrl={getImageUrl(i)} />
        </div>
        );
      }}
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

const NPC_SPECIES_TYPES = ["human", "animalfolk", "magical creature", "object mascot", "robot", "spirit"];
const NPC_AGE_READS = ["child", "teen", "adult", "elder", "ageless"];
const NPC_SILHOUETTES = ["round", "tall", "tiny", "stout", "elegant", "cozy"];
const NPC_OUTFIT_STYLES = ["academy robe", "shopkeeper apron", "ranger cloak", "librarian cardigan", "caretaker overalls", "wizard coat", "storybook dress", "cozy sweater"];
const NPC_POSE_STYLES = ["friendly wave", "hands clasped", "holding book", "shopkeeper welcome", "teacher point", "calm standing pose"];
const NPC_BACKGROUND_MODES = ["transparent-ready", "plain removable background", "simple light background", "realm-inspired portrait"];

const buildNPCImagePrompt = (draft: Partial<StudioNPC> & Record<string, any>, realm?: StudioRealm): string => {
  const name = draft.name?.trim() || "unnamed academy mentor";
  const role = draft.customRole?.trim() || draft.role || "teacher";
  const species = draft.speciesType || "human";
  const ageRead = draft.ageRead || "adult";
  const silhouette = draft.silhouette || "cozy";
  const outfitStyle = draft.outfitStyle || "academy robe";
  const poseStyle = draft.poseStyle || "friendly wave";
  const primaryColor = draft.primaryColor || "#9D8DF1";
  const accentColor = draft.accentColor || "#F4C753";
  const realmName = realm?.name || draft.realm || "Questing Academy";
  const realmFlavor = realm ? `${realm.name}, ${realm.biome}${realm.tone ? `, ${realm.tone}` : ""}` : realmName;
  const tone = draft.tone || "cheerful";
  const temperament = draft.temperament || "patient";
  const teachingStyle = draft.teachingStyle || "encouraging";
  const visualNotes = (draft.visualNotes || "friendly, readable, warm, safe, helpful").trim();
  const backgroundMode = draft.backgroundMode || "transparent-ready";

  return [
    "Create one single game-ready Questing Academy NPC character asset.",
    `NPC: ${name}.`,
    `Role: ${role}.`,
    `Species/body type: ${species}. Age read: ${ageRead}. Silhouette: ${silhouette}.`,
    `Outfit: ${outfitStyle}. Pose: ${poseStyle}.`,
    draft.hairColor || draft.hairStyle ? `Hair identity: ${draft.hairStyle || "saved hairstyle"}, ${draft.hairColor || "saved hair color"}.` : "",
    draft.eyeColor ? `Eye identity: ${draft.eyeColor}.` : "",
    draft.outfitColors || draft.outfitDetails ? `Outfit identity: colors ${draft.outfitColors || `${primaryColor} and ${accentColor}`}; details ${draft.outfitDetails || "match saved outfit details"}.` : "",
    draft.accessories ? `Accessories: ${draft.accessories}.` : "",
    draft.speciesDetails ? `Species/body details: ${draft.speciesDetails}.` : "",
    draft.mustPreserve ? `Must preserve identity details: ${draft.mustPreserve}.` : "",
    `Personality: ${tone}, ${temperament}, ${teachingStyle}.`,
    `Realm flavor: ${realmFlavor}.`,
    `Color palette: ${primaryColor} with ${accentColor} accents.`,
    `Visual notes: ${visualNotes}.`,
    "Show exactly one NPC only, centered, full body or clean three-quarter body, readable at game size.",
    "Style: cute chibi educational fantasy RPG, soft pastel storybook game art, rounded shapes, friendly expression, child-safe, polished character asset.",
    backgroundMode === "realm-inspired portrait"
      ? "Background: very simple light portrait background with tiny subtle realm color hints, no scene clutter."
      : "Background: flat pure white removable background for transparent PNG export.",
    "Negative: no text, no labels, no watermark, no logo, no UI, no character sheet, no concept sheet, no side sketches, no alternate poses, no duplicate characters, no extra characters, no weapons, no combat pose, no villain, no horror, no photorealism."
  ].filter(Boolean).join("\n");
};

const NpcsTab: React.FC = () => {
  const items = useStudio((s) => s.npcs);
  const realms = useStudio((s) => s.realms);
  const addItem = useStudio((s) => s.addItem);
  const [draft, setDraft] = useState<Partial<StudioNPC> & Record<string, any>>({
    role: "teacher", tone: "cheerful", temperament: "patient", teachingStyle: "encouraging",
    humorLevel: "light", formality: "casual", encouragementStyle: "praise",
    speciesType: "human", ageRead: "adult", silhouette: "cozy", outfitStyle: "academy robe", poseStyle: "friendly wave",
    primaryColor: "#9D8DF1", accentColor: "#F4C753", backgroundMode: "transparent-ready", transparentIntent: true,
  });
  const [generatedPreview, setGeneratedPreview] = useState<NPCGeneratedPreview | null>(null);
  const [savedPreview, setSavedPreview] = useState<NPCGeneratedPreview | null>(null);
  const update = <K extends keyof StudioNPC>(k: K, v: StudioNPC[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const selectedRealm = realms.find((r) => r.id === draft.realmId);

  const generateImagePreview = async () => {
    const prompt = buildNPCImagePrompt(draft, selectedRealm);
    setSavedPreview(null);
    try {
      const preview = await generateStudioImagePreview({
        prompt,
        contentType: "studio-art",
      });
      setGeneratedPreview(preview);
    } catch (err) {
      console.error(err);
      setGeneratedPreview(null);
      alert(err instanceof Error ? err.message : "Image generation failed.");
    }
  };

  const saveGeneratedPreview = async () => {
    if (!generatedPreview) return;
    try {
      const durablePreview = await makeDurableImagePreview(generatedPreview);
      setSavedPreview(durablePreview);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Could not save generated image to local storage.");
    }
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
      speciesType: (draft as any).speciesType,
      ageRead: (draft as any).ageRead,
      silhouette: (draft as any).silhouette,
      outfitStyle: (draft as any).outfitStyle,
      poseStyle: (draft as any).poseStyle,
      primaryColor: (draft as any).primaryColor,
      accentColor: (draft as any).accentColor,
      backgroundMode: (draft as any).backgroundMode,
      transparentIntent: (draft as any).transparentIntent,
      visualNotes: (draft as any).visualNotes,
    } as StudioNPC;
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
            <Field label="Species/body type"><SelectField testid="npcs-input-species" value={(draft as any).speciesType ?? "human"} options={NPC_SPECIES_TYPES} onChange={(v) => setDraft((d) => ({ ...d, speciesType: v }))} /></Field>
            <Field label="Age read"><SelectField testid="npcs-input-age-read" value={(draft as any).ageRead ?? "adult"} options={NPC_AGE_READS} onChange={(v) => setDraft((d) => ({ ...d, ageRead: v }))} /></Field>
            <Field label="Silhouette"><SelectField testid="npcs-input-silhouette" value={(draft as any).silhouette ?? "cozy"} options={NPC_SILHOUETTES} onChange={(v) => setDraft((d) => ({ ...d, silhouette: v }))} /></Field>
            <Field label="Outfit style"><SelectField testid="npcs-input-outfit-style" value={(draft as any).outfitStyle ?? "academy robe"} options={NPC_OUTFIT_STYLES} onChange={(v) => setDraft((d) => ({ ...d, outfitStyle: v }))} /></Field>
            <Field label="Pose"><SelectField testid="npcs-input-pose" value={(draft as any).poseStyle ?? "friendly wave"} options={NPC_POSE_STYLES} onChange={(v) => setDraft((d) => ({ ...d, poseStyle: v }))} /></Field>
            <Field label="Primary color"><ColorField testid="npcs-input-primary-color" value={(draft as any).primaryColor ?? "#9D8DF1"} onChange={(v) => setDraft((d) => ({ ...d, primaryColor: v }))} /></Field>
            <Field label="Accent color"><ColorField testid="npcs-input-accent-color" value={(draft as any).accentColor ?? "#F4C753"} onChange={(v) => setDraft((d) => ({ ...d, accentColor: v }))} /></Field>
            <Field label="Background mode"><SelectField testid="npcs-input-background-mode" value={(draft as any).backgroundMode ?? "transparent-ready"} options={NPC_BACKGROUND_MODES} onChange={(v) => setDraft((d) => ({ ...d, backgroundMode: v }))} /></Field>
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
            <Field label="Visual notes" full><TextArea testid="npcs-input-visual-notes" value={(draft as any).visualNotes ?? ""} onChange={(v) => setDraft((d) => ({ ...d, visualNotes: v }))} placeholder="Short visual DNA: cozy foxfolk librarian, round glasses, purple robe" /></Field>
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
            exportFilename={`npc-${draft.name || "academy-npc"}-${(draft as any).role || "role"}`}
          />

          <button type="button" data-testid="npcs-generate-btn" onClick={submit} className="btn-primary mt-4 !text-base !py-3 !px-6">
            <Wand2 size={16} strokeWidth={3} /> Send to review
          </button>
        </div>
      }
      renderItem={(i: StudioNPC) => (
        <div>
          {i.previewUrl && (
            <img src={getImageUrl(i)} alt={`${i.name} NPC portrait`} className="w-full h-40 object-contain rounded-xl border-2 border-white mb-2 bg-bg" />
          )}
          <p className="h-display text-lg">{i.name}</p>
          <p className="text-[10px] font-extrabold uppercase text-ink-muted">{i.role}{i.customRole && ` · ${i.customRole}`} · {i.realm}</p>
          {(i as any).speciesType && <p className="text-[10px] font-bold text-primary mt-1">{(i as any).speciesType} · {(i as any).ageRead} · {(i as any).silhouette} · {(i as any).outfitStyle}</p>}
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
          <StudioViewEditButton collection="npcs" item={i} title={i.name} imageUrl={getImageUrl(i)} />
          <button type="button" onClick={() => useStudio.getState().setStatus("npcs", i.id, "archived")} className="btn-ghost !text-xs !py-1.5 !px-3 mt-2 w-full">Archive card</button>
          <button type="button" onClick={() => useStudio.getState().removeItem("npcs", i.id)} className="btn-ghost !text-xs !py-1.5 !px-3 mt-2 w-full text-danger"><Trash2 size={12} strokeWidth={3} /> Delete card</button>
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
