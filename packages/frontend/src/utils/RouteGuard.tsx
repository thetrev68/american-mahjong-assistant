import React from 'react'
import { Navigate } from 'react-router-dom'
import { useRoomStore } from '../stores/room-store'

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
  const roomStore = useRoomStore()

  // Check if room setup is required and completed
  if (requiresRoomSetup) {
    const progress = roomStore.getRoomSetupProgress()
    
    // If room setup isn't complete, redirect to room setup
    if (progress.currentStep !== 'ready') {
      return <Navigate to="/room-setup" replace />
    }
  }

  // Check if game start is required
  if (requiresGameStart) {
    const progress = roomStore.getRoomSetupProgress()
    const isRoomReady = roomStore.isRoomReadyForGame()
    
    // If not ready for game, redirect to room setup
    if (progress.currentStep !== 'ready' || !isRoomReady) {
      console.warn('RouteGuard: Game not ready, redirecting to room setup', {
        step: progress.currentStep,
        roomReady: isRoomReady,
        coPilotMode: roomStore.coPilotMode
      })
      return <Navigate to="/room-setup" replace />
    }
  }

  return <>{children}</>
}