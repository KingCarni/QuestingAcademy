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

export type AdventureCollisionZoneType = "walkable" | "blocked" | "water" | "tall-grass" | "interaction";

export type AdventureZonePoint = { x: number; y: number };

export interface AdventureCollisionZone {
  id: string;
  label: string;
  type: AdventureCollisionZoneType;
  points: AdventureZonePoint[];
  closed?: boolean;
  description?: string;
  source?: "prototype" | "assignment" | "scene-composer";
}

export interface AdventureCollisionSettings {
  enabled: boolean;
  requireWalkableZone?: boolean;
  blockWater?: boolean;
  blockBlocked?: boolean;
  allowTallGrass?: boolean;
  allowInteractionZones?: boolean;
  blockedFeedback?: string;
  waterFeedback?: string;
  outsideWalkableFeedback?: string;
}

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
  source?: "prototype" | "assignment" | "scene-composer";
  linkedCollection?: string;
  linkedId?: string;
  linkedLabel?: string;
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

export interface AdventureZoneAssignment {
  zoneId: string;
  enabled: boolean;
  sourceType: "prototype" | "local-asset" | "asset-library" | "scene-composer";
  sourceLabel: string;
  assetId?: string;
  sceneId?: string;
  mapUrl?: string;
  notes?: string;
  importSceneComposerZones?: boolean;
  importSceneComposerMarkers?: boolean;
  fallbackToPrototype?: boolean;
  manualComposition?: {
    backgroundUrl?: string;
    zones?: Array<{
      id?: string;
      name?: string;
      label?: string;
      type?: string;
      points?: AdventureZonePoint[];
      closed?: boolean;
      description?: string;
    }>;
    markers?: Array<{
      id?: string;
      name?: string;
      label?: string;
      type?: string;
      x?: number;
      y?: number;
      radius?: number;
      linkedCollection?: string;
      linkedId?: string;
      linkedLabel?: string;
    }>;
  };
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
  collision?: AdventureCollisionSettings;
  collisionZones?: AdventureCollisionZone[];
  exits: AdventureZoneExit[];
  markers: AdventureZoneMarker[];
}

export interface ResolvedAdventureZoneDefinition extends AdventureZoneDefinition {
  assignment?: AdventureZoneAssignment;
  contentSource: "prototype" | "assigned" | "assigned-with-fallback";
  contentSourceLabel: string;
  prototypeMapUrl: string;
  importedZoneCount: number;
  importedMarkerCount: number;
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

export const ADVENTURE_COLLISION_ZONE_LABELS: Record<AdventureCollisionZoneType, string> = {
  walkable: "Walkable",
  blocked: "Blocked",
  water: "Water",
  "tall-grass": "Tall Grass",
  interaction: "Interaction",
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

const normalizeSceneMarkerType = (type?: string): AdventureZoneMarkerType => {
  switch (type) {
    case "player-start":
      return "player-start";
    case "npc-anchor":
      return "npc-anchor";
    case "companion-anchor":
    case "companion-encounter":
      return "companion-encounter";
    case "quest-object":
    case "quest-objective":
      return "quest-objective";
    case "shop-point":
    case "door":
    case "fast-travel":
    case "exit":
      return "zone-exit";
    case "battle-trigger":
      return "battle-trigger";
    case "resource-node":
      return "resource-node";
    case "chest":
      return "chest";
    case "point-of-interest":
    default:
      return "point-of-interest";
  }
};

const normalizeSceneZoneType = (type?: string): AdventureCollisionZoneType => {
  if (type === "walkable" || type === "blocked" || type === "water" || type === "tall-grass" || type === "interaction") return type;
  return "interaction";
};

const importSceneComposerZones = (assignment: AdventureZoneAssignment): AdventureCollisionZone[] => {
  const zones = assignment.manualComposition?.zones ?? [];
  if (!assignment.importSceneComposerZones || zones.length === 0) return [];
  return zones
    .filter((zone) => Array.isArray(zone.points) && zone.points.length >= 3)
    .map((zone, index) => ({
      id: `assigned-zone-${zone.id || index + 1}`,
      label: zone.label || zone.name || `Assigned Zone ${index + 1}`,
      type: normalizeSceneZoneType(zone.type),
      points: zone.points || [],
      closed: zone.closed !== false,
      description: zone.description || `Imported from ${assignment.sourceLabel}.`,
      source: "scene-composer",
    }));
};

const importSceneComposerMarkers = (assignment: AdventureZoneAssignment): AdventureZoneMarker[] => {
  const markers = assignment.manualComposition?.markers ?? [];
  if (!assignment.importSceneComposerMarkers || markers.length === 0) return [];
  return markers
    .filter((marker) => typeof marker.x === "number" && typeof marker.y === "number")
    .map((marker, index) => {
      const type = normalizeSceneMarkerType(marker.type);
      return {
        id: `assigned-marker-${marker.id || index + 1}`,
        label: marker.label || marker.name || marker.linkedLabel || `Assigned Marker ${index + 1}`,
        type,
        x: Number(marker.x ?? 50),
        y: Number(marker.y ?? 50),
        radius: Number(marker.radius ?? 7),
        actionKind: inferAdventureMarkerActionKind(type),
        description: marker.linkedLabel ? `Linked to ${marker.linkedLabel}. Imported from ${assignment.sourceLabel}.` : `Imported from ${assignment.sourceLabel}.`,
        target: type === "town-return" ? "/adventure/realms" : undefined,
        linkedCollection: marker.linkedCollection,
        linkedId: marker.linkedId,
        linkedLabel: marker.linkedLabel,
        source: "scene-composer",
      };
    });
};

export const resolveAdventureZoneDefinition = (
  zone: AdventureZoneDefinition,
  assignments: AdventureZoneAssignment[] = ADVENTURE_ZONE_ASSIGNMENTS
): ResolvedAdventureZoneDefinition => {
  const assignment = assignments.find((candidate) => candidate.zoneId === zone.id && candidate.enabled);
  if (!assignment) {
    return {
      ...zone,
      contentSource: "prototype",
      contentSourceLabel: "Prototype fallback data",
      prototypeMapUrl: zone.mapUrl,
      importedZoneCount: 0,
      importedMarkerCount: 0,
    };
  }

  const importedZones = importSceneComposerZones(assignment);
  const importedMarkers = importSceneComposerMarkers(assignment);
  const hasAssignedMap = Boolean(assignment.mapUrl || assignment.manualComposition?.backgroundUrl);
  const mapUrl = assignment.mapUrl || assignment.manualComposition?.backgroundUrl || zone.mapUrl;
  const shouldUseImportedZones = importedZones.length > 0;
  const shouldUseImportedMarkers = importedMarkers.length > 0;

  return {
    ...zone,
    mapUrl,
    collisionZones: shouldUseImportedZones ? importedZones : zone.collisionZones,
    markers: shouldUseImportedMarkers ? importedMarkers : zone.markers,
    playerStartMarkerId: shouldUseImportedMarkers
      ? importedMarkers.find((marker) => marker.type === "player-start")?.id || zone.playerStartMarkerId
      : zone.playerStartMarkerId,
    assignment,
    contentSource: hasAssignedMap || shouldUseImportedMarkers || shouldUseImportedZones ? "assigned" : "assigned-with-fallback",
    contentSourceLabel: assignment.sourceLabel,
    prototypeMapUrl: zone.mapUrl,
    importedZoneCount: importedZones.length,
    importedMarkerCount: importedMarkers.length,
  };
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
  collision: {
    enabled: true,
    requireWalkableZone: true,
    blockWater: true,
    blockBlocked: true,
    allowTallGrass: true,
    allowInteractionZones: true,
    blockedFeedback: "That path is blocked. Try the open meadow or trail.",
    waterFeedback: "The creek is not walkable yet. Use the bridge or meadow path.",
    outsideWalkableFeedback: "Stay on the meadow route for now.",
  },
  collisionZones: [
    {
      id: "main-meadow-walkable",
      label: "Main Meadow Play Space",
      type: "walkable",
      closed: true,
      description: "Primary playable meadow and broad movement lanes.",
      source: "prototype",
      points: [
        { x: 8, y: 18 },
        { x: 61, y: 13 },
        { x: 93, y: 22 },
        { x: 94, y: 78 },
        { x: 76, y: 90 },
        { x: 18, y: 91 },
        { x: 6, y: 75 },
      ],
    },
    {
      id: "creek-water-band",
      label: "Creek Edge",
      type: "water",
      closed: true,
      description: "Prototype water collision band along the lower/right creek edge.",
      source: "prototype",
      points: [
        { x: 58, y: 81 },
        { x: 100, y: 58 },
        { x: 100, y: 100 },
        { x: 49, y: 100 },
      ],
    },
    {
      id: "north-tree-wall",
      label: "North Forest Boundary",
      type: "blocked",
      closed: true,
      description: "Tree/cliff edge that should not be walked through.",
      source: "prototype",
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 12 },
        { x: 0, y: 12 },
      ],
    },
    {
      id: "left-tree-wall",
      label: "Left Tree Boundary",
      type: "blocked",
      closed: true,
      description: "Left border decoration and fence boundary.",
      source: "prototype",
      points: [
        { x: 0, y: 0 },
        { x: 7, y: 0 },
        { x: 7, y: 100 },
        { x: 0, y: 100 },
      ],
    },
    {
      id: "right-tree-wall",
      label: "Right Forest Boundary",
      type: "blocked",
      closed: true,
      description: "Right forest decoration boundary.",
      source: "prototype",
      points: [
        { x: 94, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 94, y: 100 },
      ],
    },
    {
      id: "center-tall-grass",
      label: "Soft Tall Grass",
      type: "tall-grass",
      closed: true,
      description: "Allowed movement area used for future encounter flavor.",
      source: "prototype",
      points: [
        { x: 33, y: 46 },
        { x: 66, y: 45 },
        { x: 67, y: 73 },
        { x: 31, y: 75 },
      ],
    },
    {
      id: "quest-interaction-pocket",
      label: "Study Clue Pocket",
      type: "interaction",
      closed: true,
      description: "Loose activity pocket around the first quest objective.",
      source: "prototype",
      points: [
        { x: 45, y: 42 },
        { x: 59, y: 42 },
        { x: 60, y: 58 },
        { x: 43, y: 59 },
      ],
    },
  ],
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
      source: "prototype",
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
      source: "prototype",
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
      source: "prototype",
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
      source: "prototype",
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
      source: "prototype",
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
      source: "prototype",
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
      source: "prototype",
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
      source: "prototype",
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
      source: "prototype",
    },
  ],
};

export const ADVENTURE_ZONES: AdventureZoneDefinition[] = [MEADOW_TRAIL_ZONE];

export const ADVENTURE_ZONE_ASSIGNMENTS: AdventureZoneAssignment[] = [
  {
    zoneId: "meadow-trail-a1",
    enabled: true,
    sourceType: "local-asset",
    sourceLabel: "Local Meadow Trail A-1 walking map asset",
    assetId: "local-meadow-trail-a1",
    mapUrl: "/assets/adventure-zones/meadow-trail-a1.png",
    notes: "TEA-135 first-pass assignment registry. Replace mapUrl or add manualComposition data when a saved Asset Library / Scene Composer package is ready.",
    importSceneComposerZones: false,
    importSceneComposerMarkers: false,
    fallbackToPrototype: true,
  },
];