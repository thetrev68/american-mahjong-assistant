

export type PlayerTile = Tile & {
  instanceId: string;
  isSelected: boolean;
  animation?: TileAnimation;
  recommendation?: TileRecommendation;
};

// Future enhancement: Tile animation system
export interface TileAnimation {
  type: 'keep' | 'pass' | 'discard' | 'joker' | 'dragon' | 'select' | 'deselect';
  duration: number;
  delay?: number;
}

// Future enhancement: AI recommendation system for tiles
export interface TileRecommendation {
  action: 'keep' | 'pass' | 'discard' | 'neutral';
  confidence: number;
  reasoning: string;
  priority: number;
}

export interface TileCount {
  tileId: string;
  count: number;
  remaining: number;
}

export interface HandValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  tileCount: number;
  expectedCount: number;
  duplicateErrors: string[];
}

export type TileInputMode = 'select' | 'count' | 'quick-input';

export interface TileInputState {
  selectedTiles: PlayerTile[];
  inputMode: TileInputMode;
  isValidating: boolean;
  validation: HandValidation;
  showRecommendations: boolean;
}
