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
    this.pendingActionCard = null
    this.pendingPlayerId = null
    this.players = null
    this.deck = null
    this.turn = null
    this.aiTimeoutId = null
    this.isSimulating = false
    this.logHistory = []
    this.listeners = []
  }

  onLog(listener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  _getPlayerName(id) {
    return id === K.AI_PLAYER_ID ? 'AI' : 'You'
  }

  log(message, type = 'info', meta = {}) {
    if (this.isSimulating) return
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      turnCount: this.turn ? this.turn.count : 0,
      turnId: this.turn ? this.turn.id : null,
      message,
      type,
      scores: {
        ai: this._getScore(0),
        human: this._getScore(1)
      },
      ...meta
    }
    this.logHistory.push(entry)
    for (const listener of this.listeners) {
      try {
        listener(entry, this.logHistory)
      } catch (e) {
        console.error('Error in log listener:', e)
      }
    }

    const colors = {
      turn: 'color: #3498db; font-weight: bold;',
      play: 'color: #2ecc71; font-weight: bold;',
      action: 'color: #f39c12; font-weight: bold;',
      draw: 'color: #9b59b6;',
      cancel: 'color: #e74c3c;',
      win: 'color: #e67e22; font-size: 1.1em; font-weight: bold;',
      info: 'color: #95a5a6;'
    }
    const style = colors[type] || colors.info
    console.log(`%c[Flower Power] ${message}`, style, `(Scores - AI: ${entry.scores.ai}, You: ${entry.scores.human})`)
  }

  // GAME SETUP METHODS
  newGame() {
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId)
      this.aiTimeoutId = null
    }
    this.logHistory = []
    this.currentAction = undefined
    this.pendingActionCard = null
    this.pendingPlayerId = null
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

    this.log(`Game started! Starting player: ${this._getPlayerName(this.turn.id)}`, 'turn')

    if (this.turn.id === K.AI_PLAYER_ID) {
      this.aiTimeoutId = setTimeout(() => this.doNextTurn(), 600)
    }
  }

  deal() {
    for (let i = 0; i < K.NUM_PLAYERS; i++) {
      for (let j = 0; j < 5; j++) {
        this.players.addCardToPlayer(i, this.deck.pop())
      }
    }
    this.log('Initial hands dealt (5 cards each)', 'info')
  }

  _getScore(playerId) {
    if (!this.players || !this.players.players || !this.players.players[playerId]) return 0
    return this.players.tableForId(playerId).reduce((sum, card) => sum + (card.points || 0), 0)
  }

  // GAME FLOW METHODS
  isGameOver() {
    for (let i = 0; i < K.NUM_PLAYERS; i++) {
      if (this._getScore(i) >= K.WIN_SCORE) {
        return true
      }
    }

    if (this.deck && this.deck.idx && this.deck.idx.length === 0) {
      const p0Moves = this.players.handForId(0).some(card => this._canPlayCard(card, 0))
      const p1Moves = this.players.handForId(1).some(card => this._canPlayCard(card, 1))
      if (!p0Moves && !p1Moves) {
        return true
      }
    }

    return false
  }

  getWinner() {
    const score0 = this._getScore(0)
    const score1 = this._getScore(1)
    if (score0 >= K.WIN_SCORE && score1 < K.WIN_SCORE) return 0
    if (score1 >= K.WIN_SCORE && score0 < K.WIN_SCORE) return 1
    if (score0 >= K.WIN_SCORE && score1 >= K.WIN_SCORE) {
      return score0 > score1 ? 0 : score1 > score0 ? 1 : -1
    }
    if (this.deck && this.deck.idx && this.deck.idx.length === 0) {
      if (score0 > score1) return 0
      if (score1 > score0) return 1
      return -1
    }
    return null
  }

  nextTurn() { 
    if (this.aiTimeoutId) {
      clearTimeout(this.aiTimeoutId)
      this.aiTimeoutId = null
    }
    this.turn.next()
    const nextPlayer = this._getPlayerName(this.turn.id)
    this.log(`Turn ${this.turn.count}: It is now ${nextPlayer}'s turn`, 'turn')

    if (this.isGameOver()) {
      const winner = this.getWinner()
      const winnerName = winner === -1 ? 'Nobody (Tie)' : this._getPlayerName(winner)
      this.log(`Game Over! Winner: ${winnerName} (Final: AI ${this._getScore(0)} - You ${this._getScore(1)})`, 'win')
      return
    }

    if (!this.isSimulating && this.turn.id === K.AI_PLAYER_ID) {
      this.aiTimeoutId = setTimeout(() => this.doNextTurn(), 600)
    }
  }

  doNextTurn() { 
    this.aiTimeoutId = null
    if (this.isGameOver()) return
    if (this.turn.id === K.AI_PLAYER_ID) {
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
      const opponentScore = this._getScore(opId)
      const difficulty = K.DIFFICULTY[K.currentDifficulty]

      // DEFENSIVE MODE: Opponent near victory (DEFENSIVE_THRESHOLD+ points) - prioritize disruption
      if (difficulty.defensivePlay && opponentScore >= K.DEFENSIVE_THRESHOLD) {
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
      const card = this.deck.pop()
      this.players.addCardToPlayer(playerId, card)
      this.log(`${this._getPlayerName(playerId)} drew a card (${this.deck.idx.length} left in deck)`, 'draw')
      this.nextTurn()
      return true
    }
    return false
  }

  playCardForId(card, playerId) {
    const allowNextTurn = this.handlePlayedCard(card, playerId)
    if (allowNextTurn) {
      this.nextTurn()
    }
  }

  discardFromTableForId(card, playerId) {
    if (this._canDiscardFromTable(playerId)) {
      this.players.removeCardFromTable(card, playerId)
      this.turn.select = -1
      this.log(`${this._getPlayerName(playerId)} discarded ${card.type} from table`, 'action')
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
        if (card.fertilized) return
        this.endFertilize(card, playerId)
        break
    }
  }

  cancelCurrentAction(playerId) {
    if (this.pendingActionCard && this.pendingPlayerId === playerId) {
      const actionName = this.currentAction
      this.players.addCardToPlayer(playerId, this.pendingActionCard)
      this.pendingActionCard = null
      this.pendingPlayerId = null
      this.currentAction = undefined
      this.turn.select = -1
      this.log(`${this._getPlayerName(playerId)} cancelled ${actionName} action`, 'cancel')
      return true
    }
    return false
  }

  handlePlayedCard(card, playerId) {
    switch (card.type) {
      case ACTIONS.PRUNE:
        this.currentAction = ACTIONS.PRUNE
        this.log(`${this._getPlayerName(playerId)} initiated Prune action`, 'action')
        return this.startPrune(card, playerId)
      case ACTIONS.PEST:
        this.currentAction = ACTIONS.PEST
        this.log(`${this._getPlayerName(playerId)} initiated Pest action`, 'action')
        return this.startPest(card, playerId)
      case ACTIONS.WATER:
        this.currentAction = ACTIONS.WATER
        this.log(`${this._getPlayerName(playerId)} initiated Water action`, 'action')
        return this.startWater(card, playerId)
      case ACTIONS.FERTILIZE:
        this.currentAction = ACTIONS.FERTILIZE
        this.log(`${this._getPlayerName(playerId)} initiated Fertilize action`, 'action')
        return this.startFertilize(card, playerId)
      default:
        // Add flower to table
        if (this.players.tableForId(playerId).length < 5) {
          this.currentAction = undefined
          this.players.playCardFromHand(card, playerId)
          this.log(`${this._getPlayerName(playerId)} planted ${card.type} (+${card.points} pts)`, 'play')
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
    
    this.pendingActionCard = card
    this.pendingPlayerId = playerId
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = playerId
    return false
  }

  endPrune(card, playerId) {
    this.pendingActionCard = null
    this.pendingPlayerId = null
    this.currentAction = undefined
    this.players.removeCardFromTable(card, playerId)
    this.turn.select = -1
    this.log(`${this._getPlayerName(playerId)} pruned ${card.type} (${card.points} pts) from their table`, 'action')
    this.nextTurn()
  }

  // CARD ACTION METHODS - PEST
  startPest(card, playerId) {
    const opId = this._otherPlayer(playerId)
    
    if (this.players.tableForId(opId).length === 0) {
      this.currentAction = undefined
      return false
    }
    
    this.pendingActionCard = card
    this.pendingPlayerId = playerId
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = opId
    return false
  }

  endPest(card, playerId) {
    this.pendingActionCard = null
    this.pendingPlayerId = null
    this.currentAction = undefined
    this.players.removeCardFromTable(card, playerId)
    this.turn.select = -1
    const victim = this._getPlayerName(playerId)
    const attacker = this._getPlayerName(this._otherPlayer(playerId))
    this.log(`${attacker} used Pest to destroy ${card.type} (${card.points} pts) on ${victim}'s table`, 'action')
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
    
    this.pendingActionCard = card
    this.pendingPlayerId = playerId
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = opId
    return false
  }

  endWater(card, playerId) {
    this.pendingActionCard = null
    this.pendingPlayerId = null
    this.currentAction = undefined
    const opId = this._otherPlayer(playerId)
    const stolenCard = this.players.removeCardFromTable(card, playerId)
    this.players.addCardToTable(stolenCard, opId)
    this.turn.select = -1
    const victim = this._getPlayerName(playerId)
    const thief = this._getPlayerName(opId)
    this.log(`${thief} used Water to steal ${stolenCard.type} (${stolenCard.points} pts) from ${victim}`, 'action')
    this.nextTurn()
  }

  // CARD ACTION METHODS - FERTILIZE
  startFertilize(card, playerId) {
    if (this.players.tableForId(playerId).length === 0) {
      this.currentAction = undefined
      return false
    }
    
    this.pendingActionCard = card
    this.pendingPlayerId = playerId
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = playerId
    return false
  }

  endFertilize(card, playerId) {
    this.pendingActionCard = null
    this.pendingPlayerId = null
    this.currentAction = undefined
    const oldPoints = card.points
    this.players.doubleCardFromTable(card, playerId)
    this.turn.select = -1
    this.log(`${this._getPlayerName(playerId)} fertilized ${card.type} (${oldPoints} ➔ ${card.points} pts)`, 'action')
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
    this.isSimulating = true
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
    this.isSimulating = false
    return {
      winner: score0 >= K.WIN_SCORE ? 0 : score1 >= K.WIN_SCORE ? 1 : -1,
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
  window.gameLog = () => gameLogicManager.logHistory
}
