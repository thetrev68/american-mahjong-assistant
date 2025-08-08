// frontend/src/pages/GameLobbyPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import type { Player, GameSettings, PlayerPosition, Tile } from '../types';
import PlayerStatusList from '../components/game/PlayerStatusList';
import CharlestonTileSelector from '../components/charleston/CharlestonTileSelector';
import { useCharleston } from '../hooks/useCharleston';
import GameProgress from '../components/game/GameProgress';
import { PrivateHandView } from '../components/PrivateHandView';
import PlayerPositioning from '../components/room/PlayerPositioning';
import { GameStateMachine } from '../utils/game-state-machine';
import TurnTimer from '../components/game/TurnTimer';
import ActiveGamePage from './ActiveGamePage';
import { useWakeLock } from '../hooks/useWakeLock';
import { useSocket } from '../hooks/useSocket';


// Socket room types (from useSocket.ts)
interface SocketPlayer {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string | Date;
  isParticipating: boolean;
  isOnline: boolean;
  tilesInputted: boolean;
  isReady: boolean;
  tilesCount: number;
  tiles?: Tile[]; // NEW: actual tile data
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
  playerPositions?: Record<string, PlayerPosition>; // NEW
  positionsConfirmed?: boolean; // NEW
}

interface SocketFunctions {
  startGame: () => void;
  updateTiles: (tiles: Tile[]) => void;
  updatePlayerStatus: (playerId: string, updates: { isParticipating?: boolean; tilesInputted?: boolean }) => void;
  assignPosition: (playerId: string, position: PlayerPosition) => void;
  confirmPositions: (positions: Map<string, PlayerPosition>) => void;
  toggleReady: () => void;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  leaveRoom: () => void;
  discardTile: (tile: Tile) => void;
  drawTile: () => void;
  // FIX: Change 'action: PlayerAction' to 'callType: "pung" | "kong" | "chow"'
  callTile: (tile: Tile, callType: 'pung' | 'kong' | 'chow') => void;
  declareMahjong: () => void;
}

// NEW: Define a type for the socket object
interface GameSocket extends SocketFunctions {
  advanceToPlaying: () => void;
  skipOptionalPhase: () => void;
}

interface GameLobbyPageProps {
  roomId: string;
  currentPlayer: Player;
  room: SocketRoom | null;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  socketFunctions: SocketFunctions;
  socket: GameSocket; // ADDED: The socket object itself
}

const GameLobbyPage: React.FC<GameLobbyPageProps> = ({
  roomId,
  currentPlayer,
  room,
  onLeaveRoom,
  socketFunctions,
  socket // ADDED: Destructure the socket object
}) => {
  const { startGame, toggleReady, updateTiles, updatePlayerStatus, assignPosition, confirmPositions, isConnected } = socketFunctions;
  
  // Get raw socket for kick/rename functions
  const { socket: rawSocket } = useSocket();
  
  // Add kick and rename functions directly
  const kickPlayer = (playerId: string) => {
    rawSocket.emit('kick-player', { targetPlayerId: playerId });
  };
  
  const renamePlayer = (newName: string) => {
    rawSocket.emit('rename-player', { newName });
  };
  
  // Keep screen awake during active gameplay
  const { isSupported: wakeLockSupported, isActive: screenAwake } = useWakeLock(true);
  
  // Local state for current player's tiles
  const [myTiles, setMyTiles] = useState<Tile[]>([]);

  // NEW: Position state management - RESTORED from Chunk 7
  const [playerPositions, setPlayerPositions] = useState<Map<string, PlayerPosition>>(new Map());
  const [showPositioning, setShowPositioning] = useState(false);

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

  // FIXED: Wrap socketPlayers in useMemo to fix React hooks dependency warning
  const socketPlayers = useMemo(() => room?.players || [], [room?.players]);
  
  // Derived state from room
  const gamePhase = room?.gameState?.phase || 'waiting';
  
  // FIXED: Wrap participatingPlayers in useMemo to fix React hooks dependency warning  
  const participatingPlayers = useMemo(() => room?.gameState?.participatingPlayers || [], [room?.gameState?.participatingPlayers]);

  // FIXED: Convert socket players to Player format with all required properties
  const players: Player[] = useMemo(() => {
    return socketPlayers.map(socketPlayer => {
      // Get position from playerPositions state or default based on index
      const assignedPosition = playerPositions.get(socketPlayer.id) || 
        (['east', 'south', 'west', 'north'] as PlayerPosition[])[socketPlayers.indexOf(socketPlayer)] || 'east';
      
      return {
        id: socketPlayer.id,
        name: socketPlayer.name,
        position: assignedPosition,
        isHost: socketPlayer.isHost,
        isConnected: socketPlayer.isOnline,
        isReady: socketPlayer.isReady,
        tilesInHand: socketPlayer.tilesCount || 0,
        exposedSets: [], // FIXED: Added missing property
        hasCalledMahjong: false // FIXED: Added missing property
      };
    });
  }, [socketPlayers, playerPositions]);

  // Charleston hook integration
  const charleston = useCharleston({
    playerId: currentPlayer?.id || '',
    roomId: room?.code || '',
    playerTiles: myTiles,
    totalPlayers: room?.players.length || 0
  });

  // Current player from room data
  const currentPlayerFromRoom = useMemo(() => {
    const socketPlayer = socketPlayers.find(p => p.id === currentPlayer.id);
    if (!socketPlayer) return currentPlayer;

    return {
      ...currentPlayer,
      isReady: socketPlayer.isReady,
      tilesInHand: socketPlayer.tilesCount || 0,
      exposedSets: [], // FIXED: Added missing property
      hasCalledMahjong: false // FIXED: Added missing property
    };
  }, [socketPlayers, currentPlayer]);

  // Player status checks
  const isHost = currentPlayer.isHost;
  const isCurrentPlayerReady = currentPlayerFromRoom.isReady;

  // Track when current phase started
  const [phaseStartTime] = useState(Date.now()); 

  // Position labels for display
  const positionLabels: Record<PlayerPosition, string> = {
    east: 'East (Dealer)',
    south: 'South',
    west: 'West', 
    north: 'North'
  };

  // Check if all players are ready
  const allPlayersReady = useMemo(() => {
    if (gamePhase === 'waiting') {
      return players.length >= 2 && players.every(p => p.isReady);
    }
    if (gamePhase === 'tile-input') {
      const participatingPlayersList = players.filter(p => participatingPlayers.includes(p.id));
      return participatingPlayersList.length > 0 && participatingPlayersList.every(p => p.tilesInHand === 13);
    }
    return false;
  }, [gamePhase, players, participatingPlayers]);

  // Handle start game
  const handleStartGame = () => {
    if (!isHost || gamePhase !== 'waiting') return;
    console.log('Starting game with players:', socketPlayers.map(p => ({ name: p.name, isReady: p.isReady, isHost: p.isHost })));
    startGame();
  };

  // Handle tiles update - NEW: handles actual tile data
  const handleTilesUpdate = (newTiles: Tile[]) => {
    setMyTiles(newTiles);
    updateTiles(newTiles);
  };

  // Handle player participation toggle (host only)
  const handleToggleParticipation = (playerId: string, currentStatus: boolean) => {
    if (!isHost) return;
    updatePlayerStatus(playerId, { isParticipating: !currentStatus });
  };

  const handleToggleReady = () => {
    console.log('Toggling ready state. Current ready state:', isCurrentPlayerReady);
    toggleReady();
  };

  // NEW: Position management handlers - RESTORED from Chunk 7
  const handlePositionChange = (playerId: string, position: PlayerPosition) => {
    if (!isHost) return;
    console.log('Position change requested:', { playerId, position });
    assignPosition(playerId, position);
    
    // Update local state immediately for responsive UI
    setPlayerPositions(prev => {
      const newPositions = new Map(prev);
      newPositions.set(playerId, position);
      return newPositions;
    });
  };

  const handleConfirmPositions = () => {
    if (!isHost) return;
    console.log('Confirming positions:', playerPositions);
    confirmPositions(playerPositions);
    setShowPositioning(false);
  };

  const handleShowPositioning = () => {
    if (!isHost) return;
    setShowPositioning(true);
  };

  // Handle leave room
  const handleLeaveRoom = () => {
    onLeaveRoom();
  };

  // Update local tiles from room data
  useEffect(() => {
    const myData = socketPlayers.find(p => p.id === currentPlayer.id);
    if (myData && myData.tiles && myData.tiles.length > 0) {
      setMyTiles(myData.tiles);
    }
  }, [socketPlayers, currentPlayer.id]);

  // NEW: Handle position updates from socket - RESTORED from Chunk 7
  useEffect(() => {
    if (room?.playerPositions) {
      const positionsMap = new Map(Object.entries(room.playerPositions) as [string, PlayerPosition][]);
      setPlayerPositions(positionsMap);
    }
  }, [room?.playerPositions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto"> {/* Made wider for tile input */}
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

          {/* Phase Timer - NEW */}
          {(gamePhase === 'tile-input' || gamePhase === 'charleston') && (
            <div className="flex items-center gap-3">
              {(() => {
                const timerProps = GameStateMachine.createTurnTimerProps(
                  gamePhase, 
                  phaseStartTime, 
                  'east'
                );
                return <TurnTimer {...timerProps} />;
              })()}
              <div className="text-sm">
                <div className="font-medium text-gray-900">
                  {GameStateMachine.getPhaseDisplayName(gamePhase)}
                </div>
                <div className="text-gray-600">
                  {GameStateMachine.getPhaseDescription(gamePhase)}
                </div>
              </div>
            </div>
          )}

          {/* Connection Status */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
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
            
            {/* Wake Lock Status */}
            {wakeLockSupported && (
              <div className="flex items-center gap-1 text-xs">
                <span className={screenAwake ? 'text-green-600' : 'text-gray-400'}>
                  {screenAwake ? '🔆' : '🌙'}
                </span>
                <span className="text-gray-500">
                  {screenAwake ? 'Screen awake' : 'Screen can sleep'}
                </span>
              </div>
            )}
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
            isCurrentPlayerReady={isCurrentPlayerReady}
            positionLabels={positionLabels}
            isHost={isHost}
            allPlayersReady={allPlayersReady}
            onStartGame={handleStartGame}
            roomId={roomId}
            gameSettings={gameSettings}
            onToggleReady={handleToggleReady}
            // NEW: Position management props - RESTORED from Chunk 7
            showPositioning={showPositioning}
            onPositionChange={handlePositionChange}
            onConfirmPositions={handleConfirmPositions}
            onShowPositioning={handleShowPositioning}
          />
        )}

        {isConnected && room && gamePhase === 'tile-input' && (
          <TileInputPhaseContent
            players={players}
            currentPlayerFromRoom={currentPlayerFromRoom}
            participatingPlayers={participatingPlayers}
            isHost={isHost}
            myTiles={myTiles}
            onTilesUpdate={handleTilesUpdate}
            onToggleParticipation={handleToggleParticipation}
            allPlayersReady={allPlayersReady}
            onKickPlayer={kickPlayer}
            onRenamePlayer={renamePlayer}
          />
        )}

        {isConnected && room && gamePhase === 'charleston' && charleston.currentPhase !== 'complete' && (
          <div className="charleston-phase-container pb-20"> {/* Add bottom padding for sticky buttons */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
                🔄 Charleston Phase - Pass {charleston.currentPhase.charAt(0).toUpperCase() + charleston.currentPhase.slice(1)}
              </h2>
              
              {/* Charleston progress indicator */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center space-x-2">
                  {['right', 'across', 'left', 'optional'].map((phase) => (
                    <div key={phase} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        charleston.currentPhase === phase
                          ? 'bg-blue-600 text-white'
                          : charleston.currentPhase === 'complete' || 
                            (['right', 'across', 'left', 'optional'].indexOf(charleston.currentPhase) > 
                            ['right', 'across', 'left', 'optional'].indexOf(phase))
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {phase === 'right' ? 'R' : 
                        phase === 'across' ? 'A' : 
                        phase === 'left' ? 'L' : 'O'}
                      </div>
                      {phase !== 'optional' && (
                        <div className="w-4 h-0.5 bg-gray-300 mx-1" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {charleston.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="text-red-800 text-sm">
                    Error: {charleston.error}
                  </div>
                </div>
              )}

              <CharlestonTileSelector
                playerTiles={myTiles}
                selectedTiles={charleston.selectedTiles}
                onTileSelect={charleston.selectTile}
                onTileRemove={charleston.deselectTile}
                phase={charleston.currentPhase}
                isReadyToPass={charleston.isConfirmed}
                onConfirmSelection={charleston.confirmSelection}
                onClearSelection={charleston.clearSelection}
                onSkipOptional={charleston.skipOptionalPhase}
                opponentCount={players.length - 1}
              />

              {/* Charleston status */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    Players ready: {charleston.playersReady.length} / {players.length}
                  </span>
                  {charleston.isConfirmed && (
                    <span className="text-green-600 font-medium">
                      ✅ Your selection confirmed
                    </span>
                  )}
                </div>
                
                {/* Charleston Host Controls */}
                {isHost && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex flex-col gap-2">
                      {/* Normal advance button */}
                      {charleston.canAdvancePhase && (
                        <button
                          onClick={() => {
                            if (charleston.currentPhase === 'optional') {
                              // Complete optional phase
                              charleston.advancePhase();
                              // After optional, Charleston should be complete, so advance to playing
                              setTimeout(() => {
                                console.log('Optional Charleston complete, advancing to playing...');
                                socket.advanceToPlaying();
                              }, 200);
                            } else if (charleston.currentPhase === 'left') {
                              // Complete left phase - this may lead to optional or finish Charleston
                              charleston.advancePhase();
                              // Don't auto-advance here - let user choose optional or skip
                            } else {
                              // Regular phase advance (right -> across -> left)
                              charleston.advancePhase();
                            }
                          }}
                          disabled={charleston.isLoading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {charleston.isLoading ? 'Advancing...' : 
                          charleston.currentPhase === 'optional' 
                            ? 'Complete Optional & Start Game!' 
                            : charleston.currentPhase === 'left'
                            ? 'Complete Left Pass'
                            : 'Advance to Next Phase'}
                        </button>
                      )}
                      
                      {/* Skip buttons */}
                      <div className="flex gap-2">
                        {charleston.currentPhase === 'optional' && (
                          <button
                            onClick={() => {
                              charleston.skipOptionalPhase();
                              // After skipping optional, advance to playing
                              setTimeout(() => {
                                console.log('Skipping optional, advancing to playing...');
                                socket.advanceToPlaying();
                              }, 200);
                            }}
                            disabled={charleston.isLoading}
                            className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm"
                          >
                            Skip Optional & Start Game
                          </button>
                        )}
                        
                        {charleston.currentPhase === 'left' && charleston.canAdvancePhase && (
                          <button
                            onClick={() => {
                              // Skip optional phase and go straight to playing
                              console.log('Skipping optional Charleston, advancing to playing...');
                              socket.advanceToPlaying();
                            }}
                            disabled={charleston.isLoading}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                          >
                            Skip Optional & Start Game
                          </button>
                        )}
                        
                        {/* Skip ALL remaining Charleston - available in any phase */}
                        <button
                          onClick={() => {
                            const confirmSkip = window.confirm(
                              `Are you sure you want to skip the remaining Charleston phases?\n\n` +
                              `This will end Charleston and start the game immediately.`
                            );
                            
                            if (confirmSkip) {
                              console.log('Skipping all remaining Charleston phases...');
                              charleston.skipRemainingCharleston();
                              // After skipping all, advance to playing
                              setTimeout(() => {
                                socket.advanceToPlaying();
                              }, 200);
                            }
                          }}
                          disabled={charleston.isLoading}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                        >
                          Skip All Charleston
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* PLAYING PHASE: Render ActiveGamePage */}
        {isConnected && room && gamePhase === 'playing' && (
          <ActiveGamePage
            roomId={roomId}
            currentPlayer={currentPlayerFromRoom}
            room={room}
            socket={socket}
            isConnected={isConnected}
            connectionStatus={connectionStatus}
            onLeaveRoom={handleLeaveRoom}
          />
        )}

        {/* FINISHED PHASE: Game complete */}
        {isConnected && room && gamePhase === 'finished' && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🏁 Game Finished</h2>
            <p className="text-gray-600 mb-4">Thanks for playing!</p>
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Leave Game
            </button>
          </div>
        )}

        {/* NEW: Position Assignment Modal - RESTORED from Chunk 7 */}
        {showPositioning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Player Positions</h3>
              
              <PlayerPositioning
                players={players}
                currentPositions={playerPositions}
                isHost={isHost}
                onPositionChange={handlePositionChange}
                onConfirmPositions={handleConfirmPositions}
              />
              
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowPositioning(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPositions}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirm Positions
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// FIXED: Updated WaitingPhaseContent to include position management
const WaitingPhaseContent: React.FC<{
  players: Player[];
  currentPlayer: Player;
  isCurrentPlayerReady: boolean;
  positionLabels: Record<PlayerPosition, string>;
  isHost: boolean;
  allPlayersReady: boolean;
  onStartGame: () => void;
  roomId: string;
  gameSettings: GameSettings;
  onToggleReady: () => void;
  // NEW: Position management props
  showPositioning: boolean;
  onPositionChange: (playerId: string, position: PlayerPosition) => void;
  onConfirmPositions: () => void;
  onShowPositioning: () => void;
}> = ({ 
  players, 
  currentPlayer, 
  isCurrentPlayerReady, 
  positionLabels, 
  isHost, 
  allPlayersReady, 
  onStartGame, 
  roomId, 
  gameSettings, 
  onToggleReady,
  onShowPositioning
}) => {
  
  return (
    <>
      {/* Players Table */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Players ({players.length}/4)
          </h2>
          {/* NEW: Position Management Button - RESTORED from Chunk 7 */}
          {isHost && players.length >= 2 && (
            <button
              onClick={onShowPositioning}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Assign Positions
            </button>
          )}
        </div>

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
                      {!player.isHost && (
                        player.isReady 
                          ? <span className="text-xs bg-green-100 text-green-800 px-1 rounded">READY</span>
                          : <span className="text-xs bg-gray-100 text-gray-600 px-1 rounded">WAITING</span>
                      )}
                      <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-3 shadow-sm min-w-[120px] text-center border-2 border-dashed border-gray-300">
                    <div className="text-gray-500 text-sm">{positionLabels[position]}</div>
                    <div className="text-xs text-gray-400">Waiting for player...</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Player List */}
        <div className="space-y-2">
          {players.map(player => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                player.id === currentPlayer.id 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="font-medium text-gray-900">
                    {player.name}
                    {player.id === currentPlayer.id && (
                      <span className="ml-2 text-sm text-blue-600">(You)</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {player.isHost ? 'Host' : 'Player'} • {positionLabels[player.position]}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {player.isHost ? (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">HOST</span>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded ${
                    player.isReady 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {player.isReady ? 'READY' : 'WAITING'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Game Settings</h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="text-gray-600">Charleston:</span>
            <span className="ml-2 font-medium">{gameSettings.enableCharleston ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div>
            <span className="text-gray-600">Card Year:</span>
            <span className="ml-2 font-medium">{gameSettings.cardYear}</span>
          </div>
          <div>
            <span className="text-gray-600">Jokers:</span>
            <span className="ml-2 font-medium">{gameSettings.enableJokers ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div>
            <span className="text-gray-600">Flowers:</span>
            <span className="ml-2 font-medium">{gameSettings.enableFlowers ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>

        {/* Ready/Start Controls */}
        <div className="space-y-3">
          {!isHost && (
            <button
              onClick={onToggleReady}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors touch-target ${
                isCurrentPlayerReady
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isCurrentPlayerReady ? '✓ Ready!' : '👍 Mark Ready'}
            </button>
          )}

          {isHost && (
            <button
              onClick={onStartGame}
              disabled={!allPlayersReady}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors touch-target ${
                allPlayersReady
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
            >
              {allPlayersReady ? '🎮 Start Game' : '⏳ Waiting for Players'}
            </button>
          )}

          <button
            onClick={() => {
              const gameUrl = `${window.location.origin}?roomId=${roomId}`;
              const message = `Join our American Mahjong game! Room code: ${roomId}. Click here to join: ${gameUrl}`;
              
              // Try to open SMS app with pre-filled message
              const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
              
              // Check if we're on mobile (likely to have SMS)
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              
              if (isMobile) {
                // On mobile, try SMS first
                window.location.href = smsUrl;
              } else if (navigator.share) {
                // On desktop with share API, use native sharing
                navigator.share({
                  title: 'Join our Mahjong game!',
                  text: message,
                  url: gameUrl
                });
              } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(message).then(() => {
                  alert('Game invitation copied to clipboard! Paste it into your messaging app.');
                }).catch(() => {
                  // If clipboard fails, show the text to copy
                  alert(`Copy this message to share:\n\n${message}`);
                });
              }
            }}
            className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors touch-target"
          >
            💬 Share via Text Message
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
      </div>
    </>
  );
};

// FIXED: Tile Input Phase Component - Changed gamePhase from "charleston" to "waiting"
const TileInputPhaseContent: React.FC<{
  players: Player[];
  currentPlayerFromRoom: Player;
  participatingPlayers: string[];
  isHost: boolean;
  myTiles: Tile[];
  onTilesUpdate: (tiles: Tile[]) => void;
  onToggleParticipation: (playerId: string, currentStatus: boolean) => void;
  allPlayersReady: boolean;
  onKickPlayer: (playerId: string) => void;
  onRenamePlayer: (newName: string) => void;
}> = ({ 
  players, 
  currentPlayerFromRoom, 
  participatingPlayers, 
  isHost, 
  myTiles,
  onTilesUpdate,
  onToggleParticipation,
  allPlayersReady,
  onKickPlayer,
  onRenamePlayer
}) => {
  return (
    <>
      {/* Tile Input Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <span className="text-blue-600">🀄</span>
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Tile Input Phase</div>
            <div>Input your actual tiles below. You need exactly 13 tiles to continue to Charleston.</div>
          </div>
        </div>
      </div>

      {/* FIXED: Private Tile Input - Changed gamePhase to "waiting" to enable input mode */}
      <div className="mb-6">
        <PrivateHandView
          playerId={currentPlayerFromRoom.id}
          gamePhase="waiting" // CHANGED: Use "waiting" instead of "charleston" to enable tile input
          isMyTurn={false}
          serverTiles={myTiles} // Pass server tiles to initialize
          onPlayerAction={() => {}} // Not used during tile input
          onTilesUpdate={onTilesUpdate}
        />
      </div>

      {/* Player Status */}
      <PlayerStatusList
        players={players}
        currentPlayer={currentPlayerFromRoom}
        participatingPlayers={participatingPlayers}
        isHost={isHost}
        onToggleParticipation={onToggleParticipation}
        onKickPlayer={onKickPlayer}
        onRenamePlayer={onRenamePlayer}
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