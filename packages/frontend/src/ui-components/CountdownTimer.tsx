import React, { useState, useEffect } from 'react'

interface CountdownTimerProps {
  timeRemaining: number
  onExpire?: () => void
  className?: string
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  timeRemaining,
  onExpire,
  className = ''
}) => {
  const [timeLeft, setTimeLeft] = useState(timeRemaining)

  useEffect(() => {
    setTimeLeft(timeRemaining)
  }, [timeRemaining])

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire?.()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 100
        if (newTime <= 0) {
          onExpire?.()
          return 0
        }
        return newTime
      })
    }, 100)

    return () => clearInterval(timer)
  }, [timeLeft, onExpire])

  const formatTime = (ms: number) => {
    const seconds = Math.max(0, Math.ceil(ms / 1000))
    return `${seconds}s`
  }

  return (
    <div className={`font-mono text-sm ${className}`}>
      {formatTime(timeLeft)}
    </div>
  )
}