#!/usr/bin/env python3
"""
Convert Excel template back to final JSON format
Converts your manually edited Excel file to the complete hands JSON
"""

import pandas as pd
import json
from collections import Counter
from typing import List, Dict, Any
from datetime import datetime

def excel_to_complete_hands(excel_file: str) -> Dict[str, Any]:
    """Convert Excel template to complete hands JSON"""
    
    print(f"Loading Excel file: {excel_file}")
    df = pd.read_excel(excel_file)
    print(f"Loaded {len(df)} rows from Excel")
    
    complete_hands = []
    
    for idx, row in df.iterrows():
        # Skip empty rows
        if pd.isna(row['hand_id']) or row['hand_id'] == '':
            continue
        
        # Extract tiles from the 14 positions
        tile_details = []
        required_tiles = []
        
        for i in range(1, 15):
            tile_id = row.get(f'tile_{i}_id', '')
            joker_allowed = bool(row.get(f'tile_{i}_joker', False))
            
            if pd.notna(tile_id) and tile_id != '':
                tile_details.append({
                    "tile_id": str(tile_id),
                    "joker_allowed": joker_allowed
                })
                required_tiles.append(str(tile_id))
        
        # Count tiles
        tile_counts = Counter(required_tiles)
        total_tiles = len(required_tiles)
        
        # Validate tile count
        if total_tiles != 14:
            print(f"Warning: Hand {row['hand_id']} has {total_tiles} tiles, expected 14")
        
        # Calculate joker summary
        joker_substitutable_count = sum(1 for detail in tile_details if detail['joker_allowed'])
        
        # Create complete hand structure
        complete_hand = {
            "hand_id": str(row['hand_id']),
            "pattern_info": {
                "pattern_key": str(row['pattern_key']),
                "display_pattern": str(row['display_pattern']),
                "description": str(row['description']),
                "points": int(row['points']) if pd.notna(row['points']) else 0,
                "difficulty": str(row['difficulty']),
                "concealed": bool(row['concealed']) if pd.notna(row['concealed']) else False
            },
            "exact_tiles": {
                "tile_details": tile_details,
                "required_tiles": required_tiles,
                "tile_counts": dict(tile_counts),
                "total_tiles": total_tiles
            },
            "joker_summary": {
                "total_joker_substitutable": joker_substitutable_count,
                "singles_and_pairs_restriction": False  # Set based on your rules
            }
        }
        
        complete_hands.append(complete_hand)
    
    # Create final structure
    final_json = {
        "metadata": {
            "year": 2025,
            "total_patterns": len(set(hand['pattern_info']['pattern_key'] for hand in complete_hands)),
            "total_complete_hands": len(complete_hands),
            "generated_date": datetime.now().strftime("%Y-%m-%d"),
            "tile_format": "standard_id",
            "source": "manual_excel_entry"
        },
        "complete_hands": complete_hands
    }
    
    return final_json

def validate_complete_hands(complete_hands_json: Dict[str, Any]) -> Dict[str, Any]:
    """Validate the converted complete hands"""
    hands = complete_hands_json['complete_hands']
    
    validation = {
        "total_hands": len(hands),
        "tile_count_errors": [],
        "duplicate_hand_ids": [],
        "patterns_represented": set(),
        "joker_stats": {
            "hands_with_jokers": 0,
            "total_joker_tiles": 0
        }
    }
    
    hand_ids_seen = set()
    
    for hand in hands:
        # Track patterns
        validation["patterns_represented"].add(hand["pattern_info"]["pattern_key"])
        
        # Check tile count
        total_tiles = hand["exact_tiles"]["total_tiles"]
        if total_tiles != 14:
            validation["tile_count_errors"].append({
                "hand_id": hand["hand_id"],
                "tile_count": total_tiles
            })
        
        # Check for duplicate IDs
        hand_id = hand["hand_id"]
        if hand_id in hand_ids_seen:
            validation["duplicate_hand_ids"].append(hand_id)
        hand_ids_seen.add(hand_id)
        
        # Joker statistics
        joker_count = hand["joker_summary"]["total_joker_substitutable"]
        if joker_count > 0:
            validation["joker_stats"]["hands_with_jokers"] += 1
            validation["joker_stats"]["total_joker_tiles"] += joker_count
    
    validation["patterns_represented"] = len(validation["patterns_represented"])
    
    return validation

def main():
    """Main execution"""
    try:
        import openpyxl
    except ImportError:
        print("Error: openpyxl is required. Install with: pip install openpyxl")
        return
    
    excel_file = "nmjl-complete-hands-template.xlsx"
    output_file = "frontend/public/intelligence/nmjl-patterns/nmjl-complete-hands-final-2025.json"
    
    try:
        # Convert Excel to JSON
        print("Converting Excel to JSON...")
        complete_hands_json = excel_to_complete_hands(excel_file)
        
        # Validate results
        print("Validating converted data...")
        validation = validate_complete_hands(complete_hands_json)
        
        # Print validation summary
        print(f"\n=== VALIDATION RESULTS ===")
        print(f"Total hands: {validation['total_hands']}")
        print(f"Patterns represented: {validation['patterns_represented']}")
        print(f"Tile count errors: {len(validation['tile_count_errors'])}")
        print(f"Duplicate hand IDs: {len(validation['duplicate_hand_ids'])}")
        print(f"Hands with jokers: {validation['joker_stats']['hands_with_jokers']}")
        print(f"Total joker-substitutable tiles: {validation['joker_stats']['total_joker_tiles']}")
        
        if validation['tile_count_errors']:
            print(f"\nTile count errors:")
            for error in validation['tile_count_errors'][:5]:
                print(f"  {error['hand_id']}: {error['tile_count']} tiles")
        
        if validation['duplicate_hand_ids']:
            print(f"\nDuplicate hand IDs:")
            for dup_id in validation['duplicate_hand_ids'][:5]:
                print(f"  {dup_id}")
        
        # Save final JSON
        with open(output_file, 'w') as f:
            json.dump(complete_hands_json, f, indent=2)
        
        print(f"\n✅ Success! Final JSON saved to: {output_file}")
        print("This file is ready for Engine 1 integration!")
        
    except FileNotFoundError as e:
        print(f"Error: Could not find Excel file: {e}")
        print("Make sure you have created the Excel template first")
    except Exception as e:
        print(f"Error converting Excel to JSON: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()