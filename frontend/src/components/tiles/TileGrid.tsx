// frontend/src/components/tiles/TileGrid.tsx
import React from 'react';
import type { Tile, TileSuit } from '../../types';
import TileComponent from './TileComponent';
import { 
  createAllTiles, 
  groupTilesBySuit, 
  countTiles, 
  canSelectTile,
  getSuitDisplayName 
} from '../../utils/tile-utils';

interface TileGridProps {
  availableTiles?: Tile[];
  selectedTiles: Tile[];
  onTileSelect: (tile: Tile) => void;
  mode: 'input' | 'selection' | 'display';
  readonly?: boolean;
  showCounts?: boolean;
  maxTilesPerType?: number;
}

const TileGrid: React.FC<TileGridProps> = ({
  availableTiles,
  selectedTiles,
  onTileSelect,
  mode,
  readonly = false,
  showCounts = true,
  maxTilesPerType = 4
}) => {
  // Use all tiles if none provided
  const tiles = availableTiles || createAllTiles();
  const groupedTiles = groupTilesBySuit(tiles);
  const selectedCounts = countTiles(selectedTiles);

  // Handle tile click
  const handleTileClick = (tile: Tile) => {
    if (readonly) return;
    onTileSelect(tile);
  };

  // Render a suit section
  const renderSuitSection = (suit: TileSuit, suitTiles: Tile[]) => {
    if (suitTiles.length === 0) return null;

    return (
      <div key={suit} className="mb-6">
        {/* Suit header */}
        <h3 className="text-sm font-semibold text-gray-700 mb-2 px-1">
          {getSuitDisplayName(suit)}
        </h3>
        
        {/* Tiles grid for this suit */}
        <div className={`
          grid gap-2
          ${suit === 'winds' || suit === 'dragons' ? 'grid-cols-4' : ''}
          ${suit === 'flowers' ? 'grid-cols-4' : ''}
          ${suit === 'jokers' ? 'grid-cols-1 justify-center' : ''}
          ${['dots', 'bams', 'cracks'].includes(suit) ? 'grid-cols-5 sm:grid-cols-9' : ''}
        `}>
          {suitTiles.map(tile => {
            const tileCount = selectedCounts[tile.id] || 0;
            const isSelected = tileCount > 0;
            const canSelect = canSelectTile(tile, selectedTiles, maxTilesPerType);
            const isDisabled = readonly || (!canSelect && !isSelected);

            return (
              <TileComponent
                key={tile.id}
                tile={tile}
                isSelected={isSelected}
                isDisabled={isDisabled}
                showCount={showCounts && tileCount > 0}
                count={tileCount}
                size="medium"
                onClick={handleTileClick}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Header info */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {mode === 'input' && `Selected: ${selectedTiles.length} tiles`}
          {mode === 'selection' && `Select tiles to pass`}
          {mode === 'display' && `Your hand`}
        </div>
        
        {selectedTiles.length > 0 && (
          <button
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            onClick={() => selectedTiles.forEach(tile => onTileSelect(tile))}
            disabled={readonly}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Tile sections organized by suit */}
      <div className="space-y-1">
        {/* Numbers first (most commonly used) */}
        {renderSuitSection('dots', groupedTiles.dots)}
        {renderSuitSection('bams', groupedTiles.bams)}
        {renderSuitSection('cracks', groupedTiles.cracks)}
        
        {/* Honor tiles */}
        {renderSuitSection('winds', groupedTiles.winds)}
        {renderSuitSection('dragons', groupedTiles.dragons)}
        
        {/* Special tiles */}
        {renderSuitSection('flowers', groupedTiles.flowers)}
        {renderSuitSection('jokers', groupedTiles.jokers)}
      </div>

      {/* Tile count summary for input mode */}
      {mode === 'input' && selectedTiles.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Tiles Summary:</h4>
          <div className="text-xs text-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-1">
            {Object.entries(selectedCounts).map(([tileId, count]) => (
              <div key={tileId} className="flex justify-between">
                <span>{tileId}:</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation warnings */}
      {selectedTiles.length > 14 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Too many tiles selected ({selectedTiles.length}). American Mahjong hands typically have 13-14 tiles.
          </p>
        </div>
      )}
    </div>
  );
};

export default TileGrid;