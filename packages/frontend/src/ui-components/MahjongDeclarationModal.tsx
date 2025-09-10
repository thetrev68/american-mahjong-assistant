// Mahjong Declaration Modal - Handle pattern selection and validation
// Uses MahjongValidator for real pattern validation and scoring

import React, { useState, useMemo } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { LoadingSpinner } from './LoadingSpinner'
import { AnimatedTile } from './tiles/AnimatedTile'
import { MahjongValidator, type MahjongDeclaration, type MahjongValidationResult } from '../services/mahjong-validator'
import type { NMJL2025Pattern } from 'shared-types'
import type { PlayerTile } from '../types/tile-types'
import type { GameContext } from '../services/pattern-analysis-engine'

interface MahjongDeclarationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (result: MahjongValidationResult) => void
  playerHand: PlayerTile[]
  exposedTiles: PlayerTile[]
  selectedPatterns: NMJL2025Pattern[]
  playerId: string
  gameContext: GameContext
}

export const MahjongDeclarationModal: React.FC<MahjongDeclarationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  playerHand,
  exposedTiles,
  selectedPatterns,
  playerId,
  gameContext
}) => {
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(
    selectedPatterns.length === 1 ? selectedPatterns[0].Hands_Key : null
  )
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<MahjongValidationResult | null>(null)
  const [showValidation, setShowValidation] = useState(false)

  // Quick validation check
  const quickCheck = useMemo(() => {
    return MahjongValidator.quickValidationCheck(playerHand, exposedTiles)
  }, [playerHand, exposedTiles])

  // Get selected pattern
  const selectedPattern = useMemo(() => {
    if (!selectedPatternId) return null
    return selectedPatterns.find(p => p.Hands_Key === selectedPatternId) || null
  }, [selectedPatternId, selectedPatterns])

  // Pattern requirements
  const patternRequirements = useMemo(() => {
    if (!selectedPattern) return null
    return MahjongValidator.getPatternRequirements(selectedPattern)
  }, [selectedPattern])

  const handleValidatePattern = async () => {
    if (!selectedPattern) return

    setIsValidating(true)
    setValidationResult(null)
    
    try {
      const declaration: MahjongDeclaration = {
        playerId,
        hand: playerHand,
        exposedTiles,
        selectedPattern,
        context: gameContext
      }

      const result = await MahjongValidator.validateMahjongDeclaration(declaration)
      setValidationResult(result)
      setShowValidation(true)
    } catch (error) {
      console.error('Validation error:', error)
      setValidationResult({
        isValid: false,
        violations: ['Validation failed - please try again'],
        score: 0,
        bonusPoints: []
      })
      setShowValidation(true)
    } finally {
      setIsValidating(false)
    }
  }

  const handleConfirmMahjong = () => {
    if (validationResult && validationResult.isValid) {
      onConfirm(validationResult)
      onClose()
    }
  }

  const handleBack = () => {
    setShowValidation(false)
    setValidationResult(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {!showValidation ? (
          /* Pattern Selection View */
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">🏆 Declare Mahjong</h2>
            
            {/* Quick Validation Check */}
            {!quickCheck.canDeclare && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">
                  ⚠️ {quickCheck.reason}
                </p>
              </div>
            )}

            {/* Hand Display */}
            <Card className="p-4 mb-6">
              <h3 className="font-semibold mb-3">Your Current Hand ({playerHand.length + exposedTiles.length} tiles)</h3>
              
              {/* Concealed Hand */}
              <div className="mb-4">
                <h4 className="text-sm text-gray-600 mb-2">Concealed ({playerHand.length} tiles)</h4>
                <div className="flex flex-wrap gap-1">
                  {playerHand.map((tile, index) => (
                    <AnimatedTile
                      key={`${tile.instanceId}-${index}`}
                      tile={tile}
                      size="sm"
                      context="analysis"
                      className=""
                    />
                  ))}
                </div>
              </div>

              {/* Exposed Tiles */}
              {exposedTiles.length > 0 && (
                <div>
                  <h4 className="text-sm text-gray-600 mb-2">Exposed ({exposedTiles.length} tiles)</h4>
                  <div className="flex flex-wrap gap-1">
                    {exposedTiles.map((tile, index) => (
                      <AnimatedTile
                        key={`exposed-${tile.instanceId}-${index}`}
                        tile={tile}
                        size="sm"
                        context="analysis"
                        className="opacity-80"
                      />
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Pattern Selection */}
            <Card className="p-4 mb-6">
              <h3 className="font-semibold mb-3">Select Winning Pattern</h3>
              
              {selectedPatterns.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No patterns selected. Please select patterns first.
                </p>
              )}

              <div className="space-y-2">
                {selectedPatterns.map((pattern) => (
                  <label 
                    key={pattern.Hands_Key}
                    className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPatternId === pattern.Hands_Key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="winningPattern"
                      value={pattern.Hands_Key}
                      checked={selectedPatternId === pattern.Hands_Key}
                      onChange={(e) => setSelectedPatternId(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{pattern.Hand_Description}</div>
                        <div className="text-sm text-gray-600">
                          {pattern.Hand_Points} points • {pattern.Hand_Difficulty} difficulty
                          {pattern.Hand_Conceiled && ' • Concealed required'}
                        </div>
                      </div>
                      <div className="text-2xl">
                        {selectedPatternId === pattern.Hands_Key ? '✅' : '⭕'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Pattern Requirements */}
              {patternRequirements && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Pattern Requirements</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• {patternRequirements.points} base points</li>
                    <li>• {patternRequirements.difficulty} difficulty</li>
                    {patternRequirements.requiresConcealedHand && (
                      <li>• Must be completely concealed</li>
                    )}
                    {patternRequirements.allowsJokers ? (
                      <li>• Jokers allowed in some groups</li>
                    ) : (
                      <li>• No jokers allowed</li>
                    )}
                    {patternRequirements.specialNotes?.map((note, index) => (
                      <li key={index}>• {note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleValidatePattern}
                disabled={!selectedPattern || !quickCheck.canDeclare || isValidating}
                className="flex-1"
              >
                {isValidating ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Validating...
                  </div>
                ) : (
                  'Validate Mahjong'
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Validation Results View */
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">
              {validationResult?.isValid ? '🎉 Valid Mahjong!' : '❌ Invalid Mahjong'}
            </h2>

            {validationResult?.isValid ? (
              /* Success View */
              <div className="space-y-4">
                <Card className="p-4 bg-green-50 border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3">Congratulations!</h3>
                  <div className="space-y-2 text-green-700">
                    <p><strong>Pattern:</strong> {validationResult.validPattern?.Hand_Description}</p>
                    <p><strong>Final Score:</strong> {validationResult.score} points</p>
                    {validationResult.handAnalysis && (
                      <p>
                        <strong>Completion:</strong> {Math.round(validationResult.handAnalysis.completionRatio * 100)}%
                        ({validationResult.handAnalysis.jokersUsed} jokers used)
                      </p>
                    )}
                  </div>
                </Card>

                {/* Score Breakdown */}
                {validationResult.bonusPoints.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">Score Breakdown</h4>
                    <ul className="space-y-1 text-sm">
                      {validationResult.bonusPoints.map((bonus, index) => (
                        <li key={index} className="text-gray-700">• {bonus}</li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            ) : (
              /* Error View */
              <div className="space-y-4">
                <Card className="p-4 bg-red-50 border-red-200">
                  <h3 className="font-semibold text-red-800 mb-3">Mahjong Invalid</h3>
                  <ul className="space-y-1">
                    {validationResult?.violations.map((violation, index) => (
                      <li key={index} className="text-red-700 text-sm">
                        • {violation}
                      </li>
                    ))}
                  </ul>
                </Card>

                <div className="text-sm text-gray-600">
                  <p>Review your hand and selected pattern. You may need to:</p>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>• Check that all tiles match the pattern requirements</li>
                    <li>• Verify you have exactly 14 tiles</li>
                    <li>• Ensure jokers are used correctly</li>
                    <li>• Consider if the pattern requires a concealed hand</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              {validationResult?.isValid ? (
                <Button
                  onClick={handleConfirmMahjong}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Declare Mahjong! 🏆
                </Button>
              ) : (
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}