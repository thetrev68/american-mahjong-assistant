// Connection Resilience Testing Hook
// React hook for easy integration testing of connection resilience features

import { useState, useCallback } from 'react'
import { runConnectionResilienceTests, runConnectionResilienceTestCategory } from '../lib/services/connection-resilience-test-suite'
import type { TestSuiteResult, TestResult } from '../lib/services/connection-resilience-test-suite'

export interface TestStatus {
  isRunning: boolean
  lastResults: TestSuiteResult | null
  categoryResults: Record<string, TestResult[]>
  error: string | null
}

export function useConnectionResilienceTest() {
  const [testStatus, setTestStatus] = useState<TestStatus>({
    isRunning: false,
    lastResults: null,
    categoryResults: {},
    error: null
  })

  // Run full test suite
  const runFullTestSuite = useCallback(async (): Promise<TestSuiteResult> => {
    setTestStatus(prev => ({ 
      ...prev, 
      isRunning: true, 
      error: null 
    }))

    try {
      console.log('🧪 Starting full connection resilience test suite...')
      const results = await runConnectionResilienceTests()
      
      setTestStatus(prev => ({
        ...prev,
        isRunning: false,
        lastResults: results,
        error: null
      }))

      // Log summary to console
      console.log('✅ Test suite completed:', results.summary)
      
      if (results.failed > 0) {
        console.warn(`⚠️ ${results.failed} tests failed`)
        results.tests
          .filter(t => !t.passed)
          .forEach(test => console.error(`❌ ${test.testName}: ${test.error}`))
      }

      return results
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      setTestStatus(prev => ({
        ...prev,
        isRunning: false,
        error: errorMessage
      }))

      console.error('❌ Test suite failed:', errorMessage)
      throw error
    }
  }, [])

  // Run specific test category
  const runTestCategory = useCallback(async (
    category: 'basic' | 'resilience' | 'queue' | 'integration'
  ): Promise<TestResult[]> => {
    setTestStatus(prev => ({ 
      ...prev, 
      isRunning: true, 
      error: null 
    }))

    try {
      console.log(`🧪 Running ${category} tests...`)
      const results = await runConnectionResilienceTestCategory(category)
      
      setTestStatus(prev => ({
        ...prev,
        isRunning: false,
        categoryResults: {
          ...prev.categoryResults,
          [category]: results
        },
        error: null
      }))

      const passed = results.filter(t => t.passed).length
      const total = results.length
      console.log(`✅ ${category} tests completed: ${passed}/${total} passed`)

      if (passed < total) {
        results
          .filter(t => !t.passed)
          .forEach(test => console.error(`❌ ${test.testName}: ${test.error}`))
      }

      return results
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      setTestStatus(prev => ({
        ...prev,
        isRunning: false,
        error: errorMessage
      }))

      console.error(`❌ ${category} tests failed:`, errorMessage)
      throw error
    }
  }, [])

  // Get test results for display
  const getTestResults = useCallback(() => {
    return {
      fullSuite: testStatus.lastResults,
      categories: testStatus.categoryResults
    }
  }, [testStatus])

  // Check if any tests have been run
  const hasResults = useCallback(() => {
    return testStatus.lastResults !== null || Object.keys(testStatus.categoryResults).length > 0
  }, [testStatus])

  // Get overall test health
  const getTestHealth = useCallback((): 'healthy' | 'warning' | 'error' | 'unknown' => {
    if (testStatus.error) {
      return 'error'
    }

    if (!hasResults()) {
      return 'unknown'
    }

    if (testStatus.lastResults) {
      if (testStatus.lastResults.failed === 0) {
        return 'healthy'
      } else if (testStatus.lastResults.failed < testStatus.lastResults.passed) {
        return 'warning'
      } else {
        return 'error'
      }
    }

    // Check category results
    const allCategoryResults = Object.values(testStatus.categoryResults).flat()
    const totalFailed = allCategoryResults.filter(t => !t.passed).length
    const totalPassed = allCategoryResults.filter(t => t.passed).length

    if (totalFailed === 0) {
      return 'healthy'
    } else if (totalFailed < totalPassed) {
      return 'warning'
    } else {
      return 'error'
    }
  }, [testStatus, hasResults])

  // Clear test results
  const clearResults = useCallback(() => {
    setTestStatus({
      isRunning: false,
      lastResults: null,
      categoryResults: {},
      error: null
    })
  }, [])

  // Quick validation test (runs basic tests only)
  const runQuickValidation = useCallback(async (): Promise<boolean> => {
    try {
      const results = await runTestCategory('basic')
      return results.every(test => test.passed)
    } catch (error) {
      console.error('Quick validation failed:', error)
      return false
    }
  }, [runTestCategory])

  return {
    // State
    isRunning: testStatus.isRunning,
    error: testStatus.error,
    hasResults: hasResults(),
    testHealth: getTestHealth(),

    // Actions
    runFullTestSuite,
    runTestCategory,
    runQuickValidation,
    clearResults,

    // Data
    getTestResults,
    lastResults: testStatus.lastResults,
    categoryResults: testStatus.categoryResults
  }
}

// Helper functions for creating test UI components
export const createConnectionResilienceTestPanelConfig = () => {
  return {
    getHealthColor: (health: string) => {
      switch (health) {
        case 'healthy': return 'text-green-600'
        case 'warning': return 'text-yellow-600'
        case 'error': return 'text-red-600'
        default: return 'text-gray-600'
      }
    },
    
    getHealthEmoji: (health: string) => {
      switch (health) {
        case 'healthy': return '✅'
        case 'warning': return '⚠️'
        case 'error': return '❌'
        default: return '❓'
      }
    },
    
    buttonConfigs: [
      { key: 'quick', label: 'Quick Check', bg: 'bg-green-500', action: 'runQuickValidation' },
      { key: 'basic', label: 'Basic Tests', bg: 'bg-blue-500', action: 'runTestCategory', param: 'basic' },
      { key: 'resilience', label: 'Resilience Tests', bg: 'bg-purple-500', action: 'runTestCategory', param: 'resilience' },
      { key: 'queue', label: 'Queue Tests', bg: 'bg-orange-500', action: 'runTestCategory', param: 'queue' },
      { key: 'full', label: 'Full Suite', bg: 'bg-red-500', action: 'runFullTestSuite' },
      { key: 'clear', label: 'Clear', bg: 'bg-gray-500', action: 'clearResults' }
    ]
  }
}