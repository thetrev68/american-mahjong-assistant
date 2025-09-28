/**
 * Accessibility Settings Panel
 * User controls for accessibility preferences
 */

import React, { useState } from 'react'
import { Card } from '../Card'
import { Button } from '../Button'
import { useAccessibilityContext } from './useAccessibilityContext'
import { FocusManager } from './FocusManager'

interface AccessibilitySettingsProps {
  isOpen?: boolean
  onClose?: () => void
  className?: string
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
  isOpen = true,
  onClose,
  className = ''
}) => {
  const { 
    options, 
    setOptions, 
    announceToScreenReader,
    isWCAGCompliant 
  } = useAccessibilityContext()

  const [testResults, setTestResults] = useState<Record<string, boolean>>({})

  // Test color combinations
  const testColorContrast = () => {
    const commonCombinations = [
      { fg: '#000000', bg: '#ffffff', name: 'Black on White' },
      { fg: '#ffffff', bg: '#000000', name: 'White on Black' },
      { fg: '#0066cc', bg: '#ffffff', name: 'Blue on White' },
      { fg: '#ffffff', bg: '#0066cc', name: 'White on Blue' },
      { fg: '#cc0000', bg: '#ffffff', name: 'Red on White' }
    ]

    const results: Record<string, boolean> = {}
    
    commonCombinations.forEach(combo => {
      const compliant = isWCAGCompliant(combo.fg, combo.bg, 'AA', 'normal')
      results[combo.name] = compliant
    })

    setTestResults(results)
    announceToScreenReader(`Color contrast test completed. ${Object.values(results).filter(Boolean).length} of ${Object.keys(results).length} combinations passed.`)
  }

  const handleSettingChange = (setting: keyof typeof options, value: string | boolean) => {
    setOptions({ [setting]: value })
    announceToScreenReader(`${setting} ${value ? 'enabled' : 'disabled'}`)
  }

  if (!isOpen) return null

  return (
    <FocusManager trap autoFocus onEscape={onClose}>
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ${className}`}>
        <Card className="w-full max-w-2xl max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Accessibility Settings
            </h2>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close accessibility settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {/* Motion Preferences */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Motion & Animation
              </h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.reducedMotion}
                    onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    aria-describedby="reduced-motion-desc"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Reduce Motion
                    </span>
                    <p id="reduced-motion-desc" className="text-xs text-gray-500">
                      Minimize animations and transitions for reduced distraction
                    </p>
                  </div>
                </label>
              </div>
            </section>

            {/* Visual Preferences */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Visual Display
              </h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.highContrast}
                    onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    aria-describedby="high-contrast-desc"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      High Contrast Mode
                    </span>
                    <p id="high-contrast-desc" className="text-xs text-gray-500">
                      Enhanced contrast for better visibility
                    </p>
                  </div>
                </label>

                <div>
                  <label htmlFor="font-size" className="block text-sm font-medium text-gray-700 mb-2">
                    Font Size
                  </label>
                  <select
                    id="font-size"
                    value={options.fontSize}
                    onChange={(e) => handleSettingChange('fontSize', e.target.value as 'small' | 'medium' | 'large' | 'extra-large')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    aria-describedby="font-size-desc"
                  >
                    <option value="small">Small (14px)</option>
                    <option value="medium">Medium (16px)</option>
                    <option value="large">Large (18px)</option>
                    <option value="extra-large">Extra Large (22px)</option>
                  </select>
                  <p id="font-size-desc" className="text-xs text-gray-500 mt-1">
                    Adjust base font size for better readability
                  </p>
                </div>
              </div>
            </section>

            {/* Navigation Preferences */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Navigation & Input
              </h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.screenReader}
                    onChange={(e) => handleSettingChange('screenReader', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    aria-describedby="screen-reader-desc"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Enhanced Screen Reader Support
                    </span>
                    <p id="screen-reader-desc" className="text-xs text-gray-500">
                      Additional announcements and descriptions for screen readers
                    </p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.keyboardOnly}
                    onChange={(e) => handleSettingChange('keyboardOnly', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    aria-describedby="keyboard-only-desc"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Keyboard-Only Navigation
                    </span>
                    <p id="keyboard-only-desc" className="text-xs text-gray-500">
                      Optimize interface for keyboard navigation without mouse
                    </p>
                  </div>
                </label>
              </div>
            </section>

            {/* Color Contrast Testing */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Accessibility Testing
              </h3>
              <div className="space-y-3">
                <Button
                  onClick={testColorContrast}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  aria-describedby="contrast-test-desc"
                >
                  Test Color Contrast Ratios
                </Button>
                <p id="contrast-test-desc" className="text-xs text-gray-500">
                  Verify WCAG 2.1 AA compliance for common color combinations
                </p>

                {Object.keys(testResults).length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <h4 className="font-medium text-sm text-gray-800 mb-2">
                      Test Results:
                    </h4>
                    <div className="space-y-1">
                      {Object.entries(testResults).map(([name, passed]) => (
                        <div key={name} className="flex items-center space-x-2 text-xs">
                          <span 
                            className={`inline-block w-2 h-2 rounded-full ${
                              passed ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            aria-label={passed ? 'Passed' : 'Failed'}
                          />
                          <span className={passed ? 'text-green-700' : 'text-red-700'}>
                            {name}: {passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Keyboard Shortcuts Reference */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Keyboard Shortcuts
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div><kbd className="px-2 py-1 bg-gray-200 rounded">Tab</kbd> Navigate forward</div>
                <div><kbd className="px-2 py-1 bg-gray-200 rounded">Shift+Tab</kbd> Navigate backward</div>
                <div><kbd className="px-2 py-1 bg-gray-200 rounded">Enter</kbd> Activate button/link</div>
                <div><kbd className="px-2 py-1 bg-gray-200 rounded">Space</kbd> Select/toggle</div>
                <div><kbd className="px-2 py-1 bg-gray-200 rounded">Escape</kbd> Close dialog/menu</div>
                <div><kbd className="px-2 py-1 bg-gray-200 rounded">Arrow Keys</kbd> Navigate lists/grids</div>
              </div>
            </section>
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={() => {
                setOptions({
                  reducedMotion: false,
                  highContrast: false,
                  screenReader: false,
                  keyboardOnly: false,
                  fontSize: 'medium'
                })
                announceToScreenReader('Accessibility settings reset to defaults')
              }}
            >
              Reset to Defaults
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="primary">
                Done
              </Button>
            )}
          </div>
        </Card>
      </div>
    </FocusManager>
  )
}
