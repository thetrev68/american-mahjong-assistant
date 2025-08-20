// Convert NMJL CSV files to optimized JSON format
// Run with: node scripts/convert-csv-to-json.js

const fs = require('fs')
const path = require('path')

const CSV_DIR = path.join(__dirname, '../frontend/public/intelligence/nmjl-patterns')
const OUTPUT_DIR = CSV_DIR

function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim()).filter(h => h.length > 0)
  const data = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const values = []
    let current = ''
    let inQuotes = false
    
    // Handle quoted CSV values properly
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim()) // Add the last value
    
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    if (Object.values(row).some(val => val.length > 0)) {
      data.push(row)
    }
  }
  
  return data
}

function convertPatternGroups() {
  console.log('Converting pattern_groups_all.csv...')
  
  const csvPath = path.join(CSV_DIR, 'pattern_groups_all.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rawData = parseCSV(csvContent)
  
  // Group by hand_key for better organization
  const groupedData = {}
  
  rawData.forEach(row => {
    const handKey = row.hand_key
    if (!groupedData[handKey]) {
      groupedData[handKey] = {
        handKey: handKey,
        groups: []
      }
    }
    
    groupedData[handKey].groups.push({
      group: row.group,
      displayColor: row.display_color,
      suitRole: row.suit_role,
      suiteNote: row.suite_note,
      constraintType: row.constraint_type,
      constraintValues: row.constraint_values,
      constraintMustMatch: row.constraint_must_match,
      constraintExtra: row.constraint_extra,
      jokersAllowed: row.jokers_allowed === 'TRUE'
    })
  })
  
  // Convert to array format
  const patterns = Object.values(groupedData)
  
  const outputPath = path.join(OUTPUT_DIR, 'pattern-groups.json')
  fs.writeFileSync(outputPath, JSON.stringify(patterns, null, 2))
  
  console.log(`✓ Created pattern-groups.json with ${patterns.length} patterns`)
  return patterns.length
}

function convertPatternVariations() {
  console.log('Converting pattern_variations_all.csv...')
  
  const csvPath = path.join(CSV_DIR, 'pattern_variations_all.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rawData = parseCSV(csvContent)
  
  const variations = rawData.map(row => {
    // Extract the 14 tiles as compact arrays
    const tileIds = []
    const jokerFlags = []
    
    for (let i = 1; i <= 14; i++) {
      const tileId = row[`tile_${i}_id`]
      const jokerFlag = row[`tile_${i}_joker`]
      
      if (tileId && tileId.length > 0) {
        tileIds.push(tileId)
        jokerFlags.push(jokerFlag === 'yes')
      }
    }
    
    // Only include if we have all 14 tiles
    if (tileIds.length !== 14) return null
    
    return {
      year: parseInt(row.year) || 2025,
      section: row.section,
      line: parseInt(row.line) || 1,
      patternId: parseInt(row.pattern_id) || 1,
      handKey: row.hand_key,
      handPattern: row.hand_pattern,
      handCriteria: row.hand_criteria,
      handPoints: parseInt(row.hand_points) || 25,
      handConcealed: row.hand_conceiled === 'TRUE',
      sequence: parseInt(row.sequence) || 1,
      // Compact array format - much smaller file size
      tiles: tileIds,          // ["1B", "1B", "2B", "3B", ...]
      jokers: jokerFlags       // [false, false, true, false, ...]
    }
  }).filter(variation => variation !== null) // Remove incomplete hands
  
  const outputPath = path.join(OUTPUT_DIR, 'pattern-variations.json')
  fs.writeFileSync(outputPath, JSON.stringify(variations, null, 2))
  
  console.log(`✓ Created pattern-variations.json with ${variations.length} complete variations`)
  
  // Calculate file size reduction
  const stats = fs.statSync(outputPath)
  const fileSizeKB = Math.round(stats.size / 1024)
  console.log(`  File size: ${fileSizeKB}KB (compact array format)`)
  
  return variations.length
}

function createPatternIndex() {
  console.log('Creating pattern index...')
  
  // Load the variations to create indexes
  const variationsPath = path.join(OUTPUT_DIR, 'pattern-variations.json')
  const variations = JSON.parse(fs.readFileSync(variationsPath, 'utf-8'))
  
  // Create index by pattern
  const byPattern = {}
  const bySection = {}
  const statistics = {
    totalVariations: variations.length,
    patterns: new Set(),
    sections: new Set(),
    patternCounts: {},
    sectionCounts: {}
  }
  
  variations.forEach(variation => {
    const { handKey, section } = variation
    
    // Index by pattern
    if (!byPattern[handKey]) {
      byPattern[handKey] = []
    }
    byPattern[handKey].push(variation)
    
    // Index by section
    if (!bySection[section]) {
      bySection[section] = []
    }
    bySection[section].push(variation)
    
    // Update statistics
    statistics.patterns.add(handKey)
    statistics.sections.add(section)
    statistics.patternCounts[handKey] = (statistics.patternCounts[handKey] || 0) + 1
    statistics.sectionCounts[section] = (statistics.sectionCounts[section] || 0) + 1
  })
  
  const index = {
    byPattern,
    bySection,
    statistics: {
      totalVariations: statistics.totalVariations,
      uniquePatterns: statistics.patterns.size,
      uniqueSections: statistics.sections.size,
      patternCounts: statistics.patternCounts,
      sectionCounts: statistics.sectionCounts
    }
  }
  
  const outputPath = path.join(OUTPUT_DIR, 'pattern-index.json')
  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2))
  
  console.log(`✓ Created pattern-index.json`)
  console.log(`  - ${index.statistics.uniquePatterns} unique patterns`)
  console.log(`  - ${index.statistics.uniqueSections} sections`)
  console.log(`  - ${index.statistics.totalVariations} total variations`)
  
  return index.statistics
}

function validateData() {
  console.log('\nValidating converted data...')
  
  try {
    // Load and validate each file
    const groupsPath = path.join(OUTPUT_DIR, 'pattern-groups.json')
    const variationsPath = path.join(OUTPUT_DIR, 'pattern-variations.json')
    const indexPath = path.join(OUTPUT_DIR, 'pattern-index.json')
    
    const groups = JSON.parse(fs.readFileSync(groupsPath, 'utf-8'))
    const variations = JSON.parse(fs.readFileSync(variationsPath, 'utf-8'))
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    
    console.log(`✓ pattern-groups.json: ${groups.length} patterns loaded`)
    console.log(`✓ pattern-variations.json: ${variations.length} variations loaded`)
    console.log(`✓ pattern-index.json: ${index.statistics.totalVariations} indexed variations`)
    
    // Sample validation - check a few variations
    const sampleVariation = variations[0]
    console.log(`\nSample variation (${sampleVariation.handKey}):`)
    console.log(`  Pattern: ${sampleVariation.handPattern}`)
    console.log(`  Tiles: ${sampleVariation.tiles.join(', ')}`)
    console.log(`  Joker positions: ${sampleVariation.jokers.map((canUse, i) => canUse ? i+1 : null).filter(p => p !== null).join(', ')}`)
    
    // Check for specific pattern
    const consecutiveRun7 = variations.find(v => 
      v.handKey.includes('CONSECUTIVE_RUN-7') || 
      v.handPattern.includes('112345')
    )
    
    if (consecutiveRun7) {
      console.log(`\nFound CONSECUTIVE RUN #7 pattern:`)
      console.log(`  Key: ${consecutiveRun7.handKey}`)
      console.log(`  Pattern: ${consecutiveRun7.handPattern}`)
      console.log(`  Tiles: ${consecutiveRun7.tiles.join(', ')}`)
      console.log(`  Joker flags: ${consecutiveRun7.jokers.join(', ')}`)
    }
    
    return true
  } catch (error) {
    console.error('Validation failed:', error.message)
    return false
  }
}

function main() {
  console.log('🔄 Converting NMJL CSV files to JSON format...\n')
  
  try {
    // Check if CSV files exist
    const groupsCsv = path.join(CSV_DIR, 'pattern_groups_all.csv')
    const variationsCsv = path.join(CSV_DIR, 'pattern_variations_all.csv')
    
    if (!fs.existsSync(groupsCsv)) {
      throw new Error(`File not found: ${groupsCsv}`)
    }
    
    if (!fs.existsSync(variationsCsv)) {
      throw new Error(`File not found: ${variationsCsv}`)
    }
    
    // Convert files
    const groupCount = convertPatternGroups()
    const variationCount = convertPatternVariations()
    const indexStats = createPatternIndex()
    
    // Validate results
    const isValid = validateData()
    
    if (isValid) {
      console.log('\n🎉 Conversion completed successfully!')
      console.log(`\nFiles created:`)
      console.log(`  - pattern-groups.json (${groupCount} patterns)`)
      console.log(`  - pattern-variations.json (${variationCount} variations)`)
      console.log(`  - pattern-index.json (indexing ${indexStats.totalVariations} variations)`)
      
      console.log('\n📋 Ready to delete CSV files and update intelligence engine!')
    } else {
      console.log('\n❌ Conversion failed validation')
    }
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}