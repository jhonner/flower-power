import * as K from "../data/constants.js"
import { defineStore } from "pinia"

export const turnStore = defineStore("turn", {
  state: () => {
    return { id: 0, count: 0, select: -1 }
  },
  getters: {},
  actions: {
    random() {
      this.id = 1 // Math.round(Math.random())
      console.log("random turn ", this.id)
    },
    next() {
      this.id = (this.id + 1) % K.NUM_PLAYERS
      this.count += 1
    }
  }
})
