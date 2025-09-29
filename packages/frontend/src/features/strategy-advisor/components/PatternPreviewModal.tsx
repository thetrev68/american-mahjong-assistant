// Pattern Preview Modal - "What happens if I switch?" preview with impact analysis
// Provides clear switch impact visualization with mobile-optimized design

import React, { useMemo, useCallback } from 'react'
import { Card } from '../../../ui-components/Card'
import { Button } from '../../../ui-components/Button'
import { LoadingSpinner } from '../../../ui-components/LoadingSpinner'
import { PatternPriorityIndicator } from './PatternPriorityIndicator'
import type {
  PatternPreviewModalProps,
  PatternSwitchPreview
} from '../types/strategy-advisor.types'

/**
 * Modal for previewing pattern switch impact before committing
 * Mobile-first design with clear action hierarchy
 */
export const PatternPreviewModal: React.FC<PatternPreviewModalProps> = ({
  isOpen,
  onClose,
  previewData,
  onConfirmSwitch,
  onCancel,
  className = ''
}) => {
  // Don't render if not open
  if (!isOpen) return null

  // Handle loading state
  if (!previewData) {
    return <PreviewLoadingState onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className={`
        w-full max-w-md mx-auto
        ${className}
      `}>
        <Card variant="elevated" className="bg-white">
          <PreviewContent
            previewData={previewData}
            onConfirmSwitch={onConfirmSwitch}
            onCancel={onCancel}
            onClose={onClose}
          />
        </Card>
      </div>
    </div>
  )
}

// Loading state component
const PreviewLoadingState: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
    <div className="w-full max-w-md mx-auto">
      <Card variant="elevated" className="bg-white p-6">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Analyzing Switch Impact...
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Calculating what happens if you switch patterns
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="mt-4"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  </div>
)

// Main preview content
const PreviewContent: React.FC<{
  previewData: PatternSwitchPreview
  onConfirmSwitch: () => Promise<void>
  onCancel: () => void
  onClose: () => void
}> = ({ previewData, onConfirmSwitch, onCancel, onClose }) => {
  const [isConfirming, setIsConfirming] = React.useState(false)

  // Handle confirm with loading state
  const handleConfirm = useCallback(async () => {
    setIsConfirming(true)
    try {
      await onConfirmSwitch()
      onClose()
    } catch (error) {
      console.error('Pattern switch failed:', error)
    } finally {
      setIsConfirming(false)
    }
  }, [onConfirmSwitch, onClose])

  // Cancel action
  const handleCancel = useCallback(() => {
    onCancel()
    onClose()
  }, [onCancel, onClose])

  // Recommendation styling
  const recommendationConfig = useMemo(() => {
    switch (previewData.recommendation) {
      case 'strongly_recommend':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: '🚀',
          title: 'Strongly Recommended'
        }
      case 'recommend':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: '👍',
          title: 'Recommended'
        }
      case 'neutral':
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: '⚖️',
          title: 'Neutral Switch'
        }
      case 'caution':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: '⚠️',
          title: 'Use Caution'
        }
      case 'avoid':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: '❌',
          title: 'Not Recommended'
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: '❓',
          title: 'Unknown'
        }
    }
  }, [previewData.recommendation])

  // Impact analysis formatting
  const impactItems = useMemo(() => [
    {
      label: 'Completion Probability',
      value: previewData.impactAnalysis.probabilityChange,
      format: (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(1)}%`,
      positive: previewData.impactAnalysis.probabilityChange > 0
    },
    {
      label: 'Risk Level',
      value: previewData.impactAnalysis.riskChange,
      format: (val: number) => val > 0 ? `+${val}% risk` : val < 0 ? `${val}% risk` : 'No change',
      positive: previewData.impactAnalysis.riskChange < 0 // Lower risk is better
    },
    {
      label: 'Tiles Needed',
      value: previewData.impactAnalysis.tilesNeededChange,
      format: (val: number) => val > 0 ? `+${val} more` : val < 0 ? `${-val} fewer` : 'Same',
      positive: previewData.impactAnalysis.tilesNeededChange <= 0
    },
    {
      label: 'Time to Complete',
      value: previewData.impactAnalysis.timeToCompletionChange,
      format: (val: number) => val > 0 ? `+${val} turns` : val < 0 ? `${-val} turns` : 'Same',
      positive: previewData.impactAnalysis.timeToCompletionChange <= 0
    }
  ], [previewData.impactAnalysis])

  // Button configuration based on recommendation
  const buttonConfig = useMemo(() => {
    switch (previewData.recommendation) {
      case 'strongly_recommend':
        return {
          confirmText: 'Switch Now!',
          confirmVariant: 'primary' as const,
          cancelText: 'Keep Current'
        }
      case 'recommend':
        return {
          confirmText: 'Make Switch',
          confirmVariant: 'primary' as const,
          cancelText: 'Stay Current'
        }
      case 'neutral':
        return {
          confirmText: 'Switch Anyway',
          confirmVariant: 'outline' as const,
          cancelText: 'Keep Current'
        }
      case 'caution':
        return {
          confirmText: 'Switch (Risky)',
          confirmVariant: 'outline' as const,
          cancelText: 'Stay Safe'
        }
      case 'avoid':
        return {
          confirmText: 'Force Switch',
          confirmVariant: 'outline' as const,
          cancelText: 'Stay Current'
        }
      default:
        return {
          confirmText: 'Switch',
          confirmVariant: 'outline' as const,
          cancelText: 'Cancel'
        }
    }
  }, [previewData.recommendation])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Switch Preview
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
          aria-label="Close preview"
        >
          ✕
        </button>
      </div>

      {/* Pattern Comparison */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Pattern Comparison</h3>

        {/* From Pattern */}
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500">Current:</span>
              <div className="font-medium text-gray-900">
                {previewData.fromPattern.name}
              </div>
            </div>
            <PatternPriorityIndicator
              priority={previewData.fromPattern.priority}
              completionPercentage={previewData.fromPattern.completionPercentage}
              urgencyLevel="medium"
              size="sm"
              animated={false}
            />
          </div>
        </div>

        {/* Arrow */}
        <div className="text-center text-gray-400 text-lg mb-3">
          ↓
        </div>

        {/* To Pattern */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-600">Switching to:</span>
              <div className="font-medium text-gray-900">
                {previewData.toPattern.name}
              </div>
            </div>
            <PatternPriorityIndicator
              priority={previewData.toPattern.priority}
              completionPercentage={previewData.toPattern.expectedCompletion}
              urgencyLevel="medium"
              size="sm"
              animated={false}
            />
          </div>
        </div>
      </div>

      {/* Impact Analysis */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Impact Analysis</h3>
        <div className="space-y-2">
          {impactItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{item.label}:</span>
              <span className={`text-sm font-medium ${
                item.positive ? 'text-green-600' : 'text-red-600'
              }`}>
                {item.format(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className={`
        mb-6 p-4 rounded-lg border
        ${recommendationConfig.bg}
        ${recommendationConfig.border}
      `}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{recommendationConfig.icon}</span>
          <span className={`font-semibold ${recommendationConfig.text}`}>
            {recommendationConfig.title}
          </span>
        </div>
        <p className={`text-sm ${recommendationConfig.text}`}>
          {previewData.reasoning}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant={buttonConfig.confirmVariant}
          size="md"
          onClick={handleConfirm}
          disabled={isConfirming}
          className="flex-1"
        >
          {isConfirming ? (
            <>
              <LoadingSpinner size="sm" color="white" />
              Switching...
            </>
          ) : (
            buttonConfig.confirmText
          )}
        </Button>

        <Button
          variant="outline"
          size="md"
          onClick={handleCancel}
          disabled={isConfirming}
          className="flex-1"
        >
          {buttonConfig.cancelText}
        </Button>
      </div>

      {/* Keyboard hint */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Press Escape to close • Enter to confirm
        </p>
      </div>
    </div>
  )
}

// Note: usePreviewModalKeyboard moved to ../utils/pattern-preview-modal.utils.ts for React Fast Refresh compatibility
// Import from there: import { usePreviewModalKeyboard } from '../utils/pattern-preview-modal.utils'