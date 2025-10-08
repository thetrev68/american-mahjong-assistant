import json
from collections import Counter

# Step 1: Define the Hand
hand = [
    (1, 'D'), (2, 'D'), (4, 'D'), (4, 'D'), (5, 'D'), (6, 'D'),
    (1, 'B'), (1, 'B'), (7, 'B'),
    (1, 'C'), (2, 'C'), (3, 'C'), (4, 'C'), (4, 'C')
]
tile_counts = Counter(hand)

# Step 2: Define the Corrected Scoring Algorithm
def score_hand_for_pattern(hand_counts, pattern):
    """
    Calculates a hand's score against a pattern by specifically
    matching the required groups and consuming tiles.
    """
    temp_hand = hand_counts.copy()
    total_score = 0

    # Handle a special case for the 'All Pairs' section, which requires no specific values.
    if pattern.get('Section') == 'ALL PAIRS':
        pairs_found = 0
        for count in temp_hand.values():
            pairs_found += count // 2
        return pairs_found * 2

    # Process groups in a consistent order
    groups_to_process = sorted(
        pattern.get('Groups', []),
        key=lambda x: {
            'quint': 5, 'kong': 4, 'pung': 3, 'sequence': 3, 'pair': 2, 'single': 1
        }.get(x.get('Constraint_Type'), 0),
        reverse=True
    )
    
    for group in groups_to_process:
        constraint_type = group.get('Constraint_Type')
        constraint_values = group.get('Constraint_Values')
        
        # Handles Pung, Kong, Pair logic
        if constraint_type in ['pung', 'kong', 'pair']:
            tiles_needed = {'pung': 3, 'kong': 4, 'pair': 2}[constraint_type]
            
            if isinstance(constraint_values, str) and constraint_values.isdigit():
                found_match = False
                for suit in ['D', 'C', 'B']:
                    tile = (int(constraint_values), suit)
                    if temp_hand.get(tile, 0) >= tiles_needed:
                        total_score += tiles_needed
                        temp_hand[tile] -= tiles_needed
                        found_match = True
                        break
                if found_match:
                    continue
            
            # Additional logic for Flowers, Dragons, Winds would go here
            elif constraint_values in ['flower', 'dragon', 'wind']:
                pass

        # Handles Sequence logic (runs)
        elif constraint_type == 'sequence':
            try:
                # Use a string representation for parsing
                str_values = str(constraint_values)
                values = [int(v) for v in str_values.split(',')]
                
                # Check for run in each suit
                for suit in ['D', 'C', 'B']:
                    run_found = False
                    start_number = values[0]
                    
                    # Check if all tiles for the run are in the hand
                    run_tiles_needed = [(start_number + i, suit) for i in range(len(values))]
                    if all(temp_hand.get(t, 0) > 0 for t in run_tiles_needed):
                        # Verify it's a true consecutive sequence
                        is_consecutive = all(
                            run_tiles_needed[i][0] + 1 == run_tiles_needed[i+1][0]
                            for i in range(len(run_tiles_needed) - 1)
                        )
                        if is_consecutive:
                            total_score += len(run_tiles_needed)
                            for tile in run_tiles_needed:
                                temp_hand[tile] -= 1
                            run_found = True
                    if run_found:
                        break

            except ValueError:
                # Handle non-consecutive sequences like '2,0,2,5'
                pass

    return total_score

# Step 3: Load the Patterns and Find the Best Match
def find_best_pattern(hand_counts, patterns_file):
    """
    Finds the pattern with the highest partial match score.
    """
    with open(patterns_file, 'r') as f:
        patterns = json.load(f)
        
    best_patterns = []
    highest_score = -1
    
    for pattern in patterns:
        score = score_hand_for_pattern(hand_counts, pattern)
        
        if score > highest_score:
            highest_score = score
            best_patterns = [{
                'score': score,
                'unique_id': f"{pattern.get('Section')}-{pattern.get('Line')} ({pattern.get('Hand_Pattern')})",
                'description': pattern.get('Hand_Description')
            }]
        elif score == highest_score and score > 0:
            best_patterns.append({
                'score': score,
                'unique_id': f"{pattern.get('Section')}-{pattern.get('Line')} ({pattern.get('Hand_Pattern')})",
                'description': pattern.get('Hand_Description')
            })
            
    return best_patterns, highest_score

# Run the analysis
best_patterns, highest_score = find_best_pattern(tile_counts, 'nmjl-card-2025.json')

# Print the results
if best_patterns:
    print(f"The highest score found is: {highest_score} tiles matched.")
    print("Best-fitting patterns:")
    for p in best_patterns:
        print(f"- ID: {p['unique_id']}, Description: {p['description']}")
else:
    print("No matching patterns found.")