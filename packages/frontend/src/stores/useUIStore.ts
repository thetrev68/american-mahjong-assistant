import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Tile } from '@shared-types/tile-types';
import type { NMJL2025Pattern } from '@shared-types/nmjl-types';
import type { TutorialProgress, UserPreferences, SkillLevel, TutorialSection, TutorialStep } from '../features/tutorial/types';
import type { GameOutcome, GameDifficulty, DecisionType, DecisionQuality, GameDecision, PatternAnalysis, GamePerformance, GameInsights, CompletedGame, GameComment, PerformanceStats, LearningRecommendation } from '@shared-types/game-state-types';
interface HistoryState {
  completedGames: CompletedGame[];
  currentGameId: string | null;
  performanceStats: PerformanceStats;
  learningRecommendations: LearningRecommendation[];
  selectedGameId: string | null;
  viewMode: 'overview' | 'detailed' | 'comparison';
  sortBy: 'date' | 'score' | 'duration' | 'difficulty';
  sortOrder: 'asc' | 'desc';
  filterBy: {
    outcome?: GameOutcome;
    difficulty?: GameDifficulty;
    dateRange?: { start: Date; end: Date };
    minScore?: number;
    coPilotMode?: 'everyone' | 'solo';
  };
  sharedGames: CompletedGame[];
  featuredGames: CompletedGame[];
  isLoading: boolean;
  error: string | null;
}

interface HistoryActions {
  startGame: (gameId: string, difficulty: GameDifficulty) => void;
  completeGame: (gameData: Omit<CompletedGame, 'id'>) => string;
  deleteGame: (gameId: string) => void;
  recordDecision: (decision: Omit<GameDecision, 'id'>) => void;
  updateDecisionQuality: (decisionId: string, quality: DecisionQuality, reasoning: string) => void;
  calculatePerformanceStats: () => void;
  generateLearningRecommendations: () => void;
  updateSkillLevel: (level: 'beginner' | 'intermediate' | 'expert') => void;
  selectGame: (gameId: string | null) => void;
  setViewMode: (mode: 'overview' | 'detailed' | 'comparison') => void;
  setSorting: (sortBy: string, order: 'asc' | 'desc') => void;
  setFilter: (filter: Partial<HistoryState['filterBy']>) => void;
  clearFilters: () => void;
  shareGame: (gameId: string) => Promise<boolean>;
  voteOnGame: (gameId: string, vote: 'up' | 'down') => Promise<boolean>;
  addComment: (gameId: string, comment: string) => Promise<boolean>;
  exportHistory: () => string;
  importHistory: (data: string) => Promise<boolean>;
  clearHistory: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// --- TUTORIAL TYPES ---
interface TutorialStoreState {
  progress: TutorialProgress;
  isActive: boolean;
  currentStep: TutorialStep | null;
  canProceed: boolean;
  canGoBack: boolean;
  isLoading: boolean;
  demoMode: boolean;
  demoData: { component: string } | null;
  error: string | null;
}

interface TutorialStoreActions {
  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepId: string) => void;
  goToSection: (section: TutorialSection) => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  completeStep: (stepId: string) => void;
  updateProgress: (progressUpdate: Partial<TutorialProgress>) => void;
  setSkillLevel: (level: SkillLevel) => void;
  updatePreferences: (preferencesUpdate: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  startDemo: (component: string) => void;
  stopDemo: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// --- DEV TYPES ---
interface DevState {
  activeDevPlayerId: string | null;
}

// --- COMBINED STORE STATE ---
interface UIState {
  theme: 'light' | 'dark';
  activeModal: string | null;
  tutorial: TutorialStoreState;
  history: HistoryState;
  dev: DevState;
  actions: {
    toggleTheme: () => void;
    startTutorial: () => void;
    nextStep: () => void;
    previousStep: () => void;
    goToStep: (stepId: string) => void;
    goToSection: (section: TutorialSection) => void;
    completeTutorial: () => void;
    skipTutorial: () => void;
    completeStep: (stepId: string) => void;
    updateProgress: (progressUpdate: Partial<TutorialProgress>) => void;
    setSkillLevel: (level: SkillLevel) => void;
    updatePreferences: (preferencesUpdate: Partial<UserPreferences>) => void;
    resetPreferences: () => void;
    startDemo: (component: string) => void;
    stopDemo: () => void;
    setError: (error: string | null) => void;
    reset: () => void;
    startGame: (gameId: string, difficulty: GameDifficulty) => void;
    completeGame: (gameData: Omit<CompletedGame, 'id'>) => string;
    deleteGame: (gameId: string) => void;
    recordDecision: (decision: Omit<GameDecision, 'id'>) => void;
    updateDecisionQuality: (decisionId: string, quality: DecisionQuality, reasoning: string) => void;
    calculatePerformanceStats: () => void;
    generateLearningRecommendations: () => void;
    updateSkillLevel: (level: 'beginner' | 'intermediate' | 'expert') => void;
    selectGame: (gameId: string | null) => void;
    setViewMode: (mode: 'overview' | 'detailed' | 'comparison') => void;
    setSorting: (sortBy: string, order: 'asc' | 'desc') => void;
    setFilter: (filter: Partial<HistoryState['filterBy']>) => void;
    clearFilters: () => void;
    shareGame: (gameId: string) => Promise<boolean>;
    voteOnGame: (gameId: string, vote: 'up' | 'down') => Promise<boolean>;
    addComment: (gameId: string, comment: string) => Promise<boolean>;
    exportHistory: () => string;
    importHistory: (data: string) => Promise<boolean>;
    clearHistory: () => void;
    historySetError: (error: string | null) => void;
    historyClearError: () => void;
  };
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, _get) => {
        const defaultPerformanceStats: PerformanceStats = {
          totalGames: 0,
          gamesWon: 0,
          winRate: 0,
          averageScore: 0,
          averageGameDuration: 0,
          decisionQualityTrend: [],
          patternStats: {},
          skillLevel: 'beginner',
          nextMilestone: 'Complete your first game',
          progressToNext: 0,
        };

        const defaultPreferences: UserPreferences = {
          assistanceLevel: 'moderate',
          autoSuggestions: true,
          hapticFeedback: true,
          animationsEnabled: true,
          colorScheme: 'system',
          tileSize: 'medium',
          confirmActions: true,
          showPatternProgress: true,
          enableStatistics: true,
          showHints: true,
          pauseForExplanations: true,
          interactiveMode: true,
        };

        const defaultProgress: TutorialProgress = {
          currentSection: 'welcome',
          currentStepId: 'welcome-start',
          completedSteps: [],
          completedSections: [],
          skillLevel: 'beginner',
          assessmentCompleted: false,
          startTime: new Date(),
          lastActivity: new Date(),
          totalTimeSpent: 0,
          selectedPreferences: defaultPreferences,
          skipTutorial: false,
        };

        return {
          theme: 'light',
          activeModal: null,
          dev: { activeDevPlayerId: null },
          tutorial: {
            progress: defaultProgress,
            isActive: false,
            currentStep: null,
            canProceed: true,
            canGoBack: false,
            isLoading: false,
            demoMode: false,
            demoData: null,
            error: null,
          },
          history: {
            completedGames: [],
            currentGameId: null,
            performanceStats: defaultPerformanceStats,
            learningRecommendations: [],
            selectedGameId: null,
            viewMode: 'overview',
            sortBy: 'date',
            sortOrder: 'desc',
            filterBy: {},
            sharedGames: [],
            featuredGames: [],
            isLoading: false,
            error: null,
          },
          actions: {
            toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
            // --- TUTORIAL ACTIONS ---
            startTutorial: () => {
              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  isActive: true,
                  progress: {
                    ...state.tutorial.progress,
                    startTime: new Date(),
                    lastActivity: new Date(),
                  },
                  error: null,
                },
              }));
            },
            nextStep: () => {
              const state = _get();
              if (!state.tutorial.canProceed || !state.tutorial.currentStep) return;

              const completedSteps = [...state.tutorial.progress.completedSteps];
              if (!completedSteps.includes(state.tutorial.currentStep.id)) {
                completedSteps.push(state.tutorial.currentStep.id);
              }

              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  progress: {
                    ...state.tutorial.progress,
                    completedSteps,
                    lastActivity: new Date(),
                  },
                },
              }));
            },
            previousStep: () => {
              const state = _get();
              if (!state.tutorial.canGoBack) return;

              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  progress: {
                    ...state.tutorial.progress,
                    lastActivity: new Date(),
                  },
                },
              }));
            },
            goToStep: (stepId: string) => {
              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  progress: {
                    ...state.tutorial.progress,
                    currentStepId: stepId,
                    lastActivity: new Date(),
                  },
                },
              }));
            },
            goToSection: (section: TutorialSection) => {
              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  progress: {
                    ...state.tutorial.progress,
                    currentSection: section,
                    lastActivity: new Date(),
                  },
                },
              }));
            },
            completeTutorial: () => {
              const state = _get();
              const endTime = new Date();
              const totalTime = Math.round((endTime.getTime() - state.tutorial.progress.startTime.getTime()) / 60000);

              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  isActive: false,
                  progress: {
                    ...state.tutorial.progress,
                    completedSections: ['welcome', 'pattern-basics', 'co-pilot-demo', 'skill-assessment', 'preferences', 'getting-started'],
                    totalTimeSpent: totalTime,
                    lastActivity: endTime,
                  },
                },
              }));
            },
            skipTutorial: () => {
              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  isActive: false,
                  progress: {
                    ...state.tutorial.progress,
                    skipTutorial: true,
                    lastActivity: new Date(),
                  },
                },
              }));
            },
            completeStep: (stepId: string) => {
              set((state) => {
                const completedSteps = [...state.tutorial.progress.completedSteps];
                if (!completedSteps.includes(stepId)) {
                  completedSteps.push(stepId);
                }

                return {
                  tutorial: {
                    ...state.tutorial,
                    progress: {
                      ...state.tutorial.progress,
                      completedSteps,
                      lastActivity: new Date(),
                    },
                  },
                };
              });
            },
            updateProgress: (progressUpdate: Partial<TutorialProgress>) => {
              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  progress: {
                    ...state.tutorial.progress,
                    ...progressUpdate,
                    lastActivity: new Date(),
                  },
                },
              }));
            },
            setSkillLevel: (level: SkillLevel) => {
              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  progress: {
                    ...state.tutorial.progress,
                    skillLevel: level,
                    assessmentCompleted: true,
                    lastActivity: new Date(),
                  },
                },
              }));
            },
            updatePreferences: (preferencesUpdate: Partial<UserPreferences>) => {
              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  progress: {
                    ...state.tutorial.progress,
                    selectedPreferences: {
                      ...state.tutorial.progress.selectedPreferences,
                      ...preferencesUpdate,
                    },
                    lastActivity: new Date(),
                  },
                },
              }));
            },
            resetPreferences: () => {
              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  progress: {
                    ...state.tutorial.progress,
                    selectedPreferences: defaultPreferences,
                    lastActivity: new Date(),
                  },
                },
              }));
            },
            startDemo: (component: string) => {
              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  demoMode: true,
                  demoData: { component },
                  isLoading: false,
                },
              }));
            },
            stopDemo: () => {
              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  demoMode: false,
                  demoData: null,
                },
              }));
            },
            setError: (error: string | null) => {
              set((state) => ({ tutorial: { ...state.tutorial, error } }));
            },
            reset: () => {
              set((state) => ({
                tutorial: {
                  ...state.tutorial,
                  progress: defaultProgress,
                  isActive: false,
                  currentStep: null,
                  canProceed: true,
                  canGoBack: false,
                  isLoading: false,
                  demoMode: false,
                  demoData: null,
                  error: null,
                },
              }));
            },

            // --- HISTORY ACTIONS ---
            history: {
              startGame: (gameId: string, difficulty: GameDifficulty) => {
                set((state) => ({ history: { ...state.history, currentGameId: gameId, filterBy: { ...state.history.filterBy, difficulty } } }));
              },
              completeGame: (gameData: Omit<CompletedGame, 'id'>) => {
                const gameId = _get().history.currentGameId || `game-${Date.now()}`;
                const completedGame: CompletedGame = { ...gameData, id: gameId };
                set((state) => ({
                  history: {
                    ...state.history,
                    completedGames: [completedGame, ...state.history.completedGames],
                    currentGameId: null,
                  },
                }));
                _get().actions.history.calculatePerformanceStats();
                _get().actions.history.generateLearningRecommendations();
                return gameId;
              },
              deleteGame: (gameId: string) => {
                set((state) => ({
                  history: {
                    ...state.history,
                    completedGames: state.history.completedGames.filter((game) => game.id !== gameId),
                    selectedGameId: state.history.selectedGameId === gameId ? null : state.history.selectedGameId,
                  },
                }));
                _get().actions.history.calculatePerformanceStats();
              },
              recordDecision: () => {},
              updateDecisionQuality: (decisionId: string, quality: DecisionQuality, reasoning: string) => {
                set((state) => ({
                  history: {
                    ...state.history,
                    completedGames: state.history.completedGames.map((game) => (
                      game.decisions.some(decision => decision.id === decisionId) // Only modify game if it contains the decision
                        ? {
                            ...game,
                            decisions: game.decisions.map((decision) =>
                              decision.id === decisionId ? { ...decision, quality, reasoning } : decision
                            ),
                          }
                        : game
                    )),
                  },
                }));
              },
              calculatePerformanceStats: () => {
                const games = _get().history.completedGames;
                if (games.length === 0) {
                  set((state) => ({ history: { ...state.history, performanceStats: defaultPerformanceStats } }));
                  return;
                }

                const totalGames = games.length;
                const gamesWon = games.filter((g) => g.outcome === 'won').length;
                const winRate = (gamesWon / totalGames) * 100;

                const totalScore = games.reduce((sum, g) => sum + g.finalScore, 0);
                const averageScore = totalScore / totalGames;

                const totalDuration = games.reduce((sum, g) => sum + g.duration, 0);
                const averageGameDuration = totalDuration / totalGames;

                const recentGames = games.slice(0, 10);
                const decisionQualityTrend = recentGames.map((game) => {
                  const totalDecisions = game.performance.totalDecisions;
                  return {
                    date: game.timestamp,
                    excellentRate: totalDecisions > 0 ? (game.performance.excellentDecisions / totalDecisions) * 100 : 0,
                    goodRate: totalDecisions > 0 ? (game.performance.goodDecisions / totalDecisions) * 100 : 0,
                  };
                });

                const patternStats: Record<string, { attempted: number; completed: number; successRate: number; averageCompletion: number }> = {};
                games.forEach((game) => {
                  game.selectedPatterns.forEach((pattern) => {
                    const patternId = pattern.Hands_Key;
                    if (!patternStats[patternId]) {
                      patternStats[patternId] = { attempted: 0, completed: 0, successRate: 0, averageCompletion: 0 };
                    }
                    patternStats[patternId].attempted++;
                    if (game.winningPattern?.Hands_Key === patternId) {
                      patternStats[patternId].completed++;
                    }
                  });
                });

                Object.keys(patternStats).forEach((patternId) => {
                  const stats = patternStats[patternId];
                  stats.successRate = (stats.completed / stats.attempted) * 100;
                });

                let skillLevel: 'beginner' | 'intermediate' | 'expert' = 'beginner';
                let nextMilestone = 'Complete your first game';
                let progressToNext = 0;

                if (totalGames >= 5 && winRate >= 20) {
                  skillLevel = 'intermediate';
                  nextMilestone = 'Win 10 games with 40% win rate';
                  progressToNext = Math.min(100, (gamesWon / 10) * 100);
                }
                if (gamesWon >= 10 && winRate >= 40) {
                  skillLevel = 'expert';
                  nextMilestone = 'Master of American Mahjong';
                  progressToNext = 100;
                }

                const performanceStats: PerformanceStats = {
                  totalGames,
                  gamesWon,
                  winRate,
                  averageScore,
                  averageGameDuration,
                  decisionQualityTrend,
                  patternStats,
                  skillLevel,
                  nextMilestone,
                  progressToNext,
                };

                set(state => ({ history: { ...state.history, performanceStats } }));
              },
              generateLearningRecommendations: () => {
                const { completedGames, performanceStats } = _get().history;
                const recommendations: LearningRecommendation[] = [];

                if (completedGames.length >= 3) {
                  const recentGames = completedGames.slice(0, 3);
                  const avgDecisionQuality =
                    recentGames.reduce(
                      (sum, game) =>
                        sum +
                        (game.performance.excellentDecisions + game.performance.goodDecisions) /
                          game.performance.totalDecisions,
                      0
                    ) / recentGames.length;

                  if (avgDecisionQuality < 0.6) {
                    recommendations.push({
                      id: 'improve-decisions',
                      type: 'strategy',
                      priority: 'high',
                      title: 'Improve Decision Making',
                      description: 'Your recent decision quality could be improved',
                      actionable: 'Focus on following co-pilot recommendations more closely',
                      relatedGames: recentGames.map((g) => g.id),
                      estimatedImpact: 'Could improve win rate by 15-20%',
                    });
                  }

                  const strugglingPatterns = Object.entries(performanceStats.patternStats)
                    .filter(([, stats]) => stats.attempted >= 2 && stats.successRate < 30)
                    .slice(0, 2);

                  strugglingPatterns.forEach(([patternId, stats]) => {
                    recommendations.push({
                      id: `pattern-${patternId}`,
                      type: 'pattern',
                      priority: 'medium',
                      title: `Master Pattern: ${patternId}`,
                      description: `Success rate: ${stats.successRate.toFixed(1)}% - needs improvement`,
                      actionable: 'Practice this pattern in tutorial mode',
                      relatedGames: completedGames
                        .filter((g) => g.selectedPatterns.some((p) => p.Hands_Key === patternId))
                        .map((g) => g.id),
                      estimatedImpact: 'Focused practice could double success rate',
                    });
                  });
                }

                set(state => ({ history: { ...state.history, learningRecommendations: recommendations } }));
              },
              updateSkillLevel: (level) => {
                  set(state => ({ history: { ...state.history, performanceStats: { ...state.history.performanceStats, skillLevel: level } } }))
              },
              selectGame: (gameId) => {
                set((state) => ({ history: { ...state.history, selectedGameId: gameId } }));
              },
              setViewMode: (mode) => {
                set((state) => ({ history: { ...state.history, viewMode: mode } }));
              },
              setSorting: (sortBy, order) => {
                set((state) => ({ history: { ...state.history, sortBy, sortOrder: order } }));
              },
              setFilter: (filter) => {
                set((state) => ({ history: { ...state.history, filterBy: { ...state.history.filterBy, ...filter } } }));
              },
              clearFilters: () => {
                set((state) => ({ history: { ...state.history, filterBy: {} } }));
              },
              shareGame: async (gameId) => {
                const game = _get().history.completedGames.find((g) => g.id === gameId);
                if (game) {
                  set((state) => ({
                    history: {
                      ...state.history,
                      completedGames: state.history.completedGames.map((g) => (g.id === gameId ? { ...g, shared: true } : g)),
                    },
                  }));
                  return true;
                }
                return false;
              },
              voteOnGame: async () => true,
              addComment: async () => true,
              exportHistory: () => {
                const { completedGames, performanceStats } = _get().history;
                return JSON.stringify({ completedGames, performanceStats }, null, 2);
              },
              importHistory: async (data) => {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.completedGames && Array.isArray(parsed.completedGames)) {
                    set((state) => ({
                      history: {
                        ...state.history,
                        completedGames: parsed.completedGames,
                        performanceStats: parsed.performanceStats || defaultPerformanceStats,
                      },
                    }));
                    return true;
                  }
                  return false;
                } catch {
                  return false;
                }
              },
              clearHistory: () => {
                set((state) => ({
                  history: {
                    ...state.history,
                    completedGames: [],
                    performanceStats: defaultPerformanceStats,
                    learningRecommendations: [],
                    selectedGameId: null,
                  },
                }));
              },
              setError: (error) => {
                set((state) => ({ history: { ...state.history, error } }));
              },
              clearError: () => {
                set((state) => ({ history: { ...state.history, error: null } }));
              },
            },
          },
        };
      },
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          dev: state.dev,
          tutorial: { progress: state.tutorial.progress },
          history: {
            ...state.history,
            completedGames: state.history.completedGames.slice(-50),
            learningRecommendations: state.history.learningRecommendations.slice(-10),
          },
        }),
      }
    ),
    { name: 'UIStore' }
  )
);
