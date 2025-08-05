// frontend/src/components/charleston/CharlestonHandDisplay.tsx
// Hand display with recommendation highlights for Charleston

import React from 'react';
import type { Tile } from '../../types';
import type { CharlestonRecommendation } from '../../types/charleston-types';
import TileComponent from '../tiles/TileComponent';

interface CharlestonHandDisplayProps {
  playerTiles: Tile[];
  selectedTiles: Tile[];
  recommendations: CharlestonRecommendation | null;
  onTileSelect: (tile: Tile) => void;
  maxSelection: number;
}

const CharlestonHandDisplay: React.FC<CharlestonHandDisplayProps> = ({
  playerTiles,
  selectedTiles,
  recommendations,
  onTileSelect,
  maxSelection
}) => {
  // Get recommendation status for a tile
  const getTileRecommendation = (tile: Tile): 'keep' | 'pass' | 'neutral' => {
    if (!recommendations) return 'neutral';
    
    // Check if this tile type is in recommendations
    const isRecommendedToPass = recommendations.tilesToPass.some(t => t.id === tile.id);
    const isRecommendedToKeep = recommendations.tilesToKeep.some(t => t.id === tile.id);
    
    if (isRecommendedToPass) return 'pass';
    if (isRecommendedToKeep) return 'keep';
    return 'neutral';
  };

  // Check if tile is currently selected
  const isTileSelected = (tile: Tile): boolean => {
    return selectedTiles.includes(tile);
  };

  // Check if we can select more tiles
  const canSelectMore = selectedTiles.length < maxSelection;

  // Handle tile click
  const handleTileClick = (tile: Tile) => {
    const isSelected = isTileSelected(tile);
    
    // Can always deselect, can only select if under limit
    if (isSelected || canSelectMore) {
      onTileSelect(tile);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-md font-medium text-gray-900">Your Hand</h3>
        <div className="text-sm text-gray-600">
          {playerTiles.length} tiles
        </div>
      </div>

      {/* Hand tiles grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {playerTiles.map((tile, index) => {
          const recommendation = getTileRecommendation(tile);
          const isSelected = isTileSelected(tile);
          const isDisabled = !isSelected && !canSelectMore;
          
          return (
            <div key={`hand-tile-${index}`} className="relative">
              <TileComponent
                tile={tile}
                size="large"
                onClick={handleTileClick}
                isSelected={isSelected}
                isDisabled={isDisabled}
              />
              
              {/* Recommendation border overlay */}
              {!isSelected && recommendation !== 'neutral' && (
                <div className={`absolute inset-0 rounded-md ring-3 pointer-events-none ${
                  recommendation === 'keep' 
                    ? 'ring-green-500' 
                    : 'ring-red-500'
                }`} />
              )}
              
              {/* Selection overlay */}
              {isSelected && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-md ring-2 ring-blue-500 pointer-events-none" />
              )}
              
              {/* Disabled overlay */}
              {isDisabled && (
                <div className="absolute inset-0 bg-gray-300 bg-opacity-40 rounded-md pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* Recommendation legend */}
      {recommendations && (
        <div className="border-t border-gray-200 pt-3">
          <div className="text-sm font-medium text-gray-700 mb-2">Recommendations:</div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-3 border-green-500 rounded"></div>
              <span className="text-green-700">
                Keep ({recommendations.tilesToKeep.length})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-3 border-red-500 rounded"></div>
              <span className="text-red-700">
                Consider passing ({recommendations.tilesToPass.length})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border border-gray-400 rounded bg-gray-100"></div>
              <span className="text-gray-600">Neutral</span>
            </div>
          </div>
        </div>
      )}

      {/* Selection limit warning */}
      {!canSelectMore && selectedTiles.length < maxSelection && (
        <div className="mt-2 text-center text-sm text-orange-600">
          Maximum {maxSelection} tiles can be selected
        </div>
      )}
    </div>
  );
};

export default CharlestonHandDisplay;