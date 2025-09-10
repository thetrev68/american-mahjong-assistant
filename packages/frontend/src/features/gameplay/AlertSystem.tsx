import React, { useEffect, useState } from 'react'

export interface GameAlert {
  id: string
  type: 'warning' | 'info' | 'success' | 'call'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  createdAt: Date
}

interface AlertSystemProps {
  alerts: GameAlert[]
  onDismiss: (alertId: string) => void
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center'
  maxVisible?: number
}

const AlertSystem: React.FC<AlertSystemProps> = ({
  alerts,
  onDismiss,
  position = 'top-right',
  maxVisible = 3,
}) => {
  const [visibleAlerts, setVisibleAlerts] = useState<GameAlert[]>([])

  useEffect(() => {
    const sortedAlerts = [...alerts]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, maxVisible)
    
    setVisibleAlerts(sortedAlerts)
  }, [alerts, maxVisible])

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    visibleAlerts.forEach((alert) => {
      if (alert.duration && alert.duration > 0) {
        const timer = setTimeout(() => {
          onDismiss(alert.id)
        }, alert.duration)
        timers.push(timer)
      }
    })

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [visibleAlerts, onDismiss])

  const getPositionClasses = (): string => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      default:
        return 'top-4 right-4'
    }
  }

  const getAlertIcon = (type: GameAlert['type']): string => {
    switch (type) {
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      case 'success':
        return '✅'
      case 'call':
        return '🔔'
      default:
        return 'ℹ️'
    }
  }

  const getAlertStyles = (type: GameAlert['type']): string => {
    const baseStyles = 'mb-2 p-3 rounded-lg shadow-lg backdrop-blur-sm border-l-4 min-w-72 max-w-80'
    
    switch (type) {
      case 'warning':
        return `${baseStyles} bg-yellow-50/90 border-l-yellow-400 text-yellow-800`
      case 'info':
        return `${baseStyles} bg-blue-50/90 border-l-blue-400 text-blue-800`
      case 'success':
        return `${baseStyles} bg-green-50/90 border-l-green-400 text-green-800`
      case 'call':
        return `${baseStyles} bg-purple-50/90 border-l-purple-400 text-purple-800 animate-pulse`
      default:
        return `${baseStyles} bg-gray-50/90 border-l-gray-400 text-gray-800`
    }
  }

  const getProgressBarColor = (type: GameAlert['type']): string => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-400'
      case 'info':
        return 'bg-blue-400'
      case 'success':
        return 'bg-green-400'
      case 'call':
        return 'bg-purple-400'
      default:
        return 'bg-gray-400'
    }
  }

  if (visibleAlerts.length === 0) {
    return null
  }

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      {visibleAlerts.map((alert) => (
        <AlertItem
          key={alert.id}
          alert={alert}
          onDismiss={onDismiss}
          getAlertIcon={getAlertIcon}
          getAlertStyles={getAlertStyles}
          getProgressBarColor={getProgressBarColor}
        />
      ))}
    </div>
  )
}

interface AlertItemProps {
  alert: GameAlert
  onDismiss: (alertId: string) => void
  getAlertIcon: (type: GameAlert['type']) => string
  getAlertStyles: (type: GameAlert['type']) => string
  getProgressBarColor: (type: GameAlert['type']) => string
}

const AlertItem: React.FC<AlertItemProps> = ({
  alert,
  onDismiss,
  getAlertIcon,
  getAlertStyles,
  getProgressBarColor,
}) => {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (alert.duration && alert.duration > 0) {
      const endTime = alert.createdAt.getTime() + alert.duration

      const updateProgress = () => {
        const now = Date.now()
        const remainingTime = endTime - now
        const progressPercent = Math.max(0, (remainingTime / alert.duration!) * 100)
        
        setProgress(progressPercent)

        if (remainingTime > 0) {
          requestAnimationFrame(updateProgress)
        }
      }

      updateProgress()
    }
  }, [alert.duration, alert.createdAt])

  return (
    <div className={`${getAlertStyles(alert.type)} animate-slide-in-right`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2 flex-1">
          <span className="text-lg flex-shrink-0 mt-0.5">
            {getAlertIcon(alert.type)}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold mb-1">{alert.title}</h4>
            <p className="text-xs opacity-90 leading-relaxed">{alert.message}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          {alert.action && (
            <button
              onClick={alert.action.onClick}
              className="text-xs px-2 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
            >
              {alert.action.label}
            </button>
          )}
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-lg leading-none opacity-60 hover:opacity-100 transition-opacity ml-1"
          >
            ×
          </button>
        </div>
      </div>
      
      {alert.duration && alert.duration > 0 && (
        <div className="mt-2 h-1 bg-black/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressBarColor(alert.type)} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default AlertSystem