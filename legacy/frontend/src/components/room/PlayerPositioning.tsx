// frontend/src/components/room/PlayerPositioning.tsx
// Component for host to assign players to table positions using dropdowns

import React from 'react';
import type { Player, PlayerPosition } from '../../types';

interface PlayerPositioningProps {
  players: Player[];
  currentPositions: Map<string, PlayerPosition>;
  isHost: boolean;
  onPositionChange: (playerId: string, position: PlayerPosition) => void;
  onConfirmPositions: () => void;
}

const PlayerPositioning: React.FC<PlayerPositioningProps> = ({
  players,
  currentPositions,
  isHost,
  onPositionChange,
  onConfirmPositions
}) => {
  // Position labels
  const positionLabels: Record<PlayerPosition, string> = {
    east: 'East (Dealer)',
    south: 'South',
    west: 'West',
    north: 'North'
  };

  // Get player ID assigned to a position (if any)
  const getPlayerAtPosition = (position: PlayerPosition): string | null => {
    for (const [playerId, playerPosition] of currentPositions.entries()) {
      if (playerPosition === position) {
        return playerId;
      }
    }
    return null;
  };

  // Get player name by ID
  const getPlayerName = (playerId: string | null): string => {
    if (!playerId) return '';
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown Player';
  };

  // Check if a player is assigned to multiple positions (duplicate)
  const isDuplicateAssignment = (playerId: string): boolean => {
    if (!playerId) return false;
    let count = 0;
    for (const assignedPlayerId of currentPositions.values()) {
      if (assignedPlayerId === playerId) {
        count++;
      }
    }
    return count > 1;
  };

  // Check if position has duplicate player
  const isPositionInError = (position: PlayerPosition): boolean => {
    const playerId = getPlayerAtPosition(position);
    return playerId ? isDuplicateAssignment(playerId) : false;
  };

  // Handle position selection change
  const handlePositionChange = (position: PlayerPosition, selectedPlayerId: string) => {
    if (!isHost) return;

    if (selectedPlayerId === '') {
      // Clear this position - remove player from this position
      const currentPlayerId = getPlayerAtPosition(position);
      if (currentPlayerId) {
        // Remove the mapping for this player
        const newPositions = new Map(currentPositions);
        newPositions.delete(currentPlayerId);
        // Update parent through onPositionChange (bit of a hack but keeps interface simple)
        onPositionChange('', position); // Signal to clear this position
      }
    } else {
      // Assign player to this position
      onPositionChange(selectedPlayerId, position);
    }
  };

  // Check if we can confirm positions (no duplicates)
  const hasErrors = Array.from(currentPositions.values()).some(playerId => 
    isDuplicateAssignment(playerId)
  );

  const canConfirm = !hasErrors && currentPositions.size >= 2; // Need at least 2 players

  // Get available players for dropdown (all players)
  const getPlayersForDropdown = (currentPosition: PlayerPosition) => {
    return players.map(player => ({
      id: player.id,
      name: player.name,
      isSelected: getPlayerAtPosition(currentPosition) === player.id,
      isDuplicate: isDuplicateAssignment(player.id)
    }));
  };

  if (!isHost) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">Waiting for host to assign table positions...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Assign Table Positions</h2>
      
      {/* Instructions */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-blue-600">💡</span>
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Position Assignment</div>
            <div>Choose which player sits at each position. East is the dealer and gets 14 tiles.</div>
          </div>
        </div>
      </div>

      {/* Mahjong Table Layout */}
      <div className="relative bg-green-100 rounded-xl p-8 mb-6" style={{ aspectRatio: '4/3', minHeight: '300px' }}>
        {/* Table center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-green-200 rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl mb-1">🀄</div>
            <div className="text-sm text-green-800 font-medium">Mahjong Table</div>
          </div>
        </div>

        {/* Position dropdowns */}
        {(['east', 'south', 'west', 'north'] as PlayerPosition[]).map((position, index) => {
          const playerId = getPlayerAtPosition(position);
          const isError = isPositionInError(position);
          const availablePlayers = getPlayersForDropdown(position);
          
          // Position coordinates (top, right, bottom, left)
          const positionStyles = [
            'absolute top-4 left-1/2 transform -translate-x-1/2',    // East (top)
            'absolute right-4 top-1/2 transform -translate-y-1/2',   // South (right)
            'absolute bottom-4 left-1/2 transform -translate-x-1/2', // West (bottom)
            'absolute left-4 top-1/2 transform -translate-y-1/2'     // North (left)
          ];

          return (
            <div key={position} className={positionStyles[index]}>
              <div className={`
                bg-white rounded-lg p-3 shadow-sm min-w-[160px] border-2 transition-all
                ${isError ? 'border-red-500 bg-red-50' : 'border-gray-200'}
              `}>
                {/* Position label */}
                <div className="text-center mb-2">
                  <div className="font-medium text-gray-900 text-sm">
                    {positionLabels[position]}
                  </div>
                  {position === 'east' && (
                    <div className="text-xs text-yellow-600 font-medium">⭐ DEALER</div>
                  )}
                </div>

                {/* Player dropdown */}
                <select
                  value={playerId || ''}
                  onChange={(e) => handlePositionChange(position, e.target.value)}
                  className={`
                    w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2
                    ${isError 
                      ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                      : 'border-gray-300 focus:ring-blue-500'
                    }
                  `}
                >
                  <option value="">Empty Seat</option>
                  {availablePlayers.map(player => (
                    <option 
                      key={player.id} 
                      value={player.id}
                      className={player.isDuplicate ? 'text-red-600' : ''}
                    >
                      {player.name}
                      {player.isDuplicate ? ' (DUPLICATE!)' : ''}
                    </option>
                  ))}
                </select>

                {/* Connection indicator */}
                {playerId && (
                  <div className="flex justify-center mt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      players.find(p => p.id === playerId)?.isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error messages */}
      {hasErrors && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-red-600">⚠️</span>
            <div className="text-sm text-red-800">
              <div className="font-medium">Duplicate assignments detected!</div>
              <div>Each player can only be assigned to one position. Please fix the red positions.</div>
            </div>
          </div>
        </div>
      )}

      {/* Position summary */}
      <div className="mb-4 bg-gray-50 rounded-lg p-3">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Position Summary</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {(['east', 'south', 'west', 'north'] as PlayerPosition[]).map(position => {
            const playerId = getPlayerAtPosition(position);
            const playerName = getPlayerName(playerId);
            
            return (
              <div key={position} className="flex justify-between">
                <span className="text-gray-600">{positionLabels[position]}:</span>
                <span className={`font-medium ${
                  !playerId ? 'text-gray-400' : 
                  isPositionInError(position) ? 'text-red-600' : 
                  'text-gray-900'
                }`}>
                  {playerId ? playerName : 'Empty'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm button */}
      <button
        onClick={onConfirmPositions}
        disabled={!canConfirm}
        className={`
          w-full py-3 px-4 rounded-lg font-medium transition-colors
          ${canConfirm
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {hasErrors 
          ? 'Fix Duplicate Assignments'
          : currentPositions.size < 2
            ? 'Assign At Least 2 Players'
            : 'Confirm Positions'
        }
      </button>

      {/* Additional info */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Empty seats are allowed for 2-3 player games
      </div>
    </div>
  );
};

export default PlayerPositioning;