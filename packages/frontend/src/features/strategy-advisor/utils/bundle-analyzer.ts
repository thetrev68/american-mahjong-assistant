import { useEffect, useState, useRef, useCallback } from 'react'

// Bundle Analyzer - Bundle size monitoring and optimization utilities
// Provides runtime bundle analysis, size tracking, and optimization recommendations

interface BundleAnalysis {
  totalSize: number // bytes
  gzippedSize: number // estimated
  modules: ModuleInfo[]
  chunks: ChunkInfo[]
  dependencies: DependencyInfo[]
  unusedCode: UnusedCodeInfo[]
  recommendations: OptimizationRecommendation[]
  sizeHistory: SizeHistoryEntry[]
}

interface ModuleInfo {
  name: string
  size: number
  gzippedSize: number
  type: 'component' | 'utility' | 'hook' | 'service' | 'external'
  isLazy: boolean
  isDynamic: boolean
  usageCount: number
  lastUsed: number
}

interface ChunkInfo {
  name: string
  size: number
  modules: string[]
  isInitial: boolean
  isAsync: boolean
  parents: string[]
  children: string[]
}

interface DependencyInfo {
  name: string
  version: string
  size: number
  treeshakable: boolean
  usedExports: string[]
  unusedExports: string[]
  alternatives: AlternativePackage[]
}

interface AlternativePackage {
  name: string
  size: number
  description: string
  compatibility: number // 0-1
}

interface UnusedCodeInfo {
  file: string
  functions: string[]
  estimatedSavings: number
  confidence: number // 0-1
}

interface OptimizationRecommendation {
  type: 'tree-shaking' | 'code-splitting' | 'compression' | 'dependency-replacement' | 'lazy-loading'
  description: string
  estimatedSavings: number // bytes
  difficulty: 'easy' | 'medium' | 'hard'
  impact: 'low' | 'medium' | 'high'
  action: string
}

interface SizeHistoryEntry {
  timestamp: number
  totalSize: number
  gzippedSize: number
  version: string
  changes: string[]
}

interface BundleConfig {
  sizeBudget: number // bytes
  gzippedBudget: number // bytes
  enableMonitoring: boolean
  enableRecommendations: boolean
  enableUnusedCodeDetection: boolean
  compressionLevel: 'none' | 'gzip' | 'brotli'
  trackHistory: boolean
}

// Default configuration
const DEFAULT_CONFIG: BundleConfig = {
  sizeBudget: 150 * 1024, // 150KB for Strategy Advisor
  gzippedBudget: 50 * 1024, // 50KB gzipped
  enableMonitoring: true,
  enableRecommendations: true,
  enableUnusedCodeDetection: true,
  compressionLevel: 'gzip',
  trackHistory: true
}

// Estimate gzipped size (rough approximation)
const estimateGzippedSize = (size: number): number => {
  // Typical gzip compression ratio for JS is 3:1 to 4:1
  return Math.round(size / 3.5)
}

// Module size estimation based on source code
const estimateModuleSize = (moduleContent: string): number => {
  // Simple estimation: character count * 2 (UTF-16) + overhead
  return moduleContent.length * 2 + 100
}

// Detect module type from path/content
const detectModuleType = (modulePath: string): ModuleInfo['type'] => {
  if (modulePath.includes('node_modules')) return 'external'
  if (modulePath.includes('/components/')) return 'component'
  if (modulePath.includes('/hooks/')) return 'hook'
  if (modulePath.includes('/services/')) return 'service'
  if (modulePath.includes('/utils/')) return 'utility'
  return 'utility'
}

// Known dependency alternatives
const DEPENDENCY_ALTERNATIVES: Record<string, AlternativePackage[]> = {
  'lodash': [
    { name: 'lodash-es', size: 24000, description: 'ES modules version with better tree-shaking', compatibility: 1.0 },
    { name: 'ramda', size: 15000, description: 'Functional utility library', compatibility: 0.8 }
  ],
  'moment': [
    { name: 'date-fns', size: 8000, description: 'Modular date utility library', compatibility: 0.9 },
    { name: 'dayjs', size: 2000, description: 'Lightweight date library', compatibility: 0.8 }
  ],
  'axios': [
    { name: 'fetch', size: 0, description: 'Native fetch API', compatibility: 0.7 },
    { name: 'ky', size: 3000, description: 'Tiny HTTP client based on fetch', compatibility: 0.8 }
  ]
}

class BundleAnalyzer {
  private config: BundleConfig
  private analysisHistory: BundleAnalysis[] = []
  private moduleRegistry: Map<string, ModuleInfo> = new Map()
  private usageTracker: Map<string, number> = new Map()

  constructor(config: Partial<BundleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeMonitoring()
  }

  private initializeMonitoring(): void {
    if (!this.config.enableMonitoring) return

    // Track module usage
    this.setupUsageTracking()

    // Track performance impact
    this.setupPerformanceTracking()

    console.log('[BundleAnalyzer] Monitoring initialized')
  }

  private setupUsageTracking(): void {
    if (typeof window === 'undefined') {
      return
    }

    // Intercept import calls to track usage (development only)
    if (process.env.NODE_ENV === 'development') {
      const originalRequire = (window as Window & { require?: (moduleName: string) => unknown }).require
      if (originalRequire) {
        (window as Window & { require: (moduleName: string) => unknown }).require = (moduleName: string) => {
          this.trackModuleUsage(moduleName)
          return originalRequire(moduleName)
        }
      }
    }
  }

  private setupPerformanceTracking(): void {
    if (typeof PerformanceObserver === 'undefined') {
      console.warn('[BundleAnalyzer] Performance tracking not supported in this environment')
      return
    }

    // Track script loading performance
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource' && entry.name.endsWith('.js')) {
          this.trackScriptLoadTime(entry.name, entry.duration)
        }
      })
    })

    try {
      observer.observe({ entryTypes: ['resource'] })
    } catch (error) {
      console.warn('[BundleAnalyzer] Performance tracking not supported:', error)
    }
  }

  private trackModuleUsage(moduleName: string): void {
    const currentUsage = this.usageTracker.get(moduleName) || 0
    this.usageTracker.set(moduleName, currentUsage + 1)

    const moduleInfo = this.moduleRegistry.get(moduleName)
    if (moduleInfo) {
      moduleInfo.usageCount = currentUsage + 1
      moduleInfo.lastUsed = Date.now()
    }
  }

  private trackScriptLoadTime(scriptUrl: string, loadTime: number): void {
    console.log(`[BundleAnalyzer] Script ${scriptUrl} loaded in ${loadTime.toFixed(2)}ms`)
  }

  // Register a module for analysis
  registerModule(name: string, content: string, isLazy: boolean = false): void {
    const size = estimateModuleSize(content)
    const gzippedSize = estimateGzippedSize(size)
    const type = detectModuleType(name)

    const moduleInfo: ModuleInfo = {
      name,
      size,
      gzippedSize,
      type,
      isLazy,
      isDynamic: content.includes('import(') || content.includes('lazy('),
      usageCount: 0,
      lastUsed: 0
    }

    this.moduleRegistry.set(name, moduleInfo)
  }

  // Analyze current bundle
  async analyzeBundleSize(): Promise<BundleAnalysis> {
    const modules = Array.from(this.moduleRegistry.values())
    const totalSize = modules.reduce((sum, mod) => sum + mod.size, 0)
    const gzippedSize = estimateGzippedSize(totalSize)

    const chunks = this.analyzeChunks(modules)
    const dependencies = this.analyzeDependencies()
    const unusedCode = this.detectUnusedCode(modules)
    const recommendations = this.generateRecommendations(modules, totalSize)

    const analysis: BundleAnalysis = {
      totalSize,
      gzippedSize,
      modules,
      chunks,
      dependencies,
      unusedCode,
      recommendations,
      sizeHistory: this.getSizeHistory()
    }

    // Track analysis history
    if (this.config.trackHistory) {
      this.analysisHistory.push(analysis)
      // Keep only last 10 analyses
      if (this.analysisHistory.length > 10) {
        this.analysisHistory.shift()
      }
    }

    return analysis
  }

  private analyzeChunks(modules: ModuleInfo[]): ChunkInfo[] {
    // Group modules into logical chunks
    const componentChunk: ChunkInfo = {
      name: 'components',
      size: 0,
      modules: [],
      isInitial: true,
      isAsync: false,
      parents: [],
      children: []
    }

    const utilityChunk: ChunkInfo = {
      name: 'utilities',
      size: 0,
      modules: [],
      isInitial: true,
      isAsync: false,
      parents: [],
      children: []
    }

    const lazyChunk: ChunkInfo = {
      name: 'lazy-loaded',
      size: 0,
      modules: [],
      isInitial: false,
      isAsync: true,
      parents: ['components'],
      children: []
    }

    modules.forEach(module => {
      if (module.isLazy) {
        lazyChunk.modules.push(module.name)
        lazyChunk.size += module.size
      } else if (module.type === 'component') {
        componentChunk.modules.push(module.name)
        componentChunk.size += module.size
      } else {
        utilityChunk.modules.push(module.name)
        utilityChunk.size += module.size
      }
    })

    return [componentChunk, utilityChunk, lazyChunk].filter(chunk => chunk.modules.length > 0)
  }

  private analyzeDependencies(): DependencyInfo[] {
    // This would normally analyze package.json and actual usage
    // For now, return mock data for Strategy Advisor dependencies
    return [
      {
        name: 'react',
        version: '18.x',
        size: 42000,
        treeshakable: false,
        usedExports: ['useState', 'useEffect', 'useCallback', 'useMemo'],
        unusedExports: [],
        alternatives: []
      },
      {
        name: 'zustand',
        version: '4.x',
        size: 12000,
        treeshakable: true,
        usedExports: ['create', 'subscribeWithSelector'],
        unusedExports: ['devtools', 'persist'],
        alternatives: [
          { name: 'jotai', size: 8000, description: 'Atomic state management', compatibility: 0.8 }
        ]
      }
    ]
  }

  private detectUnusedCode(modules: ModuleInfo[]): UnusedCodeInfo[] {
    if (!this.config.enableUnusedCodeDetection) return []

    const unusedCode: UnusedCodeInfo[] = []

    modules.forEach(module => {
      if (module.usageCount === 0 && module.lastUsed === 0) {
        unusedCode.push({
          file: module.name,
          functions: ['entire module'], // Would be more specific in real implementation
          estimatedSavings: module.size,
          confidence: 0.9
        })
      }
    })

    return unusedCode
  }

  private generateRecommendations(modules: ModuleInfo[], totalSize: number): OptimizationRecommendation[] {
    if (!this.config.enableRecommendations) return []

    const recommendations: OptimizationRecommendation[] = []

    // Size budget check
    if (totalSize > this.config.sizeBudget) {
      const overage = totalSize - this.config.sizeBudget
      recommendations.push({
        type: 'tree-shaking',
        description: `Bundle exceeds size budget by ${this.formatBytes(overage)}`,
        estimatedSavings: overage,
        difficulty: 'medium',
        impact: 'high',
        action: 'Enable tree-shaking and remove unused code'
      })
    }

    // Large modules
    const largeModules = modules.filter(mod => mod.size > 10000)
    largeModules.forEach(module => {
      recommendations.push({
        type: 'code-splitting',
        description: `Large module "${module.name}" (${this.formatBytes(module.size)})`,
        estimatedSavings: module.isLazy ? 0 : module.size * 0.3,
        difficulty: module.isLazy ? 'easy' : 'medium',
        impact: 'medium',
        action: module.isLazy ? 'Already lazy-loaded' : 'Consider lazy loading this module'
      })
    })

    // Unused modules
    const unusedModules = modules.filter(mod => mod.usageCount === 0)
    if (unusedModules.length > 0) {
      const totalUnusedSize = unusedModules.reduce((sum, mod) => sum + mod.size, 0)
      recommendations.push({
        type: 'tree-shaking',
        description: `${unusedModules.length} unused modules detected`,
        estimatedSavings: totalUnusedSize,
        difficulty: 'easy',
        impact: 'high',
        action: 'Remove unused modules from bundle'
      })
    }

    // Dependency replacements
    Object.entries(DEPENDENCY_ALTERNATIVES).forEach(([depName, alternatives]) => {
      const currentDep = this.moduleRegistry.get(depName)
      if (currentDep) {
        const bestAlternative = alternatives[0]
        if (bestAlternative.size < currentDep.size) {
          recommendations.push({
            type: 'dependency-replacement',
            description: `Replace ${depName} with ${bestAlternative.name}`,
            estimatedSavings: currentDep.size - bestAlternative.size,
            difficulty: 'medium',
            impact: 'medium',
            action: `Consider switching to ${bestAlternative.name}: ${bestAlternative.description}`
          })
        }
      }
    })

    // Compression recommendations
    if (this.config.compressionLevel === 'none') {
      recommendations.push({
        type: 'compression',
        description: 'Enable gzip compression',
        estimatedSavings: totalSize * 0.7, // ~70% size reduction
        difficulty: 'easy',
        impact: 'high',
        action: 'Enable gzip or brotli compression on your server'
      })
    }

    return recommendations.sort((a, b) => b.estimatedSavings - a.estimatedSavings)
  }

  private getSizeHistory(): SizeHistoryEntry[] {
    return this.analysisHistory.map(analysis => ({
      timestamp: Date.now(),
      totalSize: analysis.totalSize,
      gzippedSize: analysis.gzippedSize,
      version: '1.0.0', // Would be from package.json
      changes: [] // Would track actual changes
    }))
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Generate comprehensive bundle report
  async generateReport(): Promise<string> {
    const analysis = await this.analyzeBundleSize()

    const report = [
      '=== Bundle Analysis Report ===',
      '',
      'Size Overview:',
      `- Total Size: ${this.formatBytes(analysis.totalSize)}`,
      `- Gzipped Size: ${this.formatBytes(analysis.gzippedSize)}`,
      `- Size Budget: ${this.formatBytes(this.config.sizeBudget)}`,
      `- Budget Status: ${analysis.totalSize > this.config.sizeBudget ? '❌ EXCEEDED' : '✅ Within budget'}`,
      '',
      'Module Breakdown:',
      ...analysis.modules
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map(mod => `- ${mod.name}: ${this.formatBytes(mod.size)} (${mod.type})`),
      '',
      'Chunk Analysis:',
      ...analysis.chunks.map(chunk =>
        `- ${chunk.name}: ${this.formatBytes(chunk.size)} (${chunk.modules.length} modules)`
      ),
      '',
      'Unused Code:',
      ...analysis.unusedCode.map(unused =>
        `- ${unused.file}: ${this.formatBytes(unused.estimatedSavings)} potential savings`
      ),
      '',
      'Recommendations:',
      ...analysis.recommendations.slice(0, 5).map(rec =>
        `- [${rec.impact.toUpperCase()}] ${rec.description} (saves ${this.formatBytes(rec.estimatedSavings)})`
      ),
      '',
      'Dependencies:',
      ...analysis.dependencies.map(dep =>
        `- ${dep.name}@${dep.version}: ${this.formatBytes(dep.size)}`
      )
    ].join('\n')

    return report
  }

  // Check if bundle meets performance budgets
  checkPerformanceBudgets(): {
    sizeBudgetMet: boolean
    gzippedBudgetMet: boolean
    recommendations: string[]
  } {
    const analysis = this.analysisHistory[this.analysisHistory.length - 1]
    if (!analysis) {
      return {
        sizeBudgetMet: true,
        gzippedBudgetMet: true,
        recommendations: ['Run bundle analysis first']
      }
    }

    const sizeBudgetMet = analysis.totalSize <= this.config.sizeBudget
    const gzippedBudgetMet = analysis.gzippedSize <= this.config.gzippedBudget

    const recommendations: string[] = []

    if (!sizeBudgetMet) {
      const overage = analysis.totalSize - this.config.sizeBudget
      recommendations.push(`Reduce bundle size by ${this.formatBytes(overage)}`)
    }

    if (!gzippedBudgetMet) {
      const overage = analysis.gzippedSize - this.config.gzippedBudget
      recommendations.push(`Reduce gzipped size by ${this.formatBytes(overage)}`)
    }

    return {
      sizeBudgetMet,
      gzippedBudgetMet,
      recommendations
    }
  }

  // Export analysis data
  exportAnalysis(): string {
    const latestAnalysis = this.analysisHistory[this.analysisHistory.length - 1]
    if (!latestAnalysis) return '{}'
    return JSON.stringify(latestAnalysis, null, 2)
  }
}

// React Hook for bundle analysis
export const useBundleAnalysis = (config: Partial<BundleConfig> = {}) => {
  const analyzerRef = useRef<BundleAnalyzer | null>(null)
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const registerModule = useCallback(
    (name: string, content: string, isLazy: boolean = false) => {
      analyzerRef.current?.registerModule(name, content, isLazy)
    },
    []
  )

  useEffect(() => {
    analyzerRef.current = new BundleAnalyzer(config)
  }, [config])

  const runAnalysis = useCallback(async () => {
    if (!analyzerRef.current) return

    setIsAnalyzing(true)
    try {
      const result = await analyzerRef.current.analyzeBundleSize()
      setAnalysis(result)
    } catch (error) {
      console.error('[BundleAnalyzer] Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const generateReport = useCallback(async () => {
    if (!analyzerRef.current) return ''
    return analyzerRef.current.generateReport()
  }, [])

  const checkBudgets = useCallback(() => {
    if (!analyzerRef.current) return null
    return analyzerRef.current.checkPerformanceBudgets()
  }, [])

  return {
    analysis,
    isAnalyzing,
    runAnalysis,
    generateReport,
    checkBudgets,
    registerModule
  }
}

export {
  BundleAnalyzer,
  type BundleAnalysis,
  type ModuleInfo,
  type OptimizationRecommendation,
  type BundleConfig
}

export default BundleAnalyzer