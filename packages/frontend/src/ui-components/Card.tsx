import type { HTMLAttributes, ReactNode } from 'react'
import { useAnimationsEnabled } from '../stores'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'intelligence'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  children: ReactNode
}

export const Card = ({
  variant = 'default',
  padding = 'md',
  interactive = false,
  children,
  className = '',
  ...props
}: CardProps) => {
  const animationsEnabled = useAnimationsEnabled()
  
  const baseClasses = 'rounded-xl border'
  
  const variants = {
    default: 'bg-white border-gray-200 shadow-md',
    glass: 'glass-card',
    elevated: 'bg-white border-gray-200 shadow-[0_10px_25px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)]',
    intelligence: 'intelligence-panel'
  }
  
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }
  
  const interactiveClasses = interactive && animationsEnabled
    ? 'cursor-pointer transition-all duration-200 hover:shadow-lg hover:translate-y-[-2px] active:scale-[0.98]'
    : interactive
    ? 'cursor-pointer'
    : ''
  
  return (
    <div
      className={`${baseClasses} ${variants[variant]} ${paddings[padding]} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}