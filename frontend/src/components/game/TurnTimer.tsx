// frontend/src/components/game/TurnTimer.tsx
import React, { useState, useEffect } from 'react';
import type { PlayerPosition } from '../../types';

interface TurnTimerProps {
  timeRemaining: number;
  totalTime: number;
  isActive: boolean;
  currentTurn: PlayerPosition;
  onTimeUp?: () => void;
}

const TurnTimer: React.FC<TurnTimerProps> = ({
  timeRemaining,
  totalTime,
  isActive,
  currentTurn,
  onTimeUp
}) => {
  // Use server-provided time directly instead of local countdown
  // This ensures all clients show the same time
  const displayTime = Math.max(0, timeRemaining);
  
  // Trigger callback when server time reaches 0
  useEffect(() => {
    if (timeRemaining <= 0 && onTimeUp) {
      onTimeUp();
    }
  }, [timeRemaining, onTimeUp]);

  // Calculate percentage remaining
  const percentage = (displayTime / totalTime) * 100;
  
  // Determine urgency level
  const getUrgencyLevel = () => {
    if (percentage > 50) return 'normal';
    if (percentage > 25) return 'warning';
    return 'urgent';
  };

  const urgencyLevel = getUrgencyLevel();

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Position labels
  const positionLabels = {
    east: 'East',
    south: 'South',
    west: 'West',
    north: 'North'
  };

  // Timer colors based on urgency
  const getTimerColors = () => {
    switch (urgencyLevel) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      default:
        return isActive ? 'bg-green-500 text-white' : 'bg-gray-400 text-white';
    }
  };

  // Progress bar colors
  const getProgressColors = () => {
    switch (urgencyLevel) {
      case 'urgent':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  return (
    <div className="text-center">
      {/* Timer Display */}
      <div className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
        ${getTimerColors()}
        ${urgencyLevel === 'urgent' ? 'animate-pulse' : ''}
      `}>
        <div className="text-lg">
          {isActive ? '⏰' : '⏸️'}
        </div>
        <div>
          <div className="text-lg font-bold">
            {formatTime(displayTime)}
          </div>
          <div className="text-xs opacity-90">
            {positionLabels[currentTurn]}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2 w-24 mx-auto">
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${getProgressColors()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Urgency Indicators */}
      {urgencyLevel === 'urgent' && (
        <div className="mt-1 text-xs text-red-600 font-medium">
          ⚠️ Time running out!
        </div>
      )}
      
      {urgencyLevel === 'warning' && (
        <div className="mt-1 text-xs text-yellow-600 font-medium">
          ⏳ Hurry up!
        </div>
      )}

      {/* Turn indicator for non-active timers */}
      {!isActive && (
        <div className="mt-1 text-xs text-gray-500">
          Waiting for {positionLabels[currentTurn]}
        </div>
      )}
    </div>
  );
};

export default TurnTimer;