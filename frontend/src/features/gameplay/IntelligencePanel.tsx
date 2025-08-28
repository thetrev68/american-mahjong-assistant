import React from 'react'
import { Button } from '../../ui-components/Button'
import { Card } from '../../ui-components/Card'
import { LoadingSpinner } from '../../ui-components/LoadingSpinner'

interface IntelligencePanelProps {
  isAnalyzing: boolean
  currentAnalysis: {
    recommendations?: {
      discard?: {
        reasoning: string
      }
    }
    recommendedPatterns?: Array<{
      pattern: { displayName: string }
      completionPercentage: number
    }>
  } | null
  findAlternativePatterns: () => void
}

const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
  isAnalyzing,
  currentAnalysis,
  findAlternativePatterns,
}) => {

  const recommendedDiscard = () => {
    if (!currentAnalysis?.recommendations?.discard) return null
    return currentAnalysis.recommendations.discard
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🧠 AI Co-Pilot</h3>
        {isAnalyzing && <LoadingSpinner size="sm" />}
      </div>
      
      <div className="space-y-4">
        {currentAnalysis ? (
          <>
            {/* Primary Recommendation */}
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-2">💡 Recommendation</div>
              <div className="text-sm text-gray-700">
                {recommendedDiscard()?.reasoning || 'Analyzing your hand...'}
              </div>
            </div>

            {/* Pattern Progress */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">🎯 Pattern Progress</div>
              {currentAnalysis.recommendedPatterns?.slice(0, 2).map((patternRec, index) => {
                const completionPercentage = patternRec.completionPercentage || 0
                return (
                  <div key={index} className="p-2 bg-gray-50 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium">{patternRec.pattern.displayName}</span>
                      <span className="text-xs text-gray-500">{Math.round(completionPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.max(5, completionPercentage)}%` }} 
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-purple-600 border-purple-300"
                onClick={findAlternativePatterns}
              >
                🔄 Switch Pattern
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <div className="text-2xl mb-2">🤔</div>
            <p className="text-sm">Draw tiles to see AI recommendations</p>
          </div>
        )}
      </div>
    </Card>
  )
}

export default IntelligencePanel