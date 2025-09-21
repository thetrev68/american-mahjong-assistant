import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface UIState {
  // User Preferences
  theme: 'light' | 'dark'
  skillLevel: 'beginner' | 'intermediate' | 'expert'
  animationsEnabled: boolean
  hapticFeedbackEnabled: boolean
  soundEnabled: boolean
  
  // UI State
  sidebarOpen: boolean
  
  // Tutorial State
  tutorialCompleted: boolean
  onboardingStep: number
  
  // Actions
  setTheme: (theme: UIState['theme']) => void
  setSkillLevel: (level: UIState['skillLevel']) => void
  setAnimationsEnabled: (enabled: boolean) => void
  setHapticFeedback: (enabled: boolean) => void
  setSoundEnabled: (enabled: boolean) => void
  setSidebarOpen: (open: boolean) => void
  setTutorialCompleted: (completed: boolean) => void
  setOnboardingStep: (step: number) => void
  resetUIState: () => void
}

const initialState = {
  theme: 'light' as const,
  skillLevel: 'intermediate' as const,
  animationsEnabled: true,
  hapticFeedbackEnabled: true,
  soundEnabled: true,
  sidebarOpen: false,
  tutorialCompleted: false,
  onboardingStep: 0,
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        setTheme: (theme) => 
          set({ theme }, false, 'setTheme'),
        
        setSkillLevel: (skillLevel) =>
          set({ skillLevel }, false, 'setSkillLevel'),
        
        setAnimationsEnabled: (animationsEnabled) =>
          set({ animationsEnabled }, false, 'setAnimationsEnabled'),
        
        setHapticFeedback: (hapticFeedbackEnabled) =>
          set({ hapticFeedbackEnabled }, false, 'setHapticFeedback'),
        
        setSoundEnabled: (soundEnabled) =>
          set({ soundEnabled }, false, 'setSoundEnabled'),
        
        setSidebarOpen: (sidebarOpen) =>
          set({ sidebarOpen }, false, 'setSidebarOpen'),
        
        
        setTutorialCompleted: (tutorialCompleted) =>
          set({ tutorialCompleted }, false, 'setTutorialCompleted'),
        
        setOnboardingStep: (onboardingStep) =>
          set({ onboardingStep }, false, 'setOnboardingStep'),
        
        resetUIState: () =>
          set(initialState, false, 'resetUIState'),
      }),
      {
        name: 'ui-store', // localStorage key
        partialize: (state) => ({
          // Persist user preferences to localStorage - permanent across sessions
          // These settings should survive browser restart and app updates
          theme: state.theme,
          skillLevel: state.skillLevel,
          animationsEnabled: state.animationsEnabled,
          hapticFeedbackEnabled: state.hapticFeedbackEnabled,
          soundEnabled: state.soundEnabled,
          tutorialCompleted: state.tutorialCompleted,
        }),
      }
    ),
    {
      name: 'ui-store', // DevTools name
    }
  )
)