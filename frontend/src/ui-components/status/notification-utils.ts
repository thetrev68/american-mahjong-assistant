/**
 * Notification Utilities
 * Hook for managing notifications state and actions
 */

import { useState } from 'react'

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

export const useNotifications = () => {
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