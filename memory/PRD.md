# Questing Academy — Frontend MVP PRD (v0.5)

## Concept
Cute chibi-style educational RPG for Grades K-7. Avatar creation, companion collection, math + reading battles, egg hatching, Learning Academy training, parent progress dashboard, and a full internal **TeachMe Content Studio** with structured generator/review forms.

## Stack & Constraints
- React + TypeScript SPA (CRA), Tailwind, zustand+persist (localStorage)
- No real auth/backend/payments/child-data/API keys
- Parent PIN `1234`, Admin/Studio PIN `2580`

## Routes
- Player: `/`, `/onboarding`, `/character`, `/starter`, `/hub`, `/battle`, `/egg`, `/collection`, `/academy`
- Parent: `/parent`
- Staff: `/admin`, `/admin/studio`, `/admin/approvals`

## Versions
- v0.1 MVP · v0.2 Senses Pack + K-7 · v0.3 Pack C + Admin · v0.4 Content Studio · **v0.5 TEA-74 Studio Refinement**

### v0.5 — TEA-74 (current)
- 📝 **Questions** now grouped: Subject → Topic → Template → Generated Examples. Approval is per-template/concept; "Generate 4 samples" collapsible underneath each card.
- 🧑 **Avatars**: dropdowns for category & rarity, color picker with saved palettes, category-specific fields (hair/outfit/accessory), ageRange removed.
- 🐾 **Pets**: full editable stats (HP/ATK/DEF/SPD), affinity/rarity/role dropdowns, shiny recolor variant (stat-safe), live preview, Randomize.
- 🌱 **Evolutions**: companion **searchable dropdown**, stage selector, evolution name, unlock condition, academy influence, visual notes, stat growth notes, Randomize.
- 🎨 **Companion Art**: companion search-select, style preset dropdown + "Save new", randomize prompt/title/style. Mock Nano Banana retained with `TODO(api)`.
- 🎒 **Assets**: kind dropdown, color picker + saved palettes, egg/badge category-specific fields.
- 🗺️ **Realms**: buildings/hubs multi-select, tone dropdown, style preset, map notes, Randomize.
- ⚔️ **Battle BGs**: realm dropdown (relationship), time-of-day + mood dropdowns, style preset, randomize prompt.
- 🏠 **Scenes**: purpose dropdown, realm dropdown, NPC multi-select (relationship), style preset, randomize.
- 💬 **NPCs**: realm dropdown, role + custom-role field, 7 persona dropdowns (tone, temperament, teaching style, humor, formality, encouragement), randomize name/line.
- 📜 **Quests**: lightweight + `TODO(roadmap)` — full chain design after RPG systems mature. NPC giver dropdown.
- 🚀 **Publish Queue**: unchanged behavior, supports new data shape.
- 🎨 **Reusable presets**: ColorPalette[] + StylePreset[] stored in studio, surfaced in Color/Style pickers across tabs.

## Architecture additions
- `lib/randomizer.ts` — name/prompt/stats pools
- `components/studio/FormFields.tsx` — Field, TextField, TextArea, SelectField, NumberField, ColorField (with palette save), SearchSelect, MultiSelectChips, StylePresetPicker
- `lib/studioTypes.ts` — extensive enum exports, new shape fields, palettes/stylePresets
- `lib/studioStore.ts` — bumped persistence key to `v2`, added palette + preset CRUD

## Testing (manual visual verification)
- Questions grouped (Math + Reading visible) ✓
- Pets stats/shiny/role ✓
- Avatars category-specific reveal + color picker ✓
- Realms buildings multi-select ✓
- Battle BGs realm relationship + time/mood ✓
- NPCs 7 persona dropdowns ✓
- Publish Queue intact ✓
- Game loop (landing/battle) unaffected ✓
- `webpack compiled successfully · No issues found.`

## Backlog
- P1 Real backend + Emergent Google Auth + multi-device sync
- P1 Real Gemini/Nano Banana wired
- P1 AI Companion Art Pipeline → `Companion.illustrationUrl`
- P1 Quest chain v2 (branching, multi-step gating)
- P2 Per-collection tab file extraction (ContentStudio.tsx ~1300 lines)
- P2 Persistent Studio PIN session
- P2 Live diff preview before publishing
