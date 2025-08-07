// frontend/src/components/game/GameActions.tsx
// Player action buttons for active gameplay (discard, draw, mahjong, etc.)
import React from 'react';
import type { Tile } from '../../types';

interface GameActionsProps {
  isMyTurn: boolean;
  selectedTile: Tile | null;
  canDiscard: boolean;
  canDraw: boolean;
  canCallMahjong: boolean;
  onDiscard: () => void;
  onDraw: () => void;
  onDeclareMahjong: () => void;
  wallTilesRemaining: number;
}

const GameActions: React.FC<GameActionsProps> = ({
  isMyTurn,
  selectedTile,
  canDiscard,
  canDraw,
  canCallMahjong,
  onDiscard,
  onDraw,
  onDeclareMahjong,
  wallTilesRemaining
}) => {
  
  if (!isMyTurn) {
    return (
      <div className="text-center py-3">
        <p className="text-sm text-gray-600">
          Waiting for other player's turn...
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Tiles remaining: {wallTilesRemaining}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Primary actions */}
      <div className="flex gap-2">
        {/* Draw tile button */}
        <button
          onClick={onDraw}
          disabled={!canDraw}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors touch-target ${
            canDraw
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>🀫</span>
            <span>Draw Tile</span>
          </div>
          {canDraw && (
            <div className="text-xs mt-1 opacity-90">
              ({wallTilesRemaining} left)
            </div>
          )}
        </button>

        {/* Discard tile button */}
        <button
          onClick={onDiscard}
          disabled={!canDiscard}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors touch-target ${
            canDiscard
              ? 'bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>🗑️</span>
            <span>Discard</span>
          </div>
          {selectedTile && (
            <div className="text-xs mt-1 opacity-90">
              {selectedTile.suit} {selectedTile.value}
            </div>
          )}
        </button>
      </div>

      {/* Special actions */}
      <div className="flex gap-2">
        {/* Mahjong declaration button */}
        <button
          onClick={onDeclareMahjong}
          disabled={!canCallMahjong}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors touch-target ${
            canCallMahjong
              ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 animate-pulse'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>🎉</span>
            <span>Mahjong!</span>
          </div>
        </button>

        {/* Pass turn button (backup option) */}
        <button
          onClick={onDraw} // Same as draw for now - in real game this would pass turn
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors touch-target"
        >
          <span className="text-sm">Pass</span>
        </button>
      </div>

      {/* Helper text */}
      <div className="text-center">
        <p className="text-xs text-gray-600">
          {!selectedTile && canDraw && "Draw a tile or select one to discard"}
          {selectedTile && "Tap Discard to play selected tile"}
          {canCallMahjong && "You can declare Mahjong! 🎉"}
        </p>
      </div>
    </div>
  );
};

export default GameActions;