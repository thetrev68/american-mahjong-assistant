// Tutorial System Types
// Comprehensive type definitions for the tutorial and onboarding system

export type SkillLevel = 'beginner' | 'intermediate' | 'expert'

export type TutorialSection = 
  | 'welcome'
  | 'pattern-basics'
  | 'co-pilot-demo'
  | 'skill-assessment'
  | 'preferences'
  | 'getting-started'

export interface TutorialStep {
  id: string
  section: TutorialSection
  title: string
  description: string
  content: React.ReactNode | string
  
  // Navigation
  canSkip?: boolean
  canGoBack?: boolean
  nextButtonText?: string
  prevButtonText?: string
  
  // Interactive elements
  interactive?: boolean
  demoComponent?: React.ComponentType
  validationRequired?: boolean
  
  // Progress tracking
  timeEstimate?: number // in minutes
  completionCriteria?: string[]
  
  // Conditional display
  showForSkillLevels?: SkillLevel[]
  requiresPrevious?: string[] // step IDs that must be completed
}

export interface TutorialProgress {
  currentSection: TutorialSection
  currentStepId: string
  completedSteps: string[]
  completedSections: TutorialSection[]
  
  // User assessment
  skillLevel: SkillLevel
  assessmentCompleted: boolean
  
  // Time tracking
  startTime: Date
  lastActivity: Date
  totalTimeSpent: number // in minutes
  
  // User choices
  selectedPreferences: UserPreferences
  skipTutorial: boolean
}

export interface UserPreferences {
  // Co-pilot behavior
  assistanceLevel: 'minimal' | 'moderate' | 'detailed'
  autoSuggestions: boolean
  hapticFeedback: boolean
  
  // Visual preferences
  animationsEnabled: boolean
  colorScheme: 'light' | 'dark' | 'system'
  tileSize: 'small' | 'medium' | 'large'
  
  // Gameplay preferences
  confirmActions: boolean
  showPatternProgress: boolean
  enableStatistics: boolean
  
  // Tutorial preferences
  showHints: boolean
  pauseForExplanations: boolean
  interactiveMode: boolean
}

export interface TutorialState {
  // Progress tracking
  progress: TutorialProgress
  isActive: boolean
  currentStep: TutorialStep | null
  
  // Navigation state
  canProceed: boolean
  canGoBack: boolean
  isLoading: boolean
  
  // Demo state
  demoMode: boolean
  demoData: unknown | null
  
  // Error handling
  error: string | null
}

export interface TutorialActions {
  // Navigation
  startTutorial: () => void
  nextStep: () => void
  previousStep: () => void
  goToStep: (stepId: string) => void
  goToSection: (section: TutorialSection) => void
  completeTutorial: () => void
  skipTutorial: () => void
  
  // Progress
  completeStep: (stepId: string) => void
  updateProgress: (progress: Partial<TutorialProgress>) => void
  setSkillLevel: (level: SkillLevel) => void
  
  // Preferences
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  resetPreferences: () => void
  
  // Demo control
  startDemo: (component: string) => void
  stopDemo: () => void
  
  // State management
  setError: (error: string | null) => void
  reset: () => void
}

export type TutorialStore = TutorialState & TutorialActions

// Component Props Types
export interface TutorialViewProps {
  initialSection?: TutorialSection
  onComplete?: () => void
  onSkip?: () => void
}

export interface PatternLearningProps {
  skillLevel: SkillLevel
  onPatternSelect?: (patternId: string) => void
  interactiveMode?: boolean
}

export interface CoPilotDemoProps {
  feature: 'pattern-selection' | 'tile-analysis' | 'charleston' | 'full-game'
  onComplete?: () => void
}

export interface SkillAssessmentProps {
  onComplete: (skillLevel: SkillLevel) => void
  onSkip?: () => void
}

export interface PreferenceSetupProps {
  currentPreferences: UserPreferences
  onSave: (preferences: UserPreferences) => void
  onSkip?: () => void
}