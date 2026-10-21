# Testing Report - Card Animations Implementation

## Date: 2026-10-21 (Updated)

## Summary
The full testing suite has been completed and stabilized with a hybrid architecture:
1. **Vitest unit/integration suite**: 34 tests passing covering Pinia stores, all action cards (Water, Pest, Fertilize with 15-pt cap & single-use check, Prune), table limits, win conditions, and Easy/Medium/Hard AI behaviors with headless simulations.
2. **Playwright E2E suite**: 6 tests passing covering smoke tests, page navigation, card rendering, drawing cards, playing cards, and recursion verification.

## Automated Test Results

### 1. Vitest Unit Suite (✓ PASSED - 34/34 tests)
- `tests/unit/stores.spec.js` (9 tests passed):
  - `deckStore`: 32 cards composition, points, shuffling, popping, deck exhaustion.
  - `playersStore`: player initialization, card moves, score calculations, fertilization caps & flags.
  - `turnStore`: turn rotation and turn count progression.
- `tests/unit/actions.spec.js` (14 tests passed):
  - Table capacity constraints (max 5 cards).
  - Water: stealing conditions and table transfer.
  - Pest: card destruction.
  - Prune: removing cards from own table.
  - Fertilize: 15-point cap for 10-point cards, single-use restriction per card.
  - Win condition: $\ge 20$ points detection.
  - Deck exhaustion: empty deck draw handling.
- `tests/unit/ai.spec.js` (11 tests passed):
  - Easy AI: Flower, Pest, and Fertilize play; ignores Water and Prune.
  - Medium AI: Water stealing on $\ge 5$ point targets; ignores Prune.
  - Hard AI: Full card usage including Prune on crowded tables ($\ge 4$ cards); defensive Pest and Water triggers when opponent $\ge 15$ points.
  - Headless simulations: `simulateGame()` and `runSimulation(10)` batch verification.

### 2. Playwright E2E Suite (✓ PASSED - 6/6 tests)
- `tests/smoke.spec.js` (1/1 passed)
- `tests/gameplay.spec.js` (5/5 passed)

## Fixes Applied

1. **Port Isolation**: Configured Playwright and Vite webServer to run on isolated port `5188` to avoid port collisions with other local services on 5173/5174.
2. **Router-link Selectors**: Corrected selectors from `button:has-text("Start Game")` to `page.getByRole('link', { name: 'Start Game' })`.
3. **Heading Strict Mode Violation**: Scoped duplicate `<h1>Flower Power</h1>` query to `.first()`.
4. **NPM Test Scripts**:
   - `"test:unit"`: `vitest run`
   - `"test:e2e"`: `playwright test`
   - `"test"`: `npm run test:unit && npm run test:e2e`
