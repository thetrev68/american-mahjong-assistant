import React from 'react'
import TopZone from './TopZone'
import YourHandZone from './YourHandZone'
import DiscardPileZone from './DiscardPileZone'
import { EnhancedIntelligencePanel } from './EnhancedIntelligencePanel'
import { GameplayRecommendations } from './GameplayRecommendations'
import { GameControlPanel } from './GameControlPanel'
import type { PlayerTile, Tile } from 'shared-types'
import type { HandAnalysis } from '../../stores/useIntelligenceStore'
import type { GameAction } from '../intelligence-panel/services/turn-intelligence-engine'

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
  lastDrawnTile: Tile | null
  exposedTiles: Array<{
    type: 'pung' | 'kong' | 'quint' | 'sextet'
    tiles: Tile[]
    timestamp: Date
  }>
  selectedDiscardTile: Tile | null
  isMyTurn: boolean
  isAnalyzing: boolean
  handleDrawTile: () => void
  handleDiscardTile: (tile: Tile) => void
  onAdvanceToGameplay?: () => void
  discardPile: Array<{
    tile: Tile
    playerId: string
    timestamp: Date
  }>
  currentPlayerIndex: number
  playerExposedCount: Record<string, number>
  gameHistory: GameAction[]
  currentAnalysis: HandAnalysis | null
  wallCount?: number
  onSwapJoker?: () => void
  onDeadHand?: () => void
  playingPatternIds?: string[]
  onPlayingPatternChange?: (patternId: string, isSelected: boolean) => void
  onPatternSwitch?: (patternId: string) => void
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
  playerExposedCount: _playerExposedCount,
  gameHistory,
  currentAnalysis,
  wallCount,
  onSwapJoker,
  onDeadHand,
  playingPatternIds,
  onPlayingPatternChange,
  onPatternSwitch,
}) => {
  return (
    <div className="max-w-full mx-auto p-1 sm:p-4 md:p-6 md:max-w-4xl pb-20 sm:pb-24">
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
        wallCount={wallCount}
        onSwapJoker={onSwapJoker}
        onDeadHand={onDeadHand}
        currentPlayerIndex={currentPlayerIndex}
      />

      {/* GAME CONTROL PANEL: Solo mode controls */}
      <GameControlPanel className="mb-6" />

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
        playingPatternIds={playingPatternIds}
      />

      {/* AI RECOMMENDATIONS - Show for both Charleston and gameplay */}
      <div className="mb-6">
        <GameplayRecommendations
          analysis={currentAnalysis}
          isLoading={isAnalyzing}
          gamePhase={gamePhase}
        />
      </div>

      {/* ZONE 2: DISCARD PILE & OPPONENT EXPOSED - Hidden during Charleston */}
      {gamePhase !== 'charleston' && (
        <DiscardPileZone
          discardPile={discardPile}
          playerNames={playerNames}
          playerExposedCount={_playerExposedCount}
        />
      )}

      {/* ZONES 4-5: AI INTELLIGENCE PANEL */}
      <EnhancedIntelligencePanel
        analysis={currentAnalysis}
        gameState={{
          currentPlayer: currentPlayer,
          turnNumber: gameRound,
          roundNumber: gameRound,
          playerHands: {},
          playerActions: {},
          discardPile: discardPile.map(d => d.tile),
          exposedTiles: {},
          wallCount: wallCount || 144,
          actionHistory: gameHistory
        }}
        playerId="You"
        isCurrentTurn={isMyTurn}
        callOpportunity={null}
        gamePhase={gamePhase}
        isAnalyzing={isAnalyzing}
        playingPatternIds={playingPatternIds}
        onPlayingPatternChange={onPlayingPatternChange}
        onPatternSwitch={onPatternSwitch}
      />
    </div>
  )
}

export default GameScreenLayout
