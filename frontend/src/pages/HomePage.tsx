// frontend/src/pages/HomePage.tsx
import React from 'react';

interface HomePageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onCreateRoom, onJoinRoom }) => {
  const handleCreateRoom = () => {
    onCreateRoom();
  };

  const handleJoinRoom = () => {
    onJoinRoom();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🀄</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            American Mahjong
          </h1>
          <h2 className="text-xl font-medium text-gray-700 mb-1">
            Web Assistant
          </h2>
          <p className="text-gray-600 text-sm">
            Your digital helper for in-person gameplay
          </p>
        </div>

        {/* Main Actions */}
        <div className="space-y-4 mb-8">
          <button
            onClick={handleCreateRoom}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors shadow-lg touch-target"
          >
            🎮 Create New Game
          </button>
          
          <button
            onClick={handleJoinRoom}
            className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-medium text-lg hover:bg-green-700 transition-colors shadow-lg touch-target"
          >
            🔗 Join Existing Game
          </button>
        </div>

        {/* Features Overview */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">What This App Does</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <span className="text-blue-600">📱</span>
              <div>
                <div className="font-medium text-gray-700">Private Tile Input</div>
                <div>Enter your tiles secretly, get strategic recommendations</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-600">🔄</span>
              <div>
                <div className="font-medium text-gray-700">Charleston Coordination</div>
                <div>Coordinate passes digitally while using physical tiles</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-600">👥</span>
              <div>
                <div className="font-medium text-gray-700">Shared Game State</div>
                <div>Track discards, exposed sets, and game progress together</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-600">🧠</span>
              <div>
                <div className="font-medium text-gray-700">Strategy Assistance</div>
                <div>Pattern matching and probability calculations</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 text-lg">💡</span>
            <div className="text-sm">
              <div className="font-medium text-yellow-800">For In-Person Play</div>
              <div className="text-yellow-700">
                This app enhances your physical mahjong game - you'll still need actual tiles and players around a table!
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Works on any device • No internet required after loading
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;