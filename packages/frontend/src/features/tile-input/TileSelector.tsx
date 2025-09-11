// Tile Selector Component
// Touch-optimized interface for selecting tiles to add to hand

import { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import { AnimatedTile } from '../../ui-components/tiles/AnimatedTile'
import { useTileStore } from '../../stores'
import { tileService } from '../../lib/services/tile-service'
import type { TileSuit, PlayerTile, Tile as BaseTile } from '../../types/tile-types'

interface TileSelectorProps {
  onTileSelect?: (tileId: string) => void
  compact?: boolean
  onCollapse?: () => void
  modalMode?: boolean // If true, only call onTileSelect, don't add to store
}

export const TileSelector = ({ onTileSelect, compact = false, onCollapse, modalMode = false }: TileSelectorProps) => {
  const [selectedSuit, setSelectedSuit] = useState<TileSuit>('jokers')
  const { addTile, playerHand, dealerHand } = useTileStore()
  
  const suits: Array<{ suit: TileSuit; label: string; emoji: string }> = [
    { suit: 'jokers', label: 'Jokers', emoji: '🃏' },
    { suit: 'flowers', label: 'Flowers', emoji: '🌸' },
    { suit: 'bams', label: 'Bams', emoji: '🟢' },
    { suit: 'cracks', label: 'Cracks', emoji: '🔴' },
    { suit: 'dots', label: 'Dots', emoji: '🔵' },
    { suit: 'dragons', label: 'Dragons', emoji: '🐉' },
    { suit: 'winds', label: 'Winds', emoji: '💨' }
  ]
  
  const availableTiles = tileService.getTilesBySuit(selectedSuit)
  
  // Count how many of each tile we already have
  const tileCounts = new Map<string, number>()
  playerHand.forEach(tile => {
    tileCounts.set(tile.id, (tileCounts.get(tile.id) || 0) + 1)
  })
  
  const handleTileClick = (tile: BaseTile) => {
    const currentCount = tileCounts.get(tile.id) || 0
    
    if (!modalMode) {
      // Normal mode: check hand size and add to store
      const maxHandSize = dealerHand ? 14 : 13
      if (playerHand.length >= maxHandSize) {
        return
      }
      
      // Check if we've reached the limit of 4 for this tile
      if (currentCount >= 4) {
        return
      }
      
      addTile(tile.id)
    }
    
    // Always call the callback (in modal mode, this is the only action)
    if (onTileSelect) {
      onTileSelect(tile.id)
    }
  }
  
  const createDummyPlayerTile = (baseTile: BaseTile): PlayerTile => ({
    ...baseTile,
    instanceId: `selector_${baseTile.id}`,
    isSelected: false
  })
  
  if (compact) {
    return (
      <Card variant="default" className="p-4">
        <div className="space-y-4">
          {/* Suit Selection */}
          <div className="grid grid-cols-4 gap-2">
            {suits.slice(0, 4).map(({ suit, emoji }) => (
              <Button
                key={suit}
                variant={selectedSuit === suit ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSuit(suit)}
              >
                {emoji}
              </Button>
            ))}
          </div>
          
          {/* Tiles Grid */}
          <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
            {availableTiles.map(tile => {
              const currentCount = tileCounts.get(tile.id) || 0
              const isMaxed = currentCount >= 4
              
              return (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                      <AnimatedTile
                        tile={createDummyPlayerTile(tile)}
                        size="sm"
                        onClick={() => !isMaxed && handleTileClick(tile)}
                        className={isMaxed ? 'opacity-50 cursor-not-allowed' : ''}
                        animateOnSelect={true}
                        context="selection"
                      />
                      {currentCount > 0 && (
                        <div className="tile-count-badge">
                          {currentCount}
                        </div>
                      )}
                    </div>
              )
            })}
          </div>
        </div>
      </Card>
    )
  }
  
  return (
    <Card variant="elevated" className="p-3">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Add Tiles to Hand
          </h3>
          
          <div className="flex items-center gap-2">
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
        </div>
        
        {/* Suit Tabs */}
        <div className="flex flex-wrap gap-2">
          {suits.map(({ suit, label, emoji }) => (
            <Button
              key={suit}
              variant={selectedSuit === suit ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedSuit(suit)}
              className="flex items-center gap-2"
            >
              <span>{emoji}</span>
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
        
        {/* Tiles Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-9 gap-4">
          {availableTiles.map(tile => {
            const currentCount = tileCounts.get(tile.id) || 0
            const isMaxed = currentCount >= 4
            
            return (
              <div key={tile.id} style={{ width: '52px', height: '69px', position: 'relative' }}>
                <AnimatedTile
                  tile={createDummyPlayerTile(tile)}
                  size="md"
                  onClick={() => !isMaxed && handleTileClick(tile)}
                  className={`
                    ${isMaxed ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
                    transition-transform duration-200
                  `}
                  animateOnSelect={true}
                  context="selection"
                />
                
                {/* Count Badge */}
                {currentCount > 0 && (
                  <div className="tile-count-badge">
                    {currentCount}
                  </div>
                )}
                
                {/* Max Badge */}
                {isMaxed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                    <span className="text-white text-xs font-bold">MAX</span>
                  </div>
                )}
                
              </div>
            )
          })}
        </div>
        
      </div>
    </Card>
  )
}