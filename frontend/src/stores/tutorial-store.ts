// Tutorial Store - Zustand state management for tutorial system
// Handles tutorial progress, user preferences, and navigation

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import type { 
  TutorialStore, 
  TutorialProgress, 
  UserPreferences, 
  SkillLevel, 
  TutorialSection 
} from '../features/tutorial/types'

// Default user preferences
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
}

// Default tutorial progress
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
}

export const useTutorialStore = create<TutorialStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        progress: defaultProgress,
        isActive: false,
        currentStep: null,
        canProceed: true,
        canGoBack: false,
        isLoading: false,
        demoMode: false,
        demoData: null,
        error: null,

        // Navigation actions
        startTutorial: () => {
          set((state) => ({
            isActive: true,
            progress: {
              ...state.progress,
              startTime: new Date(),
              lastActivity: new Date(),
            },
            error: null,
          }))
        },

        nextStep: () => {
          const state = get()
          if (!state.canProceed || !state.currentStep) return

          // Mark current step as completed
          const completedSteps = [...state.progress.completedSteps]
          if (!completedSteps.includes(state.currentStep.id)) {
            completedSteps.push(state.currentStep.id)
          }

          set({
            progress: {
              ...state.progress,
              completedSteps,
              lastActivity: new Date(),
            },
          })

          // Navigation logic will be handled by tutorial hook
        },

        previousStep: () => {
          const state = get()
          if (!state.canGoBack) return

          set({
            progress: {
              ...state.progress,
              lastActivity: new Date(),
            },
          })
        },

        goToStep: (stepId: string) => {
          set((state) => ({
            progress: {
              ...state.progress,
              currentStepId: stepId,
              lastActivity: new Date(),
            },
          }))
        },

        goToSection: (section: TutorialSection) => {
          set((state) => ({
            progress: {
              ...state.progress,
              currentSection: section,
              lastActivity: new Date(),
            },
          }))
        },

        completeTutorial: () => {
          const state = get()
          const endTime = new Date()
          const totalTime = Math.round(
            (endTime.getTime() - state.progress.startTime.getTime()) / 60000
          )

          set({
            isActive: false,
            progress: {
              ...state.progress,
              completedSections: ['welcome', 'pattern-basics', 'co-pilot-demo', 'skill-assessment', 'preferences', 'getting-started'],
              totalTimeSpent: totalTime,
              lastActivity: endTime,
            },
          })
        },

        skipTutorial: () => {
          set((state) => ({
            isActive: false,
            progress: {
              ...state.progress,
              skipTutorial: true,
              lastActivity: new Date(),
            },
          }))
        },

        // Progress management
        completeStep: (stepId: string) => {
          set((state) => {
            const completedSteps = [...state.progress.completedSteps]
            if (!completedSteps.includes(stepId)) {
              completedSteps.push(stepId)
            }

            return {
              progress: {
                ...state.progress,
                completedSteps,
                lastActivity: new Date(),
              },
            }
          })
        },

        updateProgress: (progressUpdate: Partial<TutorialProgress>) => {
          set((state) => ({
            progress: {
              ...state.progress,
              ...progressUpdate,
              lastActivity: new Date(),
            },
          }))
        },

        setSkillLevel: (level: SkillLevel) => {
          set((state) => ({
            progress: {
              ...state.progress,
              skillLevel: level,
              assessmentCompleted: true,
              lastActivity: new Date(),
            },
          }))
        },

        // Preferences management
        updatePreferences: (preferencesUpdate: Partial<UserPreferences>) => {
          set((state) => ({
            progress: {
              ...state.progress,
              selectedPreferences: {
                ...state.progress.selectedPreferences,
                ...preferencesUpdate,
              },
              lastActivity: new Date(),
            },
          }))
        },

        resetPreferences: () => {
          set((state) => ({
            progress: {
              ...state.progress,
              selectedPreferences: defaultPreferences,
              lastActivity: new Date(),
            },
          }))
        },

        // Demo control
        startDemo: (component: string) => {
          set({
            demoMode: true,
            demoData: { component },
            isLoading: false,
          })
        },

        stopDemo: () => {
          set({
            demoMode: false,
            demoData: null,
          })
        },

        // State management
        setError: (error: string | null) => {
          set({ error })
        },

        reset: () => {
          set({
            progress: defaultProgress,
            isActive: false,
            currentStep: null,
            canProceed: true,
            canGoBack: false,
            isLoading: false,
            demoMode: false,
            demoData: null,
            error: null,
          })
        },
      }),
      {
        name: 'mahjong-tutorial-storage',
        partialize: (state) => ({
          progress: state.progress,
        }),
      }
    ),
    {
      name: 'tutorial-store',
    }
  )
)

// Selectors for common use cases
export const useTutorialProgress = () => useTutorialStore((state) => state.progress)
export const useTutorialNavigation = () => useTutorialStore((state) => ({
  canProceed: state.canProceed,
  canGoBack: state.canGoBack,
  nextStep: state.nextStep,
  previousStep: state.previousStep,
  goToStep: state.goToStep,
  goToSection: state.goToSection,
}))
export const useTutorialPreferences = () => useTutorialStore((state) => ({
  preferences: state.progress.selectedPreferences,
  updatePreferences: state.updatePreferences,
  resetPreferences: state.resetPreferences,
}))
export const useTutorialDemo = () => useTutorialStore((state) => ({
  demoMode: state.demoMode,
  demoData: state.demoData,
  startDemo: state.startDemo,
  stopDemo: state.stopDemo,
}))