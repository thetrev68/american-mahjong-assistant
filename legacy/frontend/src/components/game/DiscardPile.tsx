// frontend/src/components/game/DiscardPile.tsx
import React from 'react';
import type { DiscardedTile, Tile, ActionType } from '../../types';
import TileComponent from '../tiles/TileComponent';

interface DiscardPileProps {
  discards: DiscardedTile[];
  onTileCall?: (tile: Tile, callType: ActionType) => void;
  canCall?: boolean;
  maxVisible?: number;
}

const DiscardPile: React.FC<DiscardPileProps> = ({
  discards,
  onTileCall,
  canCall = false,
  maxVisible = 10
}) => {
  // Get the most recent discards
  const visibleDiscards = discards.slice(-maxVisible);
  const latestDiscard = visibleDiscards[visibleDiscards.length - 1];

  // Position labels for display
  const positionLabels = {
    east: 'E',
    south: 'S', 
    west: 'W',
    north: 'N'
  };

  const handleTileCall = (callType: ActionType) => {
    if (latestDiscard && onTileCall) {
      onTileCall(latestDiscard.tile, callType);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Discard Pile</h3>
        <span className="text-xs text-gray-500">
          {discards.length} total discards
        </span>
      </div>

      {/* Recent Discards */}
      {visibleDiscards.length > 0 ? (
        <div className="space-y-3">
          {/* Latest discard (highlighted) */}
          {latestDiscard && (
            <div className={`
              p-3 rounded-lg border-2 transition-all
              ${canCall && latestDiscard.canBeCalled 
                ? 'border-orange-300 bg-orange-50' 
                : 'border-blue-300 bg-blue-50'
              }
            `}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-600">
                  Latest discard from{' '}
                  <span className="font-medium">
                    {positionLabels[latestDiscard.discardedBy]}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(latestDiscard.timestamp).toLocaleTimeString()}
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                <TileComponent
                  tile={latestDiscard.tile}
                  size="large"
                  isSelected={canCall && latestDiscard.canBeCalled}
                />
              </div>

              {/* Call Action Buttons */}
              {canCall && latestDiscard.canBeCalled && onTileCall && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTileCall('call_pung')}
                    className="px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors touch-target"
                  >
                    Pung
                  </button>
                  <button
                    onClick={() => handleTileCall('call_kong')}
                    className="px-3 py-2 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition-colors touch-target"
                  >
                    Kong
                  </button>
                  <button
                    onClick={() => handleTileCall('call_exposure')}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors touch-target"
                  >
                    Exposure
                  </button>
                  <button
                    onClick={() => handleTileCall('pass')}
                    className="px-3 py-2 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700 transition-colors touch-target"
                  >
                    Pass
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Previous discards (compact view) */}
          {visibleDiscards.length > 1 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">Recent discards:</div>
              <div className="grid grid-cols-5 gap-1">
                {visibleDiscards.slice(0, -1).reverse().map((discard, index) => (
                  <div key={`${discard.timestamp}-${index}`} className="text-center">
                    <TileComponent
                      tile={discard.tile}
                      size="small"
                      isDisabled={true}
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {positionLabels[discard.discardedBy]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <div className="text-2xl mb-2">🀫</div>
          <div className="text-sm">No discards yet</div>
          <div className="text-xs">First player to discard will appear here</div>
        </div>
      )}

      {/* Call Timer */}
      {canCall && latestDiscard?.canBeCalled && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
          <div className="flex items-center gap-2 text-xs text-yellow-800">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Call decision needed</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {visibleDiscards.length === 0 && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          Discarded tiles will appear here in chronological order.
          You can call the most recent discard if it helps your hand.
        </div>
      )}
    </div>
  );
};

export default DiscardPile;