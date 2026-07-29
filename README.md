# Flower Power 🌸

A strategic card game built with Vue 3 where you compete against an AI opponent to grow the most beautiful garden.

## 🎮 How to Play

### Objective
Be the first player to reach **20 points** by playing flower cards to your table.

### Card Types

**Flower Cards** (score points when on your table):
| Flower | Points | Quantity |
|--------|--------|----------|
| 🌹 Rose | 1 | 5 |
| 🌻 Sunflower | 3 | 5 |
| 🌼 Daisy | 5 | 5 |
| 🌷 Lily | 10 | 5 |

**Action Cards** (3 of each):
| Action | Effect |
|--------|--------|
| 💧 Water | Steal a flower from opponent's table |
| ✂️ Prune | Remove a flower from your own table |
| 🌱 Fertilize | Double a flower's points (max 15, once per card) |
| 🐛 Pest | Destroy a flower on opponent's table |

### Turn Actions
On your turn, you can:
1. **Play a card** from your hand (flower goes to table, action targets a card)
2. **Draw a card** from the deck (if hand has fewer than 5 cards)

### Constraints
- Maximum 5 cards in hand
- Maximum 5 flowers on table

## 🤖 AI Difficulty Levels

| Level | Behaviors |
|-------|-----------|
| **Easy** | Plays flowers, uses Pest and Fertilize |
| **Medium** | Also uses Water to steal valuable cards |
| **Hard** | Uses all cards + defensive play when you're near winning |

## 🧪 AI Simulation

Test and tune AI strategies without playing manually:

**In Browser Console:**
```javascript
runSim(100)   // Run 100 AI vs AI games
runSim(1000)  // Run 1000 games for better statistics
```

**From Home Screen:**
Use the "AI vs AI Simulation" section to run batch tests with visual results.

## 🛠️ Development

### Tech Stack
- **Vue 3** with Composition API (`<script setup>`)
- **Pinia** for state management
- **Vue Router** for navigation
- **Vite** for build tooling
- **ESLint** for code quality

### Project Structure
```
src/
├── components/       # Vue components (Card, Hand, Table, Player)
├── data/            # Constants and configuration
├── managers/        # Game logic (GameLogicManager singleton)
├── stores/          # Pinia stores (players, deck, turn)
├── views/           # Route views (Home, Game, Rules)
└── style.css        # Global styles
```

### Scripts
```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
```

### Key Files
| File | Purpose |
|------|---------|
| `src/managers/gameLogicManager.js` | Core game logic, AI strategy, simulation |
| `src/stores/players.js` | Player state (hand, table, score) |
| `src/stores/deck.js` | Deck creation and shuffling |
| `src/data/constants.js` | Game settings, difficulty config |

## 📊 Game Balance

Recent balance changes:
- **Fertilize capped at 15 points** - Prevents Lily + Fertilize instant win
- **One fertilize per card** - Adds strategic depth
- **AI uses all action cards** - More competitive gameplay

Simulation results (500 games each, Hard difficulty):
- Win rates: ~47-52% (balanced)
- Average game length: 14 turns
- Draw rate: <1%

## 📝 License

MIT
