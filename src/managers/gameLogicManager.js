import { playersStore } from "@/stores/players"
import { deckStore } from "@/stores/deck"
import { turnStore } from "@/stores/turn"
import * as K from "../data/constants.js"

// Action types as constants
const ACTIONS = {
  PRUNE: 'Prune',
  PEST: 'Pest',
  WATER: 'Water',
  FERTILIZE: 'Fertilize'
}

class GameLogicManager {
  constructor() {
    this.currentAction = undefined
    this.players = null
    this.deck = null
    this.turn = null
  }

  // GAME SETUP METHODS
  newGame() {
    this.players = playersStore()
    this.deck = deckStore()
    this.turn = turnStore()
    
    // Initialize players
    for (let i = 0; i < K.NUM_PLAYERS; i++) {
      this.players.addPlayer(i)
    }
    
    // Prepare deck
    this.deck.create()
    this.deck.shuffle()
    
    // Set up turn and deal cards
    this.turn.random()
    this.deal()
  }

  deal() {
    for (let i = 0; i < K.NUM_PLAYERS; i++) {
      for (let j = 0; j < 5; j++) {
        this.players.addCardToPlayer(i, this.deck.pop())
      }
    }
  }

  // GAME FLOW METHODS
  isGameOver() {
    for (let i = 0; i < K.NUM_PLAYERS; i++) {
      if (this.players.scoreForId(i) >= 20) {
        return true
      }
    }
    return false
  }

  nextTurn() { 
    this.turn.next()
    setTimeout(() => this.doNextTurn(), 500)
  }

  doNextTurn() { 
    if (this.turn.id === K.AI_PLAYER_ID) {  // Assuming AI_PLAYER_ID is a constant for the AI player
      this.playAITurn(this.turn.id)
    }   
  }

  // AI LOGIC
  playAITurn(playerId) {
    const playerHand = this.players.handForId(playerId)
    const availableCards = playerHand.filter(card => this._canPlayCard(card, playerId))
    let cardPlayed = false

    if(availableCards.length > 0) {
      cardPlayed = this.bestStrategy(playerId, availableCards)
    }

    // If no offensive or defensive moves, attempt to draw a card
    if (!cardPlayed && this._canDrawCard(playerId)) {
      this.drawCard(playerId)
    }

  }
  
  bestStrategy(playerId, availableCards) {
      const opId = this._otherPlayer(playerId)
      const opponentScore = this.players.scoreForId(opId)
      const difficulty = K.DIFFICULTY[K.currentDifficulty]

      // DEFENSIVE MODE: Opponent near victory (15+ points) - prioritize disruption
      if (difficulty.defensivePlay && opponentScore >= 15) {
        // Prioritize Pest to destroy their high-value cards
        if (availableCards.some(card => card.type === ACTIONS.PEST) && this._canUsePest(playerId)) {
          const target = this.bestCardToPest(playerId)
          if (target && target.points >= 5) {
            const pestCard = availableCards.find(card => card.type === ACTIONS.PEST)
            this.playCardForId(pestCard, playerId)
            this.endPest(target, opId)
            return true
          }
        }
        // Then Water to steal their cards (lower threshold in defensive mode)
        if (difficulty.useWater && availableCards.some(card => card.type === ACTIONS.WATER) && this._canUseWater(playerId)) {
          const target = this.bestCardToSteal(playerId)
          if (target && target.points >= 3) {
            const waterCard = availableCards.find(card => card.type === ACTIONS.WATER)
            this.playCardForId(waterCard, playerId)
            this.endWater(target, opId)
            return true
          }
        }
      }

      // OFFENSIVE MODE: Play highest from hand
      const pointCards = availableCards.filter(card => card.points !== undefined)
      if (pointCards && pointCards.length > 0) {
        let highestCard = pointCards.reduce((prev, current) => {
          return (prev && prev.points > current.points) ? prev : current
        })
        if (this._canPlayCard(highestCard, playerId)) {
          this.playCardForId(highestCard, playerId)
          return true
        }
      }

      // Use Pest card to remove key opponent plants
      if (availableCards.some(card => card.type === ACTIONS.PEST)) {
        if (this._canUsePest(playerId)) {
          const pestCard = availableCards.find(card => card.type === ACTIONS.PEST)
          let bestCardToPest = this.bestCardToPest(playerId)
          this.playCardForId(pestCard, playerId)
          this.endPest(bestCardToPest, opId)
          return true
        }
      }

      // Use Fertilize card to double points of highest card on table
      if (availableCards.some(card => card.type === ACTIONS.FERTILIZE)) {
        if (this._canUseFertilize(playerId)) {
          const fertilizeCard = availableCards.find(card => card.type === ACTIONS.FERTILIZE)
          let bestCardToFertilize = this.bestCardToFertilize(playerId)
          this.playCardForId(fertilizeCard, playerId)
          this.endFertilize(bestCardToFertilize, playerId)
          return true
        }
      }

      // Use Water card to steal high-value opponent plants (difficulty-gated)
      if (difficulty.useWater && availableCards.some(card => card.type === ACTIONS.WATER)) {
        if (this._canUseWater(playerId)) {
          const bestStealTarget = this.bestCardToSteal(playerId)
          if (bestStealTarget && bestStealTarget.points >= 5) {
            const waterCard = availableCards.find(card => card.type === ACTIONS.WATER)
            this.playCardForId(waterCard, playerId)
            this.endWater(bestStealTarget, opId)
            return true
          }
        }
      }

      // Use Prune to remove low-value cards when table is crowded (difficulty-gated)
      if (difficulty.usePrune && availableCards.some(card => card.type === ACTIONS.PRUNE)) {
        if (this._canUsePrune(playerId)) {
          const myTable = this.players.tableForId(playerId)
          if (myTable.length >= 4) {
            const lowestOnTable = this.lowestCardOnTable(playerId)
            if (lowestOnTable && lowestOnTable.points < 5) {
              const pruneCard = availableCards.find(card => card.type === ACTIONS.PRUNE)
              this.playCardForId(pruneCard, playerId)
              this.endPrune(lowestOnTable, playerId)
              return true
            }
          }
        }
      }

      return false
  }

  //find highest card on opponent's table
  bestCardToPest(playerId) {
    return this.highestOpponentsCardOnTable(playerId)
  }
  
  //find highest card on table for playerId (unfertilized only)
  bestCardToFertilize(playerId) {
    const table = this.players.tableForId(playerId)
    const unfertilized = table.filter(card => !card.fertilized)
    if (unfertilized.length === 0) return null
    return unfertilized.reduce((prev, current) =>
      (prev && prev.points > current.points) ? prev : current
    )
  }

  //find highest card on opponent's table
  highestOpponentsCardOnTable(playerId) {
    const opId = this._otherPlayer(playerId)
    return this.highestCardOnTable(opId)
  }

  //find highest card on opponent's table
  highestCardOnTable(playerId) {
    const table = this.players.tableForId(playerId)
    return table.reduce((prev, current) => {
      return (prev && prev.points > current.points) ? prev : current
    })
  }

  // Find best card to steal from opponent (highest points)
  bestCardToSteal(playerId) {
    const opId = this._otherPlayer(playerId)
    const opponentTable = this.players.tableForId(opId)
    if (opponentTable.length === 0) return null
    return opponentTable.reduce((prev, current) =>
      (prev && prev.points > current.points) ? prev : current
    )
  }

  // Find lowest card on own table (for Prune strategy)
  lowestCardOnTable(playerId) {
    const table = this.players.tableForId(playerId)
    if (table.length === 0) return null
    return table.reduce((prev, current) =>
      (prev && prev.points < current.points) ? prev : current
    )
  }

  // find highest card in hand
  highestCardInHand(playerId) {
    const hand = this.players.handForId(playerId)
    return hand.reduce((prev, current) => {
      return (prev && prev.points > current.points) ? prev : current
    })   
  }

  // find lowest card in hand
  lowestCardInHand(playerId) {
    const hand = this.players.handForId(playerId)
    return hand.reduce((prev, current) => {
      return (prev && prev.points < current.points) ? prev : current
    }) 
  }

  // PLAYER ACTIONS
  drawCard(playerId) {
    if (this._canDrawCard(playerId)) {
      this.players.addCardToPlayer(playerId, this.deck.pop())
      this.nextTurn()
      return true
    }
    return false
  }

  playCardForId(card, playerId) {
    const allowNextTurn = this.handlePlayedCard(card, playerId)
    if (allowNextTurn || this.turn.id === K.AI_PLAYER_ID) {
      this.nextTurn()
    }
  }

  discardFromTableForId(card, playerId) {
    if (this._canDiscardFromTable(playerId)) {
      this.players.removeCardFromTable(card, playerId)
      this.turn.select = -1
      this.nextTurn()
      return true
    }
    return false
  }

  handleCardFromTableForId(card, playerId) {
    switch (this.currentAction) {
      case ACTIONS.PRUNE:
        this.endPrune(card, playerId)
        break
      case ACTIONS.PEST:
        this.endPest(card, playerId)
        break
      case ACTIONS.WATER:
        this.endWater(card, playerId)
        break
      case ACTIONS.FERTILIZE:
        this.endFertilize(card, playerId)
        break
    }
    this.currentAction = undefined
  }

  handlePlayedCard(card, playerId) {
    switch (card.type) {
      case ACTIONS.PRUNE:
        this.currentAction = ACTIONS.PRUNE
        return this.startPrune(card, playerId)
      case ACTIONS.PEST:
        this.currentAction = ACTIONS.PEST
        return this.startPest(card, playerId)
      case ACTIONS.WATER:
        this.currentAction = ACTIONS.WATER
        return this.startWater(card, playerId)
      case ACTIONS.FERTILIZE:
        this.currentAction = ACTIONS.FERTILIZE
        return this.startFertilize(card, playerId)
      default:
        // Add flower to table
        if (this.players.tableForId(playerId).length < 5) {
          this.currentAction = undefined
          this.players.playCardFromHand(card, playerId)
          return true
        }
        return false
    }
  }

  // CARD ACTION METHODS - PRUNE
  startPrune(card, playerId) {
    if (this.players.tableForId(playerId).length === 0) {
      this.currentAction = undefined
      return false
    }
    
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = playerId
    return false
  }

  endPrune(card, playerId) {
    this.players.removeCardFromTable(card, playerId)
    this.turn.select = -1
    this.nextTurn()
  }

  // CARD ACTION METHODS - PEST
  startPest(card, playerId) {
    const opId = this._otherPlayer(playerId)
    
    if (this.players.tableForId(opId).length === 0) {
      this.currentAction = undefined
      return false
    }
    
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = opId
    return false
  }

  endPest(card, playerId) {
    this.players.removeCardFromTable(card, playerId)
    this.turn.select = -1
    this.nextTurn()
  }

  // CARD ACTION METHODS - WATER
  startWater(card, playerId) {
    const opId = this._otherPlayer(playerId)    
    if (this.players.tableForId(playerId).length > 4 || 
        this.players.tableForId(opId).length === 0) {
      this.currentAction = undefined
      return false
    }
    
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = opId
    return false
  }

  endWater(card, playerId) {
    const opId = this._otherPlayer(playerId)
    const stolenCard = this.players.removeCardFromTable(card, playerId)
    this.players.addCardToTable(stolenCard, opId)
    this.turn.select = -1
    this.nextTurn()
  }

  // CARD ACTION METHODS - FERTILIZE
  startFertilize(card, playerId) {
    if (this.players.tableForId(playerId).length === 0) {
      this.currentAction = undefined
      return false
    }
    
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = playerId
    return false
  }

  endFertilize(card, playerId) {
    this.players.doubleCardFromTable(card, playerId)
    this.turn.select = -1
    this.nextTurn()
  }

  // HELPER METHODS
  _canDrawCard(playerId) {
    return this.deck.idx.length > 0 && 
           this.players.handForId(playerId).length < 5
  }

  _canDiscardFromTable(playerId) {
    return this.players.handForId(playerId).length > 4 && 
           this.players.tableForId(playerId).length > 4
  }

  // Helper to determine if a card can be played
  _canPlayCard(card, playerId) {
    switch (card.type) {
      case ACTIONS.PRUNE:
        return this._canUsePrune(playerId)
      case ACTIONS.PEST:
        return this._canUsePest(playerId)
      case ACTIONS.WATER:
        return this._canUseWater(playerId)
      case ACTIONS.FERTILIZE:
        return this._canUseFertilize(playerId)
      default:
        return this.players.tableForId(playerId).length < 5
    }
  }
  
  // Helper function to check if Prune can be used effectively
  _canUsePrune(playerId) {
    return this.players.tableForId(playerId).length > 0
  }

  // Helper function to check if Pest can be used effectively
  _canUsePest(playerId) {
    const opId = this._otherPlayer(playerId)
    return this.players.tableForId(opId).length > 0
  }

  // Helper function to check if Water can be used effectively
  _canUseWater(playerId) {
    const opId = this._otherPlayer(playerId)
    return this.players.tableForId(opId).length > 0 &&
            this.players.tableForId(playerId).length < 5
  }

  // Helper function to check if Fertilize can be used effectively
  _canUseFertilize(playerId) {
    const table = this.players.tableForId(playerId)
    return table.length > 0 && table.some(card => !card.fertilized)
  }

  _otherPlayer(playerId) {
    return (playerId + 1) % K.NUM_PLAYERS
  }

  // AI vs AI SIMULATION METHODS

  // Run a single AI vs AI game synchronously (no delays)
  simulateGame() {
    this.players.reset()
    this.deck.create()
    this.deck.shuffle()
    this.turn.id = Math.round(Math.random())
    this.deal()

    let turnCount = 0
    const maxTurns = 200

    while (!this.isGameOver() && turnCount < maxTurns) {
      const playerId = this.turn.id
      const playerHand = this.players.handForId(playerId)
      const availableCards = playerHand.filter(card => this._canPlayCard(card, playerId))

      let cardPlayed = false
      if (availableCards.length > 0) {
        cardPlayed = this.bestStrategy(playerId, availableCards)
      }

      if (!cardPlayed && this._canDrawCard(playerId)) {
        this.players.addCardToPlayer(playerId, this.deck.pop())
      }

      this.turn.id = this._otherPlayer(playerId)
      turnCount++
    }

    this.players.score()
    const score0 = this.players.scoreForId(0)
    const score1 = this.players.scoreForId(1)
    return {
      winner: score0 >= 20 ? 0 : score1 >= 20 ? 1 : -1,
      scores: [score0, score1],
      turns: turnCount
    }
  }

  // Run multiple simulations and return statistics
  runSimulation(numGames = 100) {
    const results = { wins: [0, 0], draws: 0, totalTurns: 0, games: [] }

    for (let i = 0; i < numGames; i++) {
      const result = this.simulateGame()
      results.games.push(result)
      results.totalTurns += result.turns

      if (result.winner === 0) results.wins[0]++
      else if (result.winner === 1) results.wins[1]++
      else results.draws++
    }

    return {
      player0Wins: results.wins[0],
      player1Wins: results.wins[1],
      draws: results.draws,
      avgTurns: Math.round(results.totalTurns / numGames),
      winRate: {
        player0: ((results.wins[0] / numGames) * 100).toFixed(1) + "%",
        player1: ((results.wins[1] / numGames) * 100).toFixed(1) + "%"
      }
    }
  }

}

// Create and export the singleton instance
export const gameLogicManager = new GameLogicManager()

// Expose for console testing
if (typeof window !== "undefined") {
  window.simGame = () => gameLogicManager.simulateGame()
  window.runSim = (n = 100) => gameLogicManager.runSimulation(n)
}
