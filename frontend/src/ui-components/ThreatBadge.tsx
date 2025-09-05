import React from 'react'

interface ThreatBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical'
  className?: string
}

export const ThreatBadge: React.FC<ThreatBadgeProps> = ({
  level,
  className = ''
}) => {
  const getThreatColor = () => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
    }
  }

  return (
    <span 
      className={`
        inline-flex items-center px-2 py-1 rounded-full text-xs font-bold
        ${getThreatColor()}
        ${className}
      `}
    >
      {level.toUpperCase()}
    </span>
  )
}