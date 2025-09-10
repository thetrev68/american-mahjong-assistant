// Selected Patterns Panel
// Shows currently selected and target patterns

import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { usePatternStore } from '../../stores'
import { getColoredPatternParts, getColorClasses } from '../../utils/pattern-color-utils'

export const SelectedPatternsPanel = () => {
  const {
    selectedPatternId,
    getSelectedPattern,
    getTargetPatterns,
    removeTargetPattern,
    clearSelection
  } = usePatternStore()
  
  const selectedPattern = getSelectedPattern()
  const targetPatterns = getTargetPatterns()
  const otherTargets = targetPatterns.filter(p => p.id !== selectedPatternId)
  
  return (
    <Card variant="elevated" className="space-y-6">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">
            Your Selection
          </h3>
          {(selectedPattern || targetPatterns.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-red-600 hover:bg-red-50"
            >
              Clear All
            </Button>
          )}
        </div>
        
        {/* Primary Selection */}
        {selectedPattern ? (
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              Primary Target
            </div>
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <div className="space-y-2">
                <h4 className="font-semibold text-primary text-sm">
                  Section {selectedPattern.section} #{selectedPattern.line}
                </h4>
                <div className="font-mono text-sm bg-white p-2 rounded border">
                  {getColoredPatternParts(selectedPattern.pattern, selectedPattern.groups).map((part, index) => (
                    <span key={index} className={getColorClasses(part.color)}>
                      {part.text}
                      {index < getColoredPatternParts(selectedPattern.pattern, selectedPattern.groups).length - 1 && ' '}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-600">{selectedPattern.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className={`px-2 py-1 rounded-full ${
                    selectedPattern.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    selectedPattern.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedPattern.difficulty}
                  </span>
                  <span className="font-semibold text-primary">
                    {selectedPattern.points} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl block mb-2">🎯</span>
            <p className="text-sm">Select a primary pattern to get started</p>
          </div>
        )}
        
        {/* Other Targets */}
        {otherTargets.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span className="text-lg">⭐</span>
              Additional Targets ({otherTargets.length})
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {otherTargets.map(pattern => (
                <div
                  key={pattern.id}
                  className="bg-secondary/5 rounded-lg p-3 border border-secondary/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-secondary text-xs">
                        Section {pattern.section} #{pattern.line}
                      </h5>
                      <div className="font-mono text-xs text-gray-600 mt-1">
                        {getColoredPatternParts(pattern.pattern, pattern.groups).map((part, index) => (
                          <span key={index} className={getColorClasses(part.color)}>
                            {part.text}
                            {index < getColoredPatternParts(pattern.pattern, pattern.groups).length - 1 && ' '}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">{pattern.description}</p>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className={`px-1.5 py-0.5 rounded-full ${
                          pattern.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                          pattern.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {pattern.difficulty}
                        </span>
                        <span className="font-medium text-secondary">
                          {pattern.points} pts
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeTargetPattern(pattern.id)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove target"
                    >
                      <span className="text-sm">×</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Empty State for Targets */}
        {selectedPattern && otherTargets.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <span className="text-3xl block mb-2">⭐</span>
            <p className="text-xs">Star patterns you're considering</p>
          </div>
        )}
        
        {/* Strategy Hint */}
        {selectedPattern && (
          <div className="bg-accent/5 rounded-lg p-3 border border-accent/20">
            <div className="text-xs text-accent font-medium mb-1">
              💡 Strategy Tip
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {selectedPattern.difficulty === 'easy' 
                ? 'Great choice! Easy patterns are perfect for building confidence and securing points.'
                : selectedPattern.difficulty === 'medium'
                ? 'Medium patterns offer good point value with manageable complexity.'
                : 'Challenging but rewarding! Hard patterns require strategic tile management.'
              }
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}