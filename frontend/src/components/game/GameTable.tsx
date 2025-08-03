// frontend/src/components/game/GameTable.tsx
import React from 'react';
import type { Player, PlayerPosition } from '../../types';
import ExposedSets from './ExposedSets';

interface GameTableProps {
  players: Player[];
  currentTurn: PlayerPosition;
  currentPlayerId: string;
}

const GameTable: React.FC<GameTableProps> = ({
  players,
  currentTurn,
  currentPlayerId
}) => {
  // Position labels for the table
  const positionLabels: Record<PlayerPosition, string> = {
    east: 'East (Dealer)',
    south: 'South',
    west: 'West', 
    north: 'North'
  };

  // Get turn indicator emoji
  const getTurnIndicator = (position: PlayerPosition) => {
    return currentTurn === position ? '🎯' : '';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Game Table</h2>
      
      {/* Mahjong Table Layout */}
      <div className="relative bg-green-100 rounded-xl p-8" style={{ aspectRatio: '4/3', minHeight: '400px' }}>
        {/* Table center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-green-200 rounded-lg p-6 text-center shadow-sm">
            <div className="text-3xl mb-2">🀄</div>
            <div className="text-sm text-green-800 font-medium">Mahjong Table</div>
            <div className="text-xs text-green-700 mt-1">
              Turn: {positionLabels[currentTurn]}
            </div>
          </div>
        </div>

        {/* Player positions with exposed sets */}
        {(['east', 'south', 'west', 'north'] as PlayerPosition[]).map((position, index) => {
          const player = players.find(p => p.position === position);
          const isCurrentPlayer = player?.id === currentPlayerId;
          const isCurrentTurn = currentTurn === position;
          
          // Position coordinates (top, right, bottom, left)
          const positionStyles = [
            'absolute top-4 left-1/2 transform -translate-x-1/2', // East (top)
            'absolute right-4 top-1/2 transform -translate-y-1/2',  // South (right)
            'absolute bottom-4 left-1/2 transform -translate-x-1/2', // West (bottom)
            'absolute left-4 top-1/2 transform -translate-y-1/2'     // North (left)
          ];

          // Exposed sets positioning (around each player)
          const exposedSetsStyles = [
            'absolute top-16 left-1/2 transform -translate-x-1/2', // East sets (below player)
            'absolute right-16 top-1/2 transform -translate-y-1/2',  // South sets (left of player)
            'absolute bottom-16 left-1/2 transform -translate-x-1/2', // West sets (above player)
            'absolute left-16 top-1/2 transform -translate-y-1/2'     // North sets (right of player)
          ];

          return (
            <div key={position}>
              {/* Player card */}
              <div className={positionStyles[index]}>
                {player ? (
                  <div className={`
                    bg-white rounded-lg p-3 shadow-sm min-w-[140px] text-center border-2 transition-all
                    ${isCurrentPlayer ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                    ${isCurrentTurn ? 'ring-2 ring-green-500 ring-offset-2' : ''}
                  `}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {getTurnIndicator(position) && (
                        <span className="text-lg">{getTurnIndicator(position)}</span>
                      )}
                      <div className="font-medium text-gray-900">{player.name}</div>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">{positionLabels[position]}</div>
                    
                    {/* Player stats */}
                    <div className="flex justify-center gap-2 text-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {player.tilesInHand} tiles
                      </span>
                      {player.exposedSets.length > 0 && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {player.exposedSets.length} sets
                        </span>
                      )}
                      <div className={`w-2 h-2 rounded-full self-center ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>

                    {/* Mahjong indicator */}
                    {player.hasCalledMahjong && (
                      <div className="mt-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-medium">
                        🎉 MAHJONG!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-3 min-w-[140px] text-center">
                    <div className="text-gray-500 text-sm">Empty Seat</div>
                    <div className="text-xs text-gray-400">{positionLabels[position]}</div>
                  </div>
                )}
              </div>

              {/* Exposed sets for this player */}
              {player && player.exposedSets.length > 0 && (
                <div className={exposedSetsStyles[index]}>
                  <ExposedSets
                    exposedSets={player.exposedSets}
                    playerPosition={position}
                    layout={index % 2 === 0 ? 'horizontal' : 'vertical'}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Wind indicator in corners */}
        <div className="absolute top-2 right-2 text-xs text-green-700 font-medium">
          🧭 E-S-W-N
        </div>
      </div>

      {/* Table Legend (mobile) */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600 md:hidden">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span>Connected</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          <span>Disconnected</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🎯</span>
          <span>Current Turn</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 border-2 border-blue-500 rounded"></span>
          <span>You</span>
        </div>
      </div>
    </div>
  );
};

export default GameTable;