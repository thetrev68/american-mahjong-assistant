import { useTileStore } from '../stores'
import type { PlayerTile } from 'shared-types'

export type TileInteractionContext = 'charleston' | 'gameplay' | 'selection'

export const useTileInteraction = (context: TileInteractionContext) => {
  const {
    moveToSelection,
    returnFromSelection,
    selectedForAction,
    tileStates,
    toggleTileLock
  } = useTileStore()

  const handleTileClick = (tile: PlayerTile) => {
    const currentState = tileStates[tile.instanceId]

    if (context === 'charleston') {
      // Charleston mode: toggle selection for passing
      const isSelected = selectedForAction.some(t => t.instanceId === tile.instanceId)

      if (isSelected) {
        returnFromSelection(tile.instanceId)
      } else if (selectedForAction.length < 3) {
        moveToSelection(tile.instanceId)
      }
    } else {
      // Gameplay and selection modes: use selection area system
      if (currentState === 'placeholder') {
        // Placeholder clicked - return tile from selection area
        returnFromSelection(tile.instanceId)
      } else {
        // Normal tile clicked - move to selection area (creates placeholder)
        moveToSelection(tile.instanceId)
      }
    }
  }

  const handleTileRightClick = (e: React.MouseEvent, tile: PlayerTile) => {
    e.preventDefault()
    toggleTileLock(tile.instanceId)
  }

  return {
    handleTileClick,
    handleTileRightClick
  }
}