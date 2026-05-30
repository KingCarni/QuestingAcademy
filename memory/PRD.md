# Questing Academy — Frontend MVP PRD

## Original Problem Statement
Build a polished frontend-only MVP prototype for a children's educational RPG called Questing Academy. Cute chibi-style educational RPG (originally K-2 math, **now K-7 learning**). Players create a chibi avatar, collect cute companions, battle enemies by answering questions, hatch eggs by completing learning activities, and train companions in a Learning Academy. Parents can view simple learning progress.

## User Choices (locked-in)
- Stack: React + TypeScript SPA (CRA)
- Theme: Magical academy — lavender / sage / gold / cream
- Art: CSS + SVG + emoji, with optional `illustrationUrl` hook for future AI Companion Art Pipeline
- Persistence: localStorage (zustand persist middleware)
- Parent gate: Fake PIN `1234`
- Scope expanded: K-2 → **K-7**; "Math" → **"Learning"** (room for reading etc. later)

## Architecture
- `/app/frontend/src/lib/types.ts` — Player, Companion (optional `illustrationUrl`), Question, Enemy, Egg, AcademyAssignment, ParentReport, BattleStats
- `/app/frontend/src/lib/mockData.ts` — companions, enemies, K-7 questions, 6 academy subjects, eggs, avatar options
- `/app/frontend/src/lib/gameStore.ts` — zustand+persist store. `awardBattle` returns `{leveledUp, newLevel}`
- `/app/frontend/src/lib/sfx.ts` — Web Audio API sounds (ding, sparkle, levelUp, hatch)
- `/app/frontend/src/lib/speech.ts` — SpeechSynthesis wrapper with math-friendly prep
- `/app/frontend/src/components/` — TopBar, Card, ProgressBar, ChibiAvatar (SVG), CompanionAvatar (img + fallback + `reveal` mode), SpeechButton, ConfettiBurst, RequirePlayer
- `/app/frontend/src/pages/` — Landing, Onboarding (K-7), CharacterCreator, StarterPicker, Hub, Battle, EggHatch, Collection, Academy, Parent
- All API touch points marked with `TODO(backend)` and `TODO(art-pipeline)` comments

## Implemented Versions

### v0.1 — May 30 2026 (MVP)
- 10-screen clickable shell, full happy-path loop verified
- Pure SVG chibi avatar creator (5 hair, 6 outfits, 5 accessories)
- 3 starter companions + 3 collectible
- Battle with grade-matched math, XP/coins/egg rewards
- 2 starter eggs with auto-hatch
- 4-subject Math Academy with companion assignment
- Parent dashboard PIN-gated with KPIs + session strip

### v0.2 — May 30 2026 (Senses Pack + K-7)
- 🔊 **Read-aloud questions** — `SpeechButton` on every battle question (SpeechSynthesis, no autoplay)
- 🎉 **Confetti** on egg hatch and level-up (`react-confetti`)
- 🔔 **Web Audio SFX** — sparkle (correct), ding (wrong), levelUp, hatch
- ✨ **Hatch reveal** — `CompanionAvatar reveal` mode with sparkle ring + stars
- 🖼️ **Illustration URL hook** — Companion type carries optional `illustrationUrl`; falls back to CSS/emoji
- 🎓 **K-7 grades** — onboarding now shows 8 grade cards with grade-appropriate questions
- 🧮 **Expanded subjects** — Multiplication Hall, Fraction Forest (now 6 academy subjects)
- 🏷️ **Rename** — "Math Academy" → "Learning Academy" everywhere

## Testing Status
- iteration_1: 100% pass (MVP)
- iteration_2: 100% pass (Senses Pack + K-7), zero console errors across full flow

## Backlog (P0 / P1 / P2)
- P1: Wire optional OpenAI TTS via backend for warmer voices (current SpeechSynthesis works as fallback)
- P1: Daily Quest streak card on Hub
- P1: Wire AI Companion Art Pipeline to populate `illustrationUrl`
- P1: Procedural question generation (currently 5–6 hand-written per grade)
- P2: Second realm (Frostpine Hollow)
- P2: Voice-over for non-readers (extend SpeechButton to read all UI on demand)
- P2: Reading subjects (sight words, rhyming) — slot into Academy alongside math
- P2: Real backend + auth + multi-device + multi-child profiles
- P2: Weekly parent email digest (mock toggle in dashboard first)

## Critical Code Review Notes (from iteration_2)
- `Battle.tsx` is the biggest file (~310 lines). Consider splitting into state machine + UI when feature count grows.
- Both eggs can hatch in the same visit — current UX highlights both but only animates one reveal at a time. Acceptable for v0.2.

## Out of Scope (per spec)
- Real auth, real backend, payments, real child data, PvP, guilds, teacher platform, marketplace.
