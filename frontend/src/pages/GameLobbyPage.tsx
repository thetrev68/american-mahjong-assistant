// frontend/src/pages/GameLobbyPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import type { Player, GameSettings, PlayerPosition } from '../types';
import MyTileCounter from '../components/game/MyTileCounter';
import PlayerStatusList from '../components/game/PlayerStatusList';
import GameProgress from '../components/game/GameProgress';

// Socket room types (from useSocket.ts)
interface SocketPlayer {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string | Date;
  isParticipating: boolean;
  isOnline: boolean;
  tilesInputted: boolean;
  tilesCount: number;
}

interface SocketGameState {
  phase: 'waiting' | 'tile-input' | 'charleston' | 'playing' | 'finished';
  currentRound: number;
  startedAt?: string | Date;
  participatingPlayers: string[];
  playersReady: string[];
}

interface SocketRoom {
  code: string;
  players: SocketPlayer[];
  gameState: SocketGameState;
}

interface SocketFunctions {
  startGame: () => void;
  updateTiles: (count: number) => void;
  updatePlayerStatus: (playerId: string, updates: { isParticipating?: boolean; tilesInputted?: boolean }) => void;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface GameLobbyPageProps {
  roomId: string;
  currentPlayer: Player;
  room: SocketRoom | null; // Room data from App
  onStartGame: () => void;
  onLeaveRoom: () => void;
  socketFunctions: SocketFunctions;
}

const GameLobbyPage: React.FC<GameLobbyPageProps> = ({
  roomId,
  currentPlayer,
  room,
  onLeaveRoom,
  socketFunctions
}) => {
  const { startGame, updateTiles, updatePlayerStatus, isConnected, isLoading } = socketFunctions;
  
  // Local state for tile input
  const [myTileCount, setMyTileCount] = useState(0);

  // Game settings from room or defaults
  const gameSettings: GameSettings = {
    enableCharleston: true,
    charlestonTimeLimit: 60,
    turnTimeLimit: 30,
    enableJokers: true,
    enableFlowers: true,
    cardYear: 2025
  };

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  // Position labels for the table
  const positionLabels: Record<PlayerPosition, string> = {
    east: 'East (Dealer)',
    south: 'South',
    west: 'West', 
    north: 'North'
  };

  // Use room data from props
  const socketPlayers = useMemo(() => room?.players || [], [room?.players]);
  const gamePhase = room?.gameState?.phase || 'waiting';
  const participatingPlayers = room?.gameState?.participatingPlayers || [];

  console.log('GameLobbyPage - room state:', { room, isLoading, isConnected });

  // Convert socket players to our Player type
  const players: Player[] = socketPlayers.map((p, index) => ({
    id: p.id,
    name: p.name,
    position: ['east', 'south', 'west', 'north'][index] as PlayerPosition, // Assign positions in order
    isHost: p.isHost,
    isConnected: p.isOnline !== false,
    isReady: p.tilesInputted || false,
    tilesInHand: p.tilesCount || 0,
    exposedSets: [],
    hasCalledMahjong: false
  }));

  // Find current player in room data
  const currentPlayerFromRoom = players.find(p => p.name === currentPlayer.name) || currentPlayer;
  const isHost = currentPlayerFromRoom.isHost;

  // Check if all players are ready
  const allPlayersReady = (() => {
    if (gamePhase === 'waiting') {
      return players.length >= 2 && players.every(p => p.isReady || p.isHost);
    }
    if (gamePhase === 'tile-input') {
      const participatingPlayersList = players.filter(p => participatingPlayers.includes(p.id));
      return participatingPlayersList.length > 0 && participatingPlayersList.every(p => p.isReady);
    }
    return false;
  })();

  // Handle start game
  const handleStartGame = () => {
    if (!isHost || gamePhase !== 'waiting') return;
    startGame();
  };

  // Handle tile count update
  const handleTileCountChange = (newCount: number) => {
    setMyTileCount(newCount);
    updateTiles(newCount);
  };

  // Handle player participation toggle (host only)
  const handleToggleParticipation = (playerId: string, currentStatus: boolean) => {
    if (!isHost) return;
    updatePlayerStatus(playerId, { isParticipating: !currentStatus });
  };

  // Handle leave room
  const handleLeaveRoom = () => {
    onLeaveRoom();
  };

  // Update local tile count from room data
  useEffect(() => {
    const myData = socketPlayers.find(p => p.name === currentPlayer.name);
    if (myData && myData.tilesCount !== myTileCount) {
      setMyTileCount(myData.tilesCount);
    }
  }, [socketPlayers, currentPlayer.name, myTileCount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Game Lobby</h1>
              <p className="text-gray-600">Room Code: <span className="font-mono text-lg">{roomId}</span></p>
              <p className="text-sm text-gray-500">Phase: <span className="capitalize font-medium">{gamePhase}</span></p>
            </div>
            <button
              onClick={handleLeaveRoom}
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

        {/* Show different content based on connection status */}
        {!isConnected && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
            <h2 className="text-lg font-medium text-red-800 mb-2">Connection Lost</h2>
            <p className="text-red-700">Trying to reconnect to the game server...</p>
          </div>
        )}

        {/* Show loading if no room data yet */}
        {isConnected && !room && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading room data...</p>
          </div>
        )}

        {/* Render different content based on game phase */}
        {isConnected && room && gamePhase === 'waiting' && (
          <WaitingPhaseContent 
            players={players}
            currentPlayer={currentPlayerFromRoom}
            positionLabels={positionLabels}
            isHost={isHost}
            allPlayersReady={allPlayersReady}
            onStartGame={handleStartGame}
            roomId={roomId}
            gameSettings={gameSettings}
          />
        )}

        {isConnected && room && gamePhase === 'tile-input' && (
          <TileInputPhaseContent
            players={players}
            currentPlayerFromRoom={currentPlayerFromRoom}
            participatingPlayers={participatingPlayers}
            isHost={isHost}
            myTileCount={myTileCount}
            onTileCountChange={handleTileCountChange}
            onToggleParticipation={handleToggleParticipation}
            allPlayersReady={allPlayersReady}
          />
        )}

        {isConnected && room && (gamePhase === 'charleston' || gamePhase === 'playing' || gamePhase === 'finished') && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {gamePhase === 'charleston' ? '🔄 Charleston Phase' : 
               gamePhase === 'playing' ? '🎮 Game In Progress' : 
               '🏁 Game Finished'}
            </h2>
            <p className="text-gray-600 mb-4">
              {gamePhase === 'charleston' ? 'Charleston coordination coming soon!' : 
               gamePhase === 'playing' ? 'Active gameplay coming soon!' : 
               'Thanks for playing!'}
            </p>
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Waiting Phase Component
const WaitingPhaseContent: React.FC<{
  players: Player[];
  currentPlayer: Player;
  positionLabels: Record<PlayerPosition, string>;
  isHost: boolean;
  allPlayersReady: boolean;
  onStartGame: () => void;
  roomId: string;
  gameSettings: GameSettings;
}> = ({ players, currentPlayer, positionLabels, isHost, allPlayersReady, onStartGame, roomId, gameSettings }) => {
  
  const handleToggleReady = () => {
    // TODO: Implement ready toggle functionality later
    console.log('Toggle ready - not implemented yet');
  };

  return (
    <>
      {/* Players Table */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Players ({players.length}/4)
        </h2>

        {/* Mahjong Table Layout */}
        <div className="relative bg-green-100 rounded-xl p-8 mb-4" style={{ aspectRatio: '4/3' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">🀄</div>
              <div className="text-sm text-green-800 font-medium">Mahjong Table</div>
            </div>
          </div>

          {(['east', 'south', 'west', 'north'] as PlayerPosition[]).map((position, index) => {
            const player = players.find(p => p.position === position);
            
            const positionStyles = [
              'absolute top-4 left-1/2 transform -translate-x-1/2',
              'absolute right-4 top-1/2 transform -translate-y-1/2',
              'absolute bottom-4 left-1/2 transform -translate-x-1/2',
              'absolute left-4 top-1/2 transform -translate-y-1/2'
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
        {!isHost && (
          <button
            onClick={handleToggleReady}
            className="w-full py-4 px-6 bg-green-600 text-white rounded-lg font-medium text-lg hover:bg-green-700 transition-colors touch-target"
          >
            ✅ Mark Ready
          </button>
        )}

        {isHost && (
          <button
            onClick={onStartGame}
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
    </>
  );
};

// Tile Input Phase Component  
const TileInputPhaseContent: React.FC<{
  players: Player[];
  currentPlayerFromRoom: Player;
  participatingPlayers: string[];
  isHost: boolean;
  myTileCount: number;
  onTileCountChange: (count: number) => void;
  onToggleParticipation: (playerId: string, currentStatus: boolean) => void;
  allPlayersReady: boolean;
}> = ({ 
  players, 
  currentPlayerFromRoom, 
  participatingPlayers, 
  isHost, 
  myTileCount, 
  onTileCountChange, 
  onToggleParticipation,
  allPlayersReady
}) => {
  return (
    <>
      {/* Tile Input Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <span className="text-blue-600">🀄</span>
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Tile Input Phase</div>
            <div>Each player should count their physical tiles and enter the number below. You need exactly 13 tiles to continue.</div>
          </div>
        </div>
      </div>

      {/* My Tile Count */}
      <MyTileCounter 
        myTileCount={myTileCount}
        onTileCountChange={onTileCountChange}
      />

      {/* Player Status */}
      <PlayerStatusList
        players={players}
        currentPlayer={currentPlayerFromRoom}
        participatingPlayers={participatingPlayers}
        isHost={isHost}
        onToggleParticipation={onToggleParticipation}
      />

      {/* Progress Status */}
      <GameProgress
        players={players}
        participatingPlayers={participatingPlayers}
        allPlayersReady={allPlayersReady}
      />
    </>
  );
};

export default GameLobbyPage;