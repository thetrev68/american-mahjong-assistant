// frontend/src/components/PrivateHandView/TileActionBar.tsx
// Action controls for discarding, charleston passing, and other tile actions

import React from 'react';
import type { Tile } from '../../types';

type HandMode = 'view' | 'discard' | 'charleston';

interface TileActionBarProps {
  gamePhase: 'waiting' | 'charleston' | 'playing' | 'finished';
  charlestonPhase?: 'right' | 'across' | 'left' | 'optional' | 'complete';
  isMyTurn: boolean;
  handMode: HandMode;
  selectedTiles: Tile[];
  maxSelection: number;
  onModeChange: (mode: HandMode) => void;
  onConfirmAction: () => void;
  onCancel: () => void;
}

export const TileActionBar: React.FC<TileActionBarProps> = ({
  gamePhase,
  charlestonPhase,
  isMyTurn,
  handMode,
  selectedTiles,
  maxSelection,
  onModeChange,
  onConfirmAction,
  onCancel
}) => {
  // Get current phase display text
  const getPhaseText = () => {
    if (gamePhase === 'charleston' && charlestonPhase) {
      const phaseNames = {
  right: 'Pass Right',
  across: 'Pass Across', 
  left: 'Pass Left',
  optional: 'Optional Pass',
  complete: 'Charleston Complete'
};
      return phaseNames[charlestonPhase] || 'Charleston';
    }
    
    if (gamePhase === 'playing') {
      return isMyTurn ? 'Your Turn' : 'Waiting for turn';
    }
    
    return gamePhase === 'waiting' ? 'Waiting to start' : 'Game finished';
  };

  // Check if actions are available
  const canDiscard = gamePhase === 'playing' && isMyTurn;
  const canCharleston = gamePhase === 'charleston' && charlestonPhase !== 'complete';
  const canConfirm = selectedTiles.length === maxSelection && maxSelection > 0;

  // Get confirmation button text
  const getConfirmText = () => {
    if (handMode === 'charleston') {
      return `Pass ${selectedTiles.length} Tile${selectedTiles.length !== 1 ? 's' : ''}`;
    }
    return `Discard ${selectedTiles.length > 0 ? selectedTiles[0].id : 'Tile'}`;
  };

  // Show phase indicator if not in normal play
  if (gamePhase === 'waiting' || gamePhase === 'finished') {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-gray-600 font-medium">{getPhaseText()}</p>
        {gamePhase === 'waiting' && (
          <p className="text-sm text-gray-500 mt-1">Waiting for all players to join</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Phase indicator */}
      <div className="flex items-center justify-center">
        <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
          isMyTurn || canCharleston
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        }`}>
          {getPhaseText()}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex space-x-2">
        {/* Normal play actions */}
        {gamePhase === 'playing' && (
          <>
            {/* Discard button */}
            <button
              onClick={() => onModeChange(handMode === 'discard' ? 'view' : 'discard')}
              disabled={!canDiscard}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all min-h-[44px] ${
                handMode === 'discard'
                  ? 'bg-red-100 text-red-700 border-2 border-red-300 shadow-sm'
                  : canDiscard
                    ? 'bg-white text-gray-700 border-2 border-gray-300 hover:border-red-300 hover:bg-red-50'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
              }`}
            >
              {handMode === 'discard' ? 'Cancel Discard' : 'Discard Tile'}
            </button>

            {/* Call buttons (placeholder for future features) */}
            <button
              disabled
              className="px-4 py-3 bg-gray-100 text-gray-400 border-2 border-gray-200 rounded-lg font-medium cursor-not-allowed min-h-[44px]"
            >
              Call
            </button>
          </>
        )}

        {/* Charleston actions */}
        {gamePhase === 'charleston' && (
          <button
            onClick={() => onModeChange(handMode === 'charleston' ? 'view' : 'charleston')}
            disabled={!canCharleston}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all min-h-[44px] ${
              handMode === 'charleston'
                ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300 shadow-sm'
                : canCharleston
                  ? 'bg-white text-gray-700 border-2 border-gray-300 hover:border-yellow-300 hover:bg-yellow-50'
                  : 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
            }`}
          >
            {handMode === 'charleston' ? 'Cancel Selection' : `Select 3 Tiles to Pass`}
          </button>
        )}
      </div>

      {/* Confirmation actions (shown when tiles are selected) */}
      {handMode !== 'view' && (
        <div className="flex space-x-2 pt-2 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          
          <button
            onClick={onConfirmAction}
            disabled={!canConfirm}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all min-h-[44px] ${
              canConfirm
                ? handMode === 'charleston'
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm'
                  : 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canConfirm ? getConfirmText() : `Select ${maxSelection} tile${maxSelection > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Selection counter */}
      {handMode !== 'view' && maxSelection > 0 && (
        <div className="text-center">
          <span className="text-sm text-gray-600">
            {selectedTiles.length} / {maxSelection} selected
          </span>
          {selectedTiles.length > 0 && (
            <div className="mt-1 flex justify-center flex-wrap gap-1">
              {selectedTiles.map((tile, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono"
                >
                  {tile.id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      {handMode !== 'view' && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            {handMode === 'charleston' 
              ? '💡 Tip: Pass tiles you don\'t need for your current patterns'
              : '💡 Tip: Check the analysis panel for discard recommendations'
            }
          </p>
        </div>
      )}
    </div>
  );
};