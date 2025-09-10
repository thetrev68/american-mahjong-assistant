// NMJL 2025 Pattern Service
// Simplified loader for the co-pilot architecture

import type { NMJL2025Pattern, PatternSelectionOption, PatternGroup, SuitRole, ConstraintType } from 'shared-types'

class NMJLService {
  private patterns: NMJL2025Pattern[] = []
  private loaded = false

  async loadPatterns(): Promise<NMJL2025Pattern[]> {
    if (this.loaded) return this.patterns

    try {
      // Load from the intelligence folder
      const response = await fetch('/intelligence/nmjl-patterns/nmjl-card-2025.json')
      if (!response.ok) {
        throw new Error(`Failed to load patterns: ${response.statusText}`)
      }

      const rawData = await response.json()
      this.patterns = this.validatePatterns(rawData)
      this.loaded = true
      
      // NMJL patterns loaded successfully
      return this.patterns
    } catch (error) {
      console.error('Error loading NMJL patterns:', error)
      return []
    }
  }

  private validatePatterns(rawData: unknown[]): NMJL2025Pattern[] {
    return rawData
      .filter((item) => this.isValidPattern(item))
      .map((item) => this.normalizePattern(item))
  }

  private isValidPattern(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') return false
    const pattern = raw as Record<string, unknown>
    
    return !!(
      pattern['Pattern ID'] &&
      pattern.Hand_Pattern &&
      pattern.Hand_Points &&
      Array.isArray(pattern.Groups) &&
      pattern.Groups.length > 0
    )
  }

  private normalizePattern(raw: unknown): NMJL2025Pattern {
    const pattern = raw as Record<string, unknown>
    
    return {
      Year: Number(pattern.Year) || 2025,
      Section: (pattern.Section && typeof pattern.Section !== 'object') ? pattern.Section as string | number : 2025, // Keep as original type (string or number)
      Line: Number(pattern.Line) || 1,
      'Pattern ID': Number(pattern['Pattern ID']),
      Hands_Key: String(pattern.Hands_Key) || `2025-${pattern.Section}-${pattern.Line}-${pattern['Pattern ID']}`,
      Hand_Pattern: String(pattern.Hand_Pattern),
      Hand_Description: String(pattern.Hand_Description) || `Pattern ${pattern['Pattern ID']}`,
      Hand_Points: Number(pattern.Hand_Points) || 25,
      Hand_Conceiled: Boolean(pattern.Hand_Conceiled),
      Hand_Difficulty: this.normalizeDifficulty(pattern.Hand_Difficulty),
      Hand_Notes: pattern.Hand_Notes ? String(pattern.Hand_Notes) : null,
      Groups: (pattern.Groups as unknown[]).map((group) => this.normalizeGroup(group))
    }
  }

  private normalizeDifficulty(difficulty: unknown): 'easy' | 'medium' | 'hard' {
    const normalized = String(difficulty || '').toLowerCase()
    if (['easy', 'medium', 'hard'].includes(normalized)) {
      return normalized as 'easy' | 'medium' | 'hard'
    }
    return 'medium'
  }

  private normalizeGroup(raw: unknown): PatternGroup {
    if (!raw || typeof raw !== 'object') {
      return {
        Group: '',
        Suit_Role: 'any',
        Suit_Note: null,
        Constraint_Type: 'pung',
        Constraint_Values: '',
        Constraint_Must_Match: null,
        Constraint_Extra: null,
        Jokers_Allowed: false,
        display_color: 'blue'
      }
    }
    const group = raw as Record<string, unknown>
    
    return {
      Group: String(group.Group || ''),
      Suit_Role: (String(group.Suit_Role || 'any')) as SuitRole,
      Suit_Note: group.Suit_Note ? String(group.Suit_Note) : null,
      Constraint_Type: (String(group.Constraint_Type || 'pung')) as ConstraintType,
      Constraint_Values: String(group.Constraint_Values || ''),
      Constraint_Must_Match: group.Constraint_Must_Match ? String(group.Constraint_Must_Match) : null,
      Constraint_Extra: group.Constraint_Extra ? String(group.Constraint_Extra) : null,
      Jokers_Allowed: Boolean(group.Jokers_Allowed),
      display_color: this.normalizeColor(group.display_color)
    }
  }

  private normalizeColor(color: unknown): 'blue' | 'red' | 'green' {
    const normalized = String(color || '').toLowerCase()
    if (['blue', 'red', 'green'].includes(normalized)) {
      return normalized as 'blue' | 'red' | 'green'
    }
    return 'blue' // Default fallback
  }

  // Public API methods

  async getAllPatterns(): Promise<NMJL2025Pattern[]> {
    await this.loadPatterns()
    return this.patterns
  }

  async getPatternById(id: number): Promise<NMJL2025Pattern | undefined> {
    await this.loadPatterns()
    return this.patterns.find(p => p['Pattern ID'] === id)
  }

  async getPatternsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Promise<NMJL2025Pattern[]> {
    await this.loadPatterns()
    return this.patterns.filter(p => p.Hand_Difficulty === difficulty)
  }

  async getPatternsByPoints(points: number): Promise<NMJL2025Pattern[]> {
    await this.loadPatterns()
    return this.patterns.filter(p => p.Hand_Points === points)
  }

  async getSelectionOptions(): Promise<PatternSelectionOption[]> {
    await this.loadPatterns()
    
    return this.patterns.map(pattern => ({
      id: pattern.Hands_Key, // Use unique Hands_Key instead of duplicate Pattern ID
      patternId: pattern['Pattern ID'], // Keep original ID for reference
      displayName: `${pattern.Section} #${pattern.Line}: ${pattern.Hand_Description.toUpperCase()}`,
      pattern: pattern.Hand_Pattern,
      points: pattern.Hand_Points,
      difficulty: pattern.Hand_Difficulty,
      description: pattern.Hand_Description,
      section: String(pattern.Section),
      line: pattern.Line, // Add line number from section
      allowsJokers: pattern.Groups.some(group => group.Jokers_Allowed),
      concealed: pattern.Hand_Conceiled, // Add concealed field
      groups: pattern.Groups // Include groups for color display
    }))
  }

  async getStats() {
    await this.loadPatterns()
    
    const pointCounts = new Map<number, number>()
    const difficultyCounts = new Map<string, number>()
    let jokerPatterns = 0

    for (const pattern of this.patterns) {
      // Count by points
      pointCounts.set(pattern.Hand_Points, (pointCounts.get(pattern.Hand_Points) || 0) + 1)
      
      // Count by difficulty
      difficultyCounts.set(pattern.Hand_Difficulty, (difficultyCounts.get(pattern.Hand_Difficulty) || 0) + 1)
      
      // Count joker patterns
      if (pattern.Groups.some(group => group.Jokers_Allowed)) {
        jokerPatterns++
      }
    }

    return {
      totalPatterns: this.patterns.length,
      pointDistribution: Object.fromEntries(pointCounts),
      difficultyDistribution: Object.fromEntries(difficultyCounts),
      jokerPatterns,
      sectionsUsed: new Set(this.patterns.map(p => p.Section)).size
    }
  }

  /**
   * Reset the service state - used for testing purposes only
   * @internal
   */
  resetForTesting(): void {
    this.loaded = false
    this.patterns = []
  }
}

export const nmjlService = new NMJLService()