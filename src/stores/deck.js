import * as K from "../data/constants.js"
import { defineStore } from "pinia"

export const deckStore = defineStore("deck", {
  state: () => {
    return { deck: {}, idx: [] }
  },
  getters: {},
  actions: {
    create() {
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
    log() {
      for (let i = 0; i < this.idx.length; i++) {
        console.log(`id ${i}`, this.deck[this.idx[i]])
      }
    }
  }
})
