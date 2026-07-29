import { defineStore } from "pinia"
import * as K from "../data/constants.js"

export const playersStore = defineStore("players", {
  state: () => {
    return { players: {} }
  },
  getters: {
    handForId: (state) => {
      return (id) => state.players[id].hand
    },
    tableForId: (state) => {
      return (id) => state.players[id].table
    },
    scoreForId: (state) => {
      return (id) => state.players[id].score
    }
  },
  actions: {
    reset() {
      this.players = {}
      for (let i = 0; i < K.NUM_PLAYERS; i++) {
        this.addPlayer(i)
      }
    },
    addCardToPlayer(id, card) {
      this.players[id].hand.push(card)
    },
    addPlayer(id) {
      let player = {
        hand: [],
        table: [],
        score: 0
      }
      this.players[id] = player
    },
    removePlayer(id) {
      delete this.players[id]
    },
    score() {
      for (let i = 0; i < K.NUM_PLAYERS; i++) {
        this.players[i].score = 0
        for (let j = 0; j < this.players[i].table.length; j++) {
          this.players[i].score += this.players[i].table[j].points
        }
      }
    },
    log() {
      for (let i = 0; i < K.NUM_PLAYERS; i++) {
        console.log(`id ${i}`, this.players[i])
      }
    },
    playCardFromHand(card, playerId) {
      let playedCard = this.removeCardFromHand(card, playerId)
      this.addCardToTable(playedCard, playerId)
    },
    addCardToTable(card, playerId) {
      this.players[playerId].table.push(card)
    },
    doubleCardFromTable(card, playerId) {
      let playedCardIdx = this.players[playerId].table.findIndex(
        ({ id }) => id === card.id
      )
      const currentPoints = this.players[playerId].table[playedCardIdx].points
      const newPoints = Math.min(currentPoints * 2, 15)
      this.players[playerId].table[playedCardIdx].points = newPoints
      this.players[playerId].table[playedCardIdx].fertilized = true
    },
    removeCardFromHand(card, playerId) {
      let playedCardIdx = this.players[playerId].hand.findIndex(
        ({ id }) => id === card.id
      )
      return this.players[playerId].hand.splice(playedCardIdx, 1)[0]
    },
    removeCardFromTable(card, playerId) {
      let playedCardIdx = this.players[playerId].table.findIndex(
        ({ id }) => id === card.id
      )
      return this.players[playerId].table.splice(playedCardIdx, 1)[0]
    },
    isFromHand(card, playerId) {
      return (
        this.players[playerId].hand.findIndex(({ id }) => id === card.id) >= 0
      )
    }
  }
})
