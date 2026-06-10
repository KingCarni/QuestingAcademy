export type AdventureZoneMarkerType =
  | "player-start"
  | "town-return"
  | "zone-exit"
  | "quest-objective"
  | "chest"
  | "resource-node"
  | "npc-anchor"
  | "battle-trigger"
  | "companion-encounter"
  | "point-of-interest";

export interface AdventureZoneMarker {
  id: string;
  label: string;
  type: AdventureZoneMarkerType;
  x: number;
  y: number;
  radius?: number;
  actionLabel?: string;
  description?: string;
  target?: string;
}

export interface AdventureZoneDefinition {
  id: string;
  name: string;
  subtitle: string;
  biome: string;
  mood: string;
  mapUrl: string;
  returnRealmId?: string;
  markers: AdventureZoneMarker[];
}

export const ADVENTURE_ZONE_MARKER_LABELS: Record<AdventureZoneMarkerType, string> = {
  "player-start": "Player Start",
  "town-return": "Town Return",
  "zone-exit": "Zone Exit",
  "quest-objective": "Quest Objective",
  chest: "Chest",
  "resource-node": "Resource Node",
  "npc-anchor": "NPC Anchor",
  "battle-trigger": "Battle Trigger",
  "companion-encounter": "Companion Encounter",
  "point-of-interest": "Point of Interest",
};

export const ADVENTURE_ZONE_ACTION_LABELS: Record<AdventureZoneMarkerType, string> = {
  "player-start": "Start here",
  "town-return": "Return to town",
  "zone-exit": "Travel onward",
  "quest-objective": "Inspect objective",
  chest: "Open chest",
  "resource-node": "Gather",
  "npc-anchor": "Talk",
  "battle-trigger": "Start challenge",
  "companion-encounter": "Investigate companion",
  "point-of-interest": "Inspect",
};

export const MEADOW_TRAIL_ZONE: AdventureZoneDefinition = {
  id: "meadow-trail-a1",
  name: "Meadow Trail A-1",
  subtitle: "Questing Academy outskirts",
  biome: "Sunlit meadow path",
  mood: "cozy exploration",
  mapUrl: "/assets/adventure-zones/meadow-trail-a1.png",
  returnRealmId: "questing-academy",
  markers: [
    {
      id: "start-gate",
      label: "Town Gate",
      type: "player-start",
      x: 49,
      y: 82,
      radius: 6,
      description: "The safe path back toward the academy town hub.",
    },
    {
      id: "return-town",
      label: "Return to Town",
      type: "town-return",
      x: 49,
      y: 88,
      radius: 7,
      target: "First Town Hub",
      description: "Head back to the academy town hub.",
    },
    {
      id: "first-objective",
      label: "Sparkling Study Clue",
      type: "quest-objective",
      x: 52,
      y: 50,
      radius: 7,
      description: "A gentle first objective marker for the starter quest.",
    },
    {
      id: "left-chest",
      label: "Trail Chest",
      type: "chest",
      x: 23,
      y: 58,
      radius: 6,
      description: "A prototype chest reward point.",
    },
    {
      id: "pond-resource",
      label: "Crystal Pond Reeds",
      type: "resource-node",
      x: 15,
      y: 70,
      radius: 8,
      description: "A gentle gathering point near the water edge.",
    },
    {
      id: "guide-anchor",
      label: "Guide Anchor",
      type: "npc-anchor",
      x: 37,
      y: 64,
      radius: 6,
      description: "Future NPC/event guide position.",
    },
    {
      id: "learning-encounter",
      label: "Learning Challenge",
      type: "battle-trigger",
      x: 72,
      y: 44,
      radius: 7,
      target: "/battle",
      description: "Marker-driven challenge start. Visible enemies are optional later.",
    },
    {
      id: "companion-rustle",
      label: "Rustling Grass",
      type: "companion-encounter",
      x: 75,
      y: 67,
      radius: 7,
      description: "Potential companion encounter without requiring a visible sprite yet.",
    },
    {
      id: "north-exit",
      label: "Forest Path",
      type: "zone-exit",
      x: 83,
      y: 22,
      radius: 7,
      description: "Future route to the next adventure zone.",
    },
  ],
};

export const ADVENTURE_ZONES: AdventureZoneDefinition[] = [MEADOW_TRAIL_ZONE];
