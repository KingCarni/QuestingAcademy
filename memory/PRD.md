# Questing Academy — Frontend MVP PRD

## Concept
Cute chibi-style educational RPG for Grades K-7. Avatar creation, companion collection, math + reading battles, egg hatching, Learning Academy training, parent progress dashboard, and a full internal **TeachMe Content Studio** for staff-approval workflows.

## Stack & Constraints
- React + TypeScript SPA (CRA), Tailwind, zustand+persist (localStorage)
- Theme: lavender / sage / gold / cream "magical academy"
- No real auth, backend, payments, or child-data handling (prototype only)
- Parent PIN `1234`, Admin/Studio PIN `2580`

## Architecture
- `/app/frontend/src/lib/types.ts` — Player, Companion, Question, TrickyEntry, GameSettings
- `/app/frontend/src/lib/mockData.ts` — companions, enemies, academy subjects, eggs, avatar options
- `/app/frontend/src/lib/questionEngine.ts` — 16 procedural templates (math + reading, K-7) + difficulty scaling + **approval gate**
- `/app/frontend/src/lib/gameStore.ts` — gameplay state with spaced-repetition (tricky pool) + admin helpers
- `/app/frontend/src/lib/studioTypes.ts` — Status enum + 13 collection types
- `/app/frontend/src/lib/studioStore.ts` — Studio state with seed data + CRUD + publish queue
- `/app/frontend/src/lib/mockGen.ts` — generators including `mockNanoBananaGenerateImage` (TODO marker for real backend)
- `/app/frontend/src/lib/speech.ts` — strict en-US narrator voice selection
- `/app/frontend/src/lib/sfx.ts` — Web Audio SFX
- Components: TopBar (sound toggle), Card, ProgressBar, ChibiAvatar, CompanionAvatar (illustration url + reveal), SpeechButton, ConfettiBurst, RequirePlayer, **studio/StatusChip, studio/StudioPanel, studio/GeneratorPanel**
- Pages: Landing, Onboarding, CharacterCreator, StarterPicker, Hub, Battle, EggHatch, Collection, Academy, Parent, AdminDashboard, **ContentStudio**

## Routes
- `/` Landing
- `/onboarding`, `/character`, `/starter`, `/hub`, `/battle`, `/egg`, `/collection`, `/academy` (gated)
- `/parent` (PIN 1234)
- `/admin` (PIN 2580) — operational tools
- `/admin/studio` and `/admin/approvals` — TeachMe Content Studio (PIN 2580)

## Versions
### v0.1 — MVP (10 screens, math K-2)
### v0.2 — Senses Pack + K-7 (speech, confetti, hatch reveal, expanded grades + subjects)
### v0.3 — Pack C + Admin (procedural engine, spaced repetition, reading, Admin Dashboard)
### v0.4 — TeachMe Content Studio (current)
- 🛠️ **Content Studio** at `/admin/studio` (alias `/admin/approvals`) with 13 tabs
- 📝 **Statuses**: draft / generated / pending / approved / published / rejected / archived
- 🚀 **Approval gate** — battles now consume `studioStore.isTemplatePlayerReady`; only approved/published templates appear. If everything is rejected, engine falls back to a safe `1 + 1 = ?` question (no crash).
- 🎨 **Mock Nano Banana** — `mockNanoBananaGenerateImage(prompt)` returns a styled inline SVG data URL. `TODO(api):` marker for real Gemini/Nano Banana backend call.
- 🤖 **Generators** (all output → Pending Review, never live): companions, realms, quests, battle backgrounds, companion art
- 📤 **Publish Queue** — global queue of approved items; bulk Publish / Archive
- 🔊 **Narrator voice fix** — strict en-US voice selection, blocks UK/AU/IN/Irish/Scottish voices, sets `utterance.lang="en-US"`, rate 0.92, pitch 1.05

## Testing
- iteration_1: MVP — 100%
- iteration_2: Senses Pack + K-7 — 100%
- iteration_3: Pack C + Admin — 95% (tricky-chip visibility fix applied)
- iteration_4: Content Studio — 93% (1 HIGH fixed: Studio links now visible on /admin even with no player)

## Backlog (P0 / P1 / P2)
- P1: Persistent Studio session token (single re-login per browser session)
- P1: Real backend + Emergent Google Auth + multi-device sync
- P1: Real Gemini/Nano Banana wired to mock generator
- P1: AI Companion Art Pipeline → populate Companion.illustrationUrl
- P1: Daily Quest streak card on Hub
- P2: Studio tab extraction (one file per collection) when more features land
- P2: Realm map for published realms beyond Meadowfall Grove
- P2: Multiple child profiles per device
- P2: Per-template difficulty curve config in Studio
- P2: Weekly parent email digest mock + Resend integration

## Out of Scope
Real auth, real backend, payments, real child data, PvP, guilds, teacher platform, marketplace.
