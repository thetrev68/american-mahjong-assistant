// Pattern Learning Component
// Interactive NMJL pattern education and tutorial

import React, { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { usePatternStore } from '../../stores/pattern-store'
import type { PatternLearningProps } from './types'

export const PatternLearning: React.FC<PatternLearningProps> = ({
  skillLevel,
  onPatternSelect,
  interactiveMode = true,
}) => {
  const { addTargetPattern } = usePatternStore()
  const [hasSelectedPattern, setHasSelectedPattern] = useState(false)
  return (
    <div className="space-y-6">
      {/* Pattern Learning Header */}
      <div className="text-center space-y-4">
        <div className="text-4xl">🎯</div>
        <h2 className="text-2xl font-bold text-gray-900">
          Learn NMJL 2025 Patterns
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Understanding the National Mah Jongg League card is the foundation of strategic play.
          Let's explore how patterns work and how to choose the best ones.
        </p>
      </div>

      {/* Pattern Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card variant="default" className="p-4">
          <div className="text-center space-y-2">
            <div className="text-2xl">🔢</div>
            <h3 className="font-semibold text-gray-900">Like Numbers</h3>
            <p className="text-sm text-gray-600">
              Patterns using the same numbers across different suits
            </p>
            <div className="text-xs text-gray-500">25 pts • Medium</div>
          </div>
        </Card>

        <Card variant="default" className="p-4">
          <div className="text-center space-y-2">
            <div className="text-2xl">🏃</div>
            <h3 className="font-semibold text-gray-900">Consecutive Runs</h3>
            <p className="text-sm text-gray-600">
              Sequential numbers in the same suit
            </p>
            <div className="text-xs text-gray-500">30 pts • Hard</div>
          </div>
        </Card>

        <Card variant="default" className="p-4">
          <div className="text-center space-y-2">
            <div className="text-2xl">🐉</div>
            <h3 className="font-semibold text-gray-900">Dragons & Winds</h3>
            <p className="text-sm text-gray-600">
              Special honor tiles with high point values
            </p>
            <div className="text-xs text-gray-500">35+ pts • Easy</div>
          </div>
        </Card>
      </div>

      {/* Interactive Pattern Example */}
      {interactiveMode && (
        <Card variant="elevated" className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Example: Pattern #23 - Like Numbers
            </h3>
            <p className="text-gray-600">
              This pattern requires the same number in different suits. 
              Let's see how it works:
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-center space-y-2">
                <div className="text-sm font-medium text-gray-700">Pattern Structure:</div>
                <div className="text-lg font-mono bg-white rounded px-3 py-2 inline-block border">
                  5555 6666 7777 DD
                </div>
                <div className="text-xs text-gray-600">
                  Four 5s, Four 6s, Four 7s, One pair Dragons
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button
                variant="primary"
                onClick={() => {
                  // Add pattern to the user's target patterns (this is the real functionality)
                  addTargetPattern('23')
                  setHasSelectedPattern(true)
                  onPatternSelect?.('pattern-23')
                }}
                className={hasSelectedPattern ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {hasSelectedPattern ? '✓ Pattern Added!' : 'Try This Pattern'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Skill-based Tips */}
      <Card variant="default" className="p-6 bg-blue-50 border-blue-200">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-blue-900">
            💡 Tips for {skillLevel === 'beginner' ? 'Beginners' : skillLevel === 'intermediate' ? 'Intermediate Players' : 'Expert Players'}
          </h3>
          
          {skillLevel === 'beginner' && (
            <ul className="space-y-2 text-blue-800 text-sm">
              <li>• Start with easier patterns (dragons, winds, like numbers)</li>
              <li>• Focus on patterns worth 25+ points</li>
              <li>• Choose 2-3 compatible patterns to keep your options open</li>
              <li>• Don't commit to one pattern too early</li>
            </ul>
          )}
          
          {skillLevel === 'intermediate' && (
            <ul className="space-y-2 text-blue-800 text-sm">
              <li>• Consider pattern flexibility and pivot potential</li>
              <li>• Balance high-point patterns with achievable ones</li>
              <li>• Learn to read other players' likely patterns</li>
              <li>• Practice charleston strategy for pattern setup</li>
            </ul>
          )}
          
          {skillLevel === 'expert' && (
            <ul className="space-y-2 text-blue-800 text-sm">
              <li>• Master advanced pattern combinations and transitions</li>
              <li>• Use defensive pattern selection based on discards</li>
              <li>• Optimize charleston exchanges for maximum flexibility</li>
              <li>• Consider table dynamics and player tendencies</li>
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}