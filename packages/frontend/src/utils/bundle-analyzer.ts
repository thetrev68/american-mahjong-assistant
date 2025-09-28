/**
 * Bundle Analyzer Utilities
 * Client-side bundle analysis and optimization recommendations
 */

interface BundleChunk {
  name: string
  size: number
  type: 'js' | 'css' | 'asset'
  isLazy: boolean
  dependencies?: string[]
}

interface BundleAnalysis {
  totalSize: number
  chunks: BundleChunk[]
  duplicatedDependencies: string[]
  unusedChunks: string[]
  recommendations: string[]
  compressionEstimate: number
}

export class BundleAnalyzer {
  private performanceEntries: PerformanceEntry[] = []
  private resourceSizes: Map<string, number> = new Map()
  
  constructor() {
    this.initialize()
  }

  private initialize() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      this.performanceEntries = performance.getEntriesByType('resource')
      this.calculateResourceSizes()
    }
  }

  private calculateResourceSizes() {
    this.performanceEntries.forEach(entry => {
      const resourceEntry = entry as PerformanceResourceTiming
      if (resourceEntry.transferSize) {
        this.resourceSizes.set(resourceEntry.name, resourceEntry.transferSize)
      }
    })
  }

  public async analyzeBundles(): Promise<BundleAnalysis> {
    const chunks = await this.getChunks()
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    const duplicatedDependencies = this.findDuplicatedDependencies(chunks)
    const unusedChunks = await this.findUnusedChunks(chunks)
    const recommendations = this.generateRecommendations(chunks, totalSize)
    const compressionEstimate = this.estimateCompressionSavings(totalSize)

    return {
      totalSize,
      chunks,
      duplicatedDependencies,
      unusedChunks,
      recommendations,
      compressionEstimate
    }
  }

  private async getChunks(): Promise<BundleChunk[]> {
    const chunks: BundleChunk[] = []
    
    // Analyze script tags
    const scripts = Array.from(document.querySelectorAll('script[src]'))
    for (const script of scripts) {
      const src = (script as HTMLScriptElement).src
      if (this.isAppBundle(src)) {
        const size = this.resourceSizes.get(src) || await this.estimateSize(src)
        chunks.push({
          name: this.extractChunkName(src),
          size,
          type: 'js',
          isLazy: this.isLazyChunk(src),
          dependencies: await this.extractDependencies(src)
        })
      }
    }

    // Analyze CSS files
    const styleSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    for (const sheet of styleSheets) {
      const href = (sheet as HTMLLinkElement).href
      if (this.isAppBundle(href)) {
        const size = this.resourceSizes.get(href) || await this.estimateSize(href)
        chunks.push({
          name: this.extractChunkName(href),
          size,
          type: 'css',
          isLazy: false
        })
      }
    }

    return chunks.sort((a, b) => b.size - a.size)
  }

  private isAppBundle(url: string): boolean {
    const appIndicators = [
      '/assets/',
      'localhost',
      window.location.hostname,
      'index-',
      'main-',
      'vendor-',
      'chunk-'
    ]
    return appIndicators.some(indicator => url.includes(indicator))
  }

  private extractChunkName(url: string): string {
    const parts = url.split('/')
    const filename = parts[parts.length - 1]
    return filename.replace(/\.(js|css)$/, '').replace(/\.[a-f0-9]{8,}/, '')
  }

  private isLazyChunk(url: string): boolean {
    // Heuristic: chunks with hash in name are likely lazy-loaded
    return /\.[a-f0-9]{8,}\.(js|css)$/.test(url)
  }

  private async estimateSize(url: string): Promise<number> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      const contentLength = response.headers.get('content-length')
      return contentLength ? parseInt(contentLength, 10) : 0
    } catch {
      // Fallback: estimate based on script content if accessible
      return 50000 // Default estimate: 50KB
    }
  }

  private async extractDependencies(url: string): Promise<string[]> {
    try {
      // Use heuristics to extract dependencies from bundle content
      const response = await fetch(url)
      const content = await response.text()
      
      const dependencies: Set<string> = new Set()
      
      // Look for import statements or require calls
      const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || []
      const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g) || []
      
      importMatches.forEach(match => {
        const dep = match.match(/from\s+['"]([^'"]+)['"]/)
        if (dep && dep[1] && !dep[1].startsWith('.')) {
          dependencies.add(dep[1])
        }
      })
      
      requireMatches.forEach(match => {
        const dep = match.match(/require\(['"]([^'"]+)['"]\)/)
        if (dep && dep[1] && !dep[1].startsWith('.')) {
          dependencies.add(dep[1])
        }
      })
      
      return Array.from(dependencies)
    } catch {
      return []
    }
  }

  private findDuplicatedDependencies(chunks: BundleChunk[]): string[] {
    const dependencyCounts = new Map<string, number>()
    
    chunks.forEach(chunk => {
      chunk.dependencies?.forEach(dep => {
        dependencyCounts.set(dep, (dependencyCounts.get(dep) || 0) + 1)
      })
    })
    
    return Array.from(dependencyCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([dep]) => dep)
      .sort()
  }

  private async findUnusedChunks(chunks: BundleChunk[]): Promise<string[]> {
    // This would require runtime analysis of actually executed code
    // For now, we'll identify potential candidates based on size and loading patterns
    const unusedCandidates: string[] = []
    
    chunks.forEach(chunk => {
      // Large chunks that are lazy-loaded but might not be used
      if (chunk.isLazy && chunk.size > 100000) { // 100KB+
        unusedCandidates.push(chunk.name)
      }
    })
    
    return unusedCandidates
  }

  private generateRecommendations(chunks: BundleChunk[], totalSize: number): string[] {
    const recommendations: string[] = []
    
    // Overall bundle size
    if (totalSize > 1024 * 1024) { // 1MB+
      recommendations.push('Bundle size is large (>1MB). Consider code splitting and lazy loading.')
    }
    
    // Large chunks
    const largeChunks = chunks.filter(chunk => chunk.size > 500000) // 500KB+
    if (largeChunks.length > 0) {
      recommendations.push(`Found ${largeChunks.length} large chunks (>500KB). Consider splitting: ${largeChunks.map(c => c.name).join(', ')}`)
    }
    
    // Non-lazy chunks that could be lazy
    const heavyNonLazyChunks = chunks.filter(chunk => !chunk.isLazy && chunk.size > 200000) // 200KB+
    if (heavyNonLazyChunks.length > 0) {
      recommendations.push(`Consider lazy loading: ${heavyNonLazyChunks.map(c => c.name).join(', ')}`)
    }
    
    // Vendor vs app code ratio
    const vendorChunks = chunks.filter(chunk => chunk.name.includes('vendor') || chunk.name.includes('node_modules'))
    const vendorSize = vendorChunks.reduce((sum, chunk) => sum + chunk.size, 0)
    const vendorRatio = vendorSize / totalSize
    
    if (vendorRatio > 0.7) {
      recommendations.push('Vendor code ratio is high (>70%). Review dependencies and consider tree shaking.')
    }
    
    // CSS size
    const cssChunks = chunks.filter(chunk => chunk.type === 'css')
    const cssSize = cssChunks.reduce((sum, chunk) => sum + chunk.size, 0)
    
    if (cssSize > 200000) { // 200KB+
      recommendations.push('CSS bundle is large (>200KB). Consider CSS purging and critical CSS extraction.')
    }
    
    return recommendations
  }

  private estimateCompressionSavings(totalSize: number): number {
    // Estimate potential savings from gzip compression
    // Typical compression ratios: JS ~70%, CSS ~80%
    return Math.round(totalSize * 0.25) // Estimate 25% of original size after compression
  }

  public generateOptimizationReport(): Promise<string> {
    return this.analyzeBundles().then(analysis => {
      let report = '# Bundle Analysis Report\n\n'
      
      report += `## Summary\n`
      report += `- Total bundle size: ${(analysis.totalSize / 1024).toFixed(1)} KB\n`
      report += `- Estimated compressed size: ${(analysis.compressionEstimate / 1024).toFixed(1)} KB\n`
      report += `- Number of chunks: ${analysis.chunks.length}\n`
      report += `- Duplicated dependencies: ${analysis.duplicatedDependencies.length}\n\n`
      
      report += `## Chunks by Size\n`
      analysis.chunks.slice(0, 10).forEach(chunk => {
        report += `- ${chunk.name} (${chunk.type.toUpperCase()}): ${(chunk.size / 1024).toFixed(1)} KB${chunk.isLazy ? ' [Lazy]' : ''}\n`
      })
      report += '\n'
      
      if (analysis.duplicatedDependencies.length > 0) {
        report += `## Duplicated Dependencies\n`
        analysis.duplicatedDependencies.forEach(dep => {
          report += `- ${dep}\n`
        })
        report += '\n'
      }
      
      if (analysis.recommendations.length > 0) {
        report += `## Recommendations\n`
        analysis.recommendations.forEach(rec => {
          report += `- ${rec}\n`
        })
        report += '\n'
      }
      
      return report
    }).catch(error => {
      console.error('Failed to generate optimization report:', error)
      return 'Failed to analyze bundle'
    })
  }
}

// Utility function for development
export const analyzeBundleAndLog = async (): Promise<void> => {
  const analyzer = new BundleAnalyzer()
  const analysis = await analyzer.analyzeBundles()
  
  console.group('🎯 Bundle Analysis')
  console.log('Total size:', (analysis.totalSize / 1024).toFixed(1), 'KB')
  console.log('Chunks:', analysis.chunks.length)
  console.log('Largest chunks:', analysis.chunks.slice(0, 5).map(c => `${c.name}: ${(c.size / 1024).toFixed(1)}KB`))
  
  if (analysis.recommendations.length > 0) {
    console.warn('Recommendations:')
    analysis.recommendations.forEach(rec => console.warn('•', rec))
  }
  
  console.groupEnd()
}

// Export for use in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as unknown as { analyzeBundles: () => Promise<void> }).analyzeBundles = analyzeBundleAndLog
}