import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { deckStore } from '@/stores/deck'
import { playersStore } from '@/stores/players'
import { turnStore } from '@/stores/turn'
import * as K from '@/data/constants'

describe('Pinia Stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('deckStore', () => {
    it('creates 32 cards with correct composition and points', () => {
      const deck = deckStore()
      deck.create()

      expect(deck.idx).toHaveLength(32)
      expect(Object.keys(deck.deck)).toHaveLength(32)

      // 20 flowers (5 each of Rose, Sunflower, Daisy, Lily)
      const flowers = Object.values(deck.deck).filter(c => c.points !== undefined)
      expect(flowers).toHaveLength(20)

      const roseCards = flowers.filter(c => c.type === 'Rose')
      expect(roseCards).toHaveLength(5)
      expect(roseCards[0].points).toBe(1)

      const sunflowerCards = flowers.filter(c => c.type === 'Sunflower')
      expect(sunflowerCards).toHaveLength(5)
      expect(sunflowerCards[0].points).toBe(3)

      const daisyCards = flowers.filter(c => c.type === 'Daisy')
      expect(daisyCards).toHaveLength(5)
      expect(daisyCards[0].points).toBe(5)

      const lilyCards = flowers.filter(c => c.type === 'Lily')
      expect(lilyCards).toHaveLength(5)
      expect(lilyCards[0].points).toBe(10)

      // 12 action cards (3 each of Water, Prune, Fertilize, Pest)
      const actions = Object.values(deck.deck).filter(c => c.points === undefined)
      expect(actions).toHaveLength(12)

      for (const actionType of K.ACTION_TYPES) {
        const count = actions.filter(c => c.type === actionType).length
        expect(count).toBe(3)
      }
    })

    it('shuffles the card indices while preserving length', () => {
      const deck = deckStore()
      deck.create()
      const originalOrder = [...deck.idx]

      deck.shuffle()
      expect(deck.idx).toHaveLength(32)
      expect(new Set(deck.idx).size).toBe(32)
    })

    it('pops cards until empty and handles deck exhaustion gracefully', () => {
      const deck = deckStore()
      deck.create()

      const popped = deck.pop()
      expect(popped).toBeDefined()
      expect(deck.idx).toHaveLength(31)

      // Pop all remaining cards
      while (deck.idx.length > 0) {
        deck.pop()
      }

      expect(deck.idx).toHaveLength(0)
      const emptyPop = deck.pop()
      expect(emptyPop).toBeUndefined()
    })

    it('tracks discarded cards in discard pile with topDiscard getter', () => {
      const deck = deckStore()
      deck.create()
      expect(deck.discard).toHaveLength(0)
      expect(deck.topDiscard).toBeNull()
      expect(deck.discardCount).toBe(0)

      const card1 = { id: 1, type: 'Rose', points: 1 }
      const card2 = { id: 25, type: 'Water' }

      deck.discardCard(card1)
      expect(deck.discardCount).toBe(1)
      expect(deck.topDiscard).toEqual(card1)

      deck.discardCard(card2)
      expect(deck.discardCount).toBe(2)
      expect(deck.topDiscard).toEqual(card2)

      // Re-create resets discard
      deck.create()
      expect(deck.discardCount).toBe(0)
      expect(deck.topDiscard).toBeNull()
    })
  })

  describe('playersStore', () => {
    it('initializes and adds players with empty hand, table, and 0 score', () => {
      const players = playersStore()
      players.reset()

      for (let i = 0; i < K.NUM_PLAYERS; i++) {
        expect(players.handForId(i)).toEqual([])
        expect(players.tableForId(i)).toEqual([])
        expect(players.scoreForId(i)).toBe(0)
      }
    })

    it('adds cards to player hand', () => {
      const players = playersStore()
      players.reset()

      const card = { id: 1, type: 'Rose', points: 1 }
      players.addCardToPlayer(0, card)

      expect(players.handForId(0)).toHaveLength(1)
      expect(players.isFromHand(card, 0)).toBe(true)
    })

    it('plays card from hand to table and calculates score', () => {
      const players = playersStore()
      players.reset()

      const flower1 = { id: 1, type: 'Daisy', points: 5 }
      const flower2 = { id: 2, type: 'Lily', points: 10 }

      players.addCardToPlayer(0, flower1)
      players.addCardToPlayer(0, flower2)

      players.playCardFromHand(flower1, 0)
      expect(players.handForId(0)).toHaveLength(1)
      expect(players.tableForId(0)).toHaveLength(1)

      players.playCardFromHand(flower2, 0)
      expect(players.handForId(0)).toHaveLength(0)
      expect(players.tableForId(0)).toHaveLength(2)

      players.score()
      expect(players.scoreForId(0)).toBe(15)
    })

    it('removes cards from table correctly', () => {
      const players = playersStore()
      players.reset()

      const card = { id: 1, type: 'Sunflower', points: 3 }
      players.addCardToTable(card, 0)
      expect(players.tableForId(0)).toHaveLength(1)

      const removed = players.removeCardFromTable(card, 0)
      expect(removed.id).toBe(1)
      expect(players.tableForId(0)).toHaveLength(0)
    })

    it('fertilizes cards: doubles points, caps at 15, and sets fertilized flag', () => {
      const players = playersStore()
      players.reset()

      const daisy = { id: 1, type: 'Daisy', points: 5 }
      const lily = { id: 2, type: 'Lily', points: 10 }
      const rose = { id: 3, type: 'Rose', points: 1 }

      players.addCardToTable(daisy, 0)
      players.addCardToTable(lily, 0)
      players.addCardToTable(rose, 0)

      // Daisy: 5 -> 10
      players.doubleCardFromTable(daisy, 0)
      expect(players.tableForId(0)[0].points).toBe(10)
      expect(players.tableForId(0)[0].fertilized).toBe(true)

      // Lily: 10 -> 15 (capped at 15 instead of 20)
      players.doubleCardFromTable(lily, 0)
      expect(players.tableForId(0)[1].points).toBe(15)
      expect(players.tableForId(0)[1].fertilized).toBe(true)

      // Rose: 1 -> 2
      players.doubleCardFromTable(rose, 0)
      expect(players.tableForId(0)[2].points).toBe(2)
      expect(players.tableForId(0)[2].fertilized).toBe(true)

      players.score()
      expect(players.scoreForId(0)).toBe(27)
    })
  })

  describe('turnStore', () => {
    it('toggles turn id and increments turn count on next()', () => {
      const turn = turnStore()
      turn.id = 0
      turn.count = 0

      turn.next()
      expect(turn.id).toBe(1)
      expect(turn.count).toBe(1)

      turn.next()
      expect(turn.id).toBe(0)
      expect(turn.count).toBe(2)
    })
  })
})
