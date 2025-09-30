// LoadingStates - Branded loading animations and shimmer effects for Strategy Advisor
// Provides delightful loading experiences with 60fps performance and accessibility

import React from 'react'

// Simple className utility for merging classes
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

interface LoadingStatesProps {
  variant: 'analyzing' | 'patterns' | 'recommendations' | 'switching'
  progress?: number // 0-100 for progress-based loading
  className?: string
  compact?: boolean
  respectsReducedMotion?: boolean
}

interface ShimmerProps {
  className?: string
  children?: React.ReactNode
  respectsReducedMotion?: boolean
}

// Shimmer effect component for skeleton loading
const Shimmer: React.FC<ShimmerProps> = ({
  className,
  children,
  respectsReducedMotion = true
}) => {
  const prefersReducedMotion = respectsReducedMotion &&
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Create keyframes animation using CSS-in-JS
  React.useEffect(() => {
    if (!prefersReducedMotion) {
      const style = document.createElement('style')
      style.textContent = `
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `
      document.head.appendChild(style)

      return () => {
        document.head.removeChild(style)
      }
    }
  }, [prefersReducedMotion])

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200',
        'dark:from-slate-700 dark:via-slate-600 dark:to-slate-700',
        className
      )}
      style={{
        backgroundSize: '200% 100%',
        animation: prefersReducedMotion
          ? 'none'
          : 'shimmer 2s ease-in-out infinite'
      }}
    >
      {children}
    </div>
  )
}

// Progress dots animation
const ProgressDots: React.FC<{
  count: number
  activeIndex: number
  respectsReducedMotion?: boolean
}> = ({ count, activeIndex, respectsReducedMotion = true }) => {
  const prefersReducedMotion = respectsReducedMotion &&
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="flex items-center space-x-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-300',
            index <= activeIndex
              ? 'bg-purple-500 scale-110'
              : 'bg-slate-300 dark:bg-slate-600'
          )}
          style={{
            animationDelay: prefersReducedMotion ? '0s' : `${index * 100}ms`,
            animation: prefersReducedMotion || index > activeIndex
              ? 'none'
              : 'pulse 1.5s ease-in-out infinite'
          }}
        />
      ))}
    </div>
  )
}

// Analyzing hand loading state
const AnalyzingState: React.FC<{
  compact?: boolean
  respectsReducedMotion?: boolean
}> = ({ compact, respectsReducedMotion }) => {
  const [currentStep, setCurrentStep] = React.useState(0)

  const steps = [
    'Analyzing hand composition...',
    'Evaluating pattern possibilities...',
    'Calculating win probabilities...',
    'Generating recommendations...'
  ]

  React.useEffect(() => {
    if (respectsReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % steps.length)
    }, 1200)

    return () => clearInterval(interval)
  }, [respectsReducedMotion, steps.length])

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-600 dark:text-slate-300">
          Analyzing...
        </span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
          Analyzing Hand
        </h3>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {steps[currentStep]}
        </div>

        <div className="space-y-2">
          <Shimmer className="h-4 rounded" respectsReducedMotion={respectsReducedMotion} />
          <Shimmer className="h-4 w-3/4 rounded" respectsReducedMotion={respectsReducedMotion} />
          <Shimmer className="h-4 w-1/2 rounded" respectsReducedMotion={respectsReducedMotion} />
        </div>

        <ProgressDots
          count={4}
          activeIndex={currentStep}
          respectsReducedMotion={respectsReducedMotion}
        />
      </div>
    </div>
  )
}

// Loading patterns state
const PatternsState: React.FC<{
  progress?: number
  compact?: boolean
  respectsReducedMotion?: boolean
}> = ({ progress = 0, compact, respectsReducedMotion }) => {
  const [loadedPatterns, setLoadedPatterns] = React.useState(0)
  const totalPatterns = 5

  React.useEffect(() => {
    if (respectsReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLoadedPatterns(totalPatterns)
      return
    }

    const interval = setInterval(() => {
      setLoadedPatterns(prev => {
        if (prev >= totalPatterns) return 0
        return prev + 1
      })
    }, 800)

    return () => clearInterval(interval)
  }, [respectsReducedMotion, totalPatterns])

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <ProgressDots
          count={totalPatterns}
          activeIndex={loadedPatterns}
          respectsReducedMotion={respectsReducedMotion}
        />
        <span className="text-sm text-slate-600 dark:text-slate-300">
          Loading patterns...
        </span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
          Loading Patterns
        </h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {loadedPatterns} of {totalPatterns}
        </span>
      </div>

      <div className="space-y-3">
        {Array.from({ length: totalPatterns }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center space-x-3 p-3 rounded-lg transition-all duration-300',
              index < loadedPatterns
                ? 'bg-purple-50 dark:bg-purple-900/20'
                : 'bg-slate-50 dark:bg-slate-800'
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded border-2 transition-all duration-300',
              index < loadedPatterns
                ? 'bg-purple-500 border-purple-500'
                : 'border-slate-300 dark:border-slate-600'
            )} />

            {index < loadedPatterns ? (
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Pattern {index + 1} loaded
              </span>
            ) : (
              <Shimmer
                className="h-4 w-32 rounded"
                respectsReducedMotion={respectsReducedMotion}
              />
            )}
          </div>
        ))}

        {progress > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Recommendations loading state
const RecommendationsState: React.FC<{
  compact?: boolean
  respectsReducedMotion?: boolean
}> = ({ compact, respectsReducedMotion }) => {
  const [pulseIndex, setPulseIndex] = React.useState(0)
  const recommendations = 3

  React.useEffect(() => {
    if (respectsReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const interval = setInterval(() => {
      setPulseIndex(prev => (prev + 1) % recommendations)
    }, 600)

    return () => clearInterval(interval)
  }, [respectsReducedMotion, recommendations])

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex space-x-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                i === pulseIndex ? 'bg-purple-500 scale-125' : 'bg-slate-300 dark:bg-slate-600'
              )}
            />
          ))}
        </div>
        <span className="text-sm text-slate-600 dark:text-slate-300">
          Generating recommendations...
        </span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
        Generating Recommendations
      </h3>

      <div className="space-y-3">
        {Array.from({ length: recommendations }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'p-4 rounded-lg border transition-all duration-300',
              index === pulseIndex
                ? 'border-purple-300 bg-purple-50 dark:border-purple-600 dark:bg-purple-900/20 scale-[1.02]'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
            )}
          >
            <div className="space-y-2">
              <Shimmer
                className="h-5 w-3/4 rounded"
                respectsReducedMotion={respectsReducedMotion}
              />
              <Shimmer
                className="h-3 w-full rounded"
                respectsReducedMotion={respectsReducedMotion}
              />
              <Shimmer
                className="h-3 w-5/6 rounded"
                respectsReducedMotion={respectsReducedMotion}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Strategy mode switching state
const SwitchingState: React.FC<{
  compact?: boolean
  respectsReducedMotion?: boolean
}> = ({ compact, respectsReducedMotion }) => {
  const prefersReducedMotion = respectsReducedMotion &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className={cn(
          'w-4 h-4 border-2 border-purple-500 rounded-sm',
          prefersReducedMotion ? '' : 'animate-pulse'
        )} />
        <span className="text-sm text-slate-600 dark:text-slate-300">
          Switching mode...
        </span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="text-center space-y-3">
        <div className={cn(
          'w-12 h-12 border-3 border-purple-500 rounded-lg mx-auto',
          prefersReducedMotion ? '' : 'animate-pulse'
        )} />
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
          Switching Strategy Mode
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Adapting interface for optimal experience...
        </p>
      </div>
    </div>
  )
}

// Main LoadingStates component
export const LoadingStates: React.FC<LoadingStatesProps> = ({
  variant,
  progress,
  className,
  compact = false,
  respectsReducedMotion = true
}) => {
  const renderContent = () => {
    switch (variant) {
      case 'analyzing':
        return (
          <AnalyzingState
            compact={compact}
            respectsReducedMotion={respectsReducedMotion}
          />
        )
      case 'patterns':
        return (
          <PatternsState
            progress={progress}
            compact={compact}
            respectsReducedMotion={respectsReducedMotion}
          />
        )
      case 'recommendations':
        return (
          <RecommendationsState
            compact={compact}
            respectsReducedMotion={respectsReducedMotion}
          />
        )
      case 'switching':
        return (
          <SwitchingState
            compact={compact}
            respectsReducedMotion={respectsReducedMotion}
          />
        )
      default:
        return (
          <AnalyzingState
            compact={compact}
            respectsReducedMotion={respectsReducedMotion}
          />
        )
    }
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-lg',
        compact ? 'p-3' : 'border border-slate-200 dark:border-slate-700',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${variant}`}
    >
      {renderContent()}
    </div>
  )
}

// Convenience components for specific loading states
export const AnalyzingLoader: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <LoadingStates variant="analyzing" compact={compact} />
)

export const PatternsLoader: React.FC<{ progress?: number; compact?: boolean }> = ({
  progress,
  compact
}) => (
  <LoadingStates variant="patterns" progress={progress} compact={compact} />
)

export const RecommendationsLoader: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <LoadingStates variant="recommendations" compact={compact} />
)

export const SwitchingLoader: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <LoadingStates variant="switching" compact={compact} />
)

export default LoadingStates