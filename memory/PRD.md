# Questing Academy — Frontend MVP PRD

## Original Problem Statement
Cute chibi-style educational RPG for Grades K-7 (expanded from K-2). Players create a chibi avatar, collect cute companions, battle enemies by answering math + reading questions, hatch eggs by completing learning activities, and train companions in a Learning Academy. Parents view simple progress; staff can manage the prototype via an admin dashboard.

## User Choices (locked-in)
- Stack: React + TypeScript SPA (CRA)
- Theme: Magical academy — lavender / sage / gold / cream
- Art: CSS + SVG + emoji, with optional `illustrationUrl` hook for future AI Companion Art Pipeline
- Persistence: localStorage (zustand persist middleware)
- Parent gate: PIN `1234`; Admin gate: PIN `2580`
- Scope: K-7, math + reading subjects

## Architecture
- `/app/frontend/src/lib/types.ts` — Player, Companion, Question (+ source/templateId), Enemy, Egg, AcademyAssignment, ParentReport, BattleStats, TrickyEntry, GameSettings
- `/app/frontend/src/lib/mockData.ts` — companions, enemies, 8 academy subjects, eggs, avatar options
- `/app/frontend/src/lib/questionEngine.ts` — 16 procedural templates (math + reading), `generateQuestion(grade, mode, disabled, accuracy)`, `templatesForGrade`, `templateById`
- `/app/frontend/src/lib/gameStore.ts` — zustand+persist. Includes `nextQuestion` (tricky-pool aware), `recordWrong/Correct` with spaced-repetition stages [2, 5, 10, 20], settings (subjectMode/disabledTemplateIds/soundOn), and admin helpers
- `/app/frontend/src/lib/sfx.ts` — Web Audio API SFX
- `/app/frontend/src/lib/speech.ts` — SpeechSynthesis wrapper
- Components: TopBar (sound toggle), Card, ProgressBar, ChibiAvatar, CompanionAvatar (illustration url + reveal), SpeechButton, ConfettiBurst, RequirePlayer
- Pages: Landing, Onboarding (K-7), CharacterCreator, StarterPicker, Hub, Battle, EggHatch, Collection, Academy, Parent, **AdminDashboard**
- TODO markers: `TODO(backend)`, `TODO(art-pipeline)`

## Versions

### v0.1 — May 30 2026 (MVP)
10-screen clickable shell, full math happy-path loop.

### v0.2 — May 30 2026 (Senses Pack + K-7)
- 🔊 Read-aloud questions (SpeechSynthesis)
- 🎉 Confetti on hatch/level-up
- 🔔 Web Audio SFX
- ✨ Hatch reveal animation
- 🎓 Grades K-2 → K-7
- 🧮 Added Multiplication Hall + Fraction Forest

### v0.3 — May 30 2026 (Pack C + Admin)
- 🧠 **Procedural question engine** (16 templates, math + reading, K-7, difficulty-scaled)
- 🔁 **Spaced repetition** "tricky pool" — wrong answers resurface at 2/5/10/20-question intervals; battle shows 🔁 chip
- 📖 **Reading Hall + Rhyme Garden** subjects with rhyming, letter-sounds, synonyms, antonyms
- 🛠️ **Admin Dashboard** at `/admin` (PIN 2580): player editor (name/grade/level/XP/coins), companion grant/revoke/set-active, egg slider + force-hatch, subject mode selector (math/reading/mixed), template library with per-template on/off + sample preview, tricky-pool viewer, danger-zone reset all
- 🔉 **Sound on/off toggle** in TopBar (persisted)
- 🔗 Discreet `parent-admin-link` from parent dashboard

## Testing
- iteration_1: 100% (MVP)
- iteration_2: 100% (Senses Pack + K-7)
- iteration_3: ~95% (Pack C + Admin) — only finding was UX visibility of tricky-chip; fixed by raising resurface probability from 0.55 → 0.75+

## Backlog (P0 / P1 / P2)
- P1: Daily Quest streak card on Hub
- P1: Wire AI Companion Art Pipeline → populate `illustrationUrl`
- P1: Optional warmer OpenAI TTS via backend (current SpeechSynthesis is fallback)
- P2: Second realm (Frostpine Hollow) + more enemies
- P2: Multiple child profiles per device
- P2: Weekly parent email digest mock + Resend integration
- P2: Real backend + Emergent Google Auth + multi-device sync
- P2: More reading templates (verb tense, plurals, antonyms hard)
- P3: Per-template difficulty curve config in admin

## Out of Scope
Real auth, real backend, payments, real child data, PvP, guilds, teacher platform, marketplace.
