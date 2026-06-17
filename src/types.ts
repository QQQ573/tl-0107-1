export type ItemCategory = 'allowed' | 'inspect' | 'prohibited';

export interface ItemDef {
  id: string;
  label: string;
  category: ItemCategory;
  shape: 'circle' | 'rect' | 'triangle' | 'diamond' | 'hexagon' | 'star';
  color: number;
  icon: string;
}

export interface LevelConfig {
  level: number;
  name: string;
  campType: 'elementary' | 'middle' | 'international';
  description: string;
  rules: string[];
  items: ItemDef[];
  distractorRatio: number;
  timeLimitSeconds: number;
  targetCount: number;
}

export interface ProcessedItem {
  def: ItemDef;
  assignedCategory: ItemCategory;
  correct: boolean;
  timeSeconds: number;
}

export interface LevelResult {
  level: number;
  campType: string;
  campName: string;
  safetyScore: number;
  maxSafetyScore: number;
  items: ProcessedItem[];
  averageTimeSeconds: number;
  supervisorReviews: number;
  confusionRanking: ConfusionEntry[];
}

export interface ConfusionEntry {
  itemLabel: string;
  timesMisclassified: number;
  commonMistake: string;
}

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;
