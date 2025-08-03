// frontend/src/pages/GameLobbyPage.tsx
import React, { useState, useEffect } from 'react';
import type { Player, GameSettings, PlayerPosition } from '../types';

interface GameLobbyPageProps {
  roomId: string;
  currentPlayer: Player;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const GameLobbyPage: React.FC<GameLobbyPageProps> = ({
  roomId,
  currentPlayer,
  onStartGame,
  onLeaveRoom
}) => {
  // Mock players state - replace with real socket data later
  const [players, setPlayers] = useState<Player[]>([
    currentPlayer,
    // Mock other players for demo
    { id: '2', name: 'Alice', position: 'south', isHost: false, isConnected: true, isReady: false, tilesInHand: 0, exposedSets: [], hasCalledMahjong: false },
    { id: '3', name: 'Bob', position: 'west', isHost: false, isConnected: true, isReady: true, tilesInHand: 0, exposedSets: [], hasCalledMahjong: false }
  ]);

  const [gameSettings] = useState<GameSettings>({
    enableCharleston: true,
    charlestonTimeLimit: 60,
    turnTimeLimit: 30,
    enableJokers: true,
    enableFlowers: true,
    cardYear: 2025
  });

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');

  // Position labels for the table
  const positionLabels: Record<PlayerPosition, string> = {
    east: 'East (Dealer)',
    south: 'South',
    west: 'West', 
    north: 'North'
  };

  const allPlayersReady = players.length >= 2 && players.every(p => p.isReady || p.isHost);
  const isHost = currentPlayer.isHost;

  const handleToggleReady = () => {
    if (isHost) return; // Host doesn't need to mark ready
    
    // Toggle ready status (replace with socket call later)
    setPlayers(prev => 
      prev.map(p => 
        p.id === currentPlayer.id 
          ? { ...p, isReady: !p.isReady }
          : p
      )
    );
  };

  const handleStartGame = () => {
    if (!isHost || !allPlayersReady) return;
    onStartGame();
  };

  // Mock connection status changes
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate occasional connection blips for demo
      if (Math.random() < 0.05) {
        setConnectionStatus('connecting');
        setTimeout(() => setConnectionStatus('connected'), 1000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Game Lobby</h1>
              <p className="text-gray-600">Room Code: <span className="font-mono text-lg">{roomId}</span></p>
            </div>
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors touch-target"
            >
              Leave Room
            </button>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`} />
            <span className="text-gray-600">
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Reconnecting...' :
               'Disconnected'}
            </span>
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Players ({players.length}/4)
          </h2>

          {/* Mahjong Table Layout */}
          <div className="relative bg-green-100 rounded-xl p-8 mb-4" style={{ aspectRatio: '4/3' }}>
            {/* Table center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl mb-1">🀄</div>
                <div className="text-sm text-green-800 font-medium">Mahjong Table</div>
              </div>
            </div>

            {/* Player positions */}
            {(['east', 'south', 'west', 'north'] as PlayerPosition[]).map((position, index) => {
              const player = players.find(p => p.position === position);
              
              // Position coordinates (top, right, bottom, left)
              const positionStyles = [
                'absolute top-4 left-1/2 transform -translate-x-1/2', // East (top)
                'absolute right-4 top-1/2 transform -translate-y-1/2',  // South (right)
                'absolute bottom-4 left-1/2 transform -translate-x-1/2', // West (bottom)
                'absolute left-4 top-1/2 transform -translate-y-1/2'     // North (left)
              ];

              return (
                <div key={position} className={positionStyles[index]}>
                  {player ? (
                    <div className={`
                      bg-white rounded-lg p-3 shadow-sm min-w-[120px] text-center border-2
                      ${player.id === currentPlayer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                    `}>
                      <div className="font-medium text-gray-900">{player.name}</div>
                      <div className="text-xs text-gray-600 mb-1">{positionLabels[position]}</div>
                      <div className="flex items-center justify-center gap-1">
                        {player.isHost && <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">HOST</span>}
                        {player.isReady && !player.isHost && <span className="text-xs bg-green-100 text-green-800 px-1 rounded">READY</span>}
                        {!player.isReady && !player.isHost && <span className="text-xs bg-gray-100 text-gray-600 px-1 rounded">WAITING</span>}
                        <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-3 min-w-[120px] text-center">
                      <div className="text-gray-500 text-sm">Empty</div>
                      <div className="text-xs text-gray-400">{positionLabels[position]}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Player List (alternative view for small screens) */}
          <div className="md:hidden space-y-2">
            {players.map(player => (
              <div key={player.id} className={`
                flex items-center justify-between p-3 rounded-lg border
                ${player.id === currentPlayer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
              `}>
                <div>
                  <div className="font-medium text-gray-900">{player.name}</div>
                  <div className="text-xs text-gray-600">{positionLabels[player.position]}</div>
                </div>
                <div className="flex items-center gap-2">
                  {player.isHost && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">HOST</span>}
                  {player.isReady && !player.isHost && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">READY</span>}
                  {!player.isReady && !player.isHost && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">WAITING</span>}
                  <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Game Settings</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Charleston:</span>
              <span className="font-medium">{gameSettings.enableCharleston ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Turn Timer:</span>
              <span className="font-medium">{gameSettings.turnTimeLimit}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Jokers:</span>
              <span className="font-medium">{gameSettings.enableJokers ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Card Year:</span>
              <span className="font-medium">{gameSettings.cardYear}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Ready Toggle (for non-host players) */}
          {!isHost && (
            <button
              onClick={handleToggleReady}
              className={`
                w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors touch-target
                ${players.find(p => p.id === currentPlayer.id)?.isReady
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
                }
              `}
            >
              {players.find(p => p.id === currentPlayer.id)?.isReady 
                ? '⏸️ Mark Not Ready' 
                : '✅ Mark Ready'
              }
            </button>
          )}

          {/* Start Game (for host only) */}
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!allPlayersReady}
              className={`
                w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors touch-target
                ${allPlayersReady
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {allPlayersReady ? '🎮 Start Game' : '⏳ Waiting for Players'}
            </button>
          )}

          {/* Share Room Code */}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Join our Mahjong game!',
                  text: `Room code: ${roomId}`,
                  url: window.location.href
                });
              } else {
                navigator.clipboard.writeText(roomId);
                // Show temporary success message
                alert('Room code copied to clipboard!');
              }
            }}
            className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors touch-target"
          >
            📋 Share Room Code
          </button>
        </div>

        {/* Status Messages */}
        {players.length < 2 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-yellow-600">⏳</span>
              <div className="text-sm text-yellow-800">
                <div className="font-medium">Waiting for more players</div>
                <div>Share the room code <span className="font-mono">{roomId}</span> with other players to get started.</div>
              </div>
            </div>
          </div>
        )}

        {players.length >= 2 && !allPlayersReady && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-blue-600">👥</span>
              <div className="text-sm text-blue-800">
                <div className="font-medium">Almost ready!</div>
                <div>Waiting for all players to mark themselves as ready.</div>
              </div>
            </div>
          </div>
        )}

        {allPlayersReady && !isHost && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-green-600">✅</span>
              <div className="text-sm text-green-800">
                <div className="font-medium">Ready to play!</div>
                <div>Waiting for the host to start the game.</div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">How to Play</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• Each player will input their tiles privately on their phone</div>
            <div>• The app will coordinate Charleston passes digitally</div>
            <div>• Use physical tiles for actual gameplay</div>
            <div>• The app tracks discards and provides strategic recommendations</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobbyPage;