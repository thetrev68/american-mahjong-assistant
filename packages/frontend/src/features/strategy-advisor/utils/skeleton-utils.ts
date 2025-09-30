// Skeleton loader utility functions and convenience components
// Moved from SkeletonLoader.tsx to resolve React Fast Refresh warnings

import React from 'react'

export interface SkeletonLoaderProps {
  variant: 'message' | 'pattern' | 'recommendation' | 'carousel' | 'panel' | 'list'
  count?: number
  className?: string
  animate?: boolean
  respectsReducedMotion?: boolean
}

// Simple className utility for merging classes
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

// Convenience component factory functions
export const createSkeletonComponent = (variant: SkeletonLoaderProps['variant']) => {
  return React.memo(() => {
    return React.createElement('div', {
      className: 'animate-pulse bg-slate-200 rounded-lg h-24',
      'data-skeleton': variant
    })
  })
}

export const MessageSkeleton_ = createSkeletonComponent('message')
export const PatternSkeleton_ = createSkeletonComponent('pattern')
export const RecommendationSkeleton_ = createSkeletonComponent('recommendation')
export const CarouselSkeleton_ = createSkeletonComponent('carousel')
export const PanelSkeleton_ = createSkeletonComponent('panel')

export const ListSkeleton_ = React.memo<{ count?: number }>(({ count = 3 }) => {
  return React.createElement('div', {
    className: 'space-y-2',
    'data-skeleton': 'list'
  }, Array.from({ length: count }).map((_, i) =>
    React.createElement('div', {
      key: i,
      className: 'animate-pulse bg-slate-200 rounded-lg h-16'
    })
  ))
})

// Loading wrapper component that shows skeleton while loading
interface LoadingWrapperProps {
  isLoading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  className?: string
  delay?: number // Delay before showing skeleton (prevents flash)
}

export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  skeleton,
  children,
  className,
  delay = 150
}) => {
  const [showSkeleton, setShowSkeleton] = React.useState(false)

  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowSkeleton(true), delay)
      return () => clearTimeout(timer)
    } else {
      setShowSkeleton(false)
    }
  }, [isLoading, delay])

  return React.createElement('div', {
    className
  }, isLoading && showSkeleton ? skeleton : children)
}

// Hook for managing skeleton loading states
export const useSkeletonLoading = (isLoading: boolean, delay: number = 150) => {
  const [showSkeleton, setShowSkeleton] = React.useState(false)

  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowSkeleton(true), delay)
      return () => clearTimeout(timer)
    } else {
      setShowSkeleton(false)
    }
  }, [isLoading, delay])

  return showSkeleton
}