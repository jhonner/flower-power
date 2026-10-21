import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { gameLogicManager } from '@/managers/gameLogicManager'
import { deckStore } from '@/stores/deck'
import { playersStore } from '@/stores/players'
import { turnStore } from '@/stores/turn'
import * as K from '@/data/constants'

describe('GameLogicManager - AI Strategies & Simulation', () => {
  let players, deck, turn

  beforeEach(() => {
    setActivePinia(createPinia())
    players = playersStore()
    deck = deckStore()
    turn = turnStore()

    players.reset()
    deck.create()
    turn.id = 0

    gameLogicManager.players = players
    gameLogicManager.deck = deck
    gameLogicManager.turn = turn
    gameLogicManager.currentAction = undefined

    // Stub nextTurn to prevent asynchronous timer invocations
    vi.spyOn(gameLogicManager, 'nextTurn').mockImplementation(() => {
      turn.next()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    K.setDifficulty('HARD')
  })

  describe('Easy AI Difficulty', () => {
    beforeEach(() => {
      K.setDifficulty('EASY')
    })

    it('plays highest flower from hand', () => {
      const rose = { id: 1, type: 'Rose', points: 1 }
      const lily = { id: 2, type: 'Lily', points: 10 }
      players.addCardToPlayer(0, rose)
      players.addCardToPlayer(0, lily)
      const cards = [rose, lily]

      const played = gameLogicManager.bestStrategy(0, cards)
      expect(played).toBe(true)
      expect(players.tableForId(0)).toContainEqual(lily)
    })

    it('uses Fertilize and Pest', () => {
      const daisy = { id: 1, type: 'Daisy', points: 5 }
      players.addCardToTable(daisy, 0)

      const fertilize = { id: 23, type: 'Fertilize' }
      players.addCardToPlayer(0, fertilize)
      const played = gameLogicManager.bestStrategy(0, [fertilize])
      expect(played).toBe(true)
      expect(daisy.points).toBe(10)
    })

    it('never uses Water or Prune in Easy difficulty', () => {
      const water = { id: 21, type: 'Water' }
      const prune = { id: 22, type: 'Prune' }

      // Opponent has valuable card to steal
      players.addCardToTable({ id: 10, type: 'Lily', points: 10 }, 1)
      const playedWater = gameLogicManager.bestStrategy(0, [water])
      expect(playedWater).toBe(false)

      // Player has crowded table with low card
      for (let i = 0; i < 4; i++) {
        players.addCardToTable({ id: i, type: 'Rose', points: 1 }, 0)
      }
      const playedPrune = gameLogicManager.bestStrategy(0, [prune])
      expect(playedPrune).toBe(false)
    })
  })

  describe('Medium AI Difficulty', () => {
    beforeEach(() => {
      K.setDifficulty('MEDIUM')
    })

    it('uses Water to steal high-value opponent cards (>= 5 points)', () => {
      const water = { id: 21, type: 'Water' }
      const lily = { id: 10, type: 'Lily', points: 10 }
      players.addCardToTable(lily, 1)
      players.addCardToPlayer(0, water)

      const played = gameLogicManager.bestStrategy(0, [water])
      expect(played).toBe(true)
      expect(players.tableForId(0)).toContainEqual(expect.objectContaining({ id: 10 }))
    })

    it('does not steal low-value opponent cards (< 5 points) in normal play', () => {
      const water = { id: 21, type: 'Water' }
      const sunflower = { id: 10, type: 'Sunflower', points: 3 }
      players.addCardToTable(sunflower, 1)

      const played = gameLogicManager.bestStrategy(0, [water])
      expect(played).toBe(false)
    })

    it('does not use Prune in Medium difficulty', () => {
      const prune = { id: 22, type: 'Prune' }
      for (let i = 0; i < 4; i++) {
        players.addCardToTable({ id: i, type: 'Rose', points: 1 }, 0)
      }
      const played = gameLogicManager.bestStrategy(0, [prune])
      expect(played).toBe(false)
    })
  })

  describe('Hard AI Difficulty & Defensive Strategy', () => {
    beforeEach(() => {
      K.setDifficulty('HARD')
    })

    it('uses Prune to clear low-value card when table is crowded (>= 4 cards)', () => {
      const prune = { id: 22, type: 'Prune' }
      const rose = { id: 1, type: 'Rose', points: 1 }
      const daisy1 = { id: 2, type: 'Daisy', points: 5 }
      const daisy2 = { id: 3, type: 'Daisy', points: 5 }
      const lily = { id: 4, type: 'Lily', points: 10 }

      players.addCardToTable(rose, 0)
      players.addCardToTable(daisy1, 0)
      players.addCardToTable(daisy2, 0)
      players.addCardToTable(lily, 0)
      players.addCardToPlayer(0, prune)

      const played = gameLogicManager.bestStrategy(0, [prune])
      expect(played).toBe(true)
      expect(players.tableForId(0)).not.toContainEqual(expect.objectContaining({ id: 1 }))
    })

    it('triggers defensive Pest when opponent has >= 27 points and high-value card', () => {
      // Opponent at 27 points (Lily 10 + Lily 10 + Daisy 5 + Rose 1 + Rose 1)
      players.addCardToTable({ id: 1, type: 'Lily', points: 10 }, 1)
      players.addCardToTable({ id: 2, type: 'Lily', points: 10 }, 1)
      players.addCardToTable({ id: 3, type: 'Daisy', points: 5 }, 1)
      players.addCardToTable({ id: 4, type: 'Rose', points: 1 }, 1)
      players.addCardToTable({ id: 5, type: 'Rose', points: 1 }, 1)
      players.score()
      expect(players.scoreForId(1)).toBe(27)

      // Player has Pest and a flower card
      const pest = { id: 24, type: 'Pest' }
      const rose = { id: 3, type: 'Rose', points: 1 }
      players.addCardToPlayer(0, rose)
      players.addCardToPlayer(0, pest)

      // Defensive mode should prioritize Pest over playing Rose
      const played = gameLogicManager.bestStrategy(0, [rose, pest])
      expect(played).toBe(true)
      // One high-value card (10 points) should have been destroyed by Pest
      expect(players.tableForId(1)).toHaveLength(4)
    })

    it('triggers defensive Water with lower threshold (>= 3 points) when opponent >= 27', () => {
      // Opponent at 27 points (Lily 10 + Lily 10 + Daisy 5 + Rose 1 + Rose 1)
      players.addCardToTable({ id: 1, type: 'Lily', points: 10 }, 1)
      players.addCardToTable({ id: 2, type: 'Lily', points: 10 }, 1)
      players.addCardToTable({ id: 3, type: 'Daisy', points: 5 }, 1)
      players.addCardToTable({ id: 4, type: 'Rose', points: 1 }, 1)
      players.addCardToTable({ id: 5, type: 'Rose', points: 1 }, 1)
      players.score()
      expect(players.scoreForId(1)).toBe(27)

      const water = { id: 21, type: 'Water' }
      players.addCardToPlayer(0, water)
      const played = gameLogicManager.bestStrategy(0, [water])
      expect(played).toBe(true)
      expect(players.tableForId(0)).toHaveLength(1)
    })

    it('triggers defensive mode based on live table score even without players.score() called', () => {
      // players.scoreForId(1) remains 0 because score() has not been called
      // But _getScore() computes live from table: 27 points triggers defensive
      players.addCardToTable({ id: 1, type: 'Lily', points: 10 }, 1)
      players.addCardToTable({ id: 2, type: 'Lily', points: 10 }, 1)
      players.addCardToTable({ id: 3, type: 'Daisy', points: 5 }, 1)
      players.addCardToTable({ id: 4, type: 'Rose', points: 1 }, 1)
      players.addCardToTable({ id: 5, type: 'Rose', points: 1 }, 1)
      expect(players.scoreForId(1)).toBe(0)

      const pest = { id: 24, type: 'Pest' }
      const rose = { id: 3, type: 'Rose', points: 1 }
      players.addCardToPlayer(0, rose)
      players.addCardToPlayer(0, pest)

      const played = gameLogicManager.bestStrategy(0, [rose, pest])
      expect(played).toBe(true)
      expect(players.tableForId(1)).toHaveLength(4)
    })
  })

  describe('Game Setup & First-Turn AI Startup', () => {
    it('schedules doNextTurn if AI is selected as starting player', () => {
      vi.useFakeTimers()
      const doNextTurnSpy = vi.spyOn(gameLogicManager, 'doNextTurn').mockImplementation(() => {})
      const t = turnStore()
      vi.spyOn(t, 'random').mockImplementation(() => { t.id = 0 })

      gameLogicManager.newGame()
      expect(gameLogicManager.turn.id).toBe(0)
      vi.advanceTimersByTime(700)
      expect(doNextTurnSpy).toHaveBeenCalled()
      vi.useRealTimers()
    })
  })

  describe('Headless AI Simulation', () => {
    it('simulates a full game to completion with a valid winner or draw', () => {
      // Restore nextTurn so simulateGame uses its internal synchronous loop
      vi.restoreAllMocks()

      const result = gameLogicManager.simulateGame()
      expect(result).toHaveProperty('winner')
      expect([-1, 0, 1]).toContain(result.winner)
      expect(result.scores).toHaveLength(2)
      expect(result.turns).toBeGreaterThan(0)
    })

    it('runs batch simulations and generates accurate aggregate statistics', () => {
      vi.restoreAllMocks()

      const stats = gameLogicManager.runSimulation(10)
      expect(stats.player0Wins + stats.player1Wins + stats.draws).toBe(10)
      expect(stats.avgTurns).toBeGreaterThan(0)
      expect(stats.winRate.player0).toMatch(/^[0-9.]+%$/)
      expect(stats.winRate.player1).toMatch(/^[0-9.]+%$/)
    })

    it('runs simulation successfully when manager stores are initially null (e.g. directly from HomeView)', () => {
      vi.restoreAllMocks()
      gameLogicManager.players = null
      gameLogicManager.deck = null
      gameLogicManager.turn = null

      const stats = gameLogicManager.runSimulation(5)
      expect(stats.player0Wins + stats.player1Wins + stats.draws).toBe(5)
      expect(gameLogicManager.players).not.toBeNull()
      expect(gameLogicManager.deck).not.toBeNull()
      expect(gameLogicManager.turn).not.toBeNull()
    })

    it('runs runSimulationAsync non-blocking with progressive callbacks', async () => {
      vi.restoreAllMocks()
      const progressUpdates = []
      const stats = await gameLogicManager.runSimulationAsync(15, (completed, total) => {
        progressUpdates.push({ completed, total })
      }, 5)

      expect(stats.player0Wins + stats.player1Wins + stats.draws).toBe(15)
      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[progressUpdates.length - 1]).toEqual({ completed: 15, total: 15 })
    })

    it('sanitizes invalid game counts safely', () => {
      vi.restoreAllMocks()
      const stats = gameLogicManager.runSimulation('invalid')
      expect(stats.totalGames).toBe(100)
      expect(stats.player0Wins + stats.player1Wins + stats.draws).toBe(100)
    })
  })

  describe('Empty Deck Turn-Passing & Endgame Resolution', () => {
    it('reproduces Turn 51 log scenario: AI passes turn when hand and deck are empty, allowing Human to play remaining Fertilize and win', () => {
      deck.idx = []
      gameLogicManager.consecutivePasses = 0

      // AI (Player 0): Hand empty, Table 5/5 (29 pts)
      players.addCardToTable({ id: 4, type: 'Rose', points: 2, fertilized: true }, 0)
      players.addCardToTable({ id: 7, type: 'Sunflower', points: 6, fertilized: true }, 0)
      players.addCardToTable({ id: 11, type: 'Daisy', points: 10, fertilized: true }, 0)
      players.addCardToTable({ id: 5, type: 'Sunflower', points: 6, fertilized: true }, 0)
      players.addCardToTable({ id: 13, type: 'Daisy', points: 5 }, 0)

      // Human (Player 1): Table 5/5 (33 pts), Hand has 3 unplayable flowers + 1 playable Fertilize
      const lily18 = { id: 18, type: 'Lily', points: 10 }
      players.addCardToTable({ id: 14, type: 'Daisy', points: 5 }, 1)
      players.addCardToTable(lily18, 1)
      players.addCardToTable({ id: 9, type: 'Sunflower', points: 3 }, 1)
      players.addCardToTable({ id: 19, type: 'Lily', points: 10 }, 1)
      players.addCardToTable({ id: 10, type: 'Daisy', points: 5 }, 1)

      const fertilize28 = { id: 28, type: 'Fertilize' }
      players.addCardToPlayer(1, { id: 0, type: 'Rose', points: 1 })
      players.addCardToPlayer(1, { id: 3, type: 'Rose', points: 1 })
      players.addCardToPlayer(1, { id: 12, type: 'Daisy', points: 5 })
      players.addCardToPlayer(1, fertilize28)
      players.score()

      expect(players.scoreForId(0)).toBe(29)
      expect(players.scoreForId(1)).toBe(33)

      // Turn 51: AI's turn, game is not over yet because Human can play Fertilize #28
      turn.id = 0
      expect(gameLogicManager.isGameOver()).toBe(false)

      // AI cannot play or draw -> automatically passes turn to Human (turn.id becomes 1)
      gameLogicManager.playAITurn(0)
      expect(turn.id).toBe(1)
      expect(gameLogicManager.consecutivePasses).toBe(1)

      // Human plays Fertilize #28 on Lily #18 -> reaches 38 pts and wins
      gameLogicManager.playCardForId(fertilize28, 1)
      gameLogicManager.handleCardFromTableForId(lily18, 1)
      players.score()

      expect(players.scoreForId(1)).toBe(38)
      expect(gameLogicManager.isGameOver()).toBe(true)
      expect(gameLogicManager.getWinner()).toBe(1)
    })

    it('ends the game and awards highest score when deck is empty and neither player can beneficially act', () => {
      deck.idx = []
      gameLogicManager.consecutivePasses = 0

      // AI (Player 0): 29 pts on full table, empty hand
      players.addCardToTable({ id: 1, type: 'Lily', points: 10 }, 0)
      players.addCardToTable({ id: 2, type: 'Lily', points: 10 }, 0)
      players.addCardToTable({ id: 3, type: 'Daisy', points: 5 }, 0)
      players.addCardToTable({ id: 4, type: 'Sunflower', points: 3 }, 0)
      players.addCardToTable({ id: 5, type: 'Rose', points: 1 }, 0)

      // Human (Player 1): 33 pts on full table (lowest card is 3 pts), 5 Rose cards (1 pt each) in hand
      players.addCardToTable({ id: 6, type: 'Lily', points: 10 }, 1)
      players.addCardToTable({ id: 7, type: 'Lily', points: 10 }, 1)
      players.addCardToTable({ id: 8, type: 'Daisy', points: 5 }, 1)
      players.addCardToTable({ id: 9, type: 'Daisy', points: 5 }, 1)
      players.addCardToTable({ id: 10, type: 'Sunflower', points: 3 }, 1)
      for (let i = 0; i < 5; i++) {
        players.addCardToPlayer(1, { id: 100 + i, type: 'Rose', points: 1 })
      }
      players.score()

      // Even though Human has 5 cards in hand and 5 on table, discarding a 3-pt Sunflower for a 1-pt Rose is not beneficial
      expect(gameLogicManager.isGameOver()).toBe(true)
      expect(gameLogicManager.getWinner()).toBe(1)
    })
  })
})

