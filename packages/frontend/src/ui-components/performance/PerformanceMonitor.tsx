/**
 * Performance Monitor Dashboard
 * Real-time performance monitoring and optimization insights
 */

import React, { useState, useEffect } from 'react'
import { Card } from '../Card'
import { Button } from '../Button'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'

interface PerformanceMonitorProps {
  showDetails?: boolean
  autoStart?: boolean
  position?: 'fixed' | 'inline'
  className?: string
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDetails = false,
  autoStart = false,
  position = 'inline',
  className = ''
}) => {
  const {
    metrics,
    componentMetrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getRecommendations,
    exportMetrics
  } = usePerformanceMonitor()

  const [isExpanded, setIsExpanded] = useState(showDetails)
  const [recommendations, setRecommendations] = useState<string[]>([])

  // Auto-start monitoring if requested
  useEffect(() => {
    if (autoStart && !isMonitoring) {
      startMonitoring()
    }
  }, [autoStart, isMonitoring, startMonitoring])

  // Update recommendations when metrics change
  useEffect(() => {
    const newRecommendations = getRecommendations()
    setRecommendations(newRecommendations)
  }, [metrics, componentMetrics, getRecommendations])

  // Performance score calculation
  const calculateScore = (): number => {
    let score = 100
    
    if (metrics.loadTime && metrics.loadTime > 3000) score -= 20
    if (metrics.bundleSize && metrics.bundleSize > 1000) score -= 15
    if (metrics.fps && metrics.fps < 30) score -= 20
    if (metrics.memoryUsage && metrics.memoryUsage > 50) score -= 15
    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) score -= 15
    if (metrics.firstInputDelay && metrics.firstInputDelay > 100) score -= 10
    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) score -= 5
    
    return Math.max(0, score)
  }

  const score = calculateScore()

  // Get score color and label
  const getScoreInfo = (score: number) => {
    if (score >= 90) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Excellent' }
    if (score >= 70) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Good' }
    if (score >= 50) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Fair' }
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'Poor' }
  }

  const scoreInfo = getScoreInfo(score)

  // Format metric values
  const formatMetric = (key: string, value: number): string => {
    switch (key) {
      case 'loadTime':
      case 'largestContentfulPaint':
      case 'firstInputDelay':
        return `${Math.round(value)}ms`
      case 'bundleSize':
        return `${Math.round(value)}KB`
      case 'memoryUsage':
        return `${Math.round(value)}MB`
      case 'fps':
        return `${Math.round(value)}fps`
      case 'cumulativeLayoutShift':
        return value.toFixed(3)
      default:
        return value.toString()
    }
  }

  // Compact view
  if (!isExpanded) {
    return (
      <div className={`
        ${position === 'fixed' ? 'fixed bottom-4 right-4 z-50' : 'inline-block'}
        ${className}
      `}>
        <Card className={`
          p-3 cursor-pointer transition-all duration-200
          ${scoreInfo.bg} border-l-4 ${scoreInfo.color.replace('text-', 'border-')}
          hover:shadow-lg
        `}
        onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">Performance</span>
            </div>
            
            <div className={`text-lg font-bold ${scoreInfo.color}`}>
              {score}
            </div>
            
            {recommendations.length > 0 && (
              <div className="text-yellow-500">
                ⚠️ {recommendations.length}
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // Detailed view
  return (
    <div className={`
      ${position === 'fixed' ? 'fixed top-4 right-4 z-50 w-96' : 'w-full'}
      ${className}
    `}>
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-bold text-gray-900">Performance Monitor</h3>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${scoreInfo.bg} ${scoreInfo.color}`}>
              {score} - {scoreInfo.label}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={isMonitoring ? 'secondary' : 'primary'}
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
            >
              {isMonitoring ? 'Stop' : 'Start'}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Core Web Vitals */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Core Web Vitals</h4>
          <div className="grid grid-cols-1 gap-3">
            {[
              { key: 'largestContentfulPaint', label: 'LCP', target: '<2.5s' },
              { key: 'firstInputDelay', label: 'FID', target: '<100ms' },
              { key: 'cumulativeLayoutShift', label: 'CLS', target: '<0.1' }
            ].map(({ key, label, target }) => {
              const value = metrics[key as keyof typeof metrics]
              const isGood = key === 'largestContentfulPaint' ? (value || 0) < 2500 :
                           key === 'firstInputDelay' ? (value || 0) < 100 :
                           (value || 0) < 0.1
              
              return (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs text-gray-500 ml-2">{target}</span>
                  </div>
                  <div className={`text-sm font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                    {value !== undefined ? formatMetric(key, value) : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance Metrics</h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(metrics)
              .filter(([key]) => !['largestContentfulPaint', 'firstInputDelay', 'cumulativeLayoutShift'].includes(key))
              .map(([key, value]) => (
                <div key={key} className="flex flex-col p-2 bg-gray-50 rounded">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm font-medium mt-1">
                    {formatMetric(key, value as number)}
                  </span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Component Performance */}
        {componentMetrics.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Component Performance</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {componentMetrics
                .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
                .slice(0, 5)
                .map((component) => (
                  <div key={component.name} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <span className="font-medium truncate">{component.name}</span>
                    <div className="flex space-x-3 text-right">
                      <span>{component.renderCount}x</span>
                      <span className={
                        component.averageRenderTime > 16 ? 'text-red-600' : 
                        component.averageRenderTime > 8 ? 'text-yellow-600' : 'text-green-600'
                      }>
                        {component.averageRenderTime.toFixed(1)}ms
                      </span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Recommendations ({recommendations.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <span className="text-yellow-600">⚠️</span>
                  <span className="text-yellow-800">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={exportMetrics}
            className="flex-1"
          >
            Export Data
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.location.reload()}
            className="flex-1"
          >
            Reload Page
          </Button>
        </div>
      </Card>
    </div>
  )
}
