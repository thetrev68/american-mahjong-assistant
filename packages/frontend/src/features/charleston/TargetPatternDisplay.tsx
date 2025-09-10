// TargetPatternDisplay Component
// Shows selected target patterns during Charleston with colorized display

import { useMemo } from 'react'
import type { PatternSelectionOption } from 'shared-types'
import { getColoredPatternParts, getColorClasses } from '../../utils/pattern-color-utils'

interface TargetPatternDisplayProps {
  targetPatterns: PatternSelectionOption[]
  className?: string
}

export function TargetPatternDisplay({ targetPatterns, className = '' }: TargetPatternDisplayProps) {
  
  // Group patterns by priority (primary vs backup)
  const patternGroups = useMemo(() => {
    return {
      primary: targetPatterns.slice(0, 1),
      backup: targetPatterns.slice(1, 3)
    }
  }, [targetPatterns])
  
  if (targetPatterns.length === 0) {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
          <h3 className="font-medium text-amber-800">No Target Patterns Selected</h3>
        </div>
        <p className="text-sm text-amber-600 mt-2">
          Select target patterns first to get focused Charleston recommendations
        </p>
      </div>
    )
  }
  
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
          <h3 className="font-semibold text-gray-900">Charleston Strategy</h3>
          <span className="text-sm text-gray-500">
            ({targetPatterns.length} pattern{targetPatterns.length > 1 ? 's' : ''} selected)
          </span>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Primary Target */}
        {patternGroups.primary.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-indigo-800 mb-2">🎯 Primary Target</h4>
            {patternGroups.primary.map(pattern => (
              <PatternCard 
                key={pattern.id} 
                pattern={pattern} 
                isPrimary={true}
              />
            ))}
          </div>
        )}
        
        {/* Backup Options */}
        {patternGroups.backup.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2">🔄 Backup Options</h4>
            <div className="space-y-2">
              {patternGroups.backup.map(pattern => (
                <PatternCard 
                  key={pattern.id} 
                  pattern={pattern} 
                  isPrimary={false}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Strategy Summary */}
        <div className="bg-gray-50 rounded-md p-3">
          <p className="text-xs text-gray-600">
            <strong>Charleston Focus:</strong> Keep tiles needed for these patterns, 
            pass tiles that don't contribute to any target.
          </p>
        </div>
      </div>
    </div>
  )
}

interface PatternCardProps {
  pattern: PatternSelectionOption
  isPrimary: boolean
}

function PatternCard({ pattern, isPrimary }: PatternCardProps) {
  const coloredParts = getColoredPatternParts(pattern.pattern, pattern.groups)
  
  return (
    <div className={`rounded-md border p-3 ${
      isPrimary 
        ? 'border-indigo-200 bg-indigo-50' 
        : 'border-gray-200 bg-gray-50'
    }`}>
      {/* Pattern Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">
            Section {pattern.section} #{pattern.line}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {pattern.description}
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-3">
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            pattern.points >= 50 
              ? 'bg-purple-100 text-purple-800'
              : pattern.points >= 35
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {pattern.points} pts
          </span>
          {pattern.concealed && (
            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
              Concealed
            </span>
          )}
        </div>
      </div>
      
      {/* Colorized Pattern */}
      <div className="font-mono text-base tracking-wide">
        {coloredParts.map((part, index) => (
          <span key={index} className={getColorClasses(part.color)}>
            {part.text}
            {index < coloredParts.length - 1 && <span className="text-gray-400"> </span>}
          </span>
        ))}
      </div>
      
      {/* Pattern Indicators */}
      <div className="flex items-center space-x-3 mt-2">
        <div className={`text-xs px-2 py-1 rounded ${
          pattern.difficulty === 'hard' 
            ? 'bg-red-100 text-red-700'
            : pattern.difficulty === 'medium'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {pattern.difficulty}
        </div>
        
        {pattern.allowsJokers && (
          <div className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
            Jokers OK
          </div>
        )}
        
        {isPrimary && (
          <div className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-medium">
            Primary Focus
          </div>
        )}
      </div>
    </div>
  )
}