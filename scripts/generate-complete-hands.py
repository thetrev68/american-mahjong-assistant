#!/usr/bin/env python3
"""
NMJL Complete Hands Generator
Generates all 1,002+ complete hands from the 71 NMJL 2025 patterns
Creates exact tile lists for zero-calculation pattern analysis
"""

import json
import itertools
from collections import defaultdict, Counter
from typing import List, Dict, Set, Any, Tuple

# Standard tile format (matching frontend/shared/tile-utils.ts)
SUITS = {
    'dots': 'D',
    'bams': 'B', 
    'cracks': 'C'  # Note: tile-utils has 'cracks' but some files use 'craks'
}

NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
WINDS = ['east', 'south', 'west', 'north']  
DRAGONS = ['red', 'green', 'white']
FLOWERS = ['f1', 'f2', 'f3', 'f4']
JOKER = 'joker'

def load_original_patterns(file_path: str) -> List[Dict]:
    """Load the original 71 NMJL patterns"""
    with open(file_path, 'r') as f:
        return json.load(f)

def generate_number_tiles(suit_letter: str) -> List[str]:
    """Generate tiles for a suit: ['1D', '2D', ..., '9D']"""
    return [f"{num}{suit_letter}" for num in NUMBERS]

def expand_constraint_values(constraint_values, suit_assignment: str = None) -> List[str]:
    """
    Expand constraint values to actual tile IDs
    
    Examples:
    - "flower" → ['f1', 'f2', 'f3', 'f4'] 
    - "2,5" with suit="dots" → ['2D', '5D']
    - "2,0,2,5" with suit="dots" → ['2D', 'white', '2D', '5D'] (0 = white dragon)
    - 2025 (int) → ['2', '0', '2', '5'] for processing
    """
    # Convert to string if it's an integer or other type
    if constraint_values is None:
        return []
    
    constraint_str = str(constraint_values)
    
    if constraint_str == "flower":
        return FLOWERS.copy()
    
    if constraint_str in ["wind", "winds"]:
        return WINDS.copy()
        
    if constraint_str in ["dragon", "dragons"]:
        return DRAGONS.copy()
    
    if not constraint_str or constraint_str == "any":
        return []
    
    # Handle special case where constraint_values is just a number like 2025
    if constraint_str.isdigit() and len(constraint_str) > 1:
        # Split each digit: 2025 → ['2', '0', '2', '5']
        values = list(constraint_str)
    elif ',' in constraint_str:
        # Handle comma-separated values like "2,5" or "2,0,2,5"
        values = [v.strip() for v in constraint_str.split(',')]
    else:
        # Single value
        values = [constraint_str]
    tiles = []
    
    for value in values:
        if value == '0':
            # 0 represents white dragon in sequences like "2025"
            tiles.append('white')
        elif value in WINDS:
            tiles.append(value)
        elif value in DRAGONS:
            tiles.append(value) 
        elif value.isdigit() and suit_assignment:
            # Number tile with assigned suit
            suit_letter = SUITS.get(suit_assignment, 'D')
            tiles.append(f"{value}{suit_letter}")
        elif value.isdigit():
            # Number without suit - need to handle during suit assignment
            tiles.append(value)
        else:
            # Unknown constraint - flag for manual review
            tiles.append(f"UNKNOWN:{value}")
    
    return tiles

def generate_suit_combinations(groups: List[Dict]) -> List[Dict[str, str]]:
    """
    Generate all valid suit assignments for groups that need them
    
    Returns list of assignment dictionaries like:
    [{"group1": "dots", "group2": "bams"}, {"group1": "bams", "group2": "dots"}, ...]
    """
    # Find groups that need suit assignments
    suit_roles = {}
    for group in groups:
        role = group.get('Suit_Role', 'none')
        if role in ['any', 'second', 'third']:
            suit_roles[group['Group']] = role
        elif role.startswith('same_as:'):
            # Handle same_as references later
            suit_roles[group['Group']] = role
    
    if not suit_roles:
        return [{}]  # No suit assignments needed
    
    # Count unique suit roles needed
    unique_roles = set(role for role in suit_roles.values() if role in ['any', 'second', 'third'])
    num_suits_needed = len(unique_roles)
    
    if num_suits_needed == 0:
        return [{}]
    elif num_suits_needed > 3:
        # More suits than available - flag for manual review  
        return [{"ERROR": f"Too many suits needed: {num_suits_needed}"}]
    
    # Generate all permutations of available suits
    available_suits = list(SUITS.keys())
    suit_combinations = list(itertools.permutations(available_suits, num_suits_needed))
    
    assignments = []
    for combo in suit_combinations:
        assignment = {}
        role_to_suit = dict(zip(sorted(unique_roles), combo))
        
        for group_name, role in suit_roles.items():
            if role in role_to_suit:
                assignment[group_name] = role_to_suit[role]
            elif role.startswith('same_as:'):
                # Handle same_as references
                ref_group = role.split(':')[1]
                if ref_group in assignment:
                    assignment[group_name] = assignment[ref_group]
                else:
                    assignment[group_name] = "UNRESOLVED_REFERENCE"
        
        assignments.append(assignment)
    
    return assignments

def generate_exact_tiles_for_group(group: Dict, suit_assignment: Dict[str, str], value_assignment: Dict[str, str] = None) -> Tuple[List[str], bool]:
    """
    Generate exact tile list for a single group
    
    Returns: (tile_list, success_flag)
    """
    group_name = group['Group']
    constraint_type = group['Constraint_Type']
    constraint_values = group['Constraint_Values']
    
    # Get suit assignment for this group
    assigned_suit = suit_assignment.get(group_name)
    
    # Handle different constraint types
    if constraint_type == 'single':
        # Single tile
        base_tiles = expand_constraint_values_with_assignment(constraint_values, assigned_suit, value_assignment)
        exact_tiles = base_tiles[:1] if base_tiles else ["UNKNOWN_SINGLE"]
        
    elif constraint_type == 'pair':
        # Two identical tiles
        base_tiles = expand_constraint_values_with_assignment(constraint_values, assigned_suit, value_assignment)
        if base_tiles:
            exact_tiles = [base_tiles[0]] * 2  # Take first option and duplicate
        else:
            exact_tiles = ["UNKNOWN_PAIR"] * 2
            
    elif constraint_type == 'pung':
        # Three identical tiles
        base_tiles = expand_constraint_values_with_assignment(constraint_values, assigned_suit, value_assignment)
        if base_tiles:
            exact_tiles = [base_tiles[0]] * 3  # Take first option and triplicate
        else:
            exact_tiles = ["UNKNOWN_PUNG"] * 3
            
    elif constraint_type == 'kong':
        # Four identical tiles
        if constraint_values == "flower":
            # Special case: flower kong uses all 4 different flowers
            exact_tiles = FLOWERS.copy()
        else:
            base_tiles = expand_constraint_values_with_assignment(constraint_values, assigned_suit, value_assignment)
            if base_tiles:
                exact_tiles = [base_tiles[0]] * 4  # Take first option and quadruplicate  
            else:
                exact_tiles = ["UNKNOWN_KONG"] * 4
                
    elif constraint_type == 'quint':
        # Five identical tiles (rare pattern)
        base_tiles = expand_constraint_values_with_assignment(constraint_values, assigned_suit, value_assignment)
        if base_tiles:
            exact_tiles = [base_tiles[0]] * 5  # Take first option and quintuple
        else:
            exact_tiles = ["UNKNOWN_QUINT"] * 5
                
    elif constraint_type == 'sequence':
        # Sequence uses tiles as-is
        exact_tiles = expand_constraint_values_with_assignment(constraint_values, assigned_suit, value_assignment)
        
    else:
        # Unknown constraint type - flag for review
        return [f"UNKNOWN_CONSTRAINT:{constraint_type}"], False
    
    return exact_tiles, len(exact_tiles) > 0 and not any("UNKNOWN" in str(tile) for tile in exact_tiles)

def generate_complete_hand_with_assignments(pattern: Dict, suit_assignment: Dict[str, str], value_assignment: Dict[str, str] = None) -> Dict:
    """Generate a single complete hand with exact tile list using both suit and value assignments"""
    
    all_tiles = []
    joker_rules = []
    success = True
    
    # Process each group
    for group in pattern['Groups']:
        group_tiles, group_success = generate_exact_tiles_for_group(group, suit_assignment, value_assignment)
        all_tiles.extend(group_tiles)
        success &= group_success
        
        # Record joker rules for this group
        joker_rules.append({
            "group_name": str(group['Group']),
            "jokers_allowed": group.get('Jokers_Allowed', True),
            "tiles": group_tiles
        })
    
    # Count tiles
    tile_counts = Counter(all_tiles)
    
    # Create hand ID
    base_id = pattern.get('Hands_Key', f"pattern-{pattern.get('Pattern ID', 0)}")
    suit_suffix = "-".join(suit_assignment.values()) if suit_assignment else "nosuits"
    value_suffix = "-".join(f"{k}:{v}" for k, v in (value_assignment or {}).items())
    hand_id = f"{base_id}-{suit_suffix}"
    if value_suffix:
        hand_id += f"-{value_suffix}"
    
    return {
        "hand_id": hand_id,
        "pattern_info": {
            "section": pattern.get('Section', ''),
            "line": pattern.get('Line', 0), 
            "pattern_id": pattern.get('Pattern ID', 0),
            "pattern_key": pattern.get('Hands_Key', ''),
            "display_pattern": pattern.get('Hand_Pattern', ''),
            "description": pattern.get('Hand_Description', ''),
            "points": pattern.get('Hand_Points', 0),
            "difficulty": pattern.get('Hand_Difficulty', 'unknown'),
            "concealed": pattern.get('Hand_Conceiled', False)
        },
        "exact_tiles": {
            "required_tiles": all_tiles,
            "tile_counts": dict(tile_counts),
            "total_tiles": len(all_tiles)
        },
        "joker_rules": {
            "groups": joker_rules,
            "total_joker_substitutable_tiles": sum(
                len(group["tiles"]) for group in joker_rules 
                if group["jokers_allowed"] and not any("UNKNOWN" in str(tile) for tile in group["tiles"])
            ),
            "singles_and_pairs_restriction": any(
                group.get('Constraint_Type') in ['pair', 'single'] and not group.get('Jokers_Allowed', True)
                for group in pattern['Groups']
            )
        },
        "suit_assignments": suit_assignment,
        "value_assignments": value_assignment or {},
        "generation_success": success,
        "generation_notes": "Manual review needed" if not success else "Generated automatically"
    }

def generate_complete_hand(pattern: Dict, suit_assignment: Dict[str, str]) -> Dict:
    """Generate a single complete hand with exact tile list"""
    
    all_tiles = []
    joker_rules = []
    success = True
    
    # Process each group
    for group in pattern['Groups']:
        group_tiles, group_success = generate_exact_tiles_for_group(group, suit_assignment)
        all_tiles.extend(group_tiles)
        success &= group_success
        
        # Record joker rules for this group
        joker_rules.append({
            "group_name": str(group['Group']),
            "jokers_allowed": group.get('Jokers_Allowed', True),
            "tiles": group_tiles
        })
    
    # Count tiles
    tile_counts = Counter(all_tiles)
    
    # Create hand ID
    base_id = pattern.get('Hands_Key', f"pattern-{pattern.get('Pattern ID', 0)}")
    suit_suffix = "-".join(suit_assignment.values()) if suit_assignment else "nosuits"
    hand_id = f"{base_id}-{suit_suffix}"
    
    return {
        "hand_id": hand_id,
        "pattern_info": {
            "section": pattern.get('Section', ''),
            "line": pattern.get('Line', 0), 
            "pattern_id": pattern.get('Pattern ID', 0),
            "pattern_key": pattern.get('Hands_Key', ''),
            "display_pattern": pattern.get('Hand_Pattern', ''),
            "description": pattern.get('Hand_Description', ''),
            "points": pattern.get('Hand_Points', 0),
            "difficulty": pattern.get('Hand_Difficulty', 'unknown'),
            "concealed": pattern.get('Hand_Conceiled', False)
        },
        "exact_tiles": {
            "required_tiles": all_tiles,
            "tile_counts": dict(tile_counts),
            "total_tiles": len(all_tiles)
        },
        "joker_rules": {
            "groups": joker_rules,
            "total_joker_substitutable_tiles": sum(
                len(group["tiles"]) for group in joker_rules 
                if group["jokers_allowed"] and not any("UNKNOWN" in str(tile) for tile in group["tiles"])
            ),
            "singles_and_pairs_restriction": any(
                group.get('Constraint_Type') in ['pair', 'single'] and not group.get('Jokers_Allowed', True)
                for group in pattern['Groups']
            )
        },
        "suit_assignments": suit_assignment,
        "generation_success": success,
        "generation_notes": "Manual review needed" if not success else "Generated automatically"
    }

def generate_constraint_value_combinations(pattern: Dict) -> List[Dict]:
    """
    Generate all possible constraint value combinations for a pattern
    
    For example, pattern with constraints "2,5" should generate:
    - One variation with all 2s
    - One variation with all 5s
    
    Returns list of constraint value assignments.
    """
    groups = pattern['Groups']
    value_combinations = []
    
    # Find groups with multiple constraint values
    multi_value_groups = []
    for group in groups:
        constraint_values = group.get('Constraint_Values', '')
        if isinstance(constraint_values, str) and ',' in constraint_values:
            # Split constraint values
            values = [v.strip() for v in constraint_values.split(',')]
            if len(values) > 1:
                multi_value_groups.append({
                    'group': group['Group'],
                    'values': values,
                    'constraint_type': group['Constraint_Type']
                })
    
    if not multi_value_groups:
        # No multi-value constraints, return single empty assignment
        return [{}]
    
    # Generate all combinations of constraint values
    value_options = [group['values'] for group in multi_value_groups]
    group_names = [group['group'] for group in multi_value_groups]
    
    for combination in itertools.product(*value_options):
        assignment = {}
        for i, group_name in enumerate(group_names):
            assignment[group_name] = combination[i]
        value_combinations.append(assignment)
    
    return value_combinations

def generate_consecutive_run_variations(constraint_values: str, sequence_length: int) -> List[str]:
    """
    Generate all possible consecutive run starting points
    
    For example: sequence_length=7 generates:
    ['1,2,3,4,5,6,7', '2,3,4,5,6,7,8', '3,4,5,6,7,8,9']
    """
    variations = []
    
    # Consecutive runs can start from 1-3 (ending at 7-9)
    max_start = 10 - sequence_length
    for start in range(1, max_start):
        sequence = [str(start + i) for i in range(sequence_length)]
        variations.append(','.join(sequence))
    
    return variations

def expand_constraint_values_with_assignment(constraint_values, suit_assignment: str = None, value_assignment: Dict = None) -> List[str]:
    """Enhanced version that handles value assignments"""
    
    # Convert to string if it's an integer or other type
    if constraint_values is None:
        return []
    
    constraint_str = str(constraint_values)
    
    if constraint_str == "flower":
        return FLOWERS.copy()
    
    if constraint_str in ["wind", "winds"]:
        return WINDS.copy()
        
    if constraint_str in ["dragon", "dragons"]:
        return DRAGONS.copy()
    
    if not constraint_str or constraint_str == "any":
        return []
    
    # Check if we have a value assignment for this constraint
    if value_assignment and constraint_str in value_assignment:
        constraint_str = value_assignment[constraint_str]
    
    # Handle special case where constraint_values is just a number like 2025
    if constraint_str.isdigit() and len(constraint_str) > 1:
        # Split each digit: 2025 → ['2', '0', '2', '5']
        values = list(constraint_str)
    elif ',' in constraint_str:
        # Handle comma-separated values like "2,5" or "2,0,2,5"
        values = [v.strip() for v in constraint_str.split(',')]
    else:
        # Single value
        values = [constraint_str]
    
    tiles = []
    
    for value in values:
        if value == '0':
            # 0 represents white dragon in sequences like "2025"
            tiles.append('white')
        elif value in WINDS:
            tiles.append(value)
        elif value in DRAGONS:
            tiles.append(value) 
        elif value.isdigit() and suit_assignment:
            # Number tile with assigned suit
            suit_letter = SUITS.get(suit_assignment, 'D')
            tiles.append(f"{value}{suit_letter}")
        elif value.isdigit():
            # Number without suit - need to handle during suit assignment
            tiles.append(value)
        else:
            # Unknown constraint - flag for manual review
            tiles.append(f"UNKNOWN:{value}")
    
    return tiles

def generate_all_complete_hands(patterns: List[Dict]) -> List[Dict]:
    """Generate all complete hands from patterns"""
    complete_hands = []
    
    for pattern_idx, pattern in enumerate(patterns):
        print(f"Processing pattern {pattern.get('Pattern ID', 'unknown')}: {pattern.get('Hand_Pattern', '')}")
        
        # Generate all possible constraint value combinations
        value_combinations = generate_constraint_value_combinations(pattern)
        print(f"  - Value combinations: {len(value_combinations)}")
        
        # Generate all possible suit assignments
        suit_combinations = generate_suit_combinations(pattern['Groups'])
        print(f"  - Suit combinations: {len(suit_combinations)}")
        
        total_combinations = len(value_combinations) * len(suit_combinations)
        print(f"  - Total hands for this pattern: {total_combinations}")
        
        # Skip patterns with too many combinations for now (manual review needed)
        if total_combinations > 100:
            print(f"  - SKIPPING: Too many combinations ({total_combinations}), needs manual handling")
            continue
        
        if total_combinations > 50:
            print(f"  - WARNING: Large number of combinations, this may take time...")
        
        # Generate hands for each combination of values and suits
        for i, value_assignment in enumerate(value_combinations):
            for j, suit_assignment in enumerate(suit_combinations):
                complete_hand = generate_complete_hand_with_assignments(
                    pattern, suit_assignment, value_assignment
                )
                complete_hands.append(complete_hand)
    
    return complete_hands

def validate_complete_hands(complete_hands: List[Dict]) -> Dict[str, Any]:
    """Validate the generated complete hands"""
    validation_results = {
        "total_hands": len(complete_hands),
        "successful_generations": 0,
        "failed_generations": 0,
        "tile_count_errors": [],
        "unknown_constraints": [],
        "patterns_represented": set(),
        "duplicate_hand_ids": []
    }
    
    hand_ids_seen = set()
    
    for hand in complete_hands:
        # Track patterns
        validation_results["patterns_represented"].add(hand["pattern_info"]["pattern_key"])
        
        # Check generation success
        if hand["generation_success"]:
            validation_results["successful_generations"] += 1
        else:
            validation_results["failed_generations"] += 1
        
        # Check tile count
        total_tiles = hand["exact_tiles"]["total_tiles"]
        if total_tiles != 14:
            validation_results["tile_count_errors"].append({
                "hand_id": hand["hand_id"],
                "tile_count": total_tiles,
                "tiles": hand["exact_tiles"]["required_tiles"]
            })
        
        # Check for unknown constraints
        tiles = hand["exact_tiles"]["required_tiles"]
        for tile in tiles:
            if "UNKNOWN" in str(tile):
                validation_results["unknown_constraints"].append({
                    "hand_id": hand["hand_id"],
                    "unknown_tile": tile
                })
        
        # Check for duplicate IDs
        hand_id = hand["hand_id"]
        if hand_id in hand_ids_seen:
            validation_results["duplicate_hand_ids"].append(hand_id)
        hand_ids_seen.add(hand_id)
    
    validation_results["patterns_represented"] = len(validation_results["patterns_represented"])
    
    return validation_results

def main():
    """Main script execution"""
    
    # Load original patterns
    patterns_file = "frontend/public/intelligence/nmjl-patterns/nmjl-card-2025.json"
    try:
        patterns = load_original_patterns(patterns_file)
        print(f"Loaded {len(patterns)} original patterns")
    except FileNotFoundError:
        print(f"Error: Could not find {patterns_file}")
        return
    
    # Generate complete hands
    print("Generating complete hands...")
    complete_hands = generate_all_complete_hands(patterns)
    
    # Validate results
    print("Validating results...")
    validation = validate_complete_hands(complete_hands)
    
    # Print validation summary
    print("\n=== VALIDATION RESULTS ===")
    print(f"Total hands generated: {validation['total_hands']}")
    print(f"Successful generations: {validation['successful_generations']}")  
    print(f"Failed generations: {validation['failed_generations']}")
    print(f"Patterns represented: {validation['patterns_represented']}")
    print(f"Tile count errors: {len(validation['tile_count_errors'])}")
    print(f"Unknown constraints: {len(validation['unknown_constraints'])}")
    print(f"Duplicate hand IDs: {len(validation['duplicate_hand_ids'])}")
    
    # Show examples of issues for manual review
    if validation['tile_count_errors']:
        print("\n=== TILE COUNT ERRORS (First 5) ===")
        for error in validation['tile_count_errors'][:5]:
            print(f"Hand {error['hand_id']}: {error['tile_count']} tiles")
            print(f"  Tiles: {error['tiles']}")
    
    if validation['unknown_constraints']:
        print("\n=== UNKNOWN CONSTRAINTS (First 5) ===")  
        for error in validation['unknown_constraints'][:5]:
            print(f"Hand {error['hand_id']}: {error['unknown_tile']}")
    
    # Create final output structure
    output = {
        "metadata": {
            "year": 2025,
            "total_patterns": len(patterns),
            "total_complete_hands": len(complete_hands),
            "generated_date": "2025-08-19",
            "tile_format": "standard_id",
            "generation_stats": validation
        },
        "complete_hands": complete_hands
    }
    
    # Save to file
    output_file = "frontend/public/intelligence/nmjl-patterns/nmjl-complete-hands-2025.json"
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n=== OUTPUT ===")
    print(f"Complete hands saved to: {output_file}")
    print(f"Ready for manual review and editing of failed generations")

if __name__ == "__main__":
    main()