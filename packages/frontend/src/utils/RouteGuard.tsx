import React from 'react'
import { Navigate } from 'react-router-dom'
import { useRoomSetupStore } from '../stores/room-setup.store'
import { useRoomStore } from '../stores/room.store'
import { usePlayerStore } from '../stores/player.store'

interface RouteGuardProps {
  children: React.ReactNode
  requiresRoomSetup?: boolean
  requiresGameStart?: boolean
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  requiresRoomSetup = false,
  requiresGameStart = false 
}) => {
  const roomSetupStore = useRoomSetupStore()
  const roomStore = useRoomStore()
  const playerStore = usePlayerStore()

  // Check if room setup is required and completed
  if (requiresRoomSetup) {
    const progress = roomSetupStore.getRoomSetupProgress()
    
    // If room setup isn't complete, redirect to room setup
    if (progress.currentStep !== 'ready') {
      return <Navigate to="/room-setup" replace />
    }
  }

  // Check if game start is required
  if (requiresGameStart) {
    const progress = roomSetupStore.getRoomSetupProgress()
    const isRoomReady = roomStore.isRoomReadyForGame()
    
    // Check if we have persisted player data (more resilient to refresh)
    const hasPersistedPlayerData = playerStore.currentPlayerId && 
      Object.keys(playerStore.playerPositions).length > 0
    
    // Check if co-pilot mode was selected (indicates completed setup)
    const hasCompletedSetup = roomSetupStore.coPilotModeSelected
    
    // Allow staying on current screen if we have persisted data indicating setup was completed
    const canStayOnCurrentScreen = hasCompletedSetup && hasPersistedPlayerData
    
    // If not ready for game AND we don't have indicators of completed setup, redirect to room setup
    if ((progress.currentStep !== 'ready' || !isRoomReady) && !canStayOnCurrentScreen) {
      console.warn('RouteGuard: Game not ready, redirecting to room setup', {
        step: progress.currentStep,
        roomReady: isRoomReady,
        coPilotMode: roomSetupStore.coPilotMode,
        hasPersistedPlayerData,
        hasCompletedSetup
      })
      return <Navigate to="/room-setup" replace />
    }
  }

  return <>{children}</>
}