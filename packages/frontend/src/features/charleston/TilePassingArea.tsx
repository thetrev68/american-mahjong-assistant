// TilePassingArea Component
// Interactive tile selection interface for Charleston passing

import { useState, useMemo } from 'react'
import type { PlayerTile } from 'shared-types';

interface TilePassingAreaProps {
  availableTiles: PlayerTile[]
  selectedTiles: PlayerTile[]
  recommendedTiles: PlayerTile[]
  onTileSelect: (tile: PlayerTile) => void
  onTileDeselect: (tile: PlayerTile) => void
  maxSelection?: number
  disabled?: boolean
  className?: string
}

export function TilePassingArea({ 
  availableTiles = [],
  selectedTiles = [],
  recommendedTiles = [],
  onTileSelect,
  onTileDeselect,
  maxSelection = 3,
  disabled = false,
  className = ''
}: TilePassingAreaProps) {
  
  const [sortBy, setSortBy] = useState<'suit' | 'recommendation' | 'alphabetical'>('recommendation')
  
  // Organize tiles by categories
  const organizedTiles = useMemo(() => {
    const tiles = [...availableTiles]
    const recommendedInstanceIds = new Set(recommendedTiles.map(t => t.instanceId || t.id))
    const selectedInstanceIds = new Set(selectedTiles.map(t => t.instanceId || t.id))
    
    // Sort tiles based on selected method
    const sortedTiles = tiles.sort((a, b) => {
      if (sortBy === 'recommendation') {
        const aRec = recommendedInstanceIds.has(a.instanceId || a.id) ? 1 : 0
        const bRec = recommendedInstanceIds.has(b.instanceId || b.id) ? 1 : 0
        if (aRec !== bRec) return bRec - aRec // Recommended first
      }
      
      if (sortBy === 'suit') {
        if (a.suit !== b.suit) return a.suit.localeCompare(b.suit)
        return a.value.localeCompare(b.value)
      }
      
      return a.id.localeCompare(b.id) // Alphabetical
    })
    
    return {
      recommended: sortedTiles.filter(t => recommendedInstanceIds.has(t.instanceId || t.id) && !selectedInstanceIds.has(t.instanceId || t.id)),
      selected: sortedTiles.filter(t => selectedInstanceIds.has(t.instanceId || t.id)),
      other: sortedTiles.filter(t => !recommendedInstanceIds.has(t.instanceId || t.id) && !selectedInstanceIds.has(t.instanceId || t.id))
    }
  }, [availableTiles, recommendedTiles, selectedTiles, sortBy])
  
  const canSelectMore = selectedTiles.length < maxSelection
  const isComplete = selectedTiles.length === maxSelection
  
  const handleTileClick = (tile: PlayerTile) => {
    if (disabled) return
    
    const isSelected = selectedTiles.some(t => (t.instanceId || t.id) === (tile.instanceId || tile.id))
    
    if (isSelected) {
      onTileDeselect(tile)
    } else if (canSelectMore) {
      onTileSelect(tile)
    }
  }
  
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="font-semibold text-gray-900">Select Tiles to Pass</h3>
            <div className={`px-2 py-1 text-xs font-medium rounded ${
              isComplete
                ? 'bg-green-100 text-green-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              {selectedTiles.length} / {maxSelection}
            </div>
          </div>
          
          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'suit' | 'recommendation' | 'alphabetical')}
            className="text-sm border border-gray-200 rounded px-2 py-1"
            disabled={disabled}
          >
            <option value="recommendation">By Recommendation</option>
            <option value="suit">By Suit</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
        
        {!isComplete && (
          <p className="text-sm text-gray-500 mt-1">
            Select {maxSelection - selectedTiles.length} more tile{maxSelection - selectedTiles.length > 1 ? 's' : ''}
          </p>
        )}
      </div>
      
      <div className="p-4 space-y-4">
        {/* Selected Tiles */}
        {organizedTiles.selected.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Selected to Pass
            </h4>
            <div className="flex flex-wrap gap-2">
              {organizedTiles.selected.map(tile => (
                <TileButton
                  key={tile.instanceId || tile.id}
                  tile={tile}
                  onClick={() => handleTileClick(tile)}
                  variant="selected"
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Recommended Tiles */}
        {organizedTiles.recommended.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-indigo-800 mb-2 flex items-center">
              <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
              AI Recommended
            </h4>
            <div className="flex flex-wrap gap-2">
              {organizedTiles.recommended.map(tile => (
                <TileButton
                  key={tile.instanceId || tile.id}
                  tile={tile}
                  onClick={() => handleTileClick(tile)}
                  variant="recommended"
                  disabled={disabled || !canSelectMore}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Other Available Tiles */}
        {organizedTiles.other.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
              Other Available Tiles
            </h4>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {organizedTiles.other.map(tile => (
                <TileButton
                  key={tile.instanceId || tile.id}
                  tile={tile}
                  onClick={() => handleTileClick(tile)}
                  variant="available"
                  disabled={disabled || !canSelectMore}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Status Message */}
        {isComplete && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✓</span>
              <p className="text-sm text-green-800 font-medium">
                Ready to pass! You've selected {maxSelection} tiles.
              </p>
            </div>
          </div>
        )}
        
        {availableTiles.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">🃏</div>
            <p className="text-sm text-gray-600">No tiles available</p>
            <p className="text-xs text-gray-500">Enter your hand tiles to begin</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface TileButtonProps {
  tile: PlayerTile
  onClick: () => void
  variant: 'selected' | 'recommended' | 'available'
  disabled?: boolean
}

function TileButton({ tile, onClick, variant, disabled }: TileButtonProps) {
  const isJoker = tile.isJoker || tile.suit === 'jokers'
  
  const baseClasses = "px-3 py-2 text-sm font-medium rounded-md border transition-all duration-150 hover:scale-105 active:scale-95"
  
  const variantClasses = {
    selected: "bg-green-100 border-green-300 text-green-800 shadow-md",
    recommended: "bg-indigo-100 border-indigo-300 text-indigo-800 hover:bg-indigo-200",
    available: "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
  }
  
  const disabledClasses = disabled 
    ? "opacity-50 cursor-not-allowed hover:scale-100 active:scale-100" 
    : "cursor-pointer"
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses}`}
      title={isJoker ? "⚠️ This is a joker - consider keeping!" : undefined}
    >
      <div className="flex items-center space-x-1">
        <span>{tile.id}</span>
        {isJoker && <span className="text-purple-600">🃟</span>}
        {variant === 'recommended' && <span className="text-indigo-500">⭐</span>}
        {variant === 'selected' && <span className="text-green-600">✓</span>}
      </div>
    </button>
  )
}