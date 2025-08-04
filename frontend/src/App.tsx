// frontend/src/App.tsx
import { useState, useEffect } from 'react';
import type { Player } from './types';
import { useRoom } from './hooks/useSocket';
import HomePage from './pages/HomePage';
import RoomCreation from './components/room/RoomCreation';
import RoomJoining from './components/room/RoomJoining';
import GameLobbyPage from './pages/GameLobbyPage';
import TileInputTest from './pages/TileInputTest';
import './App.css';

type AppState = 
  | 'home'
  | 'create-room'
  | 'join-room'
  | 'lobby'
  | 'game'
  | 'tile-test';

interface GameSession {
  roomId: string;
  currentPlayer: Player;
}

function App() {
  const [currentView, setCurrentView] = useState<AppState>('home');
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  
  // Room management - UPDATED: updateTiles now takes Tile[] instead of number
  const { room, leaveRoom, startGame, toggleReady, updateTiles, updatePlayerStatus, isConnected, isLoading, error } = useRoom();

  // FIXED: Listen for successful room creation from socket
  useEffect(() => {
    if (room && currentView === 'create-room' && !gameSession) {
      // Room was successfully created, transition to lobby
      const hostPlayer = room.players.find(p => p.isHost);
      if (hostPlayer) {
        console.log('Room successfully created, transitioning to lobby');
        const player: Player = {
          id: hostPlayer.id,
          name: hostPlayer.name,
          position: 'east',
          isHost: true,
          isConnected: true,
          isReady: true,
          tilesInHand: 0,
          exposedSets: [],
          hasCalledMahjong: false
        };

        setGameSession({
          roomId: room.code,
          currentPlayer: player
        });
        setCurrentView('lobby');
      }
    }
  }, [room, currentView, gameSession]);

  // FIXED: Listen for successful room joining from socket
  useEffect(() => {
    if (room && currentView === 'join-room' && !gameSession) {
      // Room was successfully joined, find our player
      // The last player to join should be us
      const players = room.players;
      const ourPlayer = players[players.length - 1]; // Assume last player is us
      
      if (ourPlayer && !ourPlayer.isHost) {
        console.log('Room successfully joined, transitioning to lobby');
        const positions = ['south', 'west', 'north'] as const;
        const assignedPosition = positions[players.length - 2] || 'south'; // Assign position based on join order

        const player: Player = {
          id: ourPlayer.id,
          name: ourPlayer.name,
          position: assignedPosition,
          isHost: false,
          isConnected: true,
          isReady: false,
          tilesInHand: 0,
          exposedSets: [],
          hasCalledMahjong: false
        };

        setGameSession({
          roomId: room.code,
          currentPlayer: player
        });
        setCurrentView('lobby');
      }
    }
  }, [room, currentView, gameSession]);

  // Navigation handlers
  const handleCreateRoom = () => {
    setCurrentView('create-room');
  };

  const handleJoinRoom = () => {
    setCurrentView('join-room');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setGameSession(null);
    if (room) {
      leaveRoom();
    }
  };

  // SIMPLIFIED: Room creation flow - just trigger the room creation
  const handleRoomCreated = (_roomId: string, _hostName: string) => {
    // The actual room creation and transition is handled by the useEffect above
    // This function is now just for compatibility with RoomCreation component
  };

  // SIMPLIFIED: Room joining flow - socket handles the actual joining
  const handleRoomJoined = (_roomId: string, _playerName: string) => {
    // The actual room joining and transition is handled by the useEffect above
    // This function is now just for compatibility with RoomJoining component
  };

  // Game flow handlers
  const handleStartGame = () => {
    setCurrentView('game');
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setGameSession(null);
    setCurrentView('home');
  };

  // Development: Access tile test
  const handleOpenTileTest = () => {
    setCurrentView('tile-test');
  };

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return (
          <div>
            <HomePage 
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
            />
            {/* Development shortcut */}
            <div className="fixed bottom-4 right-4">
              <button
                onClick={handleOpenTileTest}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg text-xs hover:bg-gray-700"
              >
                🔧 Tile Test
              </button>
            </div>
          </div>
        );

      case 'create-room':
        return (
          <RoomCreation
            onRoomCreated={handleRoomCreated}
            onBack={handleBackToHome}
          />
        );

      case 'join-room':
        return (
          <RoomJoining
            onRoomJoined={handleRoomJoined}
            onBack={handleBackToHome}
          />
        );

      case 'lobby':
        if (!gameSession) {
          return <div>Error: No game session</div>;
        }
        return (
          <GameLobbyPage
            roomId={gameSession.roomId}
            currentPlayer={gameSession.currentPlayer}
            room={room}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
            // UPDATED: updateTiles now takes Tile[] instead of number
            socketFunctions={{
              startGame,
              toggleReady,
              updateTiles, // Now expects Tile[] parameter
              updatePlayerStatus,
              isConnected,
              isLoading,
              error
            }}
          />
        );

      case 'game':
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">🎮 Game In Progress</h1>
              <p className="text-gray-600 mb-6">
                Game components coming next! Room: {gameSession?.roomId}
              </p>
              <button
                onClick={handleLeaveRoom}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Leave Game
              </button>
            </div>
          </div>
        );

      case 'tile-test':
        return (
          <div>
            <TileInputTest />
            <div className="fixed top-4 left-4">
              <button
                onClick={handleBackToHome}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        );

      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  );
}

export default App;