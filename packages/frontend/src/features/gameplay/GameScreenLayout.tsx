import React from 'react'
import TopZone from './TopZone'
import YourHandZone from './YourHandZone'
import DiscardPileZone from './DiscardPileZone'
import OpponentExposedZone from './OpponentExposedZone'
import IntelligencePanel from './IntelligencePanel'
import type { PlayerTile } from '../types/tile-types'
import type { Tile } from 'shared-types'
import type { PatternSelectionOption } from 'shared-types'

interface GameScreenLayoutProps {
  gamePhase: 'charleston' | 'gameplay'
  currentPlayer: string
  timeElapsed: number
  playerNames: string[]
  windRound: 'east' | 'south' | 'west' | 'north'
  gameRound: number
  selectedPatternsCount: number
  findAlternativePatterns: () => void
  onNavigateToCharleston?: () => void
  onPauseGame?: () => void
  isPaused?: boolean
  nextPlayer?: string
  currentHand: PlayerTile[]
  lastDrawnTile: TileType | null
  exposedTiles: Array<{
    type: 'pung' | 'kong' | 'quint' | 'sextet'
    tiles: TileType[]
    timestamp: Date
  }>
  selectedDiscardTile: TileType | null
  isMyTurn: boolean
  isAnalyzing: boolean
  handleDrawTile: () => void
  handleDiscardTile: (tile: TileType) => void
  onAdvanceToGameplay?: () => void
  discardPile: Array<{
    tile: TileType
    playerId: string
    timestamp: Date
  }>
  currentPlayerIndex: number
  playerExposedCount: Record<string, number>
  gameHistory: Array<{
    playerId: string
    action: string
    tile?: TileType
    timestamp: Date
  }>
  currentAnalysis: {
    recommendations?: {
      discard?: {
        reasoning: string
      }
    }
    recommendedPatterns?: Array<{
      pattern: PatternSelectionOption
      completionPercentage: number
      isPrimary: boolean
      confidence: number
      reasoning: string
      difficulty: 'easy' | 'medium' | 'hard'
    }>
    overallScore?: number
    tileRecommendations?: Array<{
      tileId: string
      action: 'keep' | 'pass' | 'discard' | 'neutral'
      confidence: number
      reasoning: string
    }>
  } | null
}

const GameScreenLayout: React.FC<GameScreenLayoutProps> = ({
  gamePhase,
  currentPlayer,
  timeElapsed,
  playerNames,
  windRound,
  gameRound,
  selectedPatternsCount,
  findAlternativePatterns,
  onNavigateToCharleston,
  onPauseGame,
  isPaused,
  nextPlayer,
  currentHand,
  lastDrawnTile,
  exposedTiles,
  selectedDiscardTile,
  isMyTurn,
  isAnalyzing,
  handleDrawTile,
  handleDiscardTile,
  onAdvanceToGameplay,
  discardPile,
  currentPlayerIndex,
  playerExposedCount,
  gameHistory,
  currentAnalysis,
}) => {
  return (
    <div className="max-w-full mx-auto p-2 sm:p-4 md:p-6 md:max-w-4xl">
      {/* TOP ZONE: Game phase, elapsed timer, current player, action buttons */}
      <TopZone 
        gamePhase={gamePhase}
        currentPlayer={currentPlayer}
        timeElapsed={timeElapsed}
        playerNames={playerNames}
        windRound={windRound}
        gameRound={gameRound}
        selectedPatternsCount={selectedPatternsCount}
        findAlternativePatterns={findAlternativePatterns}
        onNavigateToCharleston={onNavigateToCharleston}
        onPauseGame={onPauseGame}
        isPaused={isPaused}
        nextPlayer={nextPlayer}
      />

      {/* ZONE 1: YOUR HAND */}
      <YourHandZone
        currentHand={currentHand}
        lastDrawnTile={lastDrawnTile}
        exposedTiles={exposedTiles}
        selectedDiscardTile={selectedDiscardTile}
        isMyTurn={isMyTurn}
        isAnalyzing={isAnalyzing}
        handleDrawTile={handleDrawTile}
        handleDiscardTile={handleDiscardTile}
        gamePhase={gamePhase}
        onAdvanceToGameplay={onAdvanceToGameplay}
        currentAnalysis={currentAnalysis}
      />

      {/* ZONE 2: DISCARD PILE - Hidden during Charleston */}
      {gamePhase !== 'charleston' && (
        <DiscardPileZone discardPile={discardPile} />
      )}

      {/* ZONE 3: OPPONENT EXPOSED TILES */}
      <OpponentExposedZone
        playerNames={playerNames}
        currentPlayerIndex={currentPlayerIndex}
        playerExposedCount={playerExposedCount}
        gameHistory={gameHistory}
      />

      {/* ZONES 4-5: AI INTELLIGENCE PANEL */}
      <IntelligencePanel
        isAnalyzing={isAnalyzing}
        currentAnalysis={currentAnalysis}
        gamePhase={gamePhase}
      />
    </div>
  )
}

export default GameScreenLayout