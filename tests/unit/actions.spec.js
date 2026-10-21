import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { gameLogicManager } from '@/managers/gameLogicManager'
import { deckStore } from '@/stores/deck'
import { playersStore } from '@/stores/players'
import { turnStore } from '@/stores/turn'

describe('GameLogicManager - Card Actions & Game Rules', () => {
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

    // Stub nextTurn to avoid setTimeout side-effects in unit tests
    vi.spyOn(gameLogicManager, 'nextTurn').mockImplementation(() => {
      turn.next()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Flower Cards & Table Limits', () => {
    it('plays a flower card to the table when capacity permits', () => {
      const rose = { id: 1, type: 'Rose', points: 1 }
      players.addCardToPlayer(0, rose)

      const result = gameLogicManager.handlePlayedCard(rose, 0)
      expect(result).toBe(true)
      expect(players.tableForId(0)).toHaveLength(1)
      expect(players.handForId(0)).toHaveLength(0)
    })

    it('enforces table capacity limit (maximum 5 flowers on table)', () => {
      for (let i = 1; i <= 5; i++) {
        players.addCardToTable({ id: i, type: 'Rose', points: 1 }, 0)
      }
      expect(players.tableForId(0)).toHaveLength(5)

      const sixthFlower = { id: 6, type: 'Sunflower', points: 3 }
      players.addCardToPlayer(0, sixthFlower)

      const canPlay = gameLogicManager._canPlayCard(sixthFlower, 0)
      expect(canPlay).toBe(false)

      const played = gameLogicManager.handlePlayedCard(sixthFlower, 0)
      expect(played).toBe(false)
      expect(players.tableForId(0)).toHaveLength(5)
    })
  })

  describe('Water Action Card', () => {
    it('allows Water only when opponent has flowers and player table is not full', () => {
      const water = { id: 21, type: 'Water' }
      players.addCardToPlayer(0, water)

      // Opponent table is empty -> cannot use Water
      expect(gameLogicManager._canUseWater(0)).toBe(false)

      // Opponent has a flower -> can use Water
      players.addCardToTable({ id: 1, type: 'Sunflower', points: 3 }, 1)
      expect(gameLogicManager._canUseWater(0)).toBe(true)

      // Player table is full (5 flowers) -> cannot use Water
      for (let i = 2; i <= 6; i++) {
        players.addCardToTable({ id: i, type: 'Rose', points: 1 }, 0)
      }
      expect(gameLogicManager._canUseWater(0)).toBe(false)
    })

    it('steals opponent flower and places it on players table', () => {
      const targetFlower = { id: 10, type: 'Lily', points: 10 }
      players.addCardToTable(targetFlower, 1)

      const waterCard = { id: 21, type: 'Water' }
      players.addCardToPlayer(0, waterCard)

      gameLogicManager.handlePlayedCard(waterCard, 0)
      expect(gameLogicManager.currentAction).toBe('Water')
      expect(turn.select).toBe(1) // Targeted player 1

      gameLogicManager.endWater(targetFlower, 1)

      expect(players.tableForId(1)).toHaveLength(0)
      expect(players.tableForId(0)).toHaveLength(1)
      expect(players.tableForId(0)[0].id).toBe(10)
      expect(turn.select).toBe(-1)
      expect(gameLogicManager.nextTurn).toHaveBeenCalled()
    })
  })

  describe('Pest Action Card', () => {
    it('allows Pest only when opponent has flowers', () => {
      expect(gameLogicManager._canUsePest(0)).toBe(false)

      players.addCardToTable({ id: 5, type: 'Daisy', points: 5 }, 1)
      expect(gameLogicManager._canUsePest(0)).toBe(true)
    })

    it('destroys opponent flower', () => {
      const targetFlower = { id: 5, type: 'Daisy', points: 5 }
      players.addCardToTable(targetFlower, 1)

      const pestCard = { id: 24, type: 'Pest' }
      players.addCardToPlayer(0, pestCard)

      gameLogicManager.handlePlayedCard(pestCard, 0)
      expect(gameLogicManager.currentAction).toBe('Pest')
      expect(turn.select).toBe(1)

      gameLogicManager.endPest(targetFlower, 1)
      expect(players.tableForId(1)).toHaveLength(0)
      expect(turn.select).toBe(-1)
      expect(gameLogicManager.nextTurn).toHaveBeenCalled()
    })
  })

  describe('Prune Action Card', () => {
    it('allows Prune only when player has cards on table', () => {
      expect(gameLogicManager._canUsePrune(0)).toBe(false)

      players.addCardToTable({ id: 1, type: 'Rose', points: 1 }, 0)
      expect(gameLogicManager._canUsePrune(0)).toBe(true)
    })

    it('removes a flower from own table to free space', () => {
      const rose = { id: 1, type: 'Rose', points: 1 }
      players.addCardToTable(rose, 0)

      const pruneCard = { id: 22, type: 'Prune' }
      players.addCardToPlayer(0, pruneCard)

      gameLogicManager.handlePlayedCard(pruneCard, 0)
      expect(gameLogicManager.currentAction).toBe('Prune')
      expect(turn.select).toBe(0)

      gameLogicManager.endPrune(rose, 0)
      expect(players.tableForId(0)).toHaveLength(0)
      expect(turn.select).toBe(-1)
      expect(gameLogicManager.nextTurn).toHaveBeenCalled()
    })
  })

  describe('Fertilize Action Card & Edge Cases', () => {
    it('allows Fertilize only if table has unfertilized cards', () => {
      expect(gameLogicManager._canUseFertilize(0)).toBe(false)

      const lily = { id: 1, type: 'Lily', points: 10 }
      players.addCardToTable(lily, 0)
      expect(gameLogicManager._canUseFertilize(0)).toBe(true)

      // Once fertilized, it cannot be fertilized again
      players.doubleCardFromTable(lily, 0)
      expect(lily.fertilized).toBe(true)
      expect(gameLogicManager._canUseFertilize(0)).toBe(false)
    })

    it('caps points at 15 for 10-point Lily', () => {
      const lily = { id: 1, type: 'Lily', points: 10 }
      players.addCardToTable(lily, 0)

      const fertilizeCard = { id: 23, type: 'Fertilize' }
      players.addCardToPlayer(0, fertilizeCard)

      gameLogicManager.handlePlayedCard(fertilizeCard, 0)
      gameLogicManager.endFertilize(lily, 0)

      expect(lily.points).toBe(15) // Not 20!
      expect(lily.fertilized).toBe(true)
    })

    it('correctly picks highest unfertilized card for Fertilize', () => {
      const rose = { id: 1, type: 'Rose', points: 1 }
      const daisy = { id: 2, type: 'Daisy', points: 5, fertilized: true }
      const sunflower = { id: 3, type: 'Sunflower', points: 3 }

      players.addCardToTable(rose, 0)
      players.addCardToTable(daisy, 0)
      players.addCardToTable(sunflower, 0)

      // Daisy is fertilized, so Sunflower (3) should be selected over Rose (1)
      const best = gameLogicManager.bestCardToFertilize(0)
      expect(best.id).toBe(3)
      expect(best.points).toBe(3)
    })
  })

  describe('Game Over & Deck Exhaustion', () => {
    it('isGameOver returns true when any player reaches 20 points', () => {
      expect(gameLogicManager.isGameOver()).toBe(false)

      players.addCardToTable({ id: 1, type: 'Lily', points: 15 }, 0)
      players.addCardToTable({ id: 2, type: 'Daisy', points: 5 }, 0)
      players.score()

      expect(players.scoreForId(0)).toBe(20)
      expect(gameLogicManager.isGameOver()).toBe(true)
    })

    it('detects when player cannot draw if deck is exhausted', () => {
      deck.idx = []
      expect(gameLogicManager._canDrawCard(0)).toBe(false)
      expect(gameLogicManager.drawCard(0)).toBe(false)
    })

    it('prevents drawing when hand already has 5 cards', () => {
      for (let i = 0; i < 5; i++) {
        players.addCardToPlayer(0, { id: i, type: 'Rose', points: 1 })
      }
      expect(gameLogicManager._canDrawCard(0)).toBe(false)
    })
  })
})
