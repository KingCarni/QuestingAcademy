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

export type AdventureZoneMode = "route" | "open-field" | "forest" | "cave" | "interior-edge";

export type AdventureEncounterPresentation = "marker-only" | "visible-chip" | "visible-creature";

export type AdventureMarkerActionKind =
  | "none"
  | "return-town"
  | "travel-zone"
  | "inspect"
  | "collect"
  | "gather"
  | "talk"
  | "start-battle"
  | "companion-encounter";

export interface AdventureZoneMarker {
  id: string;
  label: string;
  type: AdventureZoneMarkerType;
  x: number;
  y: number;
  radius?: number;
  actionLabel?: string;
  actionKind?: AdventureMarkerActionKind;
  description?: string;
  target?: string;
  rewardLabel?: string;
  encounterFamily?: string;
  isOptional?: boolean;
  devOnly?: boolean;
}

export interface AdventureZoneExit {
  id: string;
  label: string;
  x: number;
  y: number;
  targetZoneId?: string;
  targetRoute?: string;
  description?: string;
}

export interface AdventureZoneDefinition {
  id: string;
  name: string;
  subtitle: string;
  biome: string;
  mood: string;
  mode: AdventureZoneMode;
  mapUrl: string;
  returnRealmId?: string;
  recommendedStageClassName?: string;
  encounterPresentation: AdventureEncounterPresentation;
  playerStartMarkerId?: string;
  camera?: {
    enabled: boolean;
    mode: "static" | "soft-follow";
    deadZonePercent?: number;
  };
  movementBounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  exits: AdventureZoneExit[];
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

export const ADVENTURE_ZONE_ACTION_KIND_LABELS: Record<AdventureMarkerActionKind, string> = {
  none: "No action",
  "return-town": "Return to town",
  "travel-zone": "Travel onward",
  inspect: "Inspect",
  collect: "Collect",
  gather: "Gather",
  talk: "Talk",
  "start-battle": "Start challenge",
  "companion-encounter": "Investigate companion",
};

export const inferAdventureMarkerActionKind = (type: AdventureZoneMarkerType): AdventureMarkerActionKind => {
  switch (type) {
    case "town-return":
      return "return-town";
    case "zone-exit":
      return "travel-zone";
    case "quest-objective":
    case "point-of-interest":
      return "inspect";
    case "chest":
      return "collect";
    case "resource-node":
      return "gather";
    case "npc-anchor":
      return "talk";
    case "battle-trigger":
      return "start-battle";
    case "companion-encounter":
      return "companion-encounter";
    default:
      return "none";
  }
};

export const MEADOW_TRAIL_ZONE: AdventureZoneDefinition = {
  id: "meadow-trail-a1",
  name: "Meadow Trail A-1",
  subtitle: "Questing Academy outskirts",
  biome: "Sunlit meadow path",
  mood: "cozy exploration",
  mode: "open-field",
  mapUrl: "/assets/adventure-zones/meadow-trail-a1.png",
  returnRealmId: "questing-academy",
  recommendedStageClassName: "wide-16-9-large-stage",
  encounterPresentation: "marker-only",
  playerStartMarkerId: "start-gate",
  camera: {
    enabled: true,
    mode: "soft-follow",
    deadZonePercent: 12,
  },
  movementBounds: {
    minX: 4,
    maxX: 96,
    minY: 8,
    maxY: 92,
  },
  exits: [
    {
      id: "return-town-exit",
      label: "Academy Town Gate",
      x: 49,
      y: 88,
      targetRoute: "/adventure/realms",
      description: "Returns the player to the current town/realm hub placeholder.",
    },
    {
      id: "north-forest-exit",
      label: "Forest Path",
      x: 83,
      y: 22,
      targetZoneId: "future-forest-path",
      description: "Future route to the next adventure zone.",
    },
  ],
  markers: [
    {
      id: "start-gate",
      label: "Town Gate",
      type: "player-start",
      x: 49,
      y: 82,
      radius: 6,
      actionKind: "none",
      description: "The safe path back toward the academy town hub.",
    },
    {
      id: "return-town",
      label: "Return to Town",
      type: "town-return",
      x: 49,
      y: 88,
      radius: 7,
      actionKind: "return-town",
      target: "/adventure/realms",
      description: "Head back to the academy town hub.",
    },
    {
      id: "first-objective",
      label: "Sparkling Study Clue",
      type: "quest-objective",
      x: 52,
      y: 50,
      radius: 7,
      actionKind: "inspect",
      rewardLabel: "Quest clue found",
      description: "A gentle first objective marker for the starter quest.",
    },
    {
      id: "left-chest",
      label: "Trail Chest",
      type: "chest",
      x: 23,
      y: 58,
      radius: 6,
      actionKind: "collect",
      rewardLabel: "+10 coins",
      isOptional: true,
      description: "A prototype chest reward point.",
    },
    {
      id: "pond-resource",
      label: "Crystal Pond Reeds",
      type: "resource-node",
      x: 15,
      y: 70,
      radius: 8,
      actionKind: "gather",
      rewardLabel: "Crystal reeds gathered",
      isOptional: true,
      description: "A gentle gathering point near the water edge.",
    },
    {
      id: "guide-anchor",
      label: "Guide Anchor",
      type: "npc-anchor",
      x: 37,
      y: 64,
      radius: 6,
      actionKind: "talk",
      description: "Future NPC/event guide position.",
    },
    {
      id: "learning-encounter",
      label: "Learning Challenge",
      type: "battle-trigger",
      x: 72,
      y: 44,
      radius: 7,
      actionKind: "start-battle",
      target: "/battle",
      encounterFamily: "starter-meadow",
      description: "Marker-driven challenge start. Visible enemies are optional later.",
    },
    {
      id: "companion-rustle",
      label: "Rustling Grass",
      type: "companion-encounter",
      x: 75,
      y: 67,
      radius: 7,
      actionKind: "companion-encounter",
      encounterFamily: "meadow-companion",
      rewardLabel: "Companion encounter discovered",
      isOptional: true,
      description: "Potential companion encounter without requiring a visible sprite yet.",
    },
    {
      id: "north-exit",
      label: "Forest Path",
      type: "zone-exit",
      x: 83,
      y: 22,
      radius: 7,
      actionKind: "travel-zone",
      target: "future-forest-path",
      description: "Future route to the next adventure zone.",
    },
  ],
};

export const ADVENTURE_ZONES: AdventureZoneDefinition[] = [MEADOW_TRAIL_ZONE];
