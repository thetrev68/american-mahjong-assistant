// Pattern Variation Loader Service
// Loads and caches the 1,002 NMJL pattern variations from JSON files
// Provides fast lookup and filtering for the intelligence engines

export interface PatternVariation {
  year: number
  section: string
  line: number
  patternId: number
  handKey: string
  handPattern: string
  handCriteria: string
  handPoints: number
  handConcealed: boolean
  sequence: number
  tiles: string[]        // ["1B", "1B", "2B", ...] - 14 tiles
  jokers: boolean[]      // [false, false, true, ...] - 14 positions
}

export interface PatternIndex {
  byPattern: { [patternId: string]: PatternVariation[] }
  bySection: { [section: string]: PatternVariation[] }
  statistics: {
    totalVariations: number
    uniquePatterns: number
    uniqueSections: number
    patternCounts: { [patternId: string]: number }
    sectionCounts: { [section: string]: number }
  }
}

export class PatternVariationLoader {
  private static variations: PatternVariation[] = []
  private static index: PatternIndex | null = null
  private static isLoaded = false
  private static loadPromise: Promise<void> | null = null

  /**
   * Load all pattern variations and create indexes
   * Returns cached data after first load
   */
  static async loadVariations(): Promise<void> {
    if (this.isLoaded) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = this._performLoad()
    await this.loadPromise
  }

  private static async _performLoad(): Promise<void> {
    try {
      const startTime = performance.now()

      // Load variations and index in parallel
      const [variationsResponse, indexResponse] = await Promise.all([
        fetch('/intelligence/nmjl-patterns/pattern-variations.json'),
        fetch('/intelligence/nmjl-patterns/pattern-index.json')
      ])

      if (!variationsResponse.ok) {
        throw new Error(`Failed to load variations: ${variationsResponse.status}`)
      }
      if (!indexResponse.ok) {
        throw new Error(`Failed to load index: ${indexResponse.status}`)
      }

      const [variations, index] = await Promise.all([
        variationsResponse.json(),
        indexResponse.json()
      ])

      this.variations = variations
      this.index = index
      this.isLoaded = true

      const loadTime = performance.now() - startTime
      // Pattern variations loaded successfully

    } catch (error) {
      console.error('Failed to load pattern variations:', error)
      throw new Error('Could not load pattern variation data')
    }
  }

  /**
   * Get all variations for a specific pattern
   */
  static async getPatternVariations(patternId: string): Promise<PatternVariation[]> {
    await this.loadVariations()
    return this.index?.byPattern[patternId] || []
  }

  /**
   * Get all variations for a specific section
   */
  static async getSectionVariations(section: string): Promise<PatternVariation[]> {
    await this.loadVariations()
    return this.index?.bySection[section] || []
  }

  /**
   * Get all loaded variations
   */
  static async getAllVariations(): Promise<PatternVariation[]> {
    await this.loadVariations()
    return this.variations
  }

  /**
   * Get a specific variation by handKey and sequence
   */
  static async getVariation(handKey: string, sequence: number): Promise<PatternVariation | null> {
    await this.loadVariations()
    return this.variations.find(v => 
      v.handKey === handKey && v.sequence === sequence
    ) || null
  }

  /**
   * Filter variations by multiple criteria
   */
  static async filterVariations(criteria: {
    sections?: string[]
    patterns?: string[]
    minPoints?: number
    maxPoints?: number
    concealed?: boolean
  }): Promise<PatternVariation[]> {
    await this.loadVariations()

    return this.variations.filter(variation => {
      if (criteria.sections && !criteria.sections.includes(variation.section)) return false
      if (criteria.patterns && !criteria.patterns.includes(variation.handKey)) return false
      if (criteria.minPoints && variation.handPoints < criteria.minPoints) return false
      if (criteria.maxPoints && variation.handPoints > criteria.maxPoints) return false
      if (criteria.concealed !== undefined && variation.handConcealed !== criteria.concealed) return false
      return true
    })
  }

  /**
   * Get loading statistics
   */
  static getStatistics(): PatternIndex['statistics'] | null {
    return this.index?.statistics || null
  }

  /**
   * Check if data is loaded
   */
  static isDataLoaded(): boolean {
    return this.isLoaded
  }

  /**
   * Force reload data (for development/testing)
   */
  static async reload(): Promise<void> {
    this.isLoaded = false
    this.loadPromise = null
    this.variations = []
    this.index = null
    await this.loadVariations()
  }

  /**
   * Count tiles in a tile array (utility method)
   */
  static countTiles(tiles: string[]): { [tileId: string]: number } {
    const counts: { [tileId: string]: number } = {}
    for (const tile of tiles) {
      counts[tile] = (counts[tile] || 0) + 1
    }
    return counts
  }

  /**
   * Get unique tile IDs from variations (utility method)
   */
  static async getUniqueTileIds(): Promise<string[]> {
    await this.loadVariations()
    const uniqueTiles = new Set<string>()
    
    for (const variation of this.variations) {
      for (const tile of variation.tiles) {
        uniqueTiles.add(tile)
      }
    }
    
    return Array.from(uniqueTiles).sort()
  }
}