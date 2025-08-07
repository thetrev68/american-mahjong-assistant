// frontend/src/pages/ActiveGamePage.tsx
// Main gameplay interface - split view for private hand + shared game state
import React, { useState, useEffect, useMemo } from 'react';
import  { DEFAULT_GAME_SETTINGS } from '../types';
import type { GameSettings, Player, PlayerPosition, Tile, PlayerAction } from '../types';
import { PrivateHandView } from '../components/PrivateHandView';
import SharedGameView from '../components/game/SharedGameView';
import GameActions from '../components/game/GameActions';
import TurnTimer from '../components/game/TurnTimer';
import { GameStateMachine } from '../utils/game-state-machine';

// Socket room types (matching GameLobbyPage.tsx)
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
  tiles?: Tile[];
}

interface SocketGameState {
  phase: 'waiting' | 'tile-input' | 'charleston' | 'playing' | 'finished';
  currentRound: number;
  startedAt?: string | Date;
  participatingPlayers: string[];
  playersReady: string[];
  currentTurn?: PlayerPosition;
  discardedTiles?: Tile[];
  wall?: {
    tilesRemaining: number;
    totalDiscarded: number;
  };
  // Add these properties to match the GameRoom type
  turnTimeLimit?: number;
  turnStartTime?: number;
  settings?: GameSettings;
}

interface SocketRoom {
  code: string;
  players: SocketPlayer[];
  gameState: SocketGameState;
  playerPositions?: Record<string, PlayerPosition>;
  positionsConfirmed?: boolean;
}

interface SocketFunctions {
  startGame: () => void;
  updateTiles: (tiles: Tile[]) => void;
  updatePlayerStatus: (playerId: string, updates: { isParticipating?: boolean; tilesInputted?: boolean; isReady?: boolean }) => void;
  leaveRoom: () => void;
  // New functions for active gameplay
  discardTile: (tile: Tile) => void;
  drawTile: () => void;
  callTile: (tile: Tile, callType: 'pung' | 'kong' | 'chow') => void;
  declareMahjong: () => void;
}

interface ActiveGamePageProps {
  roomId: string;
  currentPlayer: Player;
  room: SocketRoom | null;
  socket: SocketFunctions;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  onLeaveRoom: () => void;
}

const ActiveGamePage: React.FC<ActiveGamePageProps> = ({
  roomId,
  currentPlayer,
  room,  // <-- Your prop is called 'room'
  socket,
  connectionStatus,
  onLeaveRoom
}) => {
  // Local state for private hand
  const [myTiles, setMyTiles] = useState<Tile[]>([]);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  
  // Game state from room
  const gamePhase = room?.gameState?.phase || 'playing';
  const currentTurn = room?.gameState?.currentTurn || 'east';

  // FIX: Change 'gameRoom' to 'room' to match your prop name
  const discardedTiles = useMemo(() => 
    room?.gameState?.discardedTiles || [],  // Changed from gameRoom to room
    [room?.gameState?.discardedTiles]       // Changed from gameRoom to room
  );

  const wallState = useMemo(() => ({
    tilesRemaining: room?.gameState?.wall?.tilesRemaining || 144,  // Changed from gameRoom to room
    totalDiscarded: room?.gameState?.wall?.totalDiscarded || 0     // Changed from gameRoom to room
  }), [room?.gameState?.wall]);  // Changed from gameRoom to room
  
  // Player positions
  const playerPositions = useMemo(() => {
    const positions = new Map<string, PlayerPosition>();
    if (room?.playerPositions) {
      Object.entries(room.playerPositions).forEach(([playerId, position]) => {
        positions.set(playerId, position);
      });
    }
    return positions;
  }, [room?.playerPositions]);
  
  // Convert socket players to Player format
  const players: Player[] = useMemo(() => {
    if (!room?.players) return [];
    
    return room.players.map(socketPlayer => {
      const assignedPosition = playerPositions.get(socketPlayer.id) || 'east';
      
      return {
        id: socketPlayer.id,
        name: socketPlayer.name,
        position: assignedPosition,
        isHost: socketPlayer.isHost,
        isConnected: socketPlayer.isOnline,
        isReady: socketPlayer.isReady,
        tilesInHand: socketPlayer.tilesCount || 0,
        exposedSets: [], // TODO: Add exposed sets tracking
        hasCalledMahjong: false
      };
    });
  }, [room?.players, playerPositions]);

  // Current player's position and turn status
  const myPosition = playerPositions.get(currentPlayer.id) || 'east';
  const isMyTurn = currentTurn === myPosition;
  
  // Update my tiles when socket data changes
  useEffect(() => {
    const myData = room?.players.find(p => p.id === currentPlayer.id);
    if (myData?.tiles) {
      setMyTiles(myData.tiles);
    }
  }, [room?.players, currentPlayer.id]);

  // Game actions handlers
  const handleDiscardTile = (tile: Tile) => {
    if (!isMyTurn) {
      alert('Not your turn!');
      return;
    }
    
    if (!myTiles.some(t => t.id === tile.id)) {
      alert('You do not have this tile!');
      return;
    }
    
    socket.discardTile(tile);
    setSelectedTile(null);
  };

  const handleDrawTile = () => {
    if (!isMyTurn) {
      alert('Not your turn!');
      return;
    }
    
    socket.drawTile();
  };

  const handleCallTile = (tile: Tile, callType: 'pung' | 'kong' | 'chow') => {
    socket.callTile(tile, callType);
  };

  const handleDeclareMahjong = () => {
    socket.declareMahjong();
  };

  const handlePlayerAction = (action: PlayerAction) => {
    console.log('Player action received:', action);
    
    switch (action.type) {
      case 'call_pung':
      case 'call_kong':
      case 'call_exposure':
        if (action.tiles && action.tiles.length > 0) {
          handleCallTile(action.tiles[0], action.type.replace('call_', '') as 'pung' | 'kong' | 'chow');
        }
        break;
      case 'discard':
        if (action.tiles && action.tiles.length > 0) {
          handleDiscardTile(action.tiles[0]);
        }
        break;
      default:
        console.log('Unhandled action type:', action.type);
    }
  };

//   const handleTileSelect = (tile: Tile) => {
//     setSelectedTile(selectedTile?.id === tile.id ? null : tile);
//   };

  const handleLeaveGame = () => {
    if (confirm('Are you sure you want to leave the game?')) {
      onLeaveRoom();
    }
  };

  // Create game room object for SharedGameView
//   const gameRoom = useMemo(() => ({
//     id: roomId,
//     phase: gamePhase,
//     currentTurn: currentTurn,
//     players: players,
//     discardedTiles: discardedTiles,
//     wall: wallState
//   }), [roomId, gamePhase, currentTurn, players, discardedTiles, wallState]);

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Loading Game...</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Mobile-optimized layout: Shared game state at top, private hand at bottom */}
      <div className="flex flex-col h-screen">
        
        {/* Header with game info */}
        <div className="bg-white shadow-sm p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-bold text-gray-900">Room {roomId}</h1>
                <p className="text-sm text-gray-600">
                  {GameStateMachine.getPhaseDisplayName(gamePhase)}
                </p>
              </div>
              
              {/* Connection indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                  'bg-red-500'
                }`} />
                <span className="text-sm text-gray-600 capitalize">
                  {connectionStatus}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLeaveGame}
              className="px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-sm transition-colors"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Shared Game View - Takes up upper portion of screen */}
        <div className="flex-1 min-h-0 p-4 overflow-y-auto">
          <SharedGameView 
          gameRoom={{
            ...room, // Spread the room object to include existing properties
            id: roomId,
            players: players,
            currentTurn: currentTurn as PlayerPosition,
            phase: gamePhase as 'waiting' | 'charleston' | 'playing' | 'finished',
            discardPile: discardedTiles.map((tile, index) => ({
              tile: tile,
              discardedBy: 'east' as PlayerPosition,
              discardedAt: Date.now(),
              timestamp: Date.now(),
              canBeCalled: index === discardedTiles.length - 1
            })),
              wall: wallState,
              hostId: room.players.find(p => p.isHost)?.id || '',
              turnStartTime: Date.now(),
              turnTimeLimit: room.gameState?.turnTimeLimit || DEFAULT_GAME_SETTINGS.turnTimeLimit,
              settings: room.gameState?.settings || DEFAULT_GAME_SETTINGS
            }}
            currentPlayer={currentPlayer}
            onPlayerAction={handlePlayerAction}
          />
        </div>

        {/* Turn Timer - Fixed position when it's your turn */}
        {isMyTurn && (
            <div className="bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2 flex-shrink-0">
                <TurnTimer
                timeRemaining={30} // TODO: Get from game state
                totalTime={60}
                isActive={true}
                currentTurn={myPosition}  // ADDED: Required prop - pass current player's position
                onTimeUp={() => {
                    // TODO: Auto-discard random tile or pass turn
                    console.log('Turn time up!');
                }}
                // REMOVED: urgencyLevel prop - it's calculated internally by TurnTimer
                />
                <span className="font-medium">Your Turn - Choose Action</span>
            </div>
        )}

        {/* Private Hand View - Fixed at bottom */}
        <div className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="p-4">
            <PrivateHandView
            playerId={currentPlayer.id}           // REQUIRED: Player ID
            gamePhase="playing"                   // REQUIRED: Current game phase
            isMyTurn={isMyTurn}                  // REQUIRED: Turn status
            onPlayerAction={(action) => {        // REQUIRED: Action handler
                console.log('Player action:', action);
                // TODO: Handle player actions (discard, call, etc.)
            }}
            onTilesUpdate={(tiles) => {          // REQUIRED: Tiles update handler
                console.log('Tiles updated:', tiles);
                setMyTiles(tiles); // Update local state
            }}
            // REMOVED: All the props that don't exist on PrivateHandView:
            // - playerTiles (not a prop)
            // - selectedTile (not a prop) 
            // - onTileSelect (not a prop)
            // - recommendations (not a prop)
            // - isEditable (not a prop)
            // - showRecommendations (not a prop)
            />
        </div>
        </div>

        {/* Game Actions - Fixed at very bottom */}
        <div className="bg-gray-50 border-t border-gray-200 p-3 flex-shrink-0">
          <GameActions
            isMyTurn={isMyTurn}
            selectedTile={selectedTile}
            canDiscard={selectedTile !== null}
            canDraw={myTiles.length < (myPosition === 'east' ? 14 : 13)}
            canCallMahjong={false} // TODO: Check if hand is winning
            onDiscard={() => selectedTile && handleDiscardTile(selectedTile)}
            onDraw={handleDrawTile}
            onDeclareMahjong={handleDeclareMahjong}
            wallTilesRemaining={wallState.tilesRemaining}
          />
        </div>
      </div>
    </div>
  );
};

export default ActiveGamePage;