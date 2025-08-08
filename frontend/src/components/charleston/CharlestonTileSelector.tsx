// frontend/src/components/charleston/CharlestonTileSelector.tsx
// Main Charleston tile selection component that orchestrates all parts

import React, { useState, useEffect } from 'react';
import type { Tile } from '../../types';
import type { CharlestonRecommendation } from '../../types/charleston-types';
import { getCharlestonRecommendations } from '../../utils/charleston-engine';
import CharlestonPassingArea from './CharlestonPassingArea';
import CharlestonHandDisplay from './CharlestonHandDisplay';
import CharlestonRecommendationPanel from './CharlestonRecommendationPanel';

interface CharlestonTileSelectorProps {
  playerTiles: Tile[];
  selectedTiles: Tile[];
  onTileSelect: (tile: Tile) => void;
  onTileRemove: (tile: Tile, index: number) => void;
  phase: 'right' | 'across' | 'left' | 'optional';
  isReadyToPass: boolean;
  onConfirmSelection: () => void;
  onClearSelection: () => void;
  onSkipOptional?: () => void;
  opponentCount?: number;
}

const CharlestonTileSelector: React.FC<CharlestonTileSelectorProps> = ({
  playerTiles,
  selectedTiles,
  onTileSelect,
  onTileRemove,
  phase,
  isReadyToPass,
  onConfirmSelection,
  onClearSelection,
  onSkipOptional,
  opponentCount = 3
}) => {
  const [recommendations, setRecommendations] = useState<CharlestonRecommendation | null>(null);
  // Removed unused showRecommendations state
  const [isLoading, setIsLoading] = useState(false);

  // Generate recommendations when tiles change
  useEffect(() => {
    if (playerTiles.length >= 13) {
      setIsLoading(true);
      
      // Small delay to show loading state
      const timer = setTimeout(() => {
        try {
          const newRecommendations = getCharlestonRecommendations(
            playerTiles,
            phase,
            opponentCount
          );
          setRecommendations(newRecommendations);
        } catch (error) {
          console.error('Error generating Charleston recommendations:', error);
          setRecommendations(null);
        } finally {
          setIsLoading(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setRecommendations(null);
    }
  }, [playerTiles, phase, opponentCount]);

  const maxSelection = 3;
  const canConfirm = selectedTiles.length === maxSelection && !isReadyToPass;

  // Handle tile selection from hand
  const handleTileSelect = (tile: Tile) => {
    const isSelected = selectedTiles.includes(tile);
    
    if (isSelected) {
      // Remove from selection
      onTileRemove(tile, selectedTiles.indexOf(tile));
    } else if (selectedTiles.length < maxSelection) {
      // Add to selection
      onTileSelect(tile);
    }
  };

  // Get phase description
  const getPhaseDescription = () => {
    switch (phase) {
      case 'right':
        return 'Pass tiles to the player on your right';
      case 'across':
        return 'Pass tiles to the player across from you';
      case 'left':
        return 'Pass tiles to the player on your left';
      case 'optional':
        return 'Optional pass - you can skip this phase';
      default:
        return 'Select tiles to pass';
    }
  };

  return (
    <div className="space-y-4">
      {/* Phase header */}
      <div className="text-center bg-white rounded-lg p-4 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Charleston Phase: {phase.charAt(0).toUpperCase() + phase.slice(1)}
        </h2>
        <p className="text-gray-600 text-sm">
          {getPhaseDescription()}
        </p>
      </div>

      {/* Recommendation panel */}
      {isLoading ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 text-sm">Analyzing your hand...</span>
          </div>
        </div>
      ) : (
        <CharlestonRecommendationPanel
          recommendations={recommendations}
          currentPhase={phase}
        />
      )}

      {/* Tile passing area */}
      <CharlestonPassingArea
        selectedTiles={selectedTiles}
        onTileRemove={onTileRemove}
        phase={phase}
      />

      {/* Hand display */}
      <CharlestonHandDisplay
        playerTiles={playerTiles}
        selectedTiles={selectedTiles}
        recommendations={recommendations}
        onTileSelect={handleTileSelect}
        maxSelection={maxSelection}
      />

      {/* Action buttons - fixed positioning */}
      <div className="bg-white border-t border-gray-200 p-4 space-y-3 sticky bottom-0 safe-area-bottom">
        <div className="flex gap-3">
          {/* Clear selection button */}
          <button
            onClick={onClearSelection}
            disabled={selectedTiles.length === 0}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors min-h-[48px] touch-manipulation ${
              selectedTiles.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95'
            }`}
          >
            Clear Selection
          </button>

          {/* Skip optional phase button (only for optional phase) */}
          {phase === 'optional' && onSkipOptional && (
            <button
              onClick={() => {
                console.log('Skip optional phase requested');
                onSkipOptional();
              }}
              className="flex-1 py-3 px-4 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors min-h-[48px] touch-manipulation active:scale-95"
            >
              Skip Optional Pass
            </button>
          )}

          {/* Confirm selection button */}
          <button
            onClick={onConfirmSelection}
            disabled={!canConfirm}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors min-h-[48px] touch-manipulation ${
              canConfirm
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg active:scale-95'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isReadyToPass
              ? 'Waiting for Others...'
              : selectedTiles.length < maxSelection
                ? `Select ${maxSelection - selectedTiles.length} More`
                : selectedTiles.length > maxSelection
                  ? 'Too Many Selected'
                  : 'Ready to Pass'
            }
          </button>
        </div>
      </div>

      {/* Status messages */}
      {isReadyToPass && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <div className="text-sm text-green-800">
              <div className="font-medium">Selection confirmed!</div>
              <div>Waiting for other players to make their selections...</div>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      {!isReadyToPass && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-blue-600">💡</span>
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Charleston Tips:</div>
              <ul className="space-y-1 text-xs">
                <li>• Pass tiles you don't need for your current patterns</li>
                <li>• Keep tiles that work together or support multiple patterns</li>
                <li>• Consider what you might receive from other players</li>
                <li>• {phase === 'optional' ? 'You can skip the optional pass if your hand is good' : 'All players must participate in this phase'}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharlestonTileSelector;