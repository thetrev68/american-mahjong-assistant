import React, { useState, useEffect } from 'react'

interface GameTimerProps {
  startTime: Date | null
  className?: string
}

const GameTimer: React.FC<GameTimerProps> = ({ startTime, className }) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) {
      setElapsed(0)
      return
    }

    const updateElapsed = () => {
      const now = new Date()
      const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      setElapsed(elapsedSeconds)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <span className={className}>
      ⏱️ {formatTime(elapsed)}
    </span>
  )
}

export default GameTimer