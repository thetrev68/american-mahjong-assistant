// Pattern Search and Filter Controls
// Modern filter interface for NMJL patterns

import { Button } from '../../ui-components/Button'
import { usePatternStore } from '../../stores'

export const PatternFilters = () => {
  const {
    searchQuery,
    difficultyFilter,
    pointsFilter,
    jokerFilter,
    sectionFilter,
    setSearchQuery,
    setDifficultyFilter,
    setPointsFilter,
    setJokerFilter,
    setSectionFilter,
    clearAllFilters
  } = usePatternStore()
  
  const hasActiveFilters = 
    searchQuery ||
    difficultyFilter !== 'all' ||
    pointsFilter !== 'all' ||
    jokerFilter !== 'all' ||
    sectionFilter !== 'all'
  
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-400 text-lg">🔍</span>
        </div>
        <input
          type="text"
          placeholder="Search patterns by name, description, or tiles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
      </div>
      
      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Difficulty Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Difficulty
          </label>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        
        {/* Points Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Points
          </label>
          <select
            value={pointsFilter}
            onChange={(e) => setPointsFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Points</option>
            <option value="25">25 Points</option>
            <option value="30">30 Points</option>
            <option value="35">35 Points</option>
            <option value="40">40 Points</option>
            <option value="50">50 Points</option>
          </select>
        </div>
        
        {/* Joker Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Jokers
          </label>
          <select
            value={jokerFilter}
            onChange={(e) => setJokerFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Patterns</option>
            <option value="allows">Allows Jokers</option>
            <option value="no-jokers">No Jokers</option>
          </select>
        </div>
        
        {/* Section Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Section
          </label>
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Sections</option>
            <option value="2025">2025 Section</option>
            <option value="369">369 Section</option>
            <option value="147">147 Section</option>
            <option value="258">258 Section</option>
          </select>
        </div>
      </div>
      
      {/* Active Filters & Clear */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between bg-primary/5 rounded-lg p-3 border border-primary/10">
          <div className="flex items-center gap-2 text-sm text-primary">
            <span className="font-medium">Active filters:</span>
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <span className="px-2 py-1 bg-primary/10 rounded-full text-xs">
                  Search: "{searchQuery}"
                </span>
              )}
              {difficultyFilter !== 'all' && (
                <span className="px-2 py-1 bg-primary/10 rounded-full text-xs">
                  {difficultyFilter}
                </span>
              )}
              {pointsFilter !== 'all' && (
                <span className="px-2 py-1 bg-primary/10 rounded-full text-xs">
                  {pointsFilter} pts
                </span>
              )}
              {jokerFilter !== 'all' && (
                <span className="px-2 py-1 bg-primary/10 rounded-full text-xs">
                  {jokerFilter === 'allows' ? 'Jokers OK' : 'No Jokers'}
                </span>
              )}
              {sectionFilter !== 'all' && (
                <span className="px-2 py-1 bg-primary/10 rounded-full text-xs">
                  Section {sectionFilter}
                </span>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  )
}