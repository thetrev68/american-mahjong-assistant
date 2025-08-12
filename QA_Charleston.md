Create new game: Charleston Time Limit. What is that timer for? Doesn't match what the charleston actually uses. Set to 90 seconds for this testing iteration. Charleston start: Dealer = 6:06. Not moving. Player 2 = 6:37. Not moving. Player 3 = 7:35. Not moving.

```
Charleston Strategy / Overall Strategy: "No strong pattern focus yet - remain flexible. Round 1: Safe to pass obvious discards and duplicates" This is good comment.

Charleston Strategy / Pattern Focus: "Targeting 2025 Line 6#1: Any 3 Suits - 75 points". Section 2025 only has 4 lines so there couldn't be a line 6. If you mean year 2025 line 6 - a bit confusing - I would call that "section 2468, line 2, pattern FF 2222 + 4444 = 6666." It's only worth 25 points, not 75.

Charleston Strategy / Phase Guidance: Useless. Not helpful for understanding the recommendation or for learning the game. Just get rid of the entire section.

```
Charleston Analysis / Charleston Recommendations: This is a helpful summary. Should be at the bottom below "Your Hand" to replace what's there.

Charleston Analysis / Current Patterns: 
    2025 Line 6#1: Any 3 Suits (0% complete) (75 pts)
    2025 Line 1#1: Any 1 Suit, Any 4 Consec Nos (0% complete) (50 pts)
    2025 Line 2#1: Any 2 Suits w Matching Dragons (0% complete) (50 pts)
Year is unnecessary since we already know we're playing the 2025 card. Description is the qualifying notes on the card. Doesn't make sense as an identifier. Also, Points in parenthesis do not line up with json data. Also, why is it recommending patterns that are 0% complete? Shouldn't it be displaying the 3 best patterns based on the tiles in hand, which would necessarily mean > 0%? I would prefer this to say:
    Top 3 Possible Hands:
    Section 2468, Line 2, Pattern FF 2222 + 4444 = 6666: 25 points (5/14, 36%)
    Section 2025, Line 1, Pattern FFFF 2025 222 222: 25 points (1/14, 7%)
    Section 2025, Line 2, Pattern 222 0000 222 5555: 25 points (1/14, 7%)

Charlston Options / Alternative Passing Options: I've always only ever seen this empty / no alternative options available. Why are we wasting screen space on something that doesn't do anything? Remove the whole tab!

Charleston Your Hand: 5 tiles marked in red, 8 tiles marked in green. 0 tiles marked neutral. The best hand option listed has 5 out of 14 tiles in the hand. Those 5 should be green. Anything else that exists in possible hands should be neutral. Anything that does not exist in those top 3 hands should be red/pass (except jokers and flowers, of course).

Bug: Completing the charleston "Pass Right" round did not advance the game. "Charleston Error: Not in any room". Granted, the time did expire. But the timer should not have any stopping capability. It's a visual reference only.

Bug: Red/Green tile outlines are not the same size as the tiles. They are a tad narrower and a tad taller. It creates a poor visual effect.


