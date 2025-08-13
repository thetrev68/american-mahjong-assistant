// frontend/src/components/room/RoomCreation.tsx
import React, { useState } from 'react';
import type { GameSettings } from '../../types';
import { useRoom } from '../../hooks/useSocket';

interface RoomCreationProps {
  onRoomCreated: (roomId: string, hostName: string) => void;
  onBack: () => void;
}

const RoomCreation: React.FC<RoomCreationProps> = ({ onBack }) => {
  const [hostName, setHostName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // FIXED: Use actual socket functions instead of mock room creation
  const { createRoom, isLoading, error } = useRoom();
  
  const [settings, setSettings] = useState<GameSettings>({
    enableCharleston: true,
    charlestonTimeLimit: 60,
    turnTimeLimit: 30,
    enableJokers: true,
    enableFlowers: true,
    cardYear: 2025
  });

  // FIXED: Use socket createRoom instead of generating mock room codes
  const handleCreateRoom = async () => {
    if (!hostName.trim()) return;

    setIsCreating(true);
    
    // Call the actual socket createRoom function
    console.log('RoomCreation: calling createRoom with', hostName.trim());
    createRoom(hostName.trim());
    
    // Don't call onRoomCreated here - wait for the socket event
    // The useRoom hook will handle the room-created event and we'll listen for that
  };

  // Listen for successful room creation
  React.useEffect(() => {
    // This will be handled by the parent component via useRoom hook
    // No need to do anything here, just keep the loading state active
    setIsCreating(isLoading);
  }, [isLoading]);

  // Handle errors
  React.useEffect(() => {
    if (error) {
      setIsCreating(false);
      // Error will be displayed below
    }
  }, [error]);

  const canCreate = hostName.trim().length >= 2 && !isCreating;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
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
            <h1 className="text-2xl font-bold text-gray-900">Create New Game</h1>
            <p className="text-gray-600 text-sm">Set up a game for your group</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Host Name Input */}
          <div>
            <label htmlFor="hostName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name (as Host)
            </label>
            <input
              id="hostName"
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg touch-target"
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be shown to other players
            </p>
          </div>

          {/* Game Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Game Settings</h3>
            
            <div className="space-y-4">
              {/* Charleston Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-700">Enable Charleston</div>
                  <div className="text-sm text-gray-500">Coordinate tile passing digitally</div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, enableCharleston: !prev.enableCharleston }))}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-target
                    ${settings.enableCharleston ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${settings.enableCharleston ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Charleston Time Limit */}
              {settings.enableCharleston && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Charleston Time Limit</label>
                    <span className="text-sm text-gray-600">{settings.charlestonTimeLimit}s</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    step="10"
                    value={settings.charlestonTimeLimit}
                    onChange={(e) => setSettings(prev => ({ ...prev, charlestonTimeLimit: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              )}

              {/* Turn Time Limit */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Turn Time Limit</label>
                  <span className="text-sm text-gray-600">{settings.turnTimeLimit}s</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="5"
                  value={settings.turnTimeLimit}
                  onChange={(e) => setSettings(prev => ({ ...prev, turnTimeLimit: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              {/* Jokers Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-700">Enable Jokers</div>
                  <div className="text-sm text-gray-500">Include joker tiles in the game</div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, enableJokers: !prev.enableJokers }))}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-target
                    ${settings.enableJokers ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${settings.enableJokers ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Flowers Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-700">Enable Flowers</div>
                  <div className="text-sm text-gray-500">Include flower tiles in the game</div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, enableFlowers: !prev.enableFlowers }))}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-target
                    ${settings.enableFlowers ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${settings.enableFlowers ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Card Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NMJL Card Year
                </label>
                <select
                  value={settings.cardYear}
                  onChange={(e) => setSettings(prev => ({ ...prev, cardYear: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
                </select>
              </div>
            </div>
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

          {/* Create Button */}
          <button
            onClick={handleCreateRoom}
            disabled={!canCreate}
            className={`
              w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors touch-target
              ${canCreate
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isCreating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Room...
              </div>
            ) : (
              '🎮 Create Game Room'
            )}
          </button>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 text-sm">ℹ️</span>
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">How it works:</div>
                <div>You'll get a room code to share with other players. They can join from their phones from anywhere!</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCreation;