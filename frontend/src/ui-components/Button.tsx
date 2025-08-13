import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useAnimationsEnabled } from '../stores'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) => {
  const animationsEnabled = useAnimationsEnabled()
  
  const baseClasses = 'font-medium rounded-xl transition-all duration-200 inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-floating hover:translate-y-[-2px] focus:ring-primary/20',
    secondary: 'bg-accent text-white hover:bg-accent/90 hover:shadow-lg focus:ring-accent/20',
    outline: 'border-2 border-primary text-primary bg-white hover:bg-primary hover:text-white focus:ring-primary/20',
    ghost: 'text-primary bg-transparent hover:bg-primary/5 focus:ring-primary/20'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  }
  
  const animationClasses = animationsEnabled 
    ? 'transform active:scale-95' 
    : ''
  
  const isLoading = loading || disabled
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${animationClasses} ${className}`}
      disabled={isLoading}
      {...props}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
      ) : icon ? (
        <span className="inline-flex">{icon}</span>
      ) : null}
      {!loading && children}
    </button>
  )
}