// Randomizers used by Studio form "Randomize" buttons.
// Pure functions — no side effects, no network. Replace pools with backend-curated lists later.
// TODO(backend): expand pools or pull from a content database when available.

const PICK = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function randomAvatarName(category?: string): string {
  const prefixes = ["Star", "Moon", "Sun", "Crystal", "Cozy", "Tide", "Forest", "Ember", "Dusk", "Spark", "Mossy", "Bubble", "Cloud", "Petal"];
  const objects: Record<string, string[]> = {
    hair: ["Braids", "Tuft", "Wave", "Puff", "Curls"],
    outfit: ["Robe", "Tunic", "Cape", "Vest", "Dress"],
    accessory: ["Pin", "Bow", "Pendant", "Charm", "Ribbon"],
    hat: ["Hood", "Cap", "Tiara", "Wreath", "Halo"],
    cape: ["Cape", "Cloak", "Mantle"],
    "back-item": ["Wings", "Satchel", "Backpack", "Shell"],
    eyes: ["Sparkle", "Glimmer", "Glow", "Shine"],
    skin: ["Palette", "Tone", "Hue"],
  };
  const obj = (category && objects[category]) || ["Trinket", "Token", "Stone", "Charm"];
  return `${PICK(prefixes)} ${PICK(obj)}`;
}

export function randomCompanionName(): string {
  const stems = ["Spri", "Embe", "Pebb", "Bubb", "Twink", "Cloud", "Mossy", "Dewy", "Glim", "Tundra", "Misty"];
  const ends  = ["ggle", "rcub", "lin", "lefin", "let", "kin", "ling", "let", "mer", "kin", "ee"];
  return `${PICK(stems)}${PICK(ends)}-${Math.floor(Math.random() * 90 + 10)}`;
}

export function randomCompanionLore(): string {
  const traits = ["bashful", "bold", "playful", "loyal", "curious", "sleepy", "studious"];
  const places = ["Meadowfall Grove", "Frostpine Hollow", "Lullaby Lagoon", "Sunberry Plateau", "Whisperdune"];
  const habits = ["hums while solving puzzles", "naps on warm books", "collects shiny pebbles", "befriends rain clouds", "leaves trails of sparkles"];
  return `A ${PICK(traits)} companion from ${PICK(places)} who ${PICK(habits)}.`;
}

export function randomMoveSet(affinity: string): string[] {
  const sets: Record<string, string[][]> = {
    nature: [["Leaf Pat", "Sun Hug", "Petal Shield"], ["Vine Tap", "Bloom Burst", "Root Hug"]],
    fire:   [["Spark Hop", "Ember Pat", "Warm Glow"],  ["Cinder Flick", "Ember Roar", "Heat Hug"]],
    earth:  [["Stone Tumble", "Pebble Shield", "Earth Snug"], ["Sand Dance", "Rock Pat", "Cozy Cave"]],
    water:  [["Bubble Bop", "Splash", "Mist Veil"], ["Tide Tap", "Pond Pat", "Coral Glow"]],
    air:    [["Whisper Wind", "Float", "Breeze Veil"], ["Cloud Tap", "Gust Pat", "Sky Hug"]],
    star:   [["Star Flick", "Twinkle Dust", "Wish Beam"], ["Comet Tap", "Starlight Pat", "Wishful Hug"]],
  };
  const arr = sets[affinity] ?? sets.nature;
  return PICK(arr);
}

export function randomStats(rarityWeight = 1): { hp: number; attack: number; defense: number; speed: number } {
  const base = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * rarityWeight);
  return {
    hp:       base(60, 130),
    attack:   base(14, 30),
    defense:  base(10, 26),
    speed:    base(8, 22),
  };
}

export function randomRealmName(): string {
  const adj = ["Frostpine", "Lullaby", "Sunberry", "Candlebark", "Whisperdune", "Goldenmoss", "Starlit"];
  const noun = ["Hollow", "Lagoon", "Plateau", "Wood", "Dunes", "Grove", "Reach"];
  return `${PICK(adj)} ${PICK(noun)}`;
}

export function randomBiome(): string {
  return PICK(["spring meadow", "snowy pine forest", "warm coastal lagoon", "autumn woodland", "shimmering desert", "cherry orchard", "starlit clearing"]);
}

export function randomQuestTitle(): string {
  const a = ["The Lost", "Bubblefin's", "Star Map", "The Ember Berry", "Pebblin's", "Mossy Lantern", "Whispering"];
  const b = ["Acorn", "Riddle", "Mystery", "Search", "Counting Walk", "Discovery", "Rhymes"];
  return `${PICK(a)} ${PICK(b)}`;
}

export function randomScenePrompt(): string {
  const time = PICK(["sunlit", "moonlit", "twilight", "dawn"]);
  const place = PICK(["meadow path", "cozy library", "rooftop garden", "tide pool", "snow clearing", "lantern bridge"]);
  const detail = PICK(["dandelion fluff drifting", "soft glowing motes", "fairy lights overhead", "playful shadows", "petals in the air"]);
  return `${time} ${place}, ${detail}, no scary shadows`;
}

export function randomVisualPrompt(): string {
  const moods = ["cozy", "warm", "magical", "playful", "serene"];
  const subjects = ["chibi companion", "academy interior", "town hub", "small shop", "hatchery interior"];
  const lighting = ["soft afternoon light", "golden hour", "twilight glow", "candle warmth", "morning sunbeam"];
  return `${PICK(moods)} ${PICK(subjects)}, ${PICK(lighting)}, gentle pastel palette, kid-friendly`;
}

export function randomNPCName(): string {
  const firsts = ["Linden", "Mira", "Bramble", "Mochi", "Tilly", "Pip", "Juno", "Sage", "Wren", "Rumi"];
  const epithets = ["the Kind", "the Wise", "the Bright", "the Sprout", "the Lantern", "the Cozy", "the Brave", "the Curious"];
  return `${PICK(firsts)} ${PICK(epithets)}`;
}

export function randomDialogueLine(role: string): string {
  const lines: Record<string, string[]> = {
    teacher: [
      "Great try! Let's practice that one together.",
      "You're getting closer — I can see it!",
      "Take your time. Every step counts.",
    ],
    guide: [
      "Follow me — the path is friendlier than it looks.",
      "Did you spot the little marker? Sharp eyes!",
    ],
    shopkeeper: [
      "Pick a sparkle that matches your mood today!",
      "Brand new arrivals — and they shimmer.",
    ],
    "quest-giver": [
      "I have a small favor — if you have a moment.",
      "There's a tiny mystery in the meadow…",
    ],
    guardian: [
      "Welcome, little scholar. You're safe here.",
      "I'll watch the path while you rest.",
    ],
    rival: [
      "Race you to the next question?",
      "Bet I can solve that one faster — friendly bet though!",
    ],
    caretaker: [
      "Your egg is warming up nicely.",
      "Have a snack and a stretch before the next quest.",
    ],
  };
  return PICK(lines[role] ?? lines.teacher);
}

export function randomStylePresetName(): string {
  return `${PICK(["Cozy", "Magical", "Crayon", "Storybook", "Watercolor", "Ghibli", "Pastel"])} ${PICK(["Chibi", "Realms", "Scenes", "Worlds", "Style"])}`;
}

export function randomHex(): string {
  const hues = ["#9D8DF1","#F4C753","#86A789","#FF9F68","#7BB7D6","#D4A373","#FCE2F0","#EEF2FB","#FFE6D6","#E8F4E1"];
  return PICK(hues);
}
