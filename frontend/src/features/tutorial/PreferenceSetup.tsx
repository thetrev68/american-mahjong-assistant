// Preference Setup Component
// Customizable settings for the co-pilot experience

import React, { useState } from 'react'
import { Card } from '../../ui-components/Card'
import { Button } from '../../ui-components/Button'
import type { PreferenceSetupProps, UserPreferences } from './types'

interface PreferenceSection {
  id: string
  title: string
  icon: string
  description: string
}

const preferenceSections: PreferenceSection[] = [
  {
    id: 'assistance',
    title: 'Co-Pilot Assistance',
    icon: '🤖',
    description: 'How much help do you want from your AI assistant?'
  },
  {
    id: 'visual',
    title: 'Visual & Interface',
    icon: '🎨',
    description: 'Customize the look and feel of your experience'
  },
  {
    id: 'gameplay',
    title: 'Gameplay Features',
    icon: '🎮',
    description: 'Configure game-specific preferences'
  }
]

export const PreferenceSetup: React.FC<PreferenceSetupProps> = ({
  currentPreferences,
  onSave,
  onSkip,
}) => {
  const [preferences, setPreferences] = useState<UserPreferences>(currentPreferences)
  const [activeSection, setActiveSection] = useState('assistance')

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onSave(preferences)
  }

  const renderAssistanceSection = () => (
    <div className="space-y-6">
      {/* Assistance Level */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Assistance Level</h4>
        <div className="grid grid-cols-1 gap-3">
          {[
            { value: 'minimal', label: 'Minimal', description: 'Subtle hints only' },
            { value: 'moderate', label: 'Moderate', description: 'Balanced guidance' },
            { value: 'detailed', label: 'Detailed', description: 'Comprehensive explanations' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => updatePreference('assistanceLevel', option.value)}
              className={`
                p-4 text-left rounded-lg border transition-all
                ${preferences.assistanceLevel === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>
                </div>
                {preferences.assistanceLevel === option.value && (
                  <span className="text-blue-600">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Auto Suggestions */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Smart Features</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <div className="font-medium">Auto Suggestions</div>
              <div className="text-sm text-gray-600">Get automatic tile recommendations</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.autoSuggestions}
              onChange={(e) => updatePreference('autoSuggestions', e.target.checked)}
              className="w-5 h-5 text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <div className="font-medium">Haptic Feedback</div>
              <div className="text-sm text-gray-600">Feel subtle vibrations on mobile</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.hapticFeedback}
              onChange={(e) => updatePreference('hapticFeedback', e.target.checked)}
              className="w-5 h-5 text-blue-600"
            />
          </label>
        </div>
      </div>
    </div>
  )

  const renderVisualSection = () => (
    <div className="space-y-6">
      {/* Color Scheme */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Color Scheme</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Light', icon: '☀️' },
            { value: 'dark', label: 'Dark', icon: '🌙' },
            { value: 'system', label: 'System', icon: '💻' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => updatePreference('colorScheme', option.value)}
              className={`
                p-4 text-center rounded-lg border transition-all
                ${preferences.colorScheme === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="text-2xl mb-2">{option.icon}</div>
              <div className="font-medium">{option.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tile Size */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Tile Size</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: 'small', label: 'Small', description: 'Compact view' },
            { value: 'medium', label: 'Medium', description: 'Balanced size' },
            { value: 'large', label: 'Large', description: 'Easy to see' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => updatePreference('tileSize', option.value)}
              className={`
                p-4 text-center rounded-lg border transition-all
                ${preferences.tileSize === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-gray-600">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Animations */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Visual Effects</h4>
        <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
          <div>
            <div className="font-medium">Animations</div>
            <div className="text-sm text-gray-600">Enable smooth tile animations</div>
          </div>
          <input
            type="checkbox"
            checked={preferences.animationsEnabled}
            onChange={(e) => updatePreference('animationsEnabled', e.target.checked)}
            className="w-5 h-5 text-blue-600"
          />
        </label>
      </div>
    </div>
  )

  const renderGameplaySection = () => (
    <div className="space-y-6">
      {/* Game Features */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Game Features</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <div className="font-medium">Confirm Actions</div>
              <div className="text-sm text-gray-600">Ask before important moves</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.confirmActions}
              onChange={(e) => updatePreference('confirmActions', e.target.checked)}
              className="w-5 h-5 text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <div className="font-medium">Pattern Progress</div>
              <div className="text-sm text-gray-600">Show completion percentage</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.showPatternProgress}
              onChange={(e) => updatePreference('showPatternProgress', e.target.checked)}
              className="w-5 h-5 text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <div className="font-medium">Statistics</div>
              <div className="text-sm text-gray-600">Track your game performance</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.enableStatistics}
              onChange={(e) => updatePreference('enableStatistics', e.target.checked)}
              className="w-5 h-5 text-blue-600"
            />
          </label>
        </div>
      </div>

      {/* Tutorial Features */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Learning Features</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <div className="font-medium">Show Hints</div>
              <div className="text-sm text-gray-600">Display helpful tips during play</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.showHints}
              onChange={(e) => updatePreference('showHints', e.target.checked)}
              className="w-5 h-5 text-blue-600"
            />
          </label>

          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <div className="font-medium">Interactive Mode</div>
              <div className="text-sm text-gray-600">Enable interactive tutorials and demos</div>
            </div>
            <input
              type="checkbox"
              checked={preferences.interactiveMode}
              onChange={(e) => updatePreference('interactiveMode', e.target.checked)}
              className="w-5 h-5 text-blue-600"
            />
          </label>
        </div>
      </div>
    </div>
  )

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'assistance': return renderAssistanceSection()
      case 'visual': return renderVisualSection()
      case 'gameplay': return renderGameplaySection()
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4 px-4 sm:px-0">
        <div className="text-3xl sm:text-4xl">⚙️</div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Customize Your Experience</h2>
        <p className="text-base sm:text-lg text-gray-600 max-w-lg mx-auto">
          Set up your co-pilot preferences - you can change these anytime
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex justify-center px-4 sm:px-0">
        <div className="flex flex-wrap sm:flex-nowrap gap-1 sm:space-x-1 bg-gray-100 rounded-lg p-1 w-full max-w-md sm:max-w-none sm:w-auto">
          {preferenceSections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`
                flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap
                ${activeSection === section.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <span className="mr-1 sm:mr-2">{section.icon}</span>
              <span className="hidden sm:inline">{section.title}</span>
              <span className="sm:hidden">{section.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Current Section */}
      <Card variant="elevated" className="max-w-2xl mx-auto">
        <div className="p-4 sm:p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {preferenceSections.find(s => s.id === activeSection)?.title}
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              {preferenceSections.find(s => s.id === activeSection)?.description}
            </p>
          </div>

          {renderSectionContent()}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
        <Button variant="outline" onClick={onSkip} className="sm:min-w-[120px]">
          Use Defaults
        </Button>
        <Button variant="primary" onClick={handleSave} className="min-w-[150px]">
          Save Preferences
        </Button>
      </div>

      {/* Preview */}
      <Card variant="default" className="max-w-md mx-auto mx-4 sm:mx-auto p-3 sm:p-4 bg-blue-50 border-blue-200">
        <div className="text-center space-y-2">
          <h4 className="font-medium text-blue-900">✨ Your Settings Preview</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div>Assistance: {preferences.assistanceLevel}</div>
            <div>Theme: {preferences.colorScheme}</div>
            <div>Tiles: {preferences.tileSize}</div>
            <div>Features: {Object.values(preferences).filter(v => v === true).length} enabled</div>
          </div>
        </div>
      </Card>
    </div>
  )
}