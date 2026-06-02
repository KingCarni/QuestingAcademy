# Questing Academy — Frontend MVP PRD (v0.8)

## Concept
Cute chibi-style educational RPG for Grades K-7. Avatar creation, companion collection, math + reading battles, egg hatching, Learning Academy training, parent progress dashboard, a full internal **TeachMe Content Studio**, and a Prodigy-style **RPG Adventure shell** that wraps the game in a magical map / town / quest world.

## Stack & Constraints
- React + TypeScript SPA (CRA), Tailwind, zustand+persist (localStorage)
- No real auth/backend/payments/child-data/API keys
- Parent PIN `1234`, Admin/Studio PIN `2580`

## Routes
- Player core: `/`, `/onboarding`, `/character`, `/starter`, `/battle`, `/egg`, `/collection`, `/academy`
- **RPG Adventure shell (v0.6)**: `/adventure`, `/adventure/realms`, `/adventure/town/:realmId`, `/adventure/companions`, `/adventure/quests`
- Legacy: `/hub` now redirects to `/adventure`
- Parent: `/parent`
- Staff: `/admin`, `/admin/studio`, `/admin/approvals`

## Versions
- v0.1 MVP · v0.2 Senses Pack + K-7 · v0.3 Pack C + Admin · v0.4 Content Studio · v0.5 TEA-74 Studio Refinement · v0.6 RPG Foundation · v0.7 World Comes Alive · **v0.8 TEA-99 Scene Composer**

### v0.8 — TEA-99 Scene Composer (current, 2026-06-02)
- 🖼️ New **Scene Composer** tab inside Content Studio (between Scenes and NPCs)
- Asset picker reuses existing Asset Library (`useStudio.assets`); layers reference assets by id only (no duplication, no base64)
- 720×480 canvas, click an asset → adds draggable layer, pointer-event drag clamped to bounds, selection ring
- Scale slider 0.3×–2.5× + ± buttons + live readout · remove layer · clear canvas · click background to deselect
- Component-local state only — no persistence, no export, no z-order/opacity/grouping/markers/walkable zones
- Self-contained inside `frontend/src/pages/ContentStudio.tsx`

### v0.7 — World Comes Alive (2026-05-31)
- 🚶 Walking hero (cozy stroll ~900ms) on Realm Map + Town with point-and-click navigation
- 💬 NpcDialogue overlay (`components/adventure/NpcDialogue.tsx`) triggered by 💬 Talk sub-icons on town pins with matching NPC role; TTS Speak button
- 📜 Quest engine v2 (`gameStore.questRun` + `startQuest`/`abandonQuest`/`tickQuestOnCorrect`); Battle banner with live progress, confetti+toast on completion, Daily Mission card on Adventure Hub
- 🎨 Realm-specific battle backgrounds from `studioStore.battleBgs` keyed by `activeRealmId`; TopBar reflects realm name

### v0.6 — RPG Foundation (2026-05-31)
- AdventureLayout (painted bg + bottom dock), /adventure hub, painted top-down realm map with floating islands, town hub with hover tooltips, companions panel, quest preview, /hub → /adventure redirect

### v0.5 — TEA-74
- Studio refinement: grouped Questions, color/palette pickers, randomizers, reusable style presets, full editable stats

## Architecture additions (v0.6)
- `components/adventure/AdventureLayout.tsx` — chrome + dock
- `pages/adventure/AdventureHub.tsx | RealmMap.tsx | TownHub.tsx | CompanionsPanel.tsx | QuestsPreview.tsx`
- Reads from `useStudio.realms` (filter `published`/`approved`) and `useStudio.quests`
- `gameStore` consumed for active companion, owned roster, and player chibi avatar

## Testing (v0.7)
- Iteration 6: **20/21 frontend assertions passed** (the 1 "fail" was a Playwright timing artifact with AnimatePresence exit animation, not a product defect — dialogue closes correctly per screenshot + handler review)
- Code review checked: tickQuestOnCorrect XP/level math, realm-bg memoization, NPC role filtering, AnimatePresence node lifetime, parseTarget/parseRewards regexes

## Backlog
- **P1** Realm-specific *enemy sets* (currently only the bg swaps — enemies should also match the biome)
- **P1** Quest v2 — branching/multi-step quests (today: single counter)
- **P1** NPC dialogues with multi-line, branching choices (today: single line)
- **P1** Real backend + Emergent Google Auth + multi-device sync
- **P1** Real Gemini Nano Banana wired for companion + battle bg art
- **P2** Per-collection tab file extraction (ContentStudio.tsx ~1300 lines)
- **P2** Persistent Studio PIN session
- **P2** Live diff preview before publishing
- **P2** Expose `window.__gameStore` in dev builds for deterministic E2E quest-completion tests
h me" swaps active companion
- 📜 **/adventure/quests (QuestsPreview)** — quest cards sourced from `studioStore.quests` (approved/published only)
- 🔁 **Landing pivot** — onboarding now lands at `/adventure` after starter pick; all TopBar Back buttons and Admin/Parent "Open game" links redirected accordingly

### v0.5 — TEA-74 (previous)
- Studio refinement: grouped Questions, color/palette pickers, randomizers, reusable style presets, full editable stats, etc. (See v0.5 history above.)

## Architecture additions (v0.6)
- `components/adventure/AdventureLayout.tsx` — chrome + dock
- `pages/adventure/AdventureHub.tsx | RealmMap.tsx | TownHub.tsx | CompanionsPanel.tsx | QuestsPreview.tsx`
- Reads from `useStudio.realms` (filter `published`/`approved`) and `useStudio.quests`
- `gameStore` consumed for active companion, owned roster, and player chibi avatar

## Testing (v0.6)
- Iteration 5: **49/49 frontend assertions passed** (desktop 1440x900 + mobile 390x844)
- All new data-testids verified: `adventure-dock`, `adv-start-btn`, `adv-active-companion`, `adv-quick-*`, `realm-world-canvas`, `realm-node-realm-1`, `realm-locked-realm-2`, `realm-legend-*`, `town-pin-grid`, `town-tile-*`, `companions-active`, `companions-card-*`, `companions-pick-*`, `companions-go-battle`, `quest-card-q-1`, `quest-start-q-1`, `dock-*`
- Legacy `/hub` → `/adventure` redirect verified
- Bad realmId redirects to `/adventure/realms`
- Minor mobile clipping on realm-1 chip fixed post-test (16% inset + responsive truncate)

## Backlog
- **P1** Walking / point-and-click character movement on map & town screens
- **P1** NPC dialogue overlay/system
- **P1** Quest engine v2 wired to battles (multi-step, branching)
- **P1** Real backend + Emergent Google Auth + multi-device sync
- **P1** Real Gemini/Nano Banana wired for companion + battle bg art
- **P2** Realm-specific battle background swap based on selected realm
- **P2** Per-collection tab file extraction (ContentStudio.tsx ~1300 lines)
- **P2** Persistent Studio PIN session
- **P2** Live diff preview before publishing
- **P2** `data-testid="admin-open-game"` and `parent-open-game` rename for cleaner assertions (testing agent suggestion)
before publishing
- **P2** `data-testid="admin-open-game"` and `parent-open-game` rename for cleaner assertions (testing agent suggestion)
