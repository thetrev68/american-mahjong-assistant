import React from 'react'
import { type CoPilotMode } from '../../stores/room-setup.store'
import { Button } from '../../ui-components/Button'

interface CoPilotModeSelectorProps {
  selectedMode: CoPilotMode
  onModeChange: (mode: CoPilotMode) => void
  onContinue?: () => void
  disabled?: boolean
}

interface ModeOption {
  id: CoPilotMode
  title: string
  description: string
  icon: string
  benefits: string[]
}

const modeOptions: ModeOption[] = [
  {
    id: 'everyone',
    title: 'Everyone Gets AI Help',
    description: 'All players receive AI assistance and pattern recommendations',
    icon: '🤖',
    benefits: [
      'Fair gameplay for all',
      'Everyone learns together',
      'Balanced assistance'
    ]
  },
  {
    id: 'solo',
    title: 'Solo AI Mode',
    description: 'Only you receive AI assistance - others play manually',
    icon: '🤖',
    benefits: [
      'Traditional opponents',
      'Your private advantage',
      'Mixed skill levels'
    ]
  }
]

export const CoPilotModeSelector: React.FC<CoPilotModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  onContinue,
  disabled = false
}) => {
  const handleModeSelect = (mode: CoPilotMode) => {
    if (disabled || mode === selectedMode) return
    onModeChange(mode)
  }

  const handleKeyDown = (event: React.KeyboardEvent, mode: CoPilotMode) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleModeSelect(mode)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Co-Pilot Mode
        </h2>
        <p className="text-gray-600">
          How should AI assistance work in your game?
        </p>
      </div>

      <div 
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        role="group"
        aria-label="Co-pilot mode selection"
      >
        {modeOptions.map((option) => {
          const isSelected = selectedMode === option.id
          
          return (
            <button
              key={option.id}
              onClick={() => handleModeSelect(option.id)}
              onKeyDown={(e) => handleKeyDown(e, option.id)}
              disabled={disabled}
              aria-label={`Select ${option.title} mode: ${option.description}`}
              aria-pressed={isSelected}
              className={`
                relative border-2 rounded-lg p-6 text-left transition-all duration-200
                hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                ${isSelected 
                  ? 'border-primary-500 bg-primary-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              )}

              {/* Mode content */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl" role="img" aria-label="Robot">
                    {option.icon}
                  </span>
                  <h3 className={`font-semibold text-lg ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                    {option.title}
                  </h3>
                </div>

                <p className="text-gray-600 text-sm leading-relaxed">
                  {option.description}
                </p>

                <ul className="space-y-1">
                  {option.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center space-x-2 text-sm text-gray-500">
                      <span className="text-green-500">•</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          )
        })}
      </div>

      {/* Additional info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <span className="text-blue-500 mt-0.5" role="img" aria-label="Info">
            ℹ️
          </span>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">AI Co-Pilot Features:</p>
            <p>
              Pattern recommendations • Tile analysis • Charleston guidance • Strategic insights
            </p>
          </div>
        </div>
      </div>

      {/* Continue button - only show if mode is selected and onContinue is provided */}
      {selectedMode && onContinue && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={onContinue}
            variant="primary"
            size="lg"
            disabled={disabled}
            className="min-w-48"
          >
            Continue to Room Setup
          </Button>
        </div>
      )}
    </div>
  )
}