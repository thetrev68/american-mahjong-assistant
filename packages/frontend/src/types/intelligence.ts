import type { PatternSelectionOption } from 'shared-types';

export type TileAction = 'keep' | 'pass' | 'discard' | 'neutral';

export interface TileRecommendation {
  tileId: string;
  action: TileAction;
  confidence: number;
  reasoning: string;
  priority: number;
  contextualActions?: Record<string, TileAction>;
  patternsHelped?: string[];
  multiPatternValue?: number;
  dangers?: string[];
  [key: string]: unknown;
}

export interface PatternScoreBreakdown {
  currentTileScore: number;
  availabilityScore: number;
  jokerScore: number;
  priorityScore: number;
  [key: string]: number;
}

export interface PatternAnalysisDetail {
  currentTiles?: {
    count: number;
    percentage: number;
    matchingGroups?: string[];
  };
  missingTiles?: {
    total: number;
    byAvailability?: Record<string, string[]>;
  };
  jokerSituation?: {
    available: number;
    needed: number;
    canComplete: boolean;
    substitutionPlan?: Record<string, unknown>;
  };
  strategicValue?: {
    tilePriorities?: Record<string, number>;
    groupPriorities?: Record<string, number>;
    overallPriority?: number;
    reasoning?: string[];
  };
  gameState?: {
    wallTilesRemaining: number;
    turnsEstimated: number;
    drawProbability?: number;
  };
  [key: string]: unknown;
}

export interface PatternRecommendation {
  pattern: (PatternSelectionOption & {
    section?: string;
    line?: number;
    pattern?: string;
  }) | {
    id: string;
    displayName?: string;
    pattern?: string;
    section?: string;
    line?: number;
  };
  confidence: number;
  totalScore: number;
  completionPercentage: number;
  reasoning: string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  isPrimary: boolean;
  expandedTiles?: string[];
  scoreBreakdown?: PatternScoreBreakdown;
  analysis?: PatternAnalysisDetail;
  recommendations?: {
    shouldPursue?: boolean;
    alternativePatterns?: unknown[];
    strategicNotes?: string[];
    riskFactors?: string[];
  };
  strategicValue?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  tilesNeeded?: number;
  estimatedTurns?: number;
  missingTiles?: string[];
  [key: string]: unknown;
}

export interface PatternAnalysis {
  pattern: string;
  displayName?: string;
  section: string;
  line: number;
  groups?: Array<{ text: string; color: string }>;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  completionPercentage: number;
  tilesNeeded: number;
  estimatedTurns: number;
  riskLevel: 'low' | 'medium' | 'high';
  missingTiles: string[];
  strategicValue?: number;
  confidence?: number;
  badges?: string[];
  [key: string]: unknown;
}

export interface AnalysisThreat {
  level: 'low' | 'medium' | 'high';
  description: string;
  mitigation?: string;
  [key: string]: unknown;
}

export interface HandAnalysis {
  overallScore: number;
  recommendedPatterns: PatternRecommendation[];
  bestPatterns: PatternAnalysis[];
  tileRecommendations: TileRecommendation[];
  strategicAdvice: string[];
  threats: AnalysisThreat[];
  lastUpdated: number;
  analysisVersion: string;
  engine1Facts?: unknown[];
  [key: string]: unknown;
}

export interface IntelligenceSnapshot {
  analysis: HandAnalysis | null;
  isAnalyzing: boolean;
  lastUpdated: number | null;
}
