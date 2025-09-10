// StrategyExplanation Component
// Educational content about Charleston strategy and reasoning

import { useState } from 'react'
import type { CharlestonPhase } from '../../utils/charleston-adapter'
import type { PatternSelectionOption } from 'shared-types'

interface StrategyExplanationProps {
  phase: CharlestonPhase
  targetPatterns: PatternSelectionOption[]
  jokerCount: number
  className?: string
}

export function StrategyExplanation({ 
  phase, 
  targetPatterns, 
  jokerCount, 
  className = '' 
}: StrategyExplanationProps) {
  
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }
  
  const sections = [
    {
      id: 'phase-strategy',
      title: `${getPhaseDisplayName(phase)} Strategy`,
      icon: '🎯',
      content: getPhaseStrategy(phase)
    },
    {
      id: 'pattern-focus',
      title: 'Pattern Focus Strategy',
      icon: '🧩',
      content: getPatternFocusStrategy(targetPatterns)
    },
    {
      id: 'joker-wisdom',
      title: 'Joker Management',
      icon: '🃟',
      content: getJokerStrategy(jokerCount, phase)
    },
    {
      id: 'general-tips',
      title: 'General Charleston Tips',
      icon: '💡',
      content: getGeneralTips()
    }
  ]
  
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Charleston Strategy Guide</h3>
        <p className="text-sm text-gray-600 mt-1">
          Learn why these recommendations work
        </p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {sections.map(section => (
          <StrategySection
            key={section.id}
            {...section}
            isExpanded={expandedSection === section.id}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface StrategySectionProps {
  title: string
  icon: string
  content: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
}

function StrategySection({ title, icon, content, isExpanded, onToggle }: StrategySectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="text-sm text-gray-600 space-y-2">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}

function getPhaseDisplayName(phase: CharlestonPhase): string {
  switch (phase) {
    case 'right': return 'Phase 1 (Right Pass)'
    case 'across': return 'Phase 2 (Across Pass)'
    case 'left': return 'Phase 3 (Left Pass)'
    case 'optional': return 'Optional Phase'
    default: return 'Charleston Phase'
  }
}

function getPhaseStrategy(phase: CharlestonPhase): React.ReactNode {
  switch (phase) {
    case 'right':
      return (
        <div className="space-y-3">
          <p><strong>Early Phase Strategy:</strong> This is your safest pass. Focus on clearly unwanted tiles.</p>
          <ul className="space-y-1 ml-4">
            <li>• Pass obvious discards: isolated flowers, single honor tiles</li>
            <li>• Keep tiles with potential in multiple patterns</li>
            <li>• Avoid passing tiles that could help complete sets</li>
            <li>• Build flexibility for later decisions</li>
          </ul>
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-blue-800 text-xs">
              <strong>Tip:</strong> You'll get tiles back from the player on your left, 
              so consider what they might not want.
            </p>
          </div>
        </div>
      )
      
    case 'across':
      return (
        <div className="space-y-3">
          <p><strong>Mid Phase Strategy:</strong> Start focusing on your strongest patterns.</p>
          <ul className="space-y-1 ml-4">
            <li>• Begin committing to your best pattern options</li>
            <li>• Pass tiles that conflict with your target patterns</li>
            <li>• Consider what your across opponent might need</li>
            <li>• Balance helping yourself vs. helping opponents</li>
          </ul>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
            <p className="text-yellow-800 text-xs">
              <strong>Note:</strong> In 3-player games, this phase is automatically skipped.
            </p>
          </div>
        </div>
      )
      
    case 'left':
      return (
        <div className="space-y-3">
          <p><strong>Final Phase Strategy:</strong> Last chance to optimize your hand.</p>
          <ul className="space-y-1 ml-4">
            <li>• Only pass tiles that clearly don't help your target patterns</li>
            <li>• Keep anything that might be useful later</li>
            <li>• Consider defensive passing to avoid helping opponents</li>
            <li>• Prepare for the game ahead</li>
          </ul>
          <div className="bg-green-50 border border-green-200 rounded p-2">
            <p className="text-green-800 text-xs">
              <strong>Final Check:</strong> After this pass, the Charleston is complete. 
              Make sure you're set up for success.
            </p>
          </div>
        </div>
      )
      
    case 'optional':
      return (
        <div className="space-y-3">
          <p><strong>Optional Strategy:</strong> Only participate if you have a clear advantage.</p>
          <ul className="space-y-1 ml-4">
            <li>• Participate only if you can significantly improve your hand</li>
            <li>• Consider what you might receive vs. what you give up</li>
            <li>• Don't help opponents if your hand is already strong</li>
            <li>• Skip if you're unsure - no pass is often the best pass</li>
          </ul>
          <div className="bg-purple-50 border border-purple-200 rounded p-2">
            <p className="text-purple-800 text-xs">
              <strong>Decision:</strong> All players must agree to participate. 
              One "no" vote skips this phase entirely.
            </p>
          </div>
        </div>
      )
      
    default:
      return <p>Strategic tile passing to optimize your hand for the game ahead.</p>
  }
}

function getPatternFocusStrategy(targetPatterns: PatternSelectionOption[]): React.ReactNode {
  if (targetPatterns.length === 0) {
    return (
      <div className="space-y-3">
        <p><strong>No Target Patterns Selected:</strong></p>
        <ul className="space-y-1 ml-4">
          <li>• Select target patterns first for focused recommendations</li>
          <li>• Keep versatile tiles that work in multiple patterns</li>
          <li>• Pass tiles with limited pattern potential</li>
          <li>• Stay flexible until you identify strong options</li>
        </ul>
        <div className="bg-amber-50 border border-amber-200 rounded p-2">
          <p className="text-amber-800 text-xs">
            <strong>Recommendation:</strong> Visit the Pattern Selection page to choose 
            1-3 target patterns for focused Charleston strategy.
          </p>
        </div>
      </div>
    )
  }
  
  const primaryPattern = targetPatterns[0]
  const hasBackups = targetPatterns.length > 1
  
  return (
    <div className="space-y-3">
      <p><strong>Target Pattern Strategy:</strong></p>
      <div className="bg-indigo-50 border border-indigo-200 rounded p-2 mb-2">
        <p className="text-indigo-800 text-xs">
          <strong>Primary Target:</strong> {primaryPattern.displayName} ({primaryPattern.points} points)
        </p>
      </div>
      
      <ul className="space-y-1 ml-4">
        <li>• Keep tiles that appear in your target pattern</li>
        <li>• Pass tiles that conflict with pattern requirements</li>
        <li>• Consider joker usage for difficult completions</li>
        {hasBackups && <li>• Maintain flexibility for backup pattern options</li>}
      </ul>
      
      {primaryPattern.difficulty === 'hard' && (
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <p className="text-red-800 text-xs">
            <strong>High Difficulty:</strong> This pattern is challenging. 
            Ensure you have joker support or consider easier backup options.
          </p>
        </div>
      )}
    </div>
  )
}

function getJokerStrategy(jokerCount: number, phase: CharlestonPhase): React.ReactNode {
  if (jokerCount === 0) {
    return (
      <div className="space-y-3">
        <p><strong>No Jokers Strategy:</strong></p>
        <ul className="space-y-1 ml-4">
          <li>• Focus on patterns you can complete with exact tiles</li>
          <li>• Avoid high-difficulty patterns without joker flexibility</li>
          <li>• Hope to receive jokers from other players during Charleston</li>
          <li>• Keep tiles that form natural sets and sequences</li>
        </ul>
        <div className="bg-orange-50 border border-orange-200 rounded p-2">
          <p className="text-orange-800 text-xs">
            <strong>Challenge Mode:</strong> Playing without jokers requires more precise 
            tile management and pattern selection.
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      <p><strong>Joker Management ({jokerCount} joker{jokerCount > 1 ? 's' : ''}):</strong></p>
      <ul className="space-y-1 ml-4">
        <li>• <strong>NEVER pass jokers</strong> - they're your most valuable tiles</li>
        <li>• Use jokers strategically for difficult pattern completions</li>
        <li>• With multiple jokers, consider higher-point challenging patterns</li>
        <li>• Keep jokers flexible until you're committed to a specific pattern</li>
      </ul>
      
      {jokerCount >= 3 && (
        <div className="bg-purple-50 border border-purple-200 rounded p-2">
          <p className="text-purple-800 text-xs">
            <strong>Joker Rich:</strong> With {jokerCount} jokers, you have exceptional 
            flexibility. Consider attempting high-value patterns.
          </p>
        </div>
      )}
      
      {phase === 'optional' && jokerCount >= 2 && (
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <p className="text-green-800 text-xs">
            <strong>Optional Phase:</strong> With multiple jokers, you can afford to skip 
            the optional pass unless you see a clear advantage.
          </p>
        </div>
      )}
    </div>
  )
}

function getGeneralTips(): React.ReactNode {
  return (
    <div className="space-y-3">
      <p><strong>Universal Charleston Wisdom:</strong></p>
      <ul className="space-y-1 ml-4">
        <li>• Always keep jokers - they're irreplaceable</li>
        <li>• Pass flowers early unless needed for specific patterns</li>
        <li>• Isolated honor tiles (single winds/dragons) are usually safe to pass</li>
        <li>• Consider what tiles your opponents might need</li>
        <li>• Don't be afraid to change strategy if you receive helpful tiles</li>
        <li>• Remember: a good Charleston sets up the entire game</li>
      </ul>
      
      <div className="bg-gray-50 border border-gray-200 rounded p-3">
        <p className="text-gray-800 text-xs font-medium mb-1">Charleston Mindset:</p>
        <p className="text-gray-600 text-xs">
          The Charleston is about optimization, not perfection. Make the best decisions 
          with the information you have, and stay flexible as new tiles come in.
        </p>
      </div>
    </div>
  )
}