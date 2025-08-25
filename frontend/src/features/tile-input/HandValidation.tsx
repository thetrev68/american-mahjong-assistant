// Hand Validation Component
// Shows validation status, errors, and recommendations

import { useMemo } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { useTileStore } from '../../stores'
import { tileService } from '../../services/tile-service'

interface HandValidationProps {
  onCollapse?: () => void
}

export const HandValidation = ({ onCollapse }: HandValidationProps) => {
  const {
    playerHand,
    validation,
    dealerHand,
    analyzeHand,
    analysisInProgress,
    validateHand
  } = useTileStore()
  
  const tileStats = useMemo(() => {
    if (playerHand.length === 0) return null
    
    const counts = tileService.countTiles(playerHand)
    const groups = tileService.getTilesGroupedBySuit(playerHand)
    
    return {
      counts,
      groups,
      totalTiles: playerHand.length,
      expectedTiles: dealerHand ? 14 : 13,
      uniqueTileTypes: Object.keys(counts).length,
      maxOfAnyTile: Math.max(...Object.values(counts).map(Number), 0)
    }
  }, [playerHand, dealerHand])
  
  const getValidationIcon = () => {
    if (validation.isValid) return '✅'
    if (validation.errors.length > 0) return '❌'
    if (validation.warnings.length > 0) return '⚠️'
    return '❓'
  }
  
  const getValidationStatus = () => {
    if (validation.isValid) return 'Valid Hand'
    if (validation.errors.length > 0) return 'Invalid Hand'
    if (validation.warnings.length > 0) return 'Has Warnings'
    return 'Not Validated'
  }
  
  const getValidationColor = () => {
    if (validation.isValid) return 'text-green-800'
    if (validation.errors.length > 0) return 'text-red-800'
    if (validation.warnings.length > 0) return 'text-yellow-800'
    return 'text-gray-800'
  }
  
  const getBorderColor = () => {
    if (validation.isValid) return 'border-green-200'
    if (validation.errors.length > 0) return 'border-red-200'
    if (validation.warnings.length > 0) return 'border-yellow-200'
    return 'border-gray-200'
  }
  
  const getBackgroundColor = () => {
    if (validation.isValid) return 'bg-green-50'
    if (validation.errors.length > 0) return 'bg-red-50'
    if (validation.warnings.length > 0) return 'bg-yellow-50'
    return 'bg-gray-50'
  }
  
  if (!tileStats) {
    return (
      <Card variant="default" className="p-6">
        <div className="text-center text-gray-500 space-y-3">
          <div className="text-4xl">📊</div>
          <h3 className="font-semibold">Hand Validation</h3>
          <p className="text-sm">Add tiles to see validation and statistics</p>
        </div>
      </Card>
    )
  }
  
  return (
    <Card variant="elevated" className="space-y-4">
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Hand Validation
          </h3>
          
          {onCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCollapse}
              className="text-sm"
            >
              ↑ Collapse
            </Button>
          )}
        </div>
        
        {/* Status Card */}
        <div className={`p-4 rounded-lg border ${getBorderColor()} ${getBackgroundColor()}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getValidationIcon()}</span>
            <div className="flex-1">
              <div className={`font-semibold ${getValidationColor()}`}>
                {getValidationStatus()}
              </div>
              <div className="text-sm text-gray-600">
                {tileStats.totalTiles}/{tileStats.expectedTiles} tiles
                {validation.tileCount !== tileStats.expectedTiles && (
                  <span className="ml-2 text-red-600">
                    ({tileStats.expectedTiles - tileStats.totalTiles > 0 ? 'Need' : 'Remove'}{' '}
                    {Math.abs(tileStats.expectedTiles - tileStats.totalTiles)})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Errors */}
        {validation.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-800 text-sm">Errors:</h4>
            <ul className="space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-yellow-800 text-sm">Warnings:</h4>
            <ul className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Hand Statistics */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800 text-sm">Hand Statistics:</h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white p-3 rounded border">
              <div className="font-semibold text-primary">{tileStats.totalTiles}</div>
              <div className="text-gray-600">Total Tiles</div>
            </div>
            
            <div className="bg-white p-3 rounded border">
              <div className="font-semibold text-secondary">{tileStats.uniqueTileTypes}</div>
              <div className="text-gray-600">Unique Types</div>
            </div>
            
            <div className="bg-white p-3 rounded border">
              <div className="font-semibold text-accent">{tileStats.maxOfAnyTile}</div>
              <div className="text-gray-600">Max of Any</div>
            </div>
            
            <div className="bg-white p-3 rounded border">
              <div className={`font-semibold ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {validation.isValid ? '100%' : '0%'}
              </div>
              <div className="text-gray-600">Valid</div>
            </div>
          </div>
          
          {/* Suit Breakdown */}
          <div className="space-y-2">
            <h5 className="font-medium text-gray-700 text-xs uppercase tracking-wide">Suit Distribution:</h5>
            <div className="space-y-1">
              {Object.entries(tileStats.groups).map(([suit, tiles]) => {
                if (tiles.length === 0) return null
                return (
                  <div key={suit} className="flex justify-between text-xs">
                    <span className="capitalize">{suit}:</span>
                    <span className="font-mono">{tiles.length}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-200 space-y-3">
        <Button
          variant="outline"
          size="sm"
          onClick={validateHand}
          className="w-full"
        >
          🔍 Re-validate Hand
        </Button>
        
        <Button
          variant="primary"
          size="sm"
          onClick={analyzeHand}
          loading={analysisInProgress}
          disabled={!validation.isValid}
          className="w-full"
        >
          🧠 Analyze Patterns
        </Button>
        
        {validation.isValid && (
          <div className="text-center text-xs text-green-600 font-medium">
            ✅ Ready for pattern analysis!
          </div>
        )}
      </div>
    </Card>
  )
}