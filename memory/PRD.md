# Questing Academy — Frontend MVP PRD

## Original Problem Statement
Build a polished frontend-only MVP prototype for a children's educational RPG called Questing Academy. Cute chibi-style educational RPG for Grades K–2 where students learn through adventure. Players create a chibi avatar, collect cute companions, battle enemies by answering math questions, hatch eggs by completing learning activities, and train companions in a Math Academy. Parents can view simple learning progress.

## User Choices (locked-in)
- Stack: React + TypeScript SPA (CRA)
- Theme: Magical academy — lavender / sage / gold / cream
- Art: CSS + SVG + emoji (no copyrighted illustrations)
- Persistence: localStorage (zustand persist middleware)
- Parent gate: Fake PIN `1234`

## Architecture
- `/app/frontend/src/lib/types.ts` — Player, Companion, Question, Enemy, Egg, AcademyAssignment, ParentReport, BattleStats
- `/app/frontend/src/lib/mockData.ts` — Companions, enemies, questions per grade, academy subjects, eggs, avatar options
- `/app/frontend/src/lib/gameStore.ts` — zustand+persist store with all actions
- `/app/frontend/src/components/` — TopBar, Card, ProgressBar, ChibiAvatar (pure SVG), CompanionAvatar, RequirePlayer
- `/app/frontend/src/pages/` — Landing, Onboarding, CharacterCreator, StarterPicker, Hub, Battle, EggHatch, Collection, Academy, Parent
- All API touch points marked with `TODO(backend)` comments for future integration.

## Implemented (v0.1 — May 30 2026)
- Landing page with hero, floating companions, CTA, parent shortcut, how-it-works ribbon
- Grade selection (K/1/2)
- Character creator: SVG chibi avatar with 5 skin tones, 5 hairstyles, 6 hair colors, 6 outfit colors, 5 accessories, randomize button, name field
- Starter companion picker (Spriggle / Embercub / Pebblin) with stats
- Hub: Meadowfall Grove map with 4 floating tiles, active companion, level/xp/coins, egg progress
- Battle: enemy + companion HP bars, 3 moves (attack/defend/special), grade-matched math question, correct vs wrong damage feedback, rewards (XP/coins/egg progress), victory/defeat states
- Egg hatching screen: 2 starter eggs (Aqua, Stardust), progress bars, crack stages, auto-hatch + companion adds to collection
- Collection: owned vs locked companions, set-active
- Math Academy: 4 subjects, companion assignment, mastery progress (grows on correct answers)
- Parent dashboard: PIN-gated (1234), 4 KPIs, topics practiced, highlights, last-7-day session strip
- TopBar with back/home, XP/coins chips, avatar mini

## Testing Status
- iteration_1: 100% of functional assertions passed (20/20). One mis-specified assertion clarified (TopBar back/home are mutually exclusive by design).
- No real bugs found.

## Backlog / Next Action Items (P0/P1/P2)
- P1: Expand math question pool per grade (currently 6/grade for MVP)
- P1: Sound effects + tiny BGM toggle
- P1: Confetti on egg hatch (`react-confetti` already installed)
- P2: Additional realms beyond Meadowfall Grove
- P2: Onboarding voice-over for non-readers
- P2: Replace SVG companion shapes with the AI Companion Art Pipeline once backend exists
- P2: Wire `TODO(backend)` markers to real API + auth

## Out of Scope (per spec)
- Real auth, real backend, payments, real child data, PvP, guilds, teacher platform, marketplace.
