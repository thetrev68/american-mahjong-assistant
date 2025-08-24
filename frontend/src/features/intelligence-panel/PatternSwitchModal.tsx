// Pattern Switch Modal - Quick pattern switching with top recommendations
// Shows top 3 viable patterns plus browse more option
// Optimized for instant pattern switching with Engine 1 cache

import React, { useState } from 'react'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'
import { getColoredPatternParts, getColorClasses } from '../../utils/pattern-color-utils'
import type { PatternRecommendation } from '../../stores/intelligence-store'

interface PatternSwitchModalProps {
  isOpen: boolean
  onClose: () => void
  currentPattern: PatternRecommendation | null
  availablePatterns: PatternRecommendation[]
  onPatternSelect: (pattern: PatternRecommendation) => Promise<void>
  onBrowseMore: () => void
}

export const PatternSwitchModal = ({
  isOpen,
  onClose,
  currentPattern,
  availablePatterns,
  onPatternSelect,
  onBrowseMore
}: PatternSwitchModalProps) => {
  const [switchingPatternId, setSwitchingPatternId] = useState<string | null>(null)
  const [switchStartTime, setSwitchStartTime] = useState<number | null>(null)
  
  if (!isOpen) return null

  // Get top 3 patterns (excluding current if it's in the list)
  const topPatterns = availablePatterns
    .filter(p => p.pattern.id !== currentPattern?.pattern.id)
    .slice(0, 3)

  const handlePatternSelect = async (pattern: PatternRecommendation) => {
    const startTime = performance.now()
    setSwitchingPatternId(pattern.pattern.id)
    setSwitchStartTime(startTime)
    
    try {
      await onPatternSelect(pattern)
      
      const duration = performance.now() - startTime
      // Pattern switch completed in modal
      
      onClose()
    } catch (error) {
    } finally {
      setSwitchingPatternId(null)
      setSwitchStartTime(null)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Switch Target Pattern
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>
          
          {currentPattern && (
            <div className="mt-2 text-sm text-gray-600">
              Currently targeting: <span className="font-medium">
                {currentPattern.pattern.section} #{currentPattern.pattern.line}
              </span>
            </div>
          )}
        </div>

        {/* Pattern List */}
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {topPatterns.length > 0 ? (
            <>
              {topPatterns.map((pattern) => (
                <Card 
                  key={pattern.pattern.id}
                  variant="default" 
                  className={`p-3 transition-all duration-200 ${
                    switchingPatternId === pattern.pattern.id
                      ? 'opacity-60 cursor-wait border-blue-300 bg-blue-50'
                      : 'cursor-pointer hover:shadow-md hover:border-blue-200'
                  }`}
                  onClick={() => {
                    if (switchingPatternId === null) {
                      handlePatternSelect(pattern)
                    }
                  }}
                >
                  <div className="space-y-2">
                    {/* Pattern Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">
                          {pattern.pattern.section} #{pattern.pattern.line}
                        </div>
                        {switchingPatternId === pattern.pattern.id && (
                          <div className="flex items-center gap-1">
                            <LoadingSpinner size="sm" color="primary" />
                            <span className="text-xs text-blue-600">
                              {switchStartTime && Math.round(performance.now() - switchStartTime)}ms
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {Math.round(pattern.completionPercentage)}%
                        </div>
                        <div className="text-xs text-gray-500">completion</div>
                      </div>
                    </div>

                    {/* Colorized Pattern */}
                    <div className="flex flex-wrap gap-1">
                      {getColoredPatternParts(pattern.pattern.pattern, pattern.pattern.groups).map((part, index) => (
                        <span 
                          key={index}
                          className={`font-mono text-sm ${getColorClasses(part.color, 'text')}`}
                        >
                          {part.text}
                        </span>
                      ))}
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>💎 {pattern.pattern.points} pts</span>
                      <span className={`capitalize ${
                        pattern.difficulty === 'easy' ? 'text-green-600' :
                        pattern.difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {pattern.difficulty}
                      </span>
                      <span>🎯 {Math.round(pattern.confidence)}% confident</span>
                    </div>

                    {/* Reasoning */}
                    {pattern.reasoning && (
                      <div className="text-xs text-gray-600 leading-relaxed">
                        {pattern.reasoning}
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              {/* Browse More Button */}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  onBrowseMore()
                  onClose()
                }}
              >
                📋 Browse All Patterns
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">🤔</div>
              <div className="text-sm">No alternative patterns available</div>
              <div className="text-xs mt-1">Try adding more tiles to see recommendations</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {switchingPatternId ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <LoadingSpinner size="sm" color="primary" />
              <span className="text-sm text-gray-600">
                Switching pattern with Engine 1 cache optimization...
              </span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onBrowseMore()
                  onClose()
                }}
              >
                Browse All
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}