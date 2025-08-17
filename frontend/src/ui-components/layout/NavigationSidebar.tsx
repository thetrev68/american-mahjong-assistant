import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../../stores'
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
    path: '/tile-input',
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
  },
  {
    label: 'Post-Game Analysis',
    path: '/post-game',
    icon: '📊',
    description: 'Review performance and insights'
  }
]

export const NavigationSidebar = () => {
  const navigate = useNavigate()
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  const handleNavigation = (path: string) => {
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
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-xl group-hover:scale-110 transition-transform duration-200">
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 group-hover:text-primary">
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
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