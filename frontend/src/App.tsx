// frontend/src/App.tsx
import { useState } from 'react';
import type { Player } from './types';
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
  | 'tile-test'; // Keep the tile test for development

interface GameSession {
  roomId: string;
  currentPlayer: Player;
}

function App() {
  const [currentView, setCurrentView] = useState<AppState>('home');
  const [gameSession, setGameSession] = useState<GameSession | null>(null);

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
  };

  // Room creation flow
  const handleRoomCreated = (roomId: string, hostName: string) => {
    const hostPlayer: Player = {
      id: '1', // Generate proper ID later
      name: hostName,
      position: 'east', // Host is always East (dealer)
      isHost: true,
      isConnected: true,
      isReady: true, // Host is automatically ready
      tilesInHand: 0,
      exposedSets: [],
      hasCalledMahjong: false
    };

    setGameSession({
      roomId,
      currentPlayer: hostPlayer
    });
    setCurrentView('lobby');
  };

  // Room joining flow
  const handleRoomJoined = (roomId: string, playerName: string) => {
    // Assign positions in order: South, West, North
    const positions = ['south', 'west', 'north'] as const;
    const assignedPosition = positions[0]; // Simplified for now - real app would get this from server

    const player: Player = {
      id: Math.random().toString(36).substr(2, 9), // Generate proper ID later
      name: playerName,
      position: assignedPosition,
      isHost: false,
      isConnected: true,
      isReady: false,
      tilesInHand: 0,
      exposedSets: [],
      hasCalledMahjong: false
    };

    setGameSession({
      roomId,
      currentPlayer: player
    });
    setCurrentView('lobby');
  };

  // Game flow handlers
  const handleStartGame = () => {
    setCurrentView('game');
  };

  const handleLeaveRoom = () => {
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
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
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