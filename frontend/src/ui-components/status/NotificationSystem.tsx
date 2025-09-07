/**
 * Real-Time Notification System
 * Elegant, non-intrusive notifications for game events and user feedback
 */

import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface NotificationConfig {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'achievement'
  title: string
  message?: string
  icon?: string
  duration?: number // milliseconds, 0 for persistent
  action?: {
    label: string
    onClick: () => void
  }
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

interface NotificationProps {
  notification: NotificationConfig
  onDismiss: (id: string) => void
  index: number
}

// Individual notification component
const Notification: React.FC<NotificationProps> = ({ notification, onDismiss, index }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Auto-dismiss timer with progress bar
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const interval = 50 // Update progress every 50ms
      const steps = notification.duration / interval
      let currentStep = 0

      const progressTimer = setInterval(() => {
        currentStep++
        const newProgress = Math.max(0, 100 - (currentStep / steps) * 100)
        setProgress(newProgress)

        if (currentStep >= steps) {
          clearInterval(progressTimer)
          handleDismiss()
        }
      }, interval)

      return () => clearInterval(progressTimer)
    }
  }, [notification.duration, handleDismiss])

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => onDismiss(notification.id), 300)
  }, [notification.id, onDismiss])

  // Pause auto-dismiss on hover
  const [isPaused, setIsPaused] = useState(false)
  useEffect(() => {
    // Implementation would pause/resume progress timer
  }, [isPaused])

  // Notification styling based on type
  const getNotificationStyle = () => {
    const baseStyle = "relative overflow-hidden rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300"
    
    switch (notification.type) {
      case 'success':
        return `${baseStyle} bg-green-50/90 border-green-200 text-green-800`
      case 'error':
        return `${baseStyle} bg-red-50/90 border-red-200 text-red-800`
      case 'warning':
        return `${baseStyle} bg-yellow-50/90 border-yellow-200 text-yellow-800`
      case 'info':
        return `${baseStyle} bg-blue-50/90 border-blue-200 text-blue-800`
      case 'achievement':
        return `${baseStyle} bg-gradient-to-r from-purple-50/90 to-pink-50/90 border-purple-200 text-purple-800`
      default:
        return `${baseStyle} bg-gray-50/90 border-gray-200 text-gray-800`
    }
  }

  const getDefaultIcon = () => {
    switch (notification.type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      case 'achievement': return '🏆'
      default: return '📢'
    }
  }

  const getPriorityStyle = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'animate-pulse ring-2 ring-red-400'
      case 'high':
        return 'ring-1 ring-yellow-400'
      default:
        return ''
    }
  }

  return (
    <div
      className={`
        w-full max-w-md mx-auto mb-4 p-4 cursor-pointer
        transform transition-all duration-300 ease-out
        ${getNotificationStyle()}
        ${getPriorityStyle()}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isExiting ? 'translate-x-full opacity-0 scale-95' : ''}
        hover:scale-105 hover:shadow-xl
      `}
      onClick={handleDismiss}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{ 
        transform: `translateY(${index * -10}px)`,
        zIndex: 1000 - index
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-xl">
          {notification.icon || getDefaultIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm leading-5">
                {notification.title}
              </h4>
              {notification.message && (
                <p className="text-sm opacity-90 mt-1 leading-4">
                  {notification.message}
                </p>
              )}
            </div>
            
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDismiss()
              }}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Action button */}
          {notification.action && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                notification.action!.onClick()
                handleDismiss()
              }}
              className="mt-3 px-3 py-1 bg-white/50 hover:bg-white/70 rounded-md text-xs font-medium transition-colors"
            >
              {notification.action.label}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {notification.duration && notification.duration > 0 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black/10">
          <div 
            className="h-full bg-current transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Priority indicator */}
      {notification.priority === 'urgent' && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping" />
      )}
    </div>
  )
}

// Notification container component
interface NotificationContainerProps {
  notifications: NotificationConfig[]
  onDismiss: (id: string) => void
  maxVisible?: number
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({ 
  notifications, 
  onDismiss,
  maxVisible = 5
}) => {
  // Group notifications by position
  const notificationGroups = notifications.reduce((groups, notification) => {
    const position = notification.position || 'top-right'
    if (!groups[position]) {
      groups[position] = []
    }
    groups[position].push(notification)
    return groups
  }, {} as Record<string, NotificationConfig[]>)

  // Position classes
  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-right':
        return 'bottom-4 right-4'
      default:
        return 'top-4 right-4'
    }
  }

  return (
    <>
      {Object.entries(notificationGroups).map(([position, positionNotifications]) => (
        <div
          key={position}
          className={`fixed z-[9999] ${getPositionClasses(position)} max-w-md w-full pointer-events-none`}
        >
          <div className="space-y-2 pointer-events-auto">
            {positionNotifications
              .slice(0, maxVisible)
              .map((notification, index) => (
                <Notification
                  key={notification.id}
                  notification={notification}
                  onDismiss={onDismiss}
                  index={index}
                />
              ))}
          </div>
          
          {/* Overflow indicator */}
          {positionNotifications.length > maxVisible && (
            <div className="mt-2 text-center">
              <div className="inline-block px-3 py-1 bg-gray-800/80 text-white text-xs rounded-full">
                +{positionNotifications.length - maxVisible} more notifications
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  )
}

// Hook for managing notifications
const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationConfig[]>([])

  const addNotification = (config: Omit<NotificationConfig, 'id'>) => {
    const notification: NotificationConfig = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      duration: config.type === 'error' ? 0 : 5000, // Errors persist by default
      position: 'top-right',
      priority: 'normal',
      ...config
    }

    setNotifications(prev => [notification, ...prev])
    return notification.id
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const dismissAll = () => {
    setNotifications([])
  }

  // Convenience methods
  const success = (title: string, message?: string, options?: Partial<NotificationConfig>) => {
    return addNotification({ ...options, type: 'success', title, message })
  }

  const error = (title: string, message?: string, options?: Partial<NotificationConfig>) => {
    return addNotification({ ...options, type: 'error', title, message })
  }

  const warning = (title: string, message?: string, options?: Partial<NotificationConfig>) => {
    return addNotification({ ...options, type: 'warning', title, message })
  }

  const info = (title: string, message?: string, options?: Partial<NotificationConfig>) => {
    return addNotification({ ...options, type: 'info', title, message })
  }

  const achievement = (title: string, message?: string, options?: Partial<NotificationConfig>) => {
    return addNotification({ 
      ...options, 
      type: 'achievement', 
      title, 
      message,
      duration: 8000, // Achievements show longer
      priority: 'high'
    })
  }

  return {
    notifications,
    addNotification,
    dismissNotification,
    dismissAll,
    success,
    error,
    warning,
    info,
    achievement
  }
}

// Main notification system component to be rendered at app level
export const NotificationSystem: React.FC<{ maxVisible?: number }> = ({ maxVisible }) => {
  const { notifications, dismissNotification } = useNotifications()

  // Create portal to render notifications at document level
  if (typeof document === 'undefined') {
    return null // Server-side rendering guard
  }

  return createPortal(
    <NotificationContainer 
      notifications={notifications}
      onDismiss={dismissNotification}
      maxVisible={maxVisible}
    />,
    document.body
  )
}

export { useNotifications }
export default NotificationSystem