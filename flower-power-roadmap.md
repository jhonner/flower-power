# Flower Power — Project Roadmap & Gameplay Evolution Memory

## Project Context
Flower Power is a strategic card game built with Vue 3 (Composition API), Pinia, Vite, and Playwright/Vitest. Players build a garden on their table competing to reach 30 points first against an AI opponent.

## Current Baseline Status (as of October 2026)
- **Phase 1 (Bug & Core Loop Fixes):** COMPLETED & VERIFIED.
  - Hidden AI hand cards (face-down in hand, face-up on table).
  - Live table score calculation for AI defensive triggers.
  - First-turn AI startup automation.
  - Action cancellation ("Undo Selection") button.
  - Fertilize target validation rejecting already-fertilized cards.
  - Deck depletion stalemate resolution with tiebreaker.
- **Testing Infrastructure:** Fully stabilized.
  - 41 Vitest unit tests in `tests/unit/` (`stores.spec.js`, `actions.spec.js`, `ai.spec.js`).
  - 6 Playwright E2E browser tests on isolated port `5188` (`tests/smoke.spec.js`, `tests/gameplay.spec.js`).
  - `npm run test`, `npm run lint` (0 errors), and `npm run build` all pass cleanly.
- **Game Engine:** Centralized in `src/managers/gameLogicManager.js`.
- **UI Architecture:** Vue 3 `<script setup>` with Pinia stores (`players.js`, `deck.js`, `turn.js`).

---

## 3-Phase Recommended Implementation Roadmap

### Phase 1: Bug & Core Loop Fixes (Immediate Priority)
Resolve structural bugs and mechanical gaps that cause confusion, soft-locks, or unfair play:
1. **Hide AI Hand Cards:** Ensure opponent hand cards show only the card back without rendering type or points (`CardComp.vue`).
2. **Fix AI Defensive Mode Score Detection:** Keep `players.scoreForId()` updated during live gameplay so Hard AI accurately detects when human score reaches $\ge 15$ points.
3. **Fix 50% First-Turn Freeze:** Ensure `doNextTurn()` is invoked if `turn.random()` selects Player 0 (AI) as the first player upon game start.
4. **Action Cancellation ("Undo Selection"):** Allow players to cancel an active Action card (`Water`, `Pest`, `Prune`, `Fertilize`) before selecting a target, returning the card to hand.
5. **Deck Depletion / Stalemate Resolution:** Detect when the deck is empty and neither player can reach 20 points, awarding the win to the player with the highest current table score or declaring a draw.

### Phase 2: Visual Card Redesign & Turn Feedback
Elevate visual charm, tactical readability, and AI transparency:
1. **Rich Botanical Cards:** Colorful borders, botanical emojis (🌹, 🌻, 🌼, 🌷, 💧, ✂️, 🌱, 🐛), clear point badges, and descriptive action text.
2. **Fertilize Status Badge:** Visual `🌱 2x` marker on fertilized cards to distinguish them clearly from unfertilized cards.
3. **Discard Pile Display:** Show the most recently discarded action card face-up in `.discard`.
4. **Turn Announcement Feed / Activity Toast:** Floating toast or status indicator stating AI actions (e.g., *"AI used Water to steal your Daisy"*).
5. **Interactive Target Glow:** Highlight eligible target cards with a golden/green pulse when an action card is active.

### Phase 3: Botanical Synergies, Weather Modifiers & Retention
Transform simple numerical racing into layered strategic garden building:
1. **Botanical Synergies:**
   - **Rose (1 pt) — Thorns:** Protects other flowers from `Water` while on table.
   - **Sunflower (3 pts) — Sunbeam:** +2 bonus points for each additional Sunflower on table.
   - **Daisy (5 pts) — Fast Bloomer:** Immediately draw 1 card upon planting.
   - **Lily (10 pts) — Delicate:** Requires at least 1 other flower already in garden to plant.
   - **Prune (Action) — Compost:** Pruning a flower draws 2 cards or grants +3 pts to adjacent flower.
2. **Weather Modifiers ("Today's Forecast"):**
   - Sunny Day (bonus to Sunflowers), Rainstorm (boosts Water/Fertilize), Early Frost (reduces table slots to 4).
3. **Session Continuity & Stats (`localStorage`):**
   - Win streak tracker, win rates by difficulty, fastest win record.

---

## Phase 1 Implementation Plan (Detailed Breakdown)

### 1. Hide AI Hand Details in `CardComp.vue`
- **Issue:** Currently renders `<p class="lisible">{{ card.type }} {{ card.points }}</p>` unconditionally.
- **Fix:** Add a computed check `isFaceDown = computed(() => props.id === 0 && isFromHand())`. When `isFaceDown` is true, render the card back without text.

### 2. Fix AI Defensive Score Tracking in `gameLogicManager.js`
- **Issue:** `bestStrategy()` inspects `this.players.scoreForId(opId)`, which reads `players[opId].score`. Because `players.score()` was removed from `TableComp.vue` to avoid recursion, `score` in the store remains 0 during live play.
- **Fix:** Update `bestStrategy()` (or `_getScore(playerId)`) to compute live points directly from table cards:
  ```javascript
  _getScore(playerId) {
    return this.players.tableForId(playerId).reduce((sum, c) => sum + (c.points || 0), 0)
  }
  ```
  Use `_getScore(opId)` in `bestStrategy` and defensive triggers.

### 3. Fix First-Turn AI Freeze in `gameLogicManager.js` & `GameView.vue`
- **Issue:** In `newGame()`, `this.turn.random()` sets the starting player. If Player 0 (AI) goes first, `doNextTurn()` is never called.
- **Fix:** At the end of `newGame()`, check:
  ```javascript
  if (this.turn.id === K.AI_PLAYER_ID) {
    setTimeout(() => this.doNextTurn(), 600)
  }
  ```
  Additionally, in `GameView.vue`, prevent the human player from drawing on the AI's turn by asserting `turn.id === 1` before calling `draw()`.

### 4. Add Action Cancellation ("Undo Action")
- **Issue:** Once an action card is clicked in hand, it is immediately removed from hand. If a player changes their mind, they are stuck.
- **Fix:**
  - In `GameView.vue`, render a "Cancel Action" button in `.action-indicator` when `turn.select !== -1 && turn.id === 1`.
  - In `gameLogicManager.js`, add `cancelCurrentAction(playerId)` that restores the pending action card back to the player's hand and resets `turn.select = -1` and `currentAction = undefined`.
  - Also allow clicking the active action card again in hand or clicking outside to cancel.

### 5. Prevent Illegal Fertilize Targets
- **Issue:** `endFertilize(card, playerId)` doesn't reject already-fertilized cards if clicked via UI.
- **Fix:** In `handleCardFromTableForId` / `endFertilize`, verify `!card.fertilized`. If already fertilized, ignore click or notify player.

### 6. Stalemate / Deck Exhaustion Resolution
- **Issue:** When `deck.idx.length === 0` and neither player has reached 20 points, if neither player can make a scoring move, the game enters a dead state.
- **Fix:** In `isGameOver()`, check:
  - Either player has $\ge 20$ points $\rightarrow$ Win.
  - Deck is empty AND neither player can play or draw $\rightarrow$ Highest score on table wins (or Tie).
  - Update `GameView.vue` game over modal to display "Deck Depleted - Highest Score Wins" or "Draw".

### 7. Automated Unit & E2E Test Suite Updates
- Add unit tests in `tests/unit/actions.spec.js` and `tests/unit/ai.spec.js` verifying:
  - AI score calculation in `bestStrategy` triggers defensive play properly with table cards.
  - Action cancellation restores card to hand and clears selection.
  - First-turn AI initialization starts AI turn.
  - Deck depletion game over evaluation.
- Run `npm run test:unit`, `npm run test:e2e`, and `npm run lint` to verify 100% green status.
