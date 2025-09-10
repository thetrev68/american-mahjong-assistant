import { Button } from '../Button'
import { useGameStore, useUIStore } from '../../stores'
import { useNavigate } from 'react-router-dom'

export const Header = () => {
  const roomCode = useGameStore(state => state.roomCode)
  const gamePhase = useGameStore(state => state.gamePhase)
  const { setSidebarOpen } = useUIStore()
  const navigate = useNavigate()
  
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Navigation & Title */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            title="Open Navigation Menu"
            className="flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          
          <button
            onClick={() => navigate('/')}
            className="hover:opacity-80 transition-opacity cursor-pointer group"
            title="Go to Home"
          >
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">Mahjong Co-Pilot</h1>
              {gamePhase !== 'lobby' && (
                <p className="text-xs text-muted uppercase tracking-wide">
                  {gamePhase.replace('-', ' ')}
                </p>
              )}
            </div>
          </button>
        </div>
        
        {/* Room Status */}
        <div className="flex items-center gap-3">
          {roomCode && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-muted uppercase tracking-wide">Room</span>
              <code className="text-sm font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                {roomCode}
              </code>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}