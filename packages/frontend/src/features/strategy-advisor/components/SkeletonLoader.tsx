// SkeletonLoader - Smooth skeleton loading screens for Strategy Advisor components
// Provides realistic loading placeholders with 60fps shimmer animations

import React from 'react'

// Simple className utility for merging classes
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

interface SkeletonProps {
  className?: string
  animate?: boolean
  children?: React.ReactNode
}

interface SkeletonLoaderProps {
  variant: 'message' | 'pattern' | 'recommendation' | 'carousel' | 'panel' | 'list'
  count?: number
  className?: string
  animate?: boolean
  respectsReducedMotion?: boolean
}

// Base skeleton component with shimmer effect
const Skeleton: React.FC<SkeletonProps> = ({
  className,
  animate = true,
  children
}) => {
  const prefersReducedMotion = React.useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200',
        'dark:from-slate-700 dark:via-slate-600 dark:to-slate-700',
        animate && !prefersReducedMotion && 'animate-pulse',
        className
      )}
      style={{
        backgroundSize: animate && !prefersReducedMotion ? '200% 100%' : '100% 100%',
        animation: animate && !prefersReducedMotion
          ? 'shimmer 2s ease-in-out infinite, pulse 2s ease-in-out infinite'
          : 'none'
      }}
    >
      {children}
      {animate && !prefersReducedMotion && (
        <style jsx>{`
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
        `}</style>
      )}
    </div>
  )
}

// Strategy message skeleton
const MessageSkeleton: React.FC<{ animate?: boolean }> = ({ animate = true }) => (
  <div className="space-y-3 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
    {/* Header with urgency indicator */}
    <div className="flex items-center space-x-3">
      <Skeleton
        className="w-3 h-3 rounded-full"
        animate={animate}
      />
      <Skeleton
        className="h-5 w-24 rounded"
        animate={animate}
      />
      <div className="flex-1" />
      <Skeleton
        className="w-6 h-6 rounded"
        animate={animate}
      />
    </div>

    {/* Message content */}
    <div className="space-y-2">
      <Skeleton
        className="h-4 w-full rounded"
        animate={animate}
      />
      <Skeleton
        className="h-4 w-5/6 rounded"
        animate={animate}
      />
      <Skeleton
        className="h-4 w-3/4 rounded"
        animate={animate}
      />
    </div>

    {/* Action area */}
    <div className="flex items-center space-x-2 pt-2">
      <Skeleton
        className="h-8 w-20 rounded-md"
        animate={animate}
      />
      <Skeleton
        className="h-8 w-16 rounded-md"
        animate={animate}
      />
    </div>
  </div>
)

// Pattern card skeleton
const PatternSkeleton: React.FC<{ animate?: boolean }> = ({ animate = true }) => (
  <div className="space-y-3 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
    {/* Pattern header */}
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <Skeleton
          className="h-5 w-32 rounded"
          animate={animate}
        />
        <Skeleton
          className="h-3 w-24 rounded"
          animate={animate}
        />
      </div>
      <Skeleton
        className="w-12 h-6 rounded-full"
        animate={animate}
      />
    </div>

    {/* Pattern tiles visualization */}
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 14 }).map((_, i) => (
        <Skeleton
          key={i}
          className="w-6 h-8 rounded"
          animate={animate}
        />
      ))}
    </div>

    {/* Pattern details */}
    <div className="space-y-2">
      <Skeleton
        className="h-3 w-full rounded"
        animate={animate}
      />
      <Skeleton
        className="h-3 w-4/5 rounded"
        animate={animate}
      />
    </div>

    {/* Action buttons */}
    <div className="flex items-center space-x-2">
      <Skeleton
        className="h-8 w-24 rounded-md"
        animate={animate}
      />
      <Skeleton
        className="h-8 w-20 rounded-md"
        animate={animate}
      />
    </div>
  </div>
)

// Recommendation card skeleton
const RecommendationSkeleton: React.FC<{ animate?: boolean }> = ({ animate = true }) => (
  <div className="space-y-3 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
    {/* Recommendation header */}
    <div className="flex items-center space-x-3">
      <Skeleton
        className="w-8 h-8 rounded-full"
        animate={animate}
      />
      <div className="flex-1 space-y-1">
        <Skeleton
          className="h-5 w-40 rounded"
          animate={animate}
        />
        <Skeleton
          className="h-3 w-28 rounded"
          animate={animate}
        />
      </div>
      <Skeleton
        className="w-16 h-6 rounded-full"
        animate={animate}
      />
    </div>

    {/* Recommendation content */}
    <div className="space-y-2">
      <Skeleton
        className="h-4 w-full rounded"
        animate={animate}
      />
      <Skeleton
        className="h-4 w-11/12 rounded"
        animate={animate}
      />
      <Skeleton
        className="h-4 w-4/5 rounded"
        animate={animate}
      />
    </div>

    {/* Impact metrics */}
    <div className="grid grid-cols-3 gap-3 pt-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="text-center space-y-1">
          <Skeleton
            className="h-6 w-12 rounded mx-auto"
            animate={animate}
          />
          <Skeleton
            className="h-3 w-16 rounded mx-auto"
            animate={animate}
          />
        </div>
      ))}
    </div>
  </div>
)

// Carousel skeleton
const CarouselSkeleton: React.FC<{ animate?: boolean }> = ({ animate = true }) => (
  <div className="space-y-4">
    {/* Carousel header */}
    <div className="flex items-center justify-between px-4">
      <Skeleton
        className="h-6 w-32 rounded"
        animate={animate}
      />
      <div className="flex space-x-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-2 h-2 rounded-full"
            animate={animate}
          />
        ))}
      </div>
    </div>

    {/* Carousel content */}
    <div className="flex space-x-4 px-4 overflow-hidden">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-72">
          <PatternSkeleton animate={animate} />
        </div>
      ))}
    </div>

    {/* Carousel navigation */}
    <div className="flex justify-center space-x-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton
          key={i}
          className="w-8 h-2 rounded-full"
          animate={animate}
        />
      ))}
    </div>
  </div>
)

// Panel skeleton (for details/advanced modes)
const PanelSkeleton: React.FC<{ animate?: boolean }> = ({ animate = true }) => (
  <div className="space-y-6 p-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
    {/* Panel header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton
          className="h-7 w-48 rounded"
          animate={animate}
        />
        <Skeleton
          className="h-4 w-64 rounded"
          animate={animate}
        />
      </div>
      <Skeleton
        className="w-24 h-8 rounded-md"
        animate={animate}
      />
    </div>

    {/* Content sections */}
    {Array.from({ length: 3 }).map((_, sectionIndex) => (
      <div key={sectionIndex} className="space-y-3">
        <Skeleton
          className="h-5 w-36 rounded"
          animate={animate}
        />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, lineIndex) => (
            <Skeleton
              key={lineIndex}
              className={cn(
                'h-4 rounded',
                lineIndex === 0 ? 'w-full' : lineIndex === 1 ? 'w-5/6' : 'w-3/4'
              )}
              animate={animate}
            />
          ))}
        </div>
      </div>
    ))}

    {/* Action area */}
    <div className="flex items-center space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
      <Skeleton
        className="h-10 w-28 rounded-md"
        animate={animate}
      />
      <Skeleton
        className="h-10 w-24 rounded-md"
        animate={animate}
      />
      <div className="flex-1" />
      <Skeleton
        className="h-10 w-20 rounded-md"
        animate={animate}
      />
    </div>
  </div>
)

// List skeleton (for multiple items)
const ListSkeleton: React.FC<{ count?: number; animate?: boolean }> = ({
  count = 3,
  animate = true
}) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
      >
        <Skeleton
          className="w-10 h-10 rounded-full"
          animate={animate}
        />
        <div className="flex-1 space-y-2">
          <Skeleton
            className="h-4 w-3/4 rounded"
            animate={animate}
          />
          <Skeleton
            className="h-3 w-1/2 rounded"
            animate={animate}
          />
        </div>
        <Skeleton
          className="w-16 h-6 rounded-full"
          animate={animate}
        />
      </div>
    ))}
  </div>
)

// Main SkeletonLoader component
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant,
  count = 1,
  className,
  animate = true,
  respectsReducedMotion = true
}) => {
  const shouldAnimate = animate && !(
    respectsReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const renderSkeleton = () => {
    switch (variant) {
      case 'message':
        return count === 1 ? (
          <MessageSkeleton animate={shouldAnimate} />
        ) : (
          <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
              <MessageSkeleton key={i} animate={shouldAnimate} />
            ))}
          </div>
        )

      case 'pattern':
        return count === 1 ? (
          <PatternSkeleton animate={shouldAnimate} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
              <PatternSkeleton key={i} animate={shouldAnimate} />
            ))}
          </div>
        )

      case 'recommendation':
        return count === 1 ? (
          <RecommendationSkeleton animate={shouldAnimate} />
        ) : (
          <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
              <RecommendationSkeleton key={i} animate={shouldAnimate} />
            ))}
          </div>
        )

      case 'carousel':
        return <CarouselSkeleton animate={shouldAnimate} />

      case 'panel':
        return <PanelSkeleton animate={shouldAnimate} />

      case 'list':
        return <ListSkeleton count={count} animate={shouldAnimate} />

      default:
        return <MessageSkeleton animate={shouldAnimate} />
    }
  }

  return (
    <div className={cn('skeleton-loader', className)} role="status" aria-label="Loading...">
      {renderSkeleton()}
    </div>
  )
}

// Convenience components for specific use cases
export const MessageSkeleton_ = React.memo(() => (
  <SkeletonLoader variant="message" />
))

export const PatternSkeleton_ = React.memo(() => (
  <SkeletonLoader variant="pattern" />
))

export const RecommendationSkeleton_ = React.memo(() => (
  <SkeletonLoader variant="recommendation" />
))

export const CarouselSkeleton_ = React.memo(() => (
  <SkeletonLoader variant="carousel" />
))

export const PanelSkeleton_ = React.memo(() => (
  <SkeletonLoader variant="panel" />
))

export const ListSkeleton_ = React.memo<{ count?: number }>(({ count }) => (
  <SkeletonLoader variant="list" count={count} />
))

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

  return (
    <div className={className}>
      {isLoading && showSkeleton ? skeleton : children}
    </div>
  )
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

export default SkeletonLoader