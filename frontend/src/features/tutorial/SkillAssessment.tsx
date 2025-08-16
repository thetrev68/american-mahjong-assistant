// Skill Assessment Component
// Determines user's mahjong experience level for personalized assistance

import React, { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import type { SkillAssessmentProps, SkillLevel } from './types'

interface AssessmentQuestion {
  id: string
  question: string
  options: { value: string; label: string; points: number }[]
}

const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: 'experience',
    question: 'How long have you been playing American Mahjong?',
    options: [
      { value: 'new', label: 'I\'m completely new to the game', points: 0 },
      { value: 'learning', label: 'Less than 6 months', points: 1 },
      { value: 'casual', label: '6 months to 2 years', points: 2 },
      { value: 'regular', label: '2-5 years', points: 3 },
      { value: 'experienced', label: '5+ years', points: 4 },
    ],
  },
  {
    id: 'frequency',
    question: 'How often do you play?',
    options: [
      { value: 'never', label: 'I haven\'t played yet', points: 0 },
      { value: 'rarely', label: 'A few times a year', points: 1 },
      { value: 'monthly', label: 'Monthly', points: 2 },
      { value: 'weekly', label: 'Weekly', points: 3 },
      { value: 'daily', label: 'Multiple times per week', points: 4 },
    ],
  },
  {
    id: 'patterns',
    question: 'How comfortable are you with NMJL patterns?',
    options: [
      { value: 'confused', label: 'What are patterns?', points: 0 },
      { value: 'basic', label: 'I know some basic patterns', points: 1 },
      { value: 'familiar', label: 'I understand most patterns', points: 2 },
      { value: 'comfortable', label: 'I can read the card well', points: 3 },
      { value: 'expert', label: 'I memorize patterns and strategy', points: 4 },
    ],
  },
  {
    id: 'charleston',
    question: 'How well do you understand the Charleston?',
    options: [
      { value: 'unknown', label: 'I don\'t know what that is', points: 0 },
      { value: 'basic', label: 'I know the basic passing rules', points: 1 },
      { value: 'strategic', label: 'I use basic strategy', points: 2 },
      { value: 'advanced', label: 'I use advanced Charleston tactics', points: 3 },
      { value: 'master', label: 'I can read opponents\' discards', points: 4 },
    ],
  },
  {
    id: 'goals',
    question: 'What\'s your main goal with this co-pilot?',
    options: [
      { value: 'learn', label: 'Learn the basics of the game', points: 0 },
      { value: 'improve', label: 'Improve my casual play', points: 1 },
      { value: 'strategy', label: 'Develop better strategy', points: 2 },
      { value: 'competitive', label: 'Play more competitively', points: 3 },
      { value: 'expert', label: 'Master advanced techniques', points: 4 },
    ],
  },
]

export const SkillAssessment: React.FC<SkillAssessmentProps> = ({
  onComplete,
  onSkip,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [showResults, setShowResults] = useState(false)

  const handleAnswer = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)

    // Auto-advance to next question
    if (currentQuestion < assessmentQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1)
      }, 500)
    } else {
      // All questions answered, show results
      setTimeout(() => {
        setShowResults(true)
      }, 500)
    }
  }

  const calculateSkillLevel = (): SkillLevel => {
    let totalPoints = 0
    let answeredQuestions = 0

    for (const question of assessmentQuestions) {
      const answer = answers[question.id]
      if (answer) {
        const option = question.options.find(opt => opt.value === answer)
        if (option) {
          totalPoints += option.points
          answeredQuestions++
        }
      }
    }

    if (answeredQuestions === 0) return 'beginner'

    const averageScore = totalPoints / answeredQuestions

    if (averageScore >= 3) return 'expert'
    if (averageScore >= 1.5) return 'intermediate'
    return 'beginner'
  }

  const getSkillLevelDescription = (level: SkillLevel) => {
    switch (level) {
      case 'beginner':
        return {
          title: 'Welcome, Beginner!',
          description: 'Perfect! Your co-pilot will provide detailed explanations and gentle guidance to help you learn the fundamentals.',
          features: [
            '📚 Detailed pattern explanations',
            '🎯 Simplified recommendations',
            '💡 Educational tips and hints',
            '🚀 Step-by-step guidance'
          ]
        }
      case 'intermediate':
        return {
          title: 'Great, Intermediate Player!',
          description: 'Your co-pilot will balance helpful suggestions with room for your own strategic thinking.',
          features: [
            '⚖️ Balanced assistance level',
            '📈 Strategy insights',
            '🎲 Probability calculations',
            '🔄 Advanced charleston tips'
          ]
        }
      case 'expert':
        return {
          title: 'Excellent, Expert Player!',
          description: 'Your co-pilot will provide subtle insights and advanced analysis while respecting your expertise.',
          features: [
            '🧠 Advanced tactical analysis',
            '📊 Deep statistical insights',
            '🎯 Minimal interference mode',
            '🏆 Competitive strategy focus'
          ]
        }
    }
  }

  const handleComplete = () => {
    const skillLevel = calculateSkillLevel()
    onComplete(skillLevel)
  }

  const progress = ((currentQuestion + 1) / assessmentQuestions.length) * 100

  if (showResults) {
    const skillLevel = calculateSkillLevel()
    const description = getSkillLevelDescription(skillLevel)

    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">🎯</div>
          <h2 className="text-2xl font-bold text-gray-900">Assessment Complete!</h2>
        </div>

        <Card variant="elevated" className="p-6 text-center">
          <div className="space-y-4">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 font-medium">
              Skill Level: {skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900">
              {description.title}
            </h3>
            
            <p className="text-gray-600 max-w-2xl mx-auto">
              {description.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {description.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 text-left p-3 bg-gray-50 rounded-lg">
                  <span className="text-lg">{feature.split(' ')[0]}</span>
                  <span className="text-sm text-gray-700">{feature.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="text-center space-y-4">
          <Button variant="primary" onClick={handleComplete} className="min-w-[200px]">
            Continue with {skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)} Settings
          </Button>
          <p className="text-sm text-gray-600">
            Don't worry - you can always adjust these settings later!
          </p>
        </div>
      </div>
    )
  }

  const question = assessmentQuestions[currentQuestion]

  return (
    <div className="space-y-6">
      {/* Assessment Header */}
      <div className="text-center space-y-4">
        <div className="text-4xl">📊</div>
        <h2 className="text-2xl font-bold text-gray-900">Quick Skill Assessment</h2>
        <p className="text-lg text-gray-600">
          Help us customize your co-pilot experience
        </p>
      </div>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentQuestion + 1} of {assessmentQuestions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card variant="elevated" className="max-w-2xl mx-auto">
        <div className="p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 text-center">
            {question.question}
          </h3>

          <div className="space-y-3">
            {question.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(question.id, option.value)}
                className={`
                  w-full p-4 text-left rounded-lg border transition-all duration-200
                  ${answers[question.id] === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option.label}</span>
                  {answers[question.id] === option.value && (
                    <span className="text-blue-600">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-center space-x-4">
        {currentQuestion > 0 && (
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(currentQuestion - 1)}
          >
            ← Previous
          </Button>
        )}
        
        <Button variant="ghost" onClick={onSkip}>
          Skip Assessment
        </Button>
      </div>
    </div>
  )
}