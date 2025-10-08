// Tutorial Management Hook
// High-level tutorial logic, step management, and navigation

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useUIStore } from '../stores';
import type { TutorialStep, TutorialSection, SkillLevel } from '../features/tutorial/types';

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
];

export function useTutorial() {
  const tutorialState = useUIStore((s) => s.tutorial);
  const tutorialActions = useUIStore((s) => s.actions.tutorial);

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get current step from step definitions
  const currentStep = useMemo(() => {
    return tutorialSteps.find(step => step.id === tutorialState.progress.currentStepId) || tutorialSteps[0];
  }, [tutorialState.progress.currentStepId]);

  // Get steps for current section
  const currentSectionSteps = useMemo(() => {
    return tutorialSteps.filter(step => step.section === tutorialState.progress.currentSection);
  }, [tutorialState.progress.currentSection]);

  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    const relevantSteps = tutorialSteps.filter(step => 
      !step.showForSkillLevels || step.showForSkillLevels.includes(tutorialState.progress.skillLevel)
    );
    
    const totalSteps = relevantSteps.length;
    const completedCount = tutorialState.progress.completedSteps.length;
    const currentIndex = relevantSteps.findIndex(step => step.id === tutorialState.progress.currentStepId);
    
    return {
      totalSteps,
      completedCount,
      currentIndex: Math.max(0, currentIndex),
      progressPercentage: Math.round((Math.max(0, currentIndex) / Math.max(1, totalSteps - 1)) * 100),
      estimatedTimeRemaining: relevantSteps
        .slice(Math.max(0, currentIndex + 1))
        .reduce((total, step) => total + (step.timeEstimate || 0), 0),
    };
  }, [tutorialState.progress.completedSteps, tutorialState.progress.currentStepId, tutorialState.progress.skillLevel]);

  // Navigation helpers
  const canNavigateNext = useMemo(() => {
    if (!currentStep) return false;
    
    // Check validation requirements
    if (currentStep.validationRequired) {
      switch (currentStep.id) {
        case 'pattern-selection':
          return tutorialState.progress.completedSteps.includes('pattern-selection') || tutorialState.progress.currentStepId !== 'pattern-selection';
        case 'tile-input':
          return tutorialState.progress.completedSteps.includes('tile-input');
        case 'charleston-demo':
          return tutorialState.progress.completedSteps.includes('charleston-demo');
        case 'skill-assessment':
          return tutorialState.progress.assessmentCompleted;
        default:
          return tutorialState.progress.completedSteps.includes(currentStep.id) || tutorialState.progress.currentStepId !== currentStep.id;
      }
    }

    if (currentStep.requiresPrevious) {
      return currentStep.requiresPrevious.every(stepId => 
        tutorialState.progress.completedSteps.includes(stepId)
      );
    }

    return tutorialState.canProceed;
  }, [
    currentStep, 
    tutorialState.progress.completedSteps, 
    tutorialState.progress.currentStepId,
    tutorialState.progress.assessmentCompleted,
    tutorialState.canProceed
  ]);

  const canNavigateBack = useMemo(() => {
    if (!currentStep) return false;
    return currentStep.canGoBack !== false && tutorialState.canGoBack;
  }, [currentStep, tutorialState.canGoBack]);

  // Navigation actions with transitions
  const nextStep = useCallback(async () => {
    if (!canNavigateNext || isTransitioning) return;

    setIsTransitioning(true);
    try {
      if (currentStep) {
        tutorialActions.completeStep(currentStep.id);
      }

      const currentIndex = tutorialSteps.findIndex(step => step.id === tutorialState.progress.currentStepId);
      const nextStepIndex = currentIndex + 1;

      if (nextStepIndex < tutorialSteps.length) {
        const nextStep = tutorialSteps[nextStepIndex];
        tutorialActions.goToStep(nextStep.id);
        
        if (nextStep.section !== tutorialState.progress.currentSection) {
          tutorialActions.goToSection(nextStep.section);
        }
      } else {
        tutorialActions.completeTutorial();
      }

      tutorialActions.nextStep();
    } catch (error) {
      console.error('Error navigating to next step:', error);
      tutorialActions.setError('Failed to navigate to next step');
    } finally {
      setIsTransitioning(false);
    }
  }, [canNavigateNext, isTransitioning, currentStep, tutorialActions, tutorialState.progress.currentStepId, tutorialState.progress.currentSection]);

  const previousStep = useCallback(async () => {
    if (!canNavigateBack || isTransitioning) return;

    setIsTransitioning(true);
    try {
      const currentIndex = tutorialSteps.findIndex(step => step.id === tutorialState.progress.currentStepId);
      const prevStepIndex = currentIndex - 1;

      if (prevStepIndex >= 0) {
        const prevStep = tutorialSteps[prevStepIndex];
        tutorialActions.goToStep(prevStep.id);
        
        if (prevStep.section !== tutorialState.progress.currentSection) {
          tutorialActions.goToSection(prevStep.section);
        }
      }

      tutorialActions.previousStep();
    } catch (error) {
      console.error('Error navigating to previous step:', error);
      tutorialActions.setError('Failed to navigate to previous step');
    } finally {
      setIsTransitioning(false);
    }
  }, [canNavigateBack, isTransitioning, tutorialState.progress.currentStepId, tutorialState.progress.currentSection, tutorialActions]);

  // Jump to section
  const jumpToSection = useCallback((section: TutorialSection) => {
    const sectionFirstStep = tutorialSteps.find(step => step.section === section);
    if (sectionFirstStep) {
      tutorialActions.goToSection(section);
      tutorialActions.goToStep(sectionFirstStep.id);
    }
  }, [tutorialActions]);

  // Skill level assessment
  const assessSkillLevel = useCallback((answers: Record<string, unknown>) => {
    let score = 0;
    
    if (answers.experienceYears && typeof answers.experienceYears === 'number') {
      if (answers.experienceYears >= 10) score += 3;
      else if (answers.experienceYears >= 5) score += 2;
      else if (answers.experienceYears >= 2) score += 1;
    }
    
    if (answers.gamesPerMonth && typeof answers.gamesPerMonth === 'number') {
      if (answers.gamesPerMonth >= 12) score += 3;
      else if (answers.gamesPerMonth >= 8) score += 2;
      else if (answers.gamesPerMonth >= 4) score += 1;
    }
    
    if (answers.patternsKnown && typeof answers.patternsKnown === 'number') {
      if (answers.patternsKnown >= 50) score += 3;
      else if (answers.patternsKnown >= 25) score += 2;
      else if (answers.patternsKnown >= 10) score += 1;
    }
    
    if (answers.charlestonConfidence && typeof answers.charlestonConfidence === 'number') {
      if (answers.charlestonConfidence >= 8) score += 2;
      else if (answers.charlestonConfidence >= 5) score += 1;
    }
    
    if (answers.strategyUnderstanding && typeof answers.strategyUnderstanding === 'string') {
      switch (answers.strategyUnderstanding) {
        case 'advanced':
          score += 3;
          break;
        case 'intermediate':
          score += 2;
          break;
        case 'basic':
          score += 1;
          break;
      }
    }
    
    if (answers.competitiveExperience === true) {
      score += 2;
    } else if (answers.competitiveExperience === 'some') {
      score += 1;
    }

    let skillLevel: SkillLevel = 'beginner';
    if (score >= 12) skillLevel = 'expert';
    else if (score >= 6) skillLevel = 'intermediate';

    tutorialActions.setSkillLevel(skillLevel);
    
    tutorialActions.updateProgress({
      assessmentCompleted: true,
      skillLevel,
    });
    
    return skillLevel;
  }, [tutorialActions]);

  // Auto-save progress
  useEffect(() => {
    if (tutorialState.isActive) {
      const interval = setInterval(() => {
        tutorialActions.updateProgress({
          lastActivity: new Date(),
        });
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [tutorialState.isActive, tutorialActions]);

  return {
    // State
    progress: tutorialState.progress,
    isActive: tutorialState.isActive,
    currentStep,
    currentSectionSteps,
    progressMetrics,
    isTransitioning,
    error: tutorialState.error,

    // Navigation state
    canNavigateNext,
    canNavigateBack,

    // Actions
    startTutorial: tutorialActions.startTutorial,
    nextStep,
    previousStep,
    jumpToSection,
    goToStep: tutorialActions.goToStep,
    goToSection: tutorialActions.goToSection,
    completeTutorial: tutorialActions.completeTutorial,
    skipTutorial: tutorialActions.skipTutorial,

    // Assessment
    assessSkillLevel,

    // Utilities
    allSteps: tutorialSteps,
    getStepById: (id: string) => tutorialSteps.find(step => step.id === id),
    getStepsBySection: (section: TutorialSection) => 
      tutorialSteps.filter(step => step.section === section),
  };
}
