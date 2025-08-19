import json
import itertools
from collections import defaultdict

# The three suits in American Mahjong
SUITS = ["dots", "bams", "craks"]

def generate_playable_hands(patterns):
    """
    Generates all playable hands from a list of hand patterns by applying suit combinations.

    Args:
        patterns (list): A list of hand patterns from the NMJL card JSON.

    Returns:
        list: A list of all playable hands with suit assignments and a unique ID.
    """
    all_playable_hands = []
    
    # Pre-process patterns to group by unique pattern key
    pattern_map = defaultdict(list)
    for p in patterns:
        pattern_map[p['Hands_Key']].append(p)

    for hand_key, sub_patterns in pattern_map.items():
        playable_hand_counter = 1
        for pattern in sub_patterns:
            
            # Identify the groups that need suit assignments
            groups_to_assign = [g for g in pattern['Groups'] if g['Suit_Role'] in ['any', 'second', 'third'] or g['Suit_Role'].startswith('same_as:')]
            
            # Determine the unique suit roles needed
            suit_roles_needed = []
            if any(g['Suit_Role'] == 'any' for g in pattern['Groups']):
                suit_roles_needed.append('any')
            if any(g['Suit_Role'] == 'second' for g in pattern['Groups']):
                suit_roles_needed.append('second')
            if any(g['Suit_Role'] == 'third' for g in pattern['Groups']):
                suit_roles_needed.append('third')
            
            num_suits_needed = len(suit_roles_needed)
            
            # Generate combinations of suits based on the number of unique roles
            if num_suits_needed > 0:
                suit_combinations = list(itertools.permutations(SUITS, num_suits_needed))
            else:
                suit_combinations = [()]

            for combo in suit_combinations:
                playable_hand = pattern.copy()
                playable_hand['Suit_Assignments'] = {}
                
                # Assign suits to the primary roles ('any', 'second', 'third')
                for i, role in enumerate(suit_roles_needed):
                    for group in playable_hand['Groups']:
                        if group['Suit_Role'] == role:
                            playable_hand['Suit_Assignments'][group['Group']] = combo[i]
                            
                # Handle 'same_as' and 'Constraint_Must_Match' constraints
                for group in playable_hand['Groups']:
                    # Handle 'same_as' suit roles
                    if group['Suit_Role'].startswith('same_as:'):
                        source_group_id = group['Suit_Role'].split(':')[1]
                        if source_group_id in playable_hand['Suit_Assignments']:
                            playable_hand['Suit_Assignments'][group['Group']] = playable_hand['Suit_Assignments'][source_group_id]
                    
                    # Handle 'Constraint_Must_Match'
                    if group.get('Constraint_Must_Match'):
                        match_group_id = group['Constraint_Must_Match']
                        # Find the group that must match
                        match_group = next((g for g in playable_hand['Groups'] if g['Group'] == match_group_id), None)
                        if match_group:
                            # Use the suit from the current group to assign to the matching group
                            # and vice-versa if a suit has been assigned.
                            current_group_suit = playable_hand['Suit_Assignments'].get(group['Group'])
                            match_group_suit = playable_hand['Suit_Assignments'].get(match_group_id)
                            
                            if current_group_suit and not match_group_suit:
                                playable_hand['Suit_Assignments'][match_group_id] = current_group_suit
                            elif match_group_suit and not current_group_suit:
                                playable_hand['Suit_Assignments'][group['Group']] = match_group_suit
                
                # Add the new unique hand ID
                playable_hand['Hand_ID'] = f"{hand_key}-{playable_hand_counter}"
                playable_hand_counter += 1
                            
                all_playable_hands.append(playable_hand)

    return all_playable_hands

def main():
    """Main function to load the card data and generate the playable hands JSON."""
    nmjl_card_data = []
    
    try:
        # Load the NMJL card data from the uploaded JSON file
        with open('nmjl-card-2025.json', 'r') as f:
            nmjl_card_data = json.load(f)
    except FileNotFoundError:
        print("Error: The file 'nmjl-card-2025.json' was not found.")
        return
    except json.JSONDecodeError:
        print("Error: The file 'nmjl-card-2025.json' is not a valid JSON file.")
        return

    # Generate all playable hands
    playable_hands = generate_playable_hands(nmjl_card_data)

    # Save the playable hands to a new JSON file
    output_filename = 'nmjl-playable-hands-2025.json'
    with open(output_filename, 'w') as f:
        json.dump(playable_hands, f, indent=2)

    print(f"Successfully generated {len(playable_hands)} playable hands and saved to '{output_filename}'.")

if __name__ == "__main__":
    main()

