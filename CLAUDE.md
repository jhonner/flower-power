# Flower Power - Claude Instructions

## Project Overview
A Vue 3 card game where players compete to reach 30 points by playing flower cards. Currently supports human vs AI with three difficulty levels.

## Tech Stack
- Vue 3 with Composition API (`<script setup>`)
- Pinia for state management
- Vue Router for navigation
- Vite for build tooling
- ESLint for code quality

## Key Files
- `src/managers/gameLogicManager.js` - Core game logic, AI strategy, simulation
- `src/stores/players.js` - Player state (hand, table, score)
- `src/stores/deck.js` - Deck creation and shuffling
- `src/data/constants.js` - Game settings, difficulty config
- `src/views/GameView.vue` - Main game UI
- `src/views/HomeView.vue` - Home screen with settings

## Development Commands
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build
npm run lint     # Run ESLint
npm run lint:fix # Auto-fix lint issues
```

## Testing
- Run `runSim(100)` in browser console for AI balance testing
- All changes should pass `npm run lint`
- Test in browser before committing

## Current Roadmap
See memory file `./flower-power-roadmap.md` for gameplay analysis, bugs, and phased feature plan:
1. Phase 1: Bug & Core Loop Fixes (AI hidden hand, AI score check, first-turn freeze, action cancel, deck depletion)
2. Phase 2: Visual Card Redesign & Turn Feedback (Botanical emojis, discard pile, action toast)
3. Phase 3: Botanical Synergies & Retention (Rose Thorns, Sunflower Swarm, Daisy Tempo, Weather rules)

## Code Style
- No semicolons (enforced by ESLint)
- Use strict equality (===)
- Vue components use `<script setup>` syntax
- Pinia stores use Options API style

## Game Rules

### Objective
First player to reach 30 points wins.

### Card Types
**Flowers** (score when on table):
- Rose: 1 point (5 cards)
- Sunflower: 3 points (5 cards)
- Daisy: 5 points (5 cards)
- Lily: 10 points (5 cards)

**Actions** (3 of each):
- Water: Steal a flower from opponent's table
- Prune: Remove a flower from your own table
- Fertilize: Double a flower's points (max 15, once per card)
- Pest: Destroy a flower on opponent's table

### Constraints
- Max 5 cards in hand
- Max 5 flowers on table

## AI Difficulty Levels
- **Easy**: Plays flowers, uses Pest and Fertilize
- **Medium**: Also uses Water to steal valuable cards
- **Hard**: Uses all cards + defensive play when opponent near winning
