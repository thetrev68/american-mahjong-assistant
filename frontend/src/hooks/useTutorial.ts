// Tutorial Management Hook
// High-level tutorial logic, step management, and navigation

import { useCallback, useMemo, useEffect, useState } from 'react'
import { useTutorialStore } from '../stores/tutorial-store'
import type { TutorialStep, TutorialSection, SkillLevel } from '../features/tutorial/types'

// Tutorial step definitions
const tutorialSteps: TutorialStep[] = [
  // Welcome Section
  {
    id: 'welcome-start',
    section: 'welcome',
    title: 'Welcome to Your Mahjong Co-Pilot!',
    description: 'Learn how to use AI assistance to improve your American Mahjong game',
    content: 'Your personal AI co-pilot will help you make better decisions while playing with physical tiles and friends.',
    canSkip: true,
    nextButtonText: 'Get Started',
    timeEstimate: 1,
  },
  {
    id: 'welcome-overview',
    section: 'welcome',
    title: 'What You\'ll Learn',
    description: 'Quick overview of co-pilot features',
    content: 'We\'ll cover pattern selection, tile analysis, charleston strategy, and how to customize your co-pilot experience.',
    canGoBack: true,
    nextButtonText: 'Continue',
    timeEstimate: 1,
  },

  // Pattern Basics Section
  {
    id: 'pattern-intro',
    section: 'pattern-basics',
    title: 'NMJL Patterns Made Simple',
    description: 'Understanding the 2025 National Mah Jongg League card',
    content: 'Let\'s explore how to read and choose patterns from the official NMJL card.',
    canGoBack: true,
    interactive: true,
    timeEstimate: 3,
  },
  {
    id: 'pattern-selection',
    section: 'pattern-basics',
    title: 'Choosing Your Target Patterns',
    description: 'Learn to select multiple patterns strategically',
    content: 'The key to success is keeping your options open by targeting 2-3 compatible patterns.',
    canGoBack: true,
    interactive: true,
    timeEstimate: 4,
  },
  {
    id: 'pattern-difficulty',
    section: 'pattern-basics',
    title: 'Pattern Difficulty & Points',
    description: 'Balancing risk and reward',
    content: 'Understand how pattern difficulty affects your chances and point values.',
    canGoBack: true,
    timeEstimate: 2,
  },

  // Co-Pilot Demo Section
  {
    id: 'demo-intro',
    section: 'co-pilot-demo',
    title: 'Meet Your AI Co-Pilot',
    description: 'See how AI assistance works in real gameplay',
    content: 'Your co-pilot analyzes your tiles and suggests the best moves without taking control.',
    canGoBack: true,
    interactive: true,
    timeEstimate: 2,
  },
  {
    id: 'demo-tile-analysis',
    section: 'co-pilot-demo',
    title: 'Intelligent Tile Analysis',
    description: 'Get recommendations for every tile decision',
    content: 'See which tiles to keep, pass, or discard based on your selected patterns.',
    canGoBack: true,
    interactive: true,
    // demoComponent: TileAnalysisDemo, // Would need to import component
    timeEstimate: 3,
  },
  {
    id: 'demo-charleston',
    section: 'co-pilot-demo',
    title: 'Charleston Strategy',
    description: 'Master the opening tile exchanges',
    content: 'Learn optimal charleston decisions to set up your hand for success.',
    canGoBack: true,
    interactive: true,
    // demoComponent: CharlestonDemo, // Would need to import component
    timeEstimate: 3,
  },

  // Skill Assessment Section
  {
    id: 'assessment-intro',
    section: 'skill-assessment',
    title: 'Skill Assessment',
    description: 'Help us customize your experience',
    content: 'Answer a few questions to personalize your co-pilot assistance level.',
    canGoBack: true,
    nextButtonText: 'Start Assessment',
    timeEstimate: 2,
  },
  {
    id: 'assessment-questions',
    section: 'skill-assessment',
    title: 'Quick Assessment',
    description: 'Tell us about your mahjong experience',
    content: 'This helps us adjust the assistance level and explanations.',
    canGoBack: true,
    interactive: true,
    validationRequired: true,
    timeEstimate: 3,
  },

  // Preferences Section
  {
    id: 'preferences-intro',
    section: 'preferences',
    title: 'Customize Your Co-Pilot',
    description: 'Set up your preferences for the best experience',
    content: 'Configure how your co-pilot provides assistance and displays information.',
    canGoBack: true,
    timeEstimate: 1,
  },
  {
    id: 'preferences-assistance',
    section: 'preferences',
    title: 'Assistance Level',
    description: 'Choose how much help you want',
    content: 'From minimal hints to detailed explanations - it\'s your choice.',
    canGoBack: true,
    interactive: true,
    timeEstimate: 2,
  },
  {
    id: 'preferences-visual',
    section: 'preferences',
    title: 'Visual Preferences',
    description: 'Customize the look and feel',
    content: 'Adjust animations, colors, and tile sizes for your comfort.',
    canGoBack: true,
    interactive: true,
    timeEstimate: 2,
  },

  // Getting Started Section
  {
    id: 'getting-started',
    section: 'getting-started',
    title: 'You\'re Ready to Play!',
    description: 'Start using your AI co-pilot',
    content: 'Choose patterns, input tiles, and let your co-pilot guide you to victory.',
    canGoBack: true,
    nextButtonText: 'Start Playing',
    timeEstimate: 1,
  },
]

export function useTutorial() {
  const {
    progress,
    isActive,
    currentStep: _storeCurrentStep,
    canProceed,
    canGoBack,
    error,
    startTutorial,
    nextStep: storeNextStep,
    previousStep: storePreviousStep,
    goToStep,
    goToSection,
    completeTutorial,
    skipTutorial,
    completeStep,
    updateProgress,
    setSkillLevel,
    setError,
  } = useTutorialStore()

  const [isTransitioning, setIsTransitioning] = useState(false)

  // Get current step from step definitions
  const currentStep = useMemo(() => {
    return tutorialSteps.find(step => step.id === progress.currentStepId) || tutorialSteps[0]
  }, [progress.currentStepId])

  // Get steps for current section
  const currentSectionSteps = useMemo(() => {
    return tutorialSteps.filter(step => step.section === progress.currentSection)
  }, [progress.currentSection])

  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    // Filter steps by skill level first
    const relevantSteps = tutorialSteps.filter(step => 
      !step.showForSkillLevels || step.showForSkillLevels.includes(progress.skillLevel)
    )
    
    const totalSteps = relevantSteps.length
    const completedCount = progress.completedSteps.length
    const currentIndex = relevantSteps.findIndex(step => step.id === progress.currentStepId)
    
    return {
      totalSteps,
      completedCount,
      currentIndex: Math.max(0, currentIndex),
      progressPercentage: Math.round((Math.max(0, currentIndex) / Math.max(1, totalSteps - 1)) * 100),
      estimatedTimeRemaining: relevantSteps
        .slice(Math.max(0, currentIndex + 1))
        .reduce((total, step) => total + (step.timeEstimate || 0), 0),
    }
  }, [progress.completedSteps, progress.currentStepId, progress.skillLevel])

  // Navigation helpers
  const canNavigateNext = useMemo(() => {
    if (!currentStep) return false
    
    // Check validation requirements
    if (currentStep.validationRequired) {
      // Add specific validation logic here
      return true // Placeholder
    }

    // Check step dependencies
    if (currentStep.requiresPrevious) {
      return currentStep.requiresPrevious.every(stepId => 
        progress.completedSteps.includes(stepId)
      )
    }

    return canProceed
  }, [currentStep, progress.completedSteps, canProceed])

  const canNavigateBack = useMemo(() => {
    if (!currentStep) return false
    return currentStep.canGoBack !== false && canGoBack
  }, [currentStep, canGoBack])

  // Navigation actions with transitions
  const nextStep = useCallback(async () => {
    if (!canNavigateNext || isTransitioning) return

    setIsTransitioning(true)
    try {
      // Mark current step as completed
      if (currentStep) {
        completeStep(currentStep.id)
      }

      // Find next step
      const currentIndex = tutorialSteps.findIndex(step => step.id === progress.currentStepId)
      const nextStepIndex = currentIndex + 1

      if (nextStepIndex < tutorialSteps.length) {
        const nextStep = tutorialSteps[nextStepIndex]
        goToStep(nextStep.id)
        
        // Update section if changed
        if (nextStep.section !== progress.currentSection) {
          goToSection(nextStep.section)
        }
      } else {
        // Tutorial completed
        completeTutorial()
      }

      storeNextStep()
    } catch (error) {
      console.error('Error navigating to next step:', error)
      setError('Failed to navigate to next step')
    } finally {
      setIsTransitioning(false)
    }
  }, [canNavigateNext, isTransitioning, currentStep, completeStep, progress.currentStepId, progress.currentSection, goToStep, goToSection, completeTutorial, storeNextStep, setError])

  const previousStep = useCallback(async () => {
    if (!canNavigateBack || isTransitioning) return

    setIsTransitioning(true)
    try {
      // Find previous step
      const currentIndex = tutorialSteps.findIndex(step => step.id === progress.currentStepId)
      const prevStepIndex = currentIndex - 1

      if (prevStepIndex >= 0) {
        const prevStep = tutorialSteps[prevStepIndex]
        goToStep(prevStep.id)
        
        // Update section if changed
        if (prevStep.section !== progress.currentSection) {
          goToSection(prevStep.section)
        }
      }

      storePreviousStep()
    } catch (error) {
      console.error('Error navigating to previous step:', error)
      setError('Failed to navigate to previous step')
    } finally {
      setIsTransitioning(false)
    }
  }, [canNavigateBack, isTransitioning, progress.currentStepId, progress.currentSection, goToStep, goToSection, storePreviousStep, setError])

  // Jump to section
  const jumpToSection = useCallback((section: TutorialSection) => {
    const sectionFirstStep = tutorialSteps.find(step => step.section === section)
    if (sectionFirstStep) {
      goToSection(section)
      goToStep(sectionFirstStep.id)
    }
  }, [goToSection, goToStep])

  // Skill level assessment
  const assessSkillLevel = useCallback((answers: Record<string, unknown>) => {
    // Simple skill assessment logic
    // In a real implementation, this would be more sophisticated
    let score = 0
    
    // Example assessment logic (placeholder)
    if (answers.experienceYears && typeof answers.experienceYears === 'number') {
      if (answers.experienceYears >= 5) score += 2
      else if (answers.experienceYears >= 2) score += 1
    }
    
    if (answers.gamesPerMonth && typeof answers.gamesPerMonth === 'number') {
      if (answers.gamesPerMonth >= 8) score += 2
      else if (answers.gamesPerMonth >= 4) score += 1
    }

    // Determine skill level
    let skillLevel: SkillLevel = 'beginner'
    if (score >= 4) skillLevel = 'expert'
    else if (score >= 2) skillLevel = 'intermediate'

    setSkillLevel(skillLevel)
    return skillLevel
  }, [setSkillLevel])

  // Auto-save progress
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        updateProgress({
          lastActivity: new Date(),
        })
      }, 30000) // Save every 30 seconds

      return () => clearInterval(interval)
    }
  }, [isActive, updateProgress])

  return {
    // State
    progress,
    isActive,
    currentStep,
    currentSectionSteps,
    progressMetrics,
    isTransitioning,
    error,

    // Navigation state
    canNavigateNext,
    canNavigateBack,

    // Actions
    startTutorial,
    nextStep,
    previousStep,
    jumpToSection,
    goToStep,
    goToSection,
    completeTutorial,
    skipTutorial,

    // Assessment
    assessSkillLevel,

    // Utilities
    allSteps: tutorialSteps,
    getStepById: (id: string) => tutorialSteps.find(step => step.id === id),
    getStepsBySection: (section: TutorialSection) => 
      tutorialSteps.filter(step => step.section === section),
  }
}