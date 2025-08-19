#!/usr/bin/env python3
"""
Convert your Excel template to final compact JSON format
Matches your column structure: year, section, line, pattern_id, etc.
"""

import pandas as pd
import json
from collections import Counter
from typing import List, Dict, Any
from datetime import datetime

def excel_to_complete_hands(excel_file: str) -> Dict[str, Any]:
    """Convert your Excel template to complete hands JSON"""
    
    print(f"Loading Excel file: {excel_file}")
    df = pd.read_excel(excel_file)
    print(f"Loaded {len(df)} rows from Excel")
    
    complete_hands = []
    
    for idx, row in df.iterrows():
        # Skip empty rows
        if pd.isna(row['hand_key']) or row['hand_key'] == '':
            continue
        
        # Extract tiles from the 14 positions
        tiles = []
        joker_flags = []
        
        for i in range(1, 15):
            tile_id = row.get(f'tile_{i}_id', '')
            joker_allowed = bool(row.get(f'tile_{i}_joker', False))
            
            if pd.notna(tile_id) and tile_id != '':
                tiles.append(str(tile_id))
                joker_flags.append(joker_allowed)
        
        # Validate tile count
        if len(tiles) != 14:
            print(f"Warning: Hand {row['hand_key']} sequence {row.get('sequence', '')} has {len(tiles)} tiles, expected 14")
            continue
        
        # Create compact hand structure
        complete_hand = {
            "year": int(row['year']) if pd.notna(row['year']) else 2025,
            "section": str(row['section']),
            "line": int(row['line']) if pd.notna(row['line']) else 1,
            "pattern_id": int(row['pattern_id']) if pd.notna(row['pattern_id']) else 1,
            "hand_key": str(row['hand_key']),
            "hand_pattern": str(row['hand_pattern']),
            "hand_criteria": str(row['hand_criteria']),
            "hand_points": int(row['hand_points']) if pd.notna(row['hand_points']) else 0,
            "hand_conceiled": bool(row['hand_conceiled']) if pd.notna(row['hand_conceiled']) else False,
            "sequence": int(row['sequence']) if pd.notna(row['sequence']) else 1,
            "tiles": tiles,
            "jokers": joker_flags
        }
        
        complete_hands.append(complete_hand)
    
    # Create final structure with metadata
    sections = {}
    for hand in complete_hands:
        section = hand['section']
        if section not in sections:
            sections[section] = 0
        sections[section] += 1
    
    final_json = {
        "metadata": {
            "year": 2025,
            "total_hands": len(complete_hands),
            "sections": sections,
            "generated_date": datetime.now().strftime("%Y-%m-%d"),
            "tile_format": "standard_id",
            "source": "manual_excel_entry"
        },
        "complete_hands": complete_hands
    }
    
    return final_json

def validate_hands(complete_hands_json: Dict[str, Any]) -> Dict[str, Any]:
    """Validate the converted hands"""
    hands = complete_hands_json['complete_hands']
    
    validation = {
        "total_hands": len(hands),
        "tile_count_errors": [],
        "duplicate_keys": [],
        "section_counts": {},
        "joker_stats": {
            "hands_with_jokers": 0,
            "total_joker_positions": 0
        }
    }
    
    keys_seen = {}
    
    for hand in hands:
        # Check for duplicate keys + sequence
        hand_identifier = f"{hand['hand_key']}-{hand['sequence']}"
        if hand_identifier in keys_seen:
            validation["duplicate_keys"].append(hand_identifier)
        keys_seen[hand_identifier] = True
        
        # Count by section
        section = hand['section']
        validation["section_counts"][section] = validation["section_counts"].get(section, 0) + 1
        
        # Tile validation
        if len(hand['tiles']) != 14:
            validation["tile_count_errors"].append({
                "hand": hand_identifier,
                "tile_count": len(hand['tiles'])
            })
        
        # Joker statistics
        joker_count = sum(hand['jokers'])
        if joker_count > 0:
            validation["joker_stats"]["hands_with_jokers"] += 1
            validation["joker_stats"]["total_joker_positions"] += joker_count
    
    return validation

def main():
    """Main execution"""
    try:
        import openpyxl
    except ImportError:
        print("Error: openpyxl is required. Install with: pip install openpyxl")
        return
    
    # Your Excel file name
    excel_file = "nmjl-complete-hands-final.xlsx"  # Update this to your file name
    output_file = "frontend/public/intelligence/nmjl-patterns/nmjl-complete-hands-2025-final.json"
    
    try:
        # Convert Excel to JSON
        print("Converting Excel to JSON...")
        complete_hands_json = excel_to_complete_hands(excel_file)
        
        # Validate results
        print("Validating converted data...")
        validation = validate_hands(complete_hands_json)
        
        # Print validation summary
        print(f"\n=== VALIDATION RESULTS ===")
        print(f"Total hands: {validation['total_hands']}")
        print(f"Tile count errors: {len(validation['tile_count_errors'])}")
        print(f"Duplicate keys: {len(validation['duplicate_keys'])}")
        print(f"Hands with jokers: {validation['joker_stats']['hands_with_jokers']}")
        
        print(f"\nSection breakdown:")
        for section, count in sorted(validation['section_counts'].items()):
            print(f"  {section}: {count} hands")
        
        if validation['tile_count_errors']:
            print(f"\nTile count errors:")
            for error in validation['tile_count_errors'][:10]:
                print(f"  {error['hand']}: {error['tile_count']} tiles")
        
        if validation['duplicate_keys']:
            print(f"\nDuplicate hand keys:")
            for dup_key in validation['duplicate_keys'][:10]:
                print(f"  {dup_key}")
        
        # Save compact JSON (no pretty printing for smaller file)
        with open(output_file, 'w') as f:
            json.dump(complete_hands_json, f, separators=(',', ':'))  # Compact format
        
        print(f"\nSuccess! Final JSON saved to: {output_file}")
        
        # Check file size
        import os
        file_size_mb = os.path.getsize(output_file) / (1024 * 1024)
        print(f"File size: {file_size_mb:.2f} MB")
        
        if file_size_mb > 5:
            print("Warning: File is quite large, consider optimization")
        else:
            print("File size looks good for web performance!")
            
    except FileNotFoundError as e:
        print(f"Error: Could not find Excel file: {excel_file}")
        print("Make sure the file exists and update the excel_file variable")
    except Exception as e:
        print(f"Error converting Excel to JSON: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()