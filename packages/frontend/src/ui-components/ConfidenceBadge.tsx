import React from 'react'

interface ConfidenceBadgeProps {
  confidence: number
  className?: string
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  className = ''
}) => {
  const getConfidenceLevel = (value: number): 'high' | 'medium' | 'low' => {
    if (value >= 0.7) return 'high'
    if (value >= 0.4) return 'medium'
    return 'low'
  }

  const level = getConfidenceLevel(confidence)
  const percentage = Math.round(confidence * 100)

  return (
    <span 
      className={`
        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
        ${level === 'high' ? 'bg-green-100 text-green-800' : ''}
        ${level === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
        ${level === 'low' ? 'bg-red-100 text-red-800' : ''}
        ${className}
      `}
    >
      {percentage}%
    </span>
  )
}