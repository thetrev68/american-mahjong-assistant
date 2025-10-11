import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../../stores'
import { useRoomSetupStore } from '../../stores/room-setup.store'
import { useRoomStore } from '../../stores/useRoomStore'
import { Button } from '../Button'

interface NavItem {
  label: string
  path: string
  icon: string
  description?: string
}

const navItems: NavItem[] = [
  {
    label: 'Home',
    path: '/',
    icon: '🏠',
    description: 'Landing page and overview'
  },
  {
    label: 'Tutorial',
    path: '/tutorial',
    icon: '🎓',
    description: 'Learn NMJL patterns and co-pilot features'
  },
  {
    label: 'Pattern Selection',
    path: '/pattern-selection',
    icon: '🎯',
    description: 'Browse and select NMJL 2025 patterns'
  },
  {
    label: 'Tile Input',
    path: '/tiles',
    icon: '🀄',
    description: 'Input your hand and get recommendations'
  },
  {
    label: 'Charleston',
    path: '/charleston',
    icon: '🔄',
    description: 'Strategic passing recommendations'
  },
  {
    label: 'Game Mode',
    path: '/game',
    icon: '🎮',
    description: 'Full co-pilot gameplay experience'
  }
]

export const NavigationSidebar = () => {
  const navigate = useNavigate()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const roomSetupStore = useRoomSetupStore(s => s)
  const roomStore = useRoomStore()

  const getItemAccessibility = (path: string) => {
    const progress = (roomSetupStore as any).getRoomSetupProgress ? (roomSetupStore as any).getRoomSetupProgress() : { currentStep: 'ready' }
    
    switch (path) {
      case '/charleston':
        return {
          accessible: progress.currentStep === 'ready',
          reason: progress.currentStep !== 'ready' ? 'Complete room setup first' : undefined
        }
      case '/game':
        return {
          accessible: progress.currentStep === 'ready' && Boolean(roomStore.room && roomStore.currentPlayerId),
          reason: progress.currentStep !== 'ready' || !(roomStore.room && roomStore.currentPlayerId)
            ? 'Complete room setup and player positioning first'
            : undefined
        }
      default:
        return { accessible: true }
    }
  }

  const handleNavigation = (path: string) => {
    const { accessible } = getItemAccessibility(path)
    if (!accessible) return // Don't navigate if not accessible
    
    navigate(path)
    setSidebarOpen(false)
  }

  if (!sidebarOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:relative lg:translate-x-0 lg:w-64 lg:shadow-none lg:border-l lg:border-gray-200
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const { accessible, reason } = getItemAccessibility(item.path)
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    disabled={!accessible}
                    title={reason}
                    className={`w-full text-left p-3 rounded-lg transition-colors duration-200 group ${
                      accessible 
                        ? 'hover:bg-gray-50 cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className={`text-xl transition-transform duration-200 ${
                        accessible ? 'group-hover:scale-110' : ''
                      }`}>
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${
                          accessible 
                            ? 'text-gray-900 group-hover:text-primary' 
                            : 'text-gray-400'
                        }`}>
                          {item.label}
                          {!accessible && ' 🔒'}
                        </div>
                        <div className={`text-sm mt-1 ${
                          accessible ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {accessible ? item.description : reason}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-center space-y-2">
              <div className="text-sm text-gray-600">
                Mahjong Co-Pilot
              </div>
              <div className="text-xs text-gray-400">
                AI-Powered American Mahjong Assistant
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
