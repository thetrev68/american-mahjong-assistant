// AdvancedMode - Full analysis view for expert players
// Shows probability calculations, tile availability, and comprehensive strategy analysis

import React, { useCallback, useMemo, useState } from 'react'
import type {
  AdvancedModeProps
} from '../types/strategy-advisor.types'

// Chart component placeholder (would use recharts or similar in production)
const ProbabilityChart: React.FC<{
  probability: number
  label: string
  color?: string
}> = ({ probability, label, color = '#3B82F6' }) => {
  const percentage = Math.round(probability * 100)

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  )
}

// Mini chart for tile availability
const TileAvailabilityChart: React.FC<{
  tiles: Array<{ tile: string; available: number; probability: number }>
}> = ({ tiles }) => {
  if (tiles.length === 0) return null

  return (
    <div className="space-y-2">
      <h6 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
        Tile Availability
      </h6>
      <div className="grid grid-cols-1 gap-2">
        {tiles.slice(0, 4).map((tile, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">
                {tile.tile.length <= 3 ? tile.tile : tile.tile.slice(0, 3)}
              </span>
              <span className="text-gray-700">{tile.tile}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${tile.probability * 100}%` }}
                />
              </div>
              <span className="text-gray-600 w-6 text-right">
                {tile.available}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Strategy comparison table
const StrategyComparisonTable: React.FC<{
  strategies: Array<{
    strategy: string
    probability: number
    turnsToCompletion: number
    riskLevel: string
  }>
}> = ({ strategies }) => {
  if (strategies.length === 0) return null

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'minimal':
        return 'text-green-600 bg-green-100'
      case 'low':
        return 'text-green-600 bg-green-100'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100'
      case 'hard':
      case 'high':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-2">
      <h6 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
        Alternative Strategies
      </h6>
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left font-medium text-gray-700">Strategy</th>
              <th className="px-2 py-1 text-center font-medium text-gray-700">Success</th>
              <th className="px-2 py-1 text-center font-medium text-gray-700">Turns</th>
              <th className="px-2 py-1 text-center font-medium text-gray-700">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {strategies.slice(0, 3).map((strategy, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-2 py-1 text-gray-900 truncate">
                  {strategy.strategy}
                </td>
                <td className="px-2 py-1 text-center font-medium text-blue-600">
                  {Math.round(strategy.probability * 100)}%
                </td>
                <td className="px-2 py-1 text-center text-gray-700">
                  {strategy.turnsToCompletion}
                </td>
                <td className="px-2 py-1 text-center">
                  <span className={`px-1 py-0.5 rounded text-xs font-medium ${getRiskColor(strategy.riskLevel)}`}>
                    {strategy.riskLevel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * AdvancedMode - Comprehensive analysis view for expert players
 * Shows detailed probability analysis, tile tracking, and strategic alternatives
 */
export const AdvancedMode: React.FC<AdvancedModeProps> = ({
  content,
  isVisible,
  onCollapseToDetails,
  strategyMode: _strategyMode,
  showProbabilityCharts = true,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'tiles' | 'alternatives'>('analysis')

  // Strategy mode specific styling
  const modeStyles = useMemo(() => {
    switch (_strategyMode) {
      case 'quickWin':
        return {
          accentColor: 'text-orange-600',
          borderColor: 'border-orange-300',
          bgColor: 'bg-orange-50',
          tabColor: 'text-orange-700 border-orange-500'
        }
      case 'defensive':
        return {
          accentColor: 'text-green-600',
          borderColor: 'border-green-300',
          bgColor: 'bg-green-50',
          tabColor: 'text-green-700 border-green-500'
        }
      case 'highScore':
        return {
          accentColor: 'text-purple-600',
          borderColor: 'border-purple-300',
          bgColor: 'bg-purple-50',
          tabColor: 'text-purple-700 border-purple-500'
        }
      case 'flexible':
      default:
        return {
          accentColor: 'text-blue-600',
          borderColor: 'border-blue-300',
          bgColor: 'bg-blue-50',
          tabColor: 'text-blue-700 border-blue-500'
        }
    }
  }, [_strategyMode])

  // Format variance display
  const formatVariance = useCallback((variance: number): string => {
    return variance < 1 ? 'Low' : variance < 2 ? 'Medium' : 'High'
  }, [])

  // Get risk assessment color
  const getRiskAssessmentColor = useCallback((risk: string) => {
    if (risk.toLowerCase().includes('high')) return 'text-red-600'
    if (risk.toLowerCase().includes('moderate')) return 'text-yellow-600'
    return 'text-green-600'
  }, [])

  if (!isVisible) return null

  return (
    <div className={`p-4 space-y-4 border-t-4 ${modeStyles.borderColor} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h4 className={`font-bold text-base ${modeStyles.accentColor}`}>
            Advanced Analysis
          </h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Expert Mode
          </span>
        </div>
        <button
          onClick={onCollapseToDetails}
          className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          ← Back to Details
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {[
            { id: 'analysis', label: 'Probability Analysis', icon: '📊' },
            { id: 'tiles', label: 'Tile Tracking', icon: '🀄' },
            { id: 'alternatives', label: 'Strategy Options', icon: '🔄' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'analysis' | 'tiles' | 'alternatives')}
              className={`
                flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? `${modeStyles.tabColor} border-current`
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* Probability Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-4">
            {/* Main Analysis */}
            <div className={`p-4 rounded-lg ${modeStyles.bgColor} border ${modeStyles.borderColor}`}>
              <h5 className={`font-semibold text-sm mb-2 ${modeStyles.accentColor}`}>
                Pattern Completion Analysis
              </h5>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                {content.probabilityAnalysis}
              </p>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600">Completion Probability</span>
                    <span className={`text-sm font-bold ${modeStyles.accentColor}`}>
                      {Math.round(content.completionProbability * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600">Expected Turns</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {content.expectedTurns.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600">Turn Variance</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatVariance(content.turnVariance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600">Wall Risk</span>
                    <span className={`text-sm font-semibold ${getRiskAssessmentColor(content.wallDepletionRisk)}`}>
                      {content.wallDepletionRisk.split(' - ')[0]}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Probability Charts */}
            {showProbabilityCharts && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <ProbabilityChart
                    probability={content.completionProbability}
                    label="Pattern Completion"
                    color="#3B82F6"
                  />
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <ProbabilityChart
                    probability={Math.max(0, 1 - (content.turnVariance / 5))}
                    label="Consistency"
                    color="#10B981"
                  />
                </div>
              </div>
            )}

            {/* Wall Depletion Analysis */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h6 className="font-medium text-sm text-yellow-800 mb-1">Wall Depletion Risk</h6>
              <p className="text-sm text-yellow-700">{content.wallDepletionRisk}</p>
            </div>
          </div>
        )}

        {/* Tile Tracking Tab */}
        {activeTab === 'tiles' && (
          <div className="space-y-4">
            <TileAvailabilityChart tiles={content.tileAvailability} />

            {/* Tile Details */}
            {content.tileAvailability.length > 0 && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h6 className="font-medium text-sm text-gray-800 mb-2">Detailed Tile Analysis</h6>
                <div className="space-y-2">
                  {content.tileAvailability.slice(0, 6).map((tile, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-xs font-bold">
                          {tile.tile.length <= 2 ? tile.tile : tile.tile.slice(0, 2)}
                        </span>
                        <span className="font-medium text-gray-900">{tile.tile}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs">
                        <span className="text-gray-600">Available: {tile.available}</span>
                        <span className="font-medium text-blue-600">
                          {Math.round(tile.probability * 100)}% chance
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Strategy Alternatives Tab */}
        {activeTab === 'alternatives' && (
          <div className="space-y-4">
            <StrategyComparisonTable strategies={content.alternativeStrategies} />

            {/* Opponent Threats Analysis */}
            {content.opponentThreatsAnalysis && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h6 className="font-medium text-sm text-red-800 mb-2 flex items-center">
                  <span className="mr-2">🚨</span>
                  Opponent Threat Analysis
                </h6>
                <p className="text-sm text-red-700 leading-relaxed">
                  {content.opponentThreatsAnalysis}
                </p>
              </div>
            )}

            {/* Strategic Recommendations */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h6 className="font-medium text-sm text-blue-800 mb-2">Strategic Recommendations</h6>
              <div className="space-y-1">
                {content.alternativeStrategies.slice(0, 2).map((strategy, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-blue-700">{strategy.strategy}</span>
                    <button className="text-blue-600 hover:text-blue-800 font-medium">
                      Analyze →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Controls */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="text-xs text-gray-600 hover:text-gray-800 transition-colors">
              Export Analysis
            </button>
            <button className="text-xs text-gray-600 hover:text-gray-800 transition-colors">
              Compare Scenarios
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Expert Tips */}
      <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
        <strong>Expert Tip:</strong> Use Ctrl+E to quickly switch tabs, or long-press any metric for detailed explanation.
      </div>
    </div>
  )
}

// Simplified advanced mode for mobile or performance constraints
export const MobileAdvancedMode: React.FC<AdvancedModeProps> = ({
  content,
  isVisible,
  onCollapseToDetails,
  strategyMode: _strategyMode,
  className = ''
}) => {
  if (!isVisible) return null

  return (
    <div className={`p-3 space-y-3 ${className}`}>
      {/* Simplified Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-blue-600">Advanced</h4>
        <button
          onClick={onCollapseToDetails}
          className="text-xs text-gray-600 hover:text-gray-800"
        >
          ← Back
        </button>
      </div>

      {/* Key Metrics Only */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 bg-blue-50 rounded text-center">
          <div className="text-lg font-bold text-blue-600">
            {Math.round(content.completionProbability * 100)}%
          </div>
          <div className="text-xs text-blue-700">Success Rate</div>
        </div>
        <div className="p-2 bg-gray-50 rounded text-center">
          <div className="text-lg font-bold text-gray-900">
            {content.expectedTurns.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Expected Turns</div>
        </div>
      </div>

      {/* Essential Analysis */}
      <div className="p-2 bg-gray-50 rounded">
        <p className="text-xs text-gray-700 leading-relaxed">
          {content.probabilityAnalysis.split('.')[0]}.
        </p>
      </div>

      {/* Top Alternative */}
      {content.alternativeStrategies.length > 0 && (
        <div className="text-xs">
          <span className="text-gray-600">Best alternative: </span>
          <span className="font-medium text-gray-900">
            {content.alternativeStrategies[0].strategy} (
            {Math.round(content.alternativeStrategies[0].probability * 100)}%)
          </span>
        </div>
      )}
    </div>
  )
}