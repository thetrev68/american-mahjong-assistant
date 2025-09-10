import type { ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  center?: boolean
  className?: string
}

export const Container = ({
  children,
  size = 'lg',
  padding = 'md',
  center = false,
  className = ''
}: ContainerProps) => {
  const sizes = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-none'
  }
  
  const paddings = {
    none: '',
    sm: 'px-2 sm:px-4 py-3',
    md: 'px-4 sm:px-6 py-4',
    lg: 'px-6 sm:px-8 py-6',
    xl: 'px-8 sm:px-12 py-8'
  }
  
  const centerClasses = center ? 'mx-auto' : ''
  
  return (
    <div className={`${sizes[size]} ${centerClasses} ${paddings[padding]} ${className}`}>
      {children}
    </div>
  )
}