import * as K from "../data/constants.js"
import { defineStore } from "pinia"

export const deckStore = defineStore("deck", {
  state: () => {
    return { deck: {}, idx: [], discard: [] }
  },
  getters: {
    topDiscard: (state) => (state.discard.length > 0 ? state.discard[state.discard.length - 1] : null),
    discardCount: (state) => state.discard.length
  },
  actions: {
    create() {
      this.deck = {}
      this.idx = []
      this.discard = []
      // Create deck
      for (let i = 0; i < K.DECK_SIZE; i++) {
        if (i < 20) {
          // Flower cards
          let flowerCard = {
            id: i,
            type: K.FLOWER_TYPES[Math.floor(i / 5)],
            points: K.POINT_VALUES[Math.floor(i / 5)]
          }
          this.deck[i] = flowerCard
        } else {
          // Action cards
          let actionCard = {
            id: i,
            type: K.ACTION_TYPES[Math.floor((i - 20) / 3)]
          }
          this.deck[i] = actionCard
        }
        this.idx.push(i)
      }
    },
    shuffle() {
      this.idx = this.idx
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
    },
    pop() {
      return this.deck[this.idx.pop()]
    },
    discardCard(card) {
      if (card) {
        this.discard.push({ ...card })
      }
    },
    log() {
      for (let i = 0; i < this.idx.length; i++) {
        console.log(`id ${i}`, this.deck[this.idx[i]])
      }
    }
  }
})
