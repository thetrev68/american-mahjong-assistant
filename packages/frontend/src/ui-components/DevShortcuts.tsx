import React, { useState, useRef } from 'react'
import { Button } from './Button'

interface DevShortcutsProps {
  onFillTestData?: () => void
  onAutoPosition?: () => void
  onAddSampleHand?: () => void
  onSkipToCharleston?: () => void
  onSkipToGameplay?: () => void
  onResetGame?: () => void
  variant?: 'setup' | 'gameplay' | 'charleston' | 'tile-input'
}

const DevShortcuts: React.FC<DevShortcutsProps> = ({
  onFillTestData,
  onAutoPosition,
  onAddSampleHand,
  onSkipToCharleston,
  onSkipToGameplay,
  onResetGame,
  variant = 'setup'
}) => {
  const [position, setPosition] = useState({ x: 8, y: 8 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragStart.x))
      const newY = Math.max(0, Math.min(window.innerHeight - 200, e.clientY - dragStart.y))

      console.log('Moving to:', newX, newY)
      setPosition({ x: newX, y: newY })
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, dragStart.x, dragStart.y])

  // Only show in development
  if (import.meta.env.PROD) return null

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't drag when clicking buttons
    if ((e.target as HTMLElement).tagName === 'BUTTON' ||
        (e.target as HTMLElement).closest('button')) {
      return
    }

    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
    console.log('Starting drag from position:', position, 'mouse:', e.clientX, e.clientY)
  }

  const getShortcuts = () => {
    switch (variant) {
      case 'setup':
        return (
          <>
            {onFillTestData && (
              <Button
                variant="outline"
                size="sm"
                onClick={onFillTestData}
                className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                🚀 Fill Test Data
              </Button>
            )}
            {onAutoPosition && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAutoPosition}
                className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
              >
                🎯 Auto Position
              </Button>
            )}
            {onSkipToCharleston && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSkipToCharleston}
                className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                ⏭️ Skip to Charleston
              </Button>
            )}
            {onSkipToGameplay && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSkipToGameplay}
                className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                ⏭️⏭️ Skip to Gameplay
              </Button>
            )}
          </>
        )
      case 'tile-input':
        return (
          <>
            {onAddSampleHand && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAddSampleHand}
                className="bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                🎲 Add Sample Hand
              </Button>
            )}
            {onSkipToCharleston && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSkipToCharleston}
                className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                ⏭️ Skip to Charleston
              </Button>
            )}
            {onSkipToGameplay && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSkipToGameplay}
                className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                ⏭️⏭️ Skip to Gameplay
              </Button>
            )}
            {onResetGame && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetGame}
                className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
              >
                🔄 Reset Game
              </Button>
            )}
          </>
        )
      case 'charleston':
      case 'gameplay':
        return (
          <>
            {onResetGame && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetGame}
                className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
              >
                🔄 Reset Game
              </Button>
            )}
            {variant === 'charleston' && onSkipToGameplay && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSkipToGameplay}
                className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                ⏭️ Skip to Gameplay
              </Button>
            )}
          </>
        )
      default:
        return null
    }
  }

  return (
    <div
      ref={panelRef}
      data-testid="dev-shortcuts"
      className={`fixed z-50 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg p-2 shadow-lg transition-shadow ${
        isDragging ? 'shadow-xl' : 'shadow-lg'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
          <span>🔧 DEV SHORTCUTS</span>
          <span className="text-gray-400 ml-1">↕↔</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {getShortcuts()}
        </div>
      </div>
    </div>
  )
}

export default DevShortcuts