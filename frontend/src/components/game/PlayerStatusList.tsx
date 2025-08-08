// frontend/src/components/game/PlayerStatusList.tsx
// Component for displaying player status during tile-input phase

import React, { useState } from 'react';
import type { Player } from '../../types';

interface PlayerStatusListProps {
  players: Player[];
  currentPlayer: Player;
  participatingPlayers: string[];
  isHost: boolean;
  onToggleParticipation: (playerId: string, currentStatus: boolean) => void;
  onKickPlayer?: (playerId: string) => void;
  onRenamePlayer?: (newName: string) => void;
}

const PlayerStatusList: React.FC<PlayerStatusListProps> = ({
  players,
  currentPlayer,
  participatingPlayers,
  isHost,
  onToggleParticipation,
  onKickPlayer,
  onRenamePlayer
}) => {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Player Status ({participatingPlayers.length} playing)
      </h2>
      
      <div className="space-y-3">
        {players.map(player => {
          const isParticipating = participatingPlayers.includes(player.id);
          const tilesReady = player.isReady; // Using isReady instead of tilesInputted
          
          return (
            <div key={player.id} className={`
              flex items-center justify-between p-3 rounded-lg border
              ${player.id === currentPlayer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
            `}>
              <div className="flex items-center space-x-3">
                <div>
                  {/* Player name - clickable for editing own name */}
                  {editingName === player.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onRenamePlayer?.(newName);
                            setEditingName(null);
                            setNewName('');
                          } else if (e.key === 'Escape') {
                            setEditingName(null);
                            setNewName('');
                          }
                        }}
                        className="text-sm px-2 py-1 border border-gray-300 rounded"
                        placeholder="Enter new name"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          onRenamePlayer?.(newName);
                          setEditingName(null);
                          setNewName('');
                        }}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div 
                      className={`font-medium text-gray-900 ${
                        player.id === currentPlayer.id ? 'cursor-pointer hover:text-blue-600' : ''
                      }`}
                      onClick={() => {
                        if (player.id === currentPlayer.id) {
                          setEditingName(player.id);
                          setNewName(player.name);
                        }
                      }}
                      title={player.id === currentPlayer.id ? "Click to edit your name" : ""}
                    >
                      {player.name}
                    </div>
                  )}
                  <div className="text-xs text-gray-600">
                    {player.isHost && 'Host • '}
                    Tiles: {player.tilesInHand || 0}/13
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Participation status */}
                <div className="flex items-center space-x-1">
                  {isHost && player.id !== currentPlayer.id && (
                    <button
                      onClick={() => onToggleParticipation(player.id, isParticipating)}
                      className={`px-2 py-1 text-xs rounded ${
                        isParticipating 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isParticipating ? 'Playing' : 'Sitting Out'}
                    </button>
                  )}
                  
                  {!isHost && (
                    <span className={`px-2 py-1 text-xs rounded ${
                      isParticipating 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isParticipating ? 'Playing' : 'Sitting Out'}
                    </span>
                  )}
                </div>

                {/* Host actions: Kick button */}
                {isHost && player.id !== currentPlayer.id && onKickPlayer && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${player.name} from the room?`)) {
                        onKickPlayer(player.id);
                      }
                    }}
                    className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                    title="Remove player from room"
                  >
                    🚫 Kick
                  </button>
                )}

                {/* Tiles ready status */}
                {isParticipating && (
                  <span className={`px-2 py-1 text-xs rounded ${
                    tilesReady 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {tilesReady ? '✅ Ready' : '⏳ Counting'}
                  </span>
                )}

                {/* Connection status */}
                <div className={`w-2 h-2 rounded-full ${
                  player.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
            </div>
          );
        })}
      </div>
      
      {isHost && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Host tip:</strong> Click "Playing" / "Sitting Out" to manage who participates in the game.
          </p>
        </div>
      )}
    </div>
  );
};

export default PlayerStatusList;