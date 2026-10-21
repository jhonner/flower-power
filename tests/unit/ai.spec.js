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

    it('triggers defensive Pest when opponent has >= 15 points and high-value card', () => {
      // Opponent at 15 points
      players.addCardToTable({ id: 1, type: 'Lily', points: 10 }, 1)
      players.addCardToTable({ id: 2, type: 'Daisy', points: 5 }, 1)
      players.score()
      expect(players.scoreForId(1)).toBe(15)

      // Player has Pest and a flower card
      const pest = { id: 24, type: 'Pest' }
      const rose = { id: 3, type: 'Rose', points: 1 }
      players.addCardToPlayer(0, rose)
      players.addCardToPlayer(0, pest)

      // Defensive mode should prioritize Pest over playing Rose
      const played = gameLogicManager.bestStrategy(0, [rose, pest])
      expect(played).toBe(true)
      // Lily (10 points) should have been destroyed by Pest
      expect(players.tableForId(1)).not.toContainEqual(expect.objectContaining({ id: 1 }))
    })

    it('triggers defensive Water with lower threshold (>= 3 points) when opponent >= 15', () => {
      // Opponent at 16 points (Daisy 5 + Daisy 5 + Sunflower 3 + Sunflower 3)
      players.addCardToTable({ id: 1, type: 'Sunflower', points: 3 }, 1)
      players.addCardToTable({ id: 2, type: 'Sunflower', points: 3 }, 1)
      players.addCardToTable({ id: 3, type: 'Daisy', points: 5 }, 1)
      players.addCardToTable({ id: 4, type: 'Daisy', points: 5 }, 1)
      players.score()
      expect(players.scoreForId(1)).toBe(16)

      const water = { id: 21, type: 'Water' }
      players.addCardToPlayer(0, water)
      const played = gameLogicManager.bestStrategy(0, [water])
      expect(played).toBe(true)
      expect(players.tableForId(0)).toHaveLength(1)
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
  })
})
