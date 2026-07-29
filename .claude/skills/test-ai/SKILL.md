---
name: test-ai
description: Run AI simulation tests to verify game balance
user-invocable: true
---

Run AI vs AI simulation to test balance:

1. Create a temporary Node.js test script using ES modules
2. Import Pinia and game stores (players, deck, turn)
3. Run simulations at each difficulty level:
   - EASY: 100 games
   - MEDIUM: 100 games  
   - HARD: 100 games
4. Report for each difficulty:
   - Player 0 win rate
   - Player 1 win rate
   - Draw rate
   - Average game length (turns)
5. Flag any imbalance (win rate outside 40-60% range)
6. Clean up temporary test file
