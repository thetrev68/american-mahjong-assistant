// /frontend/src/components/RoomManager.tsx
// Component for creating/joining rooms

import React, { useState } from 'react';
import { useRoom, useConnectionTest } from '../hooks/useSocket';

const RoomManager: React.FC = () => {
  const { 
    room, 
    isLoading, 
    error, 
    isConnected, 
    createRoom, 
    joinRoom, 
    leaveRoom 
  } = useRoom();
  
  const { testConnection, pingTime } = useConnectionTest();
  
  const [playerName, setPlayerName] = useState<string>('');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    createRoom(playerName.trim());
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!roomCodeInput.trim()) {
      alert('Please enter a room code');
      return;
    }
    joinRoom(roomCodeInput.trim().toUpperCase(), playerName.trim());
  };

  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      leaveRoom();
    }
  };

  // Connection status indicator
  const ConnectionStatus: React.FC = () => (
    <div className="mb-4 p-3 rounded-lg bg-gray-100">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          Connection: {' '}
          <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </span>
        <button
          onClick={testConnection}
          disabled={!isConnected}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          Test ({pingTime ? `${pingTime}ms` : '?'})
        </button>
      </div>
    </div>
  );

  // Room display
  const RoomDisplay: React.FC = () => (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-green-800">
          Room: {room?.code}
        </h2>
        <button
          onClick={handleLeaveRoom}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Leave Room
        </button>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold mb-2">Players ({room?.players.length || 0}/4):</h3>
        <div className="space-y-2">
          {room?.players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-2 bg-white rounded border"
            >
              <span className="font-medium">{player.name}</span>
              <div className="flex gap-2">
                {player.isHost && (
                  <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">
                    Host
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(player.joinedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>Game Phase: <span className="font-medium">{room?.gameState.phase}</span></p>
        <p>Round: <span className="font-medium">{room?.gameState.currentRound}</span></p>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-800">
          <strong>Share this room code:</strong> {room?.code}
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Other players can join by entering this code
        </p>
      </div>
    </div>
  );

  // Join/Create forms
  const RoomForms: React.FC = () => (
    <div className="space-y-6">
      {/* Player name input */}
      <div>
        <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">
          Your Name
        </label>
        <input
          type="text"
          id="playerName"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
      </div>

      {/* Create room */}
      <form onSubmit={handleCreateRoom} className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Create New Room</h3>
        <button
          type="submit"
          disabled={isLoading || !isConnected}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Creating...' : 'Create Room'}
        </button>
      </form>

      {/* Join room */}
      <form onSubmit={handleJoinRoom} className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Join Existing Room</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            placeholder="Enter 4-character room code"
            maxLength={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !isConnected}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Mahjong Assistant</h1>
      
      <ConnectionStatus />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {room ? <RoomDisplay /> : <RoomForms />}
    </div>
  );
};

export default RoomManager;