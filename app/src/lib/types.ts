export type ModuleId = 'core_emotion' | 'color' | 'place_memory' | 'soundscape' | 'light' | 'texture' | 'spatial';

export interface CoreEmotion { emotions: string[]; intensity: number; arrival: string }
export interface ColorPrefs { liked: string[]; avoided: string[]; warmth: number; saturation: number }
export interface PlaceMemory { archetype: string; story: string; sense: string }
export interface SoundPrefs { level: number; sources: string[]; sensitivity: number }
export interface LightPrefs { daylight: number; kelvin: number; rhythm: 'morning' | 'evening' | 'both'; contrast: number }
export interface TexturePrefs { materials: string[]; roughness: number; softness: number }
export interface SpatialPrefs {
  openness: number;
  ceiling: number;
  curvature: number;
  layering: number;
  nature: number;
  privacy: number;
  activities: string[];
}

export interface Answers {
  core_emotion?: CoreEmotion;
  color?: ColorPrefs;
  place_memory?: PlaceMemory;
  soundscape?: SoundPrefs;
  light?: LightPrefs;
  texture?: TexturePrefs;
  spatial?: SpatialPrefs;
}

export type ProjectStatus = 'draft' | 'sent' | 'completed' | 'analyzed';

export interface Project {
  id: string;
  token: string;
  clientName: string;
  projectType: string;
  area: number;
  budget: string;
  dueDate: string;
  notes: string;
  status: ProjectStatus;
  answers: Answers;
  createdAt: number;
  updatedAt: number;
}

export interface Swatch { role: string; hex: string; name: string; share: number }

export interface SceneParams {
  ceiling: number;
  curvature: number;
  width: number;
  depth: number;
  windowRatio: number;
  wall: string;
  secondary: string;
  accent: string;
  anchor: string;
  floor: string;
  floorKind: 'wood' | 'stone' | 'concrete' | 'terrazzo';
  textile: string;
  kelvinDay: number;
  kelvinEvening: number;
  contrast: number;
  nature: number;
  layering: number;
  refuge: number;
  water: boolean;
}

export interface Insight { id: string; title: string; principle: string; application: string; source: string }

export interface Analysis {
  version: 2;
  createdAt: number;
  archetype: { name: string; tagline: string };
  emotional_profile: {
    dominant: { id: string; label: string; weight: number }[];
    axes: { id: string; label: string; low: string; high: string; value: number }[];
    summary: string;
    memory: string;
  };
  color_code: { palette: Swatch[]; rule: string; notes: string[] };
  proportions: { ceiling: number; entryCeiling: number; ratio: string; curvature: string; windowToWall: number; notes: string[] };
  lighting_plan: {
    schedule: { time: string; kelvin: number; lux: number; note: string }[];
    layers: { layer: string; detail: string }[];
    contrastRatio: string;
  };
  materials_code: { role: string; name: string; finish: string; why: string; hex: string }[];
  soundscape_strategy: { rt60: string; nrc: string; masking: string[]; actions: string[]; mix: Record<string, number> };
  spatial_transitions: { step: string; detail: string }[];
  implementation_timeline: { phase: string; weeks: number; detail: string }[];
  rooms: { name: string; mood: string; keys: string[] }[];
  insights: Insight[];
  scene: SceneParams;
}
