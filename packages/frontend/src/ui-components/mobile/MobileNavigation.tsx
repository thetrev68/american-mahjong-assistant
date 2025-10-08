/**
 * Mobile Navigation Component
 * Touch-friendly navigation optimized for mobile devices
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useGameStore } from '../../stores/useGameStore'

interface MobileNavItem {
  id: string
  label: string
  icon: string
  path?: string
  onClick?: () => void
  disabled?: boolean
  badge?: string | number
  description?: string
}

interface MobileNavigationProps {
  items?: MobileNavItem[]
  position?: 'bottom' | 'top' | 'floating'
  showLabels?: boolean
  compact?: boolean
  className?: string
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  items: customItems,
  position = 'bottom',
  showLabels = true,
  compact = false,
  className = ''
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const gameStore = useGameStore()
  const [activeItem, setActiveItem] = useState<string>('')

  // Default navigation items based on current game phase
  const getDefaultNavItems = (): MobileNavItem[] => {
    const baseItems: MobileNavItem[] = [
      {
        id: 'home',
        label: 'Home',
        icon: '🏠',
        path: '/',
        description: 'Return to main menu'
      },
      {
        id: 'patterns',
        label: 'Patterns',
        icon: '🎯',
        path: '/patterns',
        badge: gameStore.gamePhase === 'tile-input' ? '!' : undefined,
        description: 'Select patterns'
      }
    ]

    // Add phase-specific navigation
    switch (gameStore.gamePhase) {
      case 'tile-input':
        baseItems.push({
          id: 'tiles',
          label: 'Tiles',
          icon: '🀄',
          path: '/tile-input',
          description: 'Enter your hand'
        })
        break
        
      case 'charleston':
        baseItems.push({
          id: 'charleston',
          label: 'Charleston',
          icon: '🔄',
          path: '/charleston',
          badge: 'Active',
          description: 'Pass tiles'
        })
        break
        
      case 'playing':
        baseItems.push(
          {
            id: 'game',
            label: 'Game',
            icon: '🎮',
            path: '/game',
            badge: 'Live',
            description: 'Play the game'
          },
          {
            id: 'analysis',
            label: 'Analysis',
            icon: '📊',
            path: '/analysis',
            description: 'View recommendations'
          }
        )
        break
        
      case 'finished':
        baseItems.push({
          id: 'results',
          label: 'Results',
          icon: '🏆',
          path: '/post-game',
          description: 'View game results'
        })
        break
    }

    // Add settings
    baseItems.push({
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      path: '/settings',
      description: 'App settings'
    })

    return baseItems
  }

  const navItems = customItems || getDefaultNavItems()

  // Update active item based on current path
  useEffect(() => {
    const currentItem = navItems.find(item => 
      item.path && location.pathname.includes(item.path)
    )
    if (currentItem) {
      setActiveItem(currentItem.id)
    }
  }, [location.pathname, navItems])

  // Handle navigation item click
  const handleItemClick = (item: MobileNavItem) => {
    if (item.disabled) return

    setActiveItem(item.id)

    if (item.onClick) {
      item.onClick()
    } else if (item.path) {
      navigate(item.path)
    }

    // Haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate([10])
    }
  }

  // Position-specific classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-0 left-0 right-0'
      case 'bottom':
        return 'bottom-0 left-0 right-0'
      case 'floating':
        return 'bottom-4 left-4 right-4 rounded-2xl'
      default:
        return 'bottom-0 left-0 right-0'
    }
  }

  // Safe area padding for devices with notches/home indicators
  const getSafeAreaClasses = () => {
    if (position === 'bottom') {
      return 'pb-safe-bottom'
    }
    if (position === 'top') {
      return 'pt-safe-top'
    }
    return ''
  }

  return (
    <div
      className={`
        fixed z-50 ${getPositionClasses()}
        bg-white/95 backdrop-blur-md border-t border-gray-200/50
        ${position === 'floating' ? 'shadow-2xl' : 'shadow-lg'}
        ${getSafeAreaClasses()}
        ${className}
      `}
      style={{
        // Handle safe areas on iOS devices
        paddingBottom: position === 'bottom' ? 'max(1rem, env(safe-area-inset-bottom))' : undefined,
        paddingTop: position === 'top' ? 'max(1rem, env(safe-area-inset-top))' : undefined
      }}
    >
      <nav className={`flex ${compact ? 'px-2 py-2' : 'px-4 py-3'}`}>
        {navItems.map((item) => {
          const isActive = activeItem === item.id
          const isDisabled = item.disabled

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              disabled={isDisabled}
              className={`
                flex-1 flex flex-col items-center justify-center
                min-h-12 px-2 py-2 rounded-xl
                transition-all duration-200 ease-out
                touch-manipulation select-none
                ${isActive 
                  ? 'bg-blue-100 text-blue-600 scale-95' 
                  : 'text-gray-600 hover:bg-gray-100 active:scale-95'
                }
                ${isDisabled 
                  ? 'opacity-40 cursor-not-allowed' 
                  : 'cursor-pointer hover:scale-105 active:scale-95'
                }
                ${compact ? 'min-h-10' : 'min-h-12'}
              `}
              style={{
                minWidth: '44px', // iOS minimum touch target
                minHeight: '44px'
              }}
              aria-label={item.description || item.label}
              role="tab"
              aria-selected={isActive}
            >
              {/* Icon with badge */}
              <div className="relative">
                <span className={`text-xl ${compact ? 'text-lg' : 'text-xl'}`}>
                  {item.icon}
                </span>
                
                {/* Badge */}
                {item.badge && (
                  <div className={`
                    absolute -top-1 -right-1 min-w-4 h-4
                    bg-red-500 text-white text-xs font-bold
                    rounded-full flex items-center justify-center
                    ${compact ? 'text-xs min-w-3 h-3' : 'text-xs'}
                  `}>
                    {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </div>

              {/* Label */}
              {showLabels && !compact && (
                <span className={`
                  text-xs font-medium mt-1 leading-tight text-center
                  ${isActive ? 'text-blue-600' : 'text-gray-600'}
                `}>
                  {item.label}
                </span>
              )}

              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// Floating action button for primary actions
interface FloatingActionButtonProps {
  icon: string
  label?: string
  onClick: () => void
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  disabled?: boolean
  badge?: string | number
  className?: string
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  label,
  onClick,
  position = 'bottom-right',
  size = 'md',
  color = 'primary',
  disabled = false,
  badge,
  className = ''
}) => {
  const [isPressed, setIsPressed] = useState(false)

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'bottom-6 right-6'
      case 'bottom-left':
        return 'bottom-6 left-6'
      case 'top-right':
        return 'top-6 right-6'
      case 'top-left':
        return 'top-6 left-6'
      default:
        return 'bottom-6 right-6'
    }
  }

  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-12 h-12 text-lg'
      case 'lg':
        return 'w-16 h-16 text-2xl'
      default:
        return 'w-14 h-14 text-xl'
    }
  }

  // Color classes
  const getColorClasses = () => {
    switch (color) {
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 text-white'
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white'
      case 'error':
        return 'bg-red-600 hover:bg-red-700 text-white'
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const handleClick = () => {
    if (disabled) return

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([15])
    }

    onClick()
  }

  return (
    <button
      onClick={handleClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      disabled={disabled}
      className={`
        fixed z-50 ${getPositionClasses()}
        ${getSizeClasses()} ${getColorClasses()}
        rounded-full shadow-lg hover:shadow-xl
        flex items-center justify-center
        transition-all duration-200 ease-out
        touch-manipulation select-none
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer hover:scale-110 active:scale-95'
        }
        ${isPressed ? 'scale-95' : 'scale-100'}
        ${className}
      `}
      style={{
        // Safe area consideration
        bottom: position.includes('bottom') ? 'max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom)))' : undefined,
        top: position.includes('top') ? 'max(1.5rem, calc(1.5rem + env(safe-area-inset-top)))' : undefined,
        left: position.includes('left') ? 'max(1.5rem, calc(1.5rem + env(safe-area-inset-left)))' : undefined,
        right: position.includes('right') ? 'max(1.5rem, calc(1.5rem + env(safe-area-inset-right)))' : undefined
      }}
      aria-label={label || 'Action button'}
    >
      {/* Icon */}
      <span>{icon}</span>
      
      {/* Badge */}
      {badge && (
        <div className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {typeof badge === 'number' && badge > 99 ? '99+' : badge}
        </div>
      )}

      {/* Label tooltip */}
      {label && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {label}
        </div>
      )}
    </button>
  )
}

