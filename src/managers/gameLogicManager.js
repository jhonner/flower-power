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
    this.consecutivePasses = 0
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

  _formatCard(card) {
    if (!card) return 'None'
    if (card.points !== undefined) {
      const fert = card.fertilized ? ', fertilized' : ''
      return `${card.type} (${card.points} pts${fert}) [#${card.id}]`
    }
    return `${card.type} (Action) [#${card.id}]`
  }

  _formatCardList(cards) {
    if (!cards || cards.length === 0) return 'Empty'
    return cards.map(c => this._formatCard(c)).join(', ')
  }

  _getStateSnapshot() {
    if (!this.players || !this.players.players || !this.players.players[0] || !this.players.players[1]) {
      return null
    }
    return {
      deckRemaining: this.deck && this.deck.idx ? this.deck.idx.length : 0,
      aiHand: this.players.handForId(0).map(c => this._formatCard(c)),
      aiTable: this.players.tableForId(0).map(c => this._formatCard(c)),
      humanHand: this.players.handForId(1).map(c => this._formatCard(c)),
      humanTable: this.players.tableForId(1).map(c => this._formatCard(c))
    }
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
      snapshot: this._getStateSnapshot(),
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
    this.consecutivePasses = 0
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
    const aiHandStr = this._formatCardList(this.players.handForId(0))
    const humanHandStr = this._formatCardList(this.players.handForId(1))
    this.log(`Initial hands dealt (5 cards each, ${this.deck.idx.length} left in deck)`, 'info')
    this.log(`AI initial hand: [${aiHandStr}]`, 'info')
    this.log(`You initial hand: [${humanHandStr}]`, 'info')
  }

  _getScore(playerId) {
    if (!this.players || !this.players.players || !this.players.players[playerId]) return 0
    return this.players.tableForId(playerId).reduce((sum, card) => sum + (card.points || 0), 0)
  }

  _canBenefitFromTableDiscard(playerId) {
    if (!this._canDiscardFromTable(playerId)) return false
    if (this.deck && this.deck.idx && this.deck.idx.length > 0) return true
    const lowestOnTable = this.lowestCardOnTable(playerId)
    if (!lowestOnTable) return false
    const hand = this.players.handForId(playerId)
    const hasBetterFlower = hand.some(c => c.points !== undefined && c.points > lowestOnTable.points)
    const opBest = this.bestCardToSteal(playerId)
    const hasBetterSteal = hand.some(c => c.type === ACTIONS.WATER) && opBest && opBest.points > lowestOnTable.points
    return Boolean(hasBetterFlower || hasBetterSteal)
  }

  _canPlayerAct(playerId) {
    if (!this.players || !this.players.players || !this.players.players[playerId]) return false
    const hasPlayableCard = this.players.handForId(playerId).some(card => this._canPlayCard(card, playerId))
    const canDraw = this._canDrawCard(playerId)
    const canDiscard = this._canBenefitFromTableDiscard(playerId)
    return hasPlayableCard || canDraw || canDiscard
  }

  // GAME FLOW METHODS
  isGameOver() {
    for (let i = 0; i < K.NUM_PLAYERS; i++) {
      if (this._getScore(i) >= K.WIN_SCORE) {
        return true
      }
    }

    if (this.consecutivePasses >= K.NUM_PLAYERS) {
      return true
    }

    if (this.deck && this.deck.idx && this.deck.idx.length === 0) {
      const p0CanAct = this._canPlayerAct(0)
      const p1CanAct = this._canPlayerAct(1)
      if (!p0CanAct && !p1CanAct) {
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
    if (this.isGameOver()) {
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

    if (!this.isSimulating) {
      if (this.turn.id === K.AI_PLAYER_ID) {
        this.aiTimeoutId = setTimeout(() => this.doNextTurn(), 600)
      } else if (!this._canPlayerAct(this.turn.id)) {
        this.aiTimeoutId = setTimeout(() => {
          if (this.isGameOver()) return
          this.consecutivePasses++
          this.log(`${this._getPlayerName(this.turn.id)} have no valid moves — passing turn`, 'info')
          this.nextTurn()
        }, 400)
      }
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

    if (availableCards.length > 0) {
      cardPlayed = this.bestStrategy(playerId, availableCards)
    }

    // If no offensive or defensive moves, attempt to draw a card
    if (!cardPlayed && this._canDrawCard(playerId)) {
      cardPlayed = this.drawCard(playerId)
    }

    // If hand and table are full, discard lowest table card if hand holds a higher-value flower
    if (!cardPlayed && this._canBenefitFromTableDiscard(playerId)) {
      const lowestOnTable = this.lowestCardOnTable(playerId)
      if (lowestOnTable) {
        cardPlayed = this.discardFromTableForId(lowestOnTable, playerId)
      }
    }

    // If AI cannot play, draw, or profitably discard, pass turn to the other player
    if (!cardPlayed) {
      this.consecutivePasses++
      this.log(`${this._getPlayerName(playerId)} has no valid moves — passing turn`, 'info')
      this.nextTurn()
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
      this.consecutivePasses = 0
      const card = this.deck.pop()
      this.players.addCardToPlayer(playerId, card)
      this.log(
        `${this._getPlayerName(playerId)} drew ${this._formatCard(card)} (${this.deck.idx.length} left in deck)`,
        'draw',
        { drawnCard: { ...card }, deckRemaining: this.deck.idx.length }
      )
      this.nextTurn()
      return true
    }
    return false
  }

  passTurn(playerId) {
    if (this.turn.id !== playerId || this.isGameOver()) return false
    if (this.pendingActionCard) {
      this.cancelCurrentAction(playerId)
    }
    this.consecutivePasses++
    this.log(`${this._getPlayerName(playerId)} passed their turn`, 'info')
    this.nextTurn()
    return true
  }

  playCardForId(card, playerId) {
    const allowNextTurn = this.handlePlayedCard(card, playerId)
    if (allowNextTurn) {
      this.nextTurn()
    }
  }

  discardFromTableForId(card, playerId) {
    if (this._canDiscardFromTable(playerId)) {
      this.consecutivePasses = 0
      this.players.removeCardFromTable(card, playerId)
      if (this.deck && this.deck.discardCard) {
        this.deck.discardCard(card)
      }
      this.turn.select = -1
      this.log(
        `${this._getPlayerName(playerId)} discarded ${this._formatCard(card)} from table`,
        'action',
        { discardedCard: { ...card } }
      )
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
      const cardInfo = this._formatCard(this.pendingActionCard)
      this.players.addCardToPlayer(playerId, this.pendingActionCard)
      this.pendingActionCard = null
      this.pendingPlayerId = null
      this.currentAction = undefined
      this.turn.select = -1
      this.log(`${this._getPlayerName(playerId)} cancelled ${actionName} action (${cardInfo} returned to hand)`, 'cancel')
      return true
    }
    return false
  }

  handlePlayedCard(card, playerId) {
    switch (card.type) {
      case ACTIONS.PRUNE:
        this.currentAction = ACTIONS.PRUNE
        this.log(`${this._getPlayerName(playerId)} initiated Prune [#${card.id}] action`, 'action')
        return this.startPrune(card, playerId)
      case ACTIONS.PEST:
        this.currentAction = ACTIONS.PEST
        this.log(`${this._getPlayerName(playerId)} initiated Pest [#${card.id}] action`, 'action')
        return this.startPest(card, playerId)
      case ACTIONS.WATER:
        this.currentAction = ACTIONS.WATER
        this.log(`${this._getPlayerName(playerId)} initiated Water [#${card.id}] action`, 'action')
        return this.startWater(card, playerId)
      case ACTIONS.FERTILIZE:
        this.currentAction = ACTIONS.FERTILIZE
        this.log(`${this._getPlayerName(playerId)} initiated Fertilize [#${card.id}] action`, 'action')
        return this.startFertilize(card, playerId)
      default:
        // Add flower to table
        if (this.players.tableForId(playerId).length < 5) {
          this.consecutivePasses = 0
          this.currentAction = undefined
          this.players.playCardFromHand(card, playerId)
          this.log(`${this._getPlayerName(playerId)} planted ${card.type} (+${card.points} pts) [#${card.id}]`, 'play')
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
    this.consecutivePasses = 0
    if (this.deck && this.deck.discardCard) {
      if (this.pendingActionCard) this.deck.discardCard(this.pendingActionCard)
      this.deck.discardCard(card)
    }
    this.pendingActionCard = null
    this.pendingPlayerId = null
    this.currentAction = undefined
    this.players.removeCardFromTable(card, playerId)
    this.turn.select = -1
    this.log(`${this._getPlayerName(playerId)} pruned ${card.type} (${card.points} pts) [#${card.id}] from their table`, 'action')
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
    this.consecutivePasses = 0
    if (this.deck && this.deck.discardCard) {
      if (this.pendingActionCard) this.deck.discardCard(this.pendingActionCard)
      this.deck.discardCard(card)
    }
    this.pendingActionCard = null
    this.pendingPlayerId = null
    this.currentAction = undefined
    this.players.removeCardFromTable(card, playerId)
    this.turn.select = -1
    const victim = this._getPlayerName(playerId)
    const attacker = this._getPlayerName(this._otherPlayer(playerId))
    this.log(`${attacker} used Pest to destroy ${card.type} (${card.points} pts) [#${card.id}] on ${victim}'s table`, 'action')
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
    this.consecutivePasses = 0
    if (this.deck && this.deck.discardCard && this.pendingActionCard) {
      this.deck.discardCard(this.pendingActionCard)
    }
    this.pendingActionCard = null
    this.pendingPlayerId = null
    this.currentAction = undefined
    const opId = this._otherPlayer(playerId)
    const stolenCard = this.players.removeCardFromTable(card, playerId)
    this.players.addCardToTable(stolenCard, opId)
    this.turn.select = -1
    const victim = this._getPlayerName(playerId)
    const thief = this._getPlayerName(opId)
    this.log(`${thief} used Water to steal ${stolenCard.type} (${stolenCard.points} pts) [#${stolenCard.id}] from ${victim}`, 'action')
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
    this.consecutivePasses = 0
    if (this.deck && this.deck.discardCard && this.pendingActionCard) {
      this.deck.discardCard(this.pendingActionCard)
    }
    this.pendingActionCard = null
    this.pendingPlayerId = null
    this.currentAction = undefined
    const oldPoints = card.points
    this.players.doubleCardFromTable(card, playerId)
    this.turn.select = -1
    this.log(`${this._getPlayerName(playerId)} fertilized ${card.type} [#${card.id}] (${oldPoints} ➔ ${card.points} pts)`, 'action')
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
    try {
      if (!this.players) this.players = playersStore()
      if (!this.deck) this.deck = deckStore()
      if (!this.turn) this.turn = turnStore()

      this.consecutivePasses = 0
      this.currentAction = undefined
      this.pendingActionCard = null
      this.pendingPlayerId = null
      this.turn.count = 0
      this.turn.select = -1

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
          cardPlayed = true
        }

        if (!cardPlayed && this._canBenefitFromTableDiscard(playerId)) {
          const lowestOnTable = this.lowestCardOnTable(playerId)
          if (lowestOnTable) {
            this.players.removeCardFromTable(lowestOnTable, playerId)
            cardPlayed = true
          }
        }

        if (cardPlayed) {
          this.consecutivePasses = 0
        } else {
          this.consecutivePasses++
        }

        this.turn.id = this._otherPlayer(playerId)
        turnCount++
      }

      this.players.score()
      const score0 = this.players.scoreForId(0)
      const score1 = this.players.scoreForId(1)
      let winner = this.getWinner()
      if (winner === null) {
        winner = score0 > score1 ? 0 : score1 > score0 ? 1 : -1
      }

      return {
        winner,
        scores: [score0, score1],
        turns: turnCount
      }
    } finally {
      this.isSimulating = false
    }
  }

  // Run multiple simulations and return statistics
  runSimulation(numGames = 100) {
    const sanitizedGames = Math.max(1, parseInt(numGames, 10) || 100)
    const results = { wins: [0, 0], draws: 0, totalTurns: 0, games: [] }

    for (let i = 0; i < sanitizedGames; i++) {
      const result = this.simulateGame()
      results.games.push(result)
      results.totalTurns += result.turns

      if (result.winner === 0) results.wins[0]++
      else if (result.winner === 1) results.wins[1]++
      else results.draws++
    }

    return {
      totalGames: sanitizedGames,
      player0Wins: results.wins[0],
      player1Wins: results.wins[1],
      draws: results.draws,
      drawRate: ((results.draws / sanitizedGames) * 100).toFixed(1) + "%",
      avgTurns: Math.round(results.totalTurns / sanitizedGames),
      winRate: {
        player0: ((results.wins[0] / sanitizedGames) * 100).toFixed(1) + "%",
        player1: ((results.wins[1] / sanitizedGames) * 100).toFixed(1) + "%"
      }
    }
  }

  // Run simulations in non-blocking asynchronous chunks to avoid freezing the UI
  async runSimulationAsync(numGames = 100, onProgress = null, chunkSize = 20) {
    const sanitizedGames = Math.max(1, parseInt(numGames, 10) || 100)
    const results = { wins: [0, 0], draws: 0, totalTurns: 0, games: [] }

    let completed = 0
    while (completed < sanitizedGames) {
      const batchSize = Math.min(chunkSize, sanitizedGames - completed)
      for (let i = 0; i < batchSize; i++) {
        const result = this.simulateGame()
        results.games.push(result)
        results.totalTurns += result.turns

        if (result.winner === 0) results.wins[0]++
        else if (result.winner === 1) results.wins[1]++
        else results.draws++
      }
      completed += batchSize

      if (onProgress && typeof onProgress === 'function') {
        onProgress(completed, sanitizedGames)
      }

      if (completed < sanitizedGames) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    return {
      totalGames: sanitizedGames,
      player0Wins: results.wins[0],
      player1Wins: results.wins[1],
      draws: results.draws,
      drawRate: ((results.draws / sanitizedGames) * 100).toFixed(1) + "%",
      avgTurns: Math.round(results.totalTurns / sanitizedGames),
      winRate: {
        player0: ((results.wins[0] / sanitizedGames) * 100).toFixed(1) + "%",
        player1: ((results.wins[1] / sanitizedGames) * 100).toFixed(1) + "%"
      }
    }
  }

  exportGameLogReport() {
    if (!this.players) this.players = playersStore()
    if (!this.deck) this.deck = deckStore()
    if (!this.turn) this.turn = turnStore()

    const lines = []
    lines.push('===================================================================')
    lines.push('                   FLOWER POWER — GAME FLOW LOG                    ')
    lines.push('===================================================================')
    lines.push(`Exported At:         ${new Date().toISOString()}`)
    lines.push(`Difficulty:          ${K.currentDifficulty}`)
    lines.push(`Win Target:          ${K.WIN_SCORE} pts (Defensive Threshold: ${K.DEFENSIVE_THRESHOLD} pts)`)
    lines.push('')

    const hasPlayers = this.players && this.players.players && this.players.players[0] && this.players.players[1]
    if (hasPlayers) {
      const aiHand = this.players.handForId(0)
      const aiTable = this.players.tableForId(0)
      const humanHand = this.players.handForId(1)
      const humanTable = this.players.tableForId(1)
      const deckRemaining = this.deck && this.deck.idx ? this.deck.idx.length : 0
      const remainingCards = this.deck && this.deck.idx
        ? this.deck.idx.map(id => this._formatCard(this.deck.deck[id]))
        : []

      const aiPlayable = aiHand.filter(c => this._canPlayCard(c, 0))
      const humanPlayable = humanHand.filter(c => this._canPlayCard(c, 1))

      lines.push('--- CURRENT LIVE BOARD STATE SNAPSHOT ---')
      lines.push(`Turn Count:          ${this.turn ? this.turn.count : 0}`)
      lines.push(`Active Turn:         ${this.turn ? this._getPlayerName(this.turn.id) + ' (Player ' + this.turn.id + ')' : 'N/A'}`)
      lines.push(`Pending Selection:   ${this.turn ? this.turn.select : -1} (Active Action: ${this.currentAction || 'None'})`)
      lines.push(`Game Over Status:    isGameOver=${this.isGameOver()} | Winner=${this.getWinner()}`)
      lines.push(`Current Scores:      AI: ${this._getScore(0)} pts | You: ${this._getScore(1)} pts`)
      lines.push(`Deck Remaining:      ${deckRemaining} cards ${remainingCards.length > 0 ? '[' + remainingCards.join(', ') + ']' : '(Empty)'}`)
      lines.push('')
      lines.push('AI (Player 0):')
      lines.push(`  - Table (${aiTable.length}/5): [${this._formatCardList(aiTable)}]`)
      lines.push(`  - Hand  (${aiHand.length}/5):  [${this._formatCardList(aiHand)}]`)
      lines.push(`  - Diagnostics: canDraw=${this._canDrawCard(0)} | canDiscardFromTable=${this._canDiscardFromTable(0)} | playableInHand=${aiPlayable.length} (${this._formatCardList(aiPlayable)})`)
      lines.push('')
      lines.push('You (Player 1):')
      lines.push(`  - Table (${humanTable.length}/5): [${this._formatCardList(humanTable)}]`)
      lines.push(`  - Hand  (${humanHand.length}/5):  [${this._formatCardList(humanHand)}]`)
      lines.push(`  - Diagnostics: canDraw=${this._canDrawCard(1)} | canDiscardFromTable=${this._canDiscardFromTable(1)} | playableInHand=${humanPlayable.length} (${this._formatCardList(humanPlayable)})`)
      lines.push('')
    }

    lines.push(`--- CHRONOLOGICAL EVENT LOG (${this.logHistory.length} entries) ---`)
    if (this.logHistory.length === 0) {
      lines.push('(No log entries recorded)')
    } else {
      this.logHistory.forEach((entry, idx) => {
        const stepNum = String(idx + 1).padStart(3, '0')
        const turnStr = `T${entry.turnCount ?? 0}`
        const typeStr = (entry.type || 'info').toUpperCase().padEnd(6, ' ')
        const scoreStr = `(AI: ${entry.scores?.ai ?? 0}, You: ${entry.scores?.human ?? 0})`
        lines.push(`[#${stepNum}] [${entry.timestamp}] [${turnStr}] [${typeStr}] ${entry.message} ${scoreStr}`)
        if (entry.snapshot) {
          lines.push(`        ↳ State: Deck=${entry.snapshot.deckRemaining} | AI Hand(${entry.snapshot.aiHand.length})=[${entry.snapshot.aiHand.join(', ')}] | AI Table(${entry.snapshot.aiTable.length})=[${entry.snapshot.aiTable.join(', ')}]`)
          lines.push(`                 You Hand(${entry.snapshot.humanHand.length})=[${entry.snapshot.humanHand.join(', ')}] | You Table(${entry.snapshot.humanTable.length})=[${entry.snapshot.humanTable.join(', ')}]`)
        }
      })
    }
    lines.push('===================================================================')
    return lines.join('\n')
  }

}

// Preserve log history across Vite HMR reloads if a game is currently open
const previousLogHistory = (typeof window !== "undefined" && typeof window.gameLog === "function")
  ? window.gameLog()
  : null

// Create and export the singleton instance
export const gameLogicManager = new GameLogicManager()

if (Array.isArray(previousLogHistory) && previousLogHistory.length > 0) {
  gameLogicManager.logHistory = [...previousLogHistory]
}

// Expose for console testing
if (typeof window !== "undefined") {
  window.simGame = () => gameLogicManager.simulateGame()
  window.runSim = (n = 100) => gameLogicManager.runSimulation(n)
  window.runSimAsync = (n = 100) => gameLogicManager.runSimulationAsync(n)
  window.gameLog = () => gameLogicManager.logHistory
  window.exportGameLog = () => gameLogicManager.exportGameLogReport()
}
