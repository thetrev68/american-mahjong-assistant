// frontend/src/components/game/ActionButtons.tsx
import React, { useState } from 'react';
import type { ActionType } from '../../types';

interface ActionButtonsProps {
  availableActions: ActionType[];
  onAction: (actionType: ActionType, data?: Record<string, unknown>) => void;
  isCurrentTurn: boolean;
  context: 'discard' | 'call' | 'charleston';
  disabled?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  availableActions,
  onAction,
  isCurrentTurn,
  context,
  disabled = false
}) => {
  const [showConfirmation, setShowConfirmation] = useState<ActionType | null>(null);

  // Action button configurations
  const actionConfig = {
    discard: {
      label: 'Discard Tile',
      emoji: '🀫',
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Choose a tile to discard'
    },
    call_pung: {
      label: 'Pung',
      emoji: '🔴',
      color: 'bg-red-600 hover:bg-red-700', 
      description: 'Call for Pung (3 of same)'
    },
    call_kong: {
      label: 'Kong',
      emoji: '🟣',
      color: 'bg-purple-600 hover:bg-purple-700',
      description: 'Call for Kong (4 of same)'
    },
    call_exposure: {
      label: 'Exposure',
      emoji: '🔵',
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Call for Exposure'
    },
    call_mahjong: {
      label: 'Mahjong!',
      emoji: '🎉',
      color: 'bg-green-600 hover:bg-green-700',
      description: 'Declare winning hand'
    },
    pass: {
      label: 'Pass',
      emoji: '⏭️',
      color: 'bg-gray-600 hover:bg-gray-700',
      description: 'Skip this action'
    },
    charleston_pass: {
      label: 'Confirm Pass',
      emoji: '🔄',
      color: 'bg-purple-600 hover:bg-purple-700',
      description: 'Confirm Charleston tiles'
    }
  };

  // Handle action with confirmation for important actions
  const handleAction = (actionType: ActionType) => {
    const needsConfirmation = ['call_mahjong', 'charleston_pass'].includes(actionType);
    
    if (needsConfirmation && showConfirmation !== actionType) {
      setShowConfirmation(actionType);
      return;
    }

    // Execute the action
    onAction(actionType);
    setShowConfirmation(null);
  };

  // Cancel confirmation
  const handleCancelConfirmation = () => {
    setShowConfirmation(null);
  };

  // Filter actions based on context
  const getRelevantActions = () => {
    switch (context) {
      case 'discard':
        return availableActions.filter(action => 
          ['discard', 'call_mahjong'].includes(action)
        );
      case 'call':
        return availableActions.filter(action => 
          ['call_pung', 'call_kong', 'call_exposure', 'call_mahjong', 'pass'].includes(action)
        );
      case 'charleston':
        return availableActions.filter(action => 
          ['charleston_pass'].includes(action)
        );
      default:
        return availableActions;
    }
  };

  const relevantActions = getRelevantActions();

  if (relevantActions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-sm">No actions available</div>
          <div className="text-xs">Wait for your turn or for someone to discard</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          {context === 'discard' ? 'Your Turn' : 
           context === 'call' ? 'Call Options' : 
           'Charleston'}
        </h3>
        {isCurrentTurn && (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-sm text-yellow-800 mb-2">
            <span className="font-medium">Confirm Action:</span>
            <br />
            Are you sure you want to {actionConfig[showConfirmation].label.toLowerCase()}?
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAction(showConfirmation)}
              className="px-3 py-1 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 transition-colors touch-target"
            >
              ✓ Confirm
            </button>
            <button
              onClick={handleCancelConfirmation}
              className="px-3 py-1 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700 transition-colors touch-target"
            >
              ✗ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {relevantActions.map(actionType => {
          const config = actionConfig[actionType];
          const isConfirming = showConfirmation === actionType;
          
          return (
            <button
              key={actionType}
              onClick={() => handleAction(actionType)}
              disabled={disabled || isConfirming}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-white transition-colors touch-target
                ${isConfirming ? 'bg-yellow-500' : config.color}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span className="text-lg">{config.emoji}</span>
              <div className="flex-1 text-left">
                <div className="font-medium">{config.label}</div>
                <div className="text-xs opacity-90">{config.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Context-specific instructions */}
      <div className="mt-3 text-xs text-gray-500">
        {context === 'discard' && (
          <div>
            💡 Select a tile from your private hand to discard, then tap "Discard Tile"
          </div>
        )}
        {context === 'call' && (
          <div>
            💡 You can call the most recent discard or pass to continue play
          </div>
        )}
        {context === 'charleston' && (
          <div>
            💡 Select exactly 3 tiles to pass, then confirm your Charleston selection
          </div>
        )}
      </div>

      {/* Timer warning for current turn */}
      {isCurrentTurn && context === 'discard' && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2">
          <div className="flex items-center gap-2 text-xs text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Your turn - choose an action before time runs out!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionButtons;