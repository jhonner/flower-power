---
paths:
  - "src/managers/**/*.js"
  - "src/stores/**/*.js"
  - "src/data/**/*.js"
---

# Game Logic Guidelines

## Architecture
- `GameLogicManager` is a singleton - import the exported instance
- Pinia stores use Options API style (state, getters, actions)
- Game constants live in `src/data/constants.js`

## AI Strategy
- AI difficulty behaviors gated by `K.DIFFICULTY[K.currentDifficulty]`
- Strategy priority: defensive mode → play flowers → pest → fertilize → water → prune → draw
- Defensive mode triggers when opponent score >= 15

## Balance Constraints
- Fertilize capped at 15 points maximum
- Each card can only be fertilized once (check `card.fertilized`)
- Win condition: first to 20 points

## Testing
- Test all game logic changes with AI simulation
- Run `runSim(100)` in browser console
- Win rates should be 40-60% for balanced gameplay

## State Management
- Player state (hand, table, score) in `players` store
- Deck state in `deck` store
- Turn state (current player, selection mode) in `turn` store
