// Tutorial View - Main tutorial interface and orchestrator
// Handles tutorial navigation, progress display, and step rendering

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTutorial } from '../../hooks/useTutorial'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { Container } from '../../ui-components/layout/Container'
import type { TutorialViewProps, TutorialSection } from './types'

// Import tutorial section components
import { PatternLearning } from './PatternLearning'
import { CoPilotDemo } from './CoPilotDemo'
import { SkillAssessment } from './SkillAssessment'
import { PreferenceSetup } from './PreferenceSetup'

export const TutorialView: React.FC<TutorialViewProps> = ({
  initialSection,
  onComplete,
  onSkip,
}) => {
  const navigate = useNavigate()
  const {
    progress,
    isActive,
    currentStep,
    progressMetrics,
    isTransitioning,
    error,
    canNavigateNext,
    canNavigateBack,
    startTutorial,
    nextStep,
    previousStep,
    jumpToSection,
    completeTutorial,
    skipTutorial,
  } = useTutorial()

  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false)

  // Initialize tutorial
  useEffect(() => {
    if (!isActive) {
      startTutorial()
    }
    if (initialSection) {
      jumpToSection(initialSection)
    }
  }, [isActive, initialSection, startTutorial, jumpToSection])

  // Handle tutorial completion
  useEffect(() => {
    if (!isActive && progress.completedSections.length > 0 && !progress.skipTutorial) {
      onComplete?.()
    }
  }, [isActive, progress.completedSections, progress.skipTutorial, onComplete])

  // Handle tutorial skip
  const handleSkip = () => {
    if (showSkipConfirmation) {
      skipTutorial()
      onSkip?.()
      navigate('/')
    } else {
      setShowSkipConfirmation(true)
    }
  }

  // Handle tutorial completion
  const handleComplete = () => {
    completeTutorial()
    onComplete?.()
    navigate('/room-setup') // Navigate to Start Game (room setup)
  }

  // Render step content based on section
  const renderStepContent = () => {
    if (!currentStep) return null

    const section = currentStep.section

    switch (section) {
      case 'welcome':
      case 'getting-started':
        return (
          <div className="text-center space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-0">
            <div className="text-3xl sm:text-4xl lg:text-6xl mb-3 sm:mb-4">
              {section === 'welcome' ? '👋' : '🚀'}
            </div>
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{currentStep.title}</h2>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 w-full max-w-xs sm:max-w-md lg:max-w-2xl mx-auto leading-relaxed">
                {currentStep.description}
              </p>
              <div className="text-xs sm:text-sm lg:text-base text-gray-700 leading-relaxed w-full max-w-xs sm:max-w-sm lg:max-w-xl mx-auto">
                {currentStep.content}
              </div>
            </div>
          </div>
        )

      case 'pattern-basics':
        return (
          <PatternLearning
            skillLevel={progress.skillLevel}
            interactiveMode={currentStep.interactive}
          />
        )

      case 'co-pilot-demo':
        return (
          <CoPilotDemo
            feature={
              currentStep.id.includes('charleston') ? 'charleston' :
              currentStep.id.includes('tile-analysis') ? 'tile-analysis' :
              currentStep.id.includes('pattern') ? 'pattern-selection' :
              'full-game'
            }
            onComplete={() => nextStep()}
          />
        )

      case 'skill-assessment':
        return (
          <SkillAssessment
            onComplete={() => {
              // Skill level is automatically saved by the hook
              nextStep()
            }}
            onSkip={() => nextStep()}
          />
        )

      case 'preferences':
        return (
          <PreferenceSetup
            currentPreferences={progress.selectedPreferences}
            onSave={() => {
              // Preferences are automatically saved by the hook
              nextStep()
            }}
            onSkip={() => nextStep()}
          />
        )

      default:
        return (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">{currentStep.title}</h2>
            <p className="text-gray-600">{currentStep.description}</p>
            <div className="text-gray-700">{currentStep.content}</div>
          </div>
        )
    }
  }

  // Render section navigation breadcrumbs
  const renderSectionNavigation = () => {
    const sections: { id: TutorialSection; label: string; icon: string }[] = [
      { id: 'welcome', label: 'Welcome', icon: '👋' },
      { id: 'pattern-basics', label: 'Patterns', icon: '🎯' },
      { id: 'co-pilot-demo', label: 'Demo', icon: '🤖' },
      { id: 'skill-assessment', label: 'Assessment', icon: '📊' },
      { id: 'preferences', label: 'Settings', icon: '⚙️' },
      { id: 'getting-started', label: 'Ready!', icon: '🚀' },
    ]

    return (
      <div className="flex justify-center mb-6 sm:mb-8 overflow-x-auto">
        <div className="flex items-center space-x-1 sm:space-x-2 bg-white rounded-full px-3 sm:px-6 py-2 sm:py-3 shadow-sm border min-w-max">
          {sections.map((section, index) => {
            const isCompleted = progress.completedSections.includes(section.id)
            const isCurrent = progress.currentSection === section.id
            const isAccessible = index <= sections.findIndex(s => s.id === progress.currentSection)

            return (
              <React.Fragment key={section.id}>
                <button
                  onClick={() => isAccessible ? jumpToSection(section.id) : undefined}
                  className={`
                    flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap
                    ${isCompleted ? 'bg-green-100 text-green-800' : ''}
                    ${isCurrent ? 'bg-blue-100 text-blue-800' : ''}
                    ${!isCompleted && !isCurrent && isAccessible ? 'hover:bg-gray-100 text-gray-600' : ''}
                    ${!isAccessible ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  disabled={!isAccessible}
                >
                  <span className="text-base sm:text-lg">{section.icon}</span>
                  <span className="hidden sm:inline">{section.label}</span>
                  {isCompleted && <span className="text-green-600 text-xs sm:text-sm">✓</span>}
                </button>
                {index < sections.length - 1 && (
                  <div className="w-2 h-0.5 bg-gray-300"></div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    )
  }

  // Show loading state
  if (isTransitioning) {
    return (
      <Container className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </Container>
    )
  }

  // Show error state
  if (error) {
    return (
      <Container className="min-h-screen flex items-center justify-center">
        <Card variant="elevated" className="p-8 text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Restart Tutorial
          </Button>
        </Card>
      </Container>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Container className="py-4 sm:py-8 px-2 sm:px-4 lg:px-6">
        {/* Header with progress */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Mahjong Co-Pilot Tutorial</h1>
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                <span>⏱️ {progressMetrics.estimatedTimeRemaining} min remaining</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {showSkipConfirmation ? (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSkipConfirmation(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkip}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Yes, Skip Tutorial
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  Skip Tutorial
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressMetrics.progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Step {progressMetrics.currentIndex + 1} of {progressMetrics.totalSteps}</span>
            <span>{progressMetrics.progressPercentage}% complete</span>
          </div>
        </div>

        {/* Section Navigation */}
        {renderSectionNavigation()}

        {/* Main Content */}
        <Card variant="elevated" className="w-full max-w-4xl mx-auto">
          <div className="p-3 sm:p-6 lg:p-8">
            {renderStepContent()}
          </div>

          {/* Navigation Footer */}
          <div className="border-t border-gray-200 px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex items-center space-x-2 sm:space-x-4">
                {canNavigateBack && (
                  <Button
                    variant="outline"
                    onClick={previousStep}
                    disabled={isTransitioning}
                    size="sm"
                    className="sm:text-base"
                  >
                    ← {currentStep?.prevButtonText || 'Previous'}
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                {currentStep?.canSkip && (
                  <Button
                    variant="ghost"
                    onClick={nextStep}
                    disabled={isTransitioning}
                    size="sm"
                    className="sm:text-base"
                  >
                    Skip this step
                  </Button>
                )}
                
                {canNavigateNext && (
                  <Button
                    variant="primary"
                    onClick={currentStep?.section === 'getting-started' ? handleComplete : nextStep}
                    disabled={isTransitioning}
                    size="sm"
                    className="min-w-[120px] sm:text-base font-medium"
                  >
                    {isTransitioning ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      currentStep?.nextButtonText || 
                      (currentStep?.section === 'getting-started' ? 'Start Playing!' : 'Next')
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Step description footer */}
            {currentStep && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  {currentStep.description}
                  {currentStep.timeEstimate && (
                    <span className="ml-2">• ~{currentStep.timeEstimate} min</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </Card>
      </Container>
    </div>
  )
}