// frontend/src/components/room/RoomJoining.tsx
import React, { useState, useEffect } from 'react';
import { useRoom } from '../../hooks/useSocket';

interface RoomJoiningProps {
  onRoomJoined: (roomId: string, playerName: string) => void;
  onBack: () => void;
}

const RoomJoining: React.FC<RoomJoiningProps> = ({ onBack }) => {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  
  // Check for pre-filled room ID from URL sharing
  useEffect(() => {
    const prefilledRoomId = sessionStorage.getItem('prefilledRoomId');
    if (prefilledRoomId) {
      setRoomCode(prefilledRoomId);
      sessionStorage.removeItem('prefilledRoomId'); // Clear it after using
    }
  }, []);
  const [isJoining, setIsJoining] = useState(false);
  
  // FIXED: Use actual socket functions instead of mock joining
  const { joinRoom, isLoading, error } = useRoom();

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !playerName.trim()) return;

    setIsJoining(true);

    // Call the actual socket joinRoom function
    const cleanRoomCode = roomCode.trim().toUpperCase();
    console.log('RoomJoining: calling joinRoom with', cleanRoomCode, playerName.trim());
    joinRoom(cleanRoomCode, playerName.trim());
    
    // Don't call onRoomJoined here - wait for the socket event
    // The useRoom hook will handle the room-joined event
  };

  // Listen for loading state changes
  React.useEffect(() => {
    setIsJoining(isLoading);
  }, [isLoading]);

  // Handle errors
  React.useEffect(() => {
    if (error) {
      setIsJoining(false);
      // Error will be displayed below
    }
  }, [error]);

  const handleRoomCodeChange = (value: string) => {
    // Clean up room code input - only letters and numbers
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomCode(cleaned);
  };

  const canJoin = roomCode.trim().length >= 4 && playerName.trim().length >= 2 && !isJoining;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors touch-target"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Join Game</h1>
            <p className="text-gray-600 text-sm">Enter the room code from your host</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Room Code Input */}
          <div>
            <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => handleRoomCodeChange(e.target.value)}
              placeholder="Enter room code (e.g., TILE123)"
              className="w-full px-3 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg text-center font-mono tracking-wider touch-target"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ask your host for the room code
            </p>
          </div>

          {/* Player Name Input */}
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg touch-target"
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be shown to other players
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-red-600">⚠️</span>
                <div className="text-sm text-red-800">{error}</div>
              </div>
            </div>
          )}

          {/* Join Button */}
          <button
            onClick={handleJoinRoom}
            disabled={!canJoin}
            className={`
              w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors touch-target
              ${canJoin
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isJoining ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Joining Room...
              </div>
            ) : (
              '🔗 Join Game Room'
            )}
          </button>

          {/* Connection Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-green-600 text-sm">💡</span>
              <div className="text-sm text-green-800">
                <div className="font-medium mb-1">Connection Tips:</div>
                <ul className="space-y-1 text-xs">
                  <li>• Make sure you're on the same WiFi as the host</li>
                  <li>• Room codes are usually 4-8 characters long</li>
                  <li>• Ask the host to share the exact code (case doesn't matter)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Demo */}
          <div className="border-t pt-4">
            <button
              onClick={() => {
                setRoomCode('TILE123');
                setPlayerName('Demo Player');
              }}
              className="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              📝 Fill Demo Values (for testing)
            </button>
          </div>
        </div>

        {/* Sample Room Codes (for development) */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Development: Try codes like TILE123, MANG456, KONG789
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoomJoining;