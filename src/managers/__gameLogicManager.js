import { playersStore } from "@/stores/players"
import { deckStore } from "@/stores/deck"
import { turnStore } from "@/stores/turn"
import * as K from "../data/constants.js"

// Game states
const GAME_STATE = {
  IDLE: 'IDLE',
  SETUP: 'SETUP',
  PLAYER_TURN: 'PLAYER_TURN',
  PRUNE_SELECTION: 'PRUNE_SELECTION',
  PEST_SELECTION: 'PEST_SELECTION',
  WATER_SELECTION: 'WATER_SELECTION',
  FERTILIZE_SELECTION: 'FERTILIZE_SELECTION',
  GAME_OVER: 'GAME_OVER'
}

// Card action types
const CARD_ACTION = {
  PRUNE: 'Prune',
  PEST: 'Pest',
  WATER: 'Water',
  FERTILIZE: 'Fertilize'
}

class GameLogicManager {
  constructor() {
    this.state = GAME_STATE.IDLE
    this.players = null
    this.deck = null
    this.turn = null
    this.activePlayerId = null
    this.pendingCard = null
    this.stateHandlers = {
      [GAME_STATE.IDLE]: this._handleIdleState.bind(this),
      [GAME_STATE.SETUP]: this._handleSetupState.bind(this),
      [GAME_STATE.PLAYER_TURN]: this._handlePlayerTurnState.bind(this),
      [GAME_STATE.PRUNE_SELECTION]: this._handlePruneSelectionState.bind(this),
      [GAME_STATE.PEST_SELECTION]: this._handlePestSelectionState.bind(this),
      [GAME_STATE.WATER_SELECTION]: this._handleWaterSelectionState.bind(this),
      [GAME_STATE.FERTILIZE_SELECTION]: this._handleFertilizeSelectionState.bind(this),
      [GAME_STATE.GAME_OVER]: this._handleGameOverState.bind(this)
    }
  }

  // Public API

  // Transitions to SETUP state and initializes the game
  newGame() {
    this._transitionTo(GAME_STATE.SETUP)
    return this.stateHandlers[this.state]()
  }

  // Check if game is over
  isGameOver() {
    for (let i = 0; i < K.NUM_PLAYERS; i++) {
      if (this.players.scoreForId(i) >= 20) {
        this._transitionTo(GAME_STATE.GAME_OVER)
        return true
      }
    }
    return false
  }

  // Change to next player's turn
  nextTurn() {
    this.turn.next()
    this.activePlayerId = this.turn.current
    
    if (this.isGameOver()) {
      return false
    }
    
    this._transitionTo(GAME_STATE.PLAYER_TURN)
    return true
  }

  // Player draws a card
  drawCard(playerId) {
    if (this.state !== GAME_STATE.PLAYER_TURN || 
        playerId !== this.activePlayerId ||
        !this._canDrawCard(playerId)) {
      return false
    }
    
    this.players.addCardToPlayer(playerId, this.deck.pop())
    this.nextTurn()
    return true
  }

  // Player plays a card
  playCardForId(card, playerId) {
    if (this.state !== GAME_STATE.PLAYER_TURN || 
        playerId !== this.activePlayerId) {
      return false
    }
    
    return this._handleCardPlay(card, playerId)
  }

  // Player discards a card from table
  discardFromTableForId(card, playerId) {
    if (this.state !== GAME_STATE.PLAYER_TURN || 
        playerId !== this.activePlayerId ||
        !this._canDiscardFromTable(playerId)) {
      return false
    }
    
    this.players.removeCardFromTable(card, playerId)
    this.turn.select = -1
    this.nextTurn()
    return true
  }

  // Handle selection of a card on the table (for actions)
  handleCardFromTableForId(card, playerId) {
    // Verify we're in a selection state
    const selectionStates = [
      GAME_STATE.PRUNE_SELECTION,
      GAME_STATE.PEST_SELECTION,
      GAME_STATE.WATER_SELECTION,
      GAME_STATE.FERTILIZE_SELECTION
    ]
    
    if (!selectionStates.includes(this.state)) {
      return false
    }
    
    return this.stateHandlers[this.state](card, playerId)
  }

  // State handlers
  
  _handleIdleState() {
    // Nothing to do in idle state
    return true
  }
  
  _handleSetupState() {
    // Initialize stores
    this.players = playersStore()
    this.deck = deckStore()
    this.turn = turnStore()
    
    // Create players
    for (let i = 0; i < K.NUM_PLAYERS; i++) {
      this.players.addPlayer(i)
    }
    
    // Prepare deck
    this.deck.create()
    this.deck.shuffle()
    
    // Deal cards
    for (let i = 0; i < K.NUM_PLAYERS; i++) {
      for (let j = 0; j < 5; j++) {
        this.players.addCardToPlayer(i, this.deck.pop())
      }
    }
    
    // Set random first player
    this.turn.random()
    this.activePlayerId = this.turn.current
    
    // Move to player turn state
    this._transitionTo(GAME_STATE.PLAYER_TURN)
    return true
  }
  
  _handlePlayerTurnState() {
    // This state is passive and waits for player input
    return true
  }
  
  _handlePruneSelectionState(card, playerId) {
    if (playerId !== this.turn.select) {
      return false
    }
    
    this.players.removeCardFromTable(card, playerId)
    this.turn.select = -1
    this.pendingCard = null
    
    this._transitionTo(GAME_STATE.PLAYER_TURN)
    this.nextTurn()
    return true
  }
  
  _handlePestSelectionState(card, playerId) {
    if (playerId !== this.turn.select) {
      return false
    }
    
    this.players.removeCardFromTable(card, playerId)
    this.turn.select = -1
    this.pendingCard = null
    
    this._transitionTo(GAME_STATE.PLAYER_TURN)
    this.nextTurn()
    return true
  }
  
  _handleWaterSelectionState(card, playerId) {
    if (playerId !== this.turn.select) {
      return false
    }
    
    const opId = (this.activePlayerId + 1) % K.NUM_PLAYERS
    const stolenCard = this.players.removeCardFromTable(card, playerId)
    this.players.addCardToTable(stolenCard, this.activePlayerId)
    this.turn.select = -1
    this.pendingCard = null
    
    this._transitionTo(GAME_STATE.PLAYER_TURN)
    this.nextTurn()
    return true
  }
  
  _handleFertilizeSelectionState(card, playerId) {
    if (playerId !== this.turn.select) {
      return false
    }
    
    this.players.doubleCardFromTable(card, playerId)
    this.turn.select = -1
    this.pendingCard = null
    
    this._transitionTo(GAME_STATE.PLAYER_TURN)
    this.nextTurn()
    return true
  }
  
  _handleGameOverState() {
    // Game is over, nothing to do
    return true
  }

  // Private helper methods
  
  _transitionTo(newState) {
    if (this.state === newState) return
    
    this.state = newState
  }
  
  _handleCardPlay(card, playerId) {
    // Store the card for later use in selection states
    this.pendingCard = card
    
    switch (card.type) {
      case CARD_ACTION.PRUNE:
        return this._startPrune(card, playerId)
      case CARD_ACTION.PEST:
        return this._startPest(card, playerId)
      case CARD_ACTION.WATER:
        return this._startWater(card, playerId)
      case CARD_ACTION.FERTILIZE:
        return this._startFertilize(card, playerId)
      default:
        // Regular flower card
        if (this.players.tableForId(playerId).length < 5) {
          this.players.playCardFromHand(card, playerId)
          this.nextTurn()
          return true
        }
        return false
    }
  }
  
  _startPrune(card, playerId) {
    if (this.players.tableForId(playerId).length === 0) {
      return false
    }
    
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = playerId
    this._transitionTo(GAME_STATE.PRUNE_SELECTION)
    return true
  }
  
  _startPest(card, playerId) {
    const opId = (playerId + 1) % K.NUM_PLAYERS
    
    if (this.players.tableForId(opId).length === 0) {
      return false
    }
    
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = opId
    this._transitionTo(GAME_STATE.PEST_SELECTION)
    return true
  }
  
  _startWater(card, playerId) {
    const opId = (playerId + 1) % K.NUM_PLAYERS
    
    if (this.players.tableForId(playerId).length > 4 || 
        this.players.tableForId(opId).length === 0) {
      return false
    }
    
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = opId
    this._transitionTo(GAME_STATE.WATER_SELECTION)
    return true
  }
  
  _startFertilize(card, playerId) {
    if (this.players.tableForId(playerId).length === 0) {
      return false
    }
    
    this.players.removeCardFromHand(card, playerId)
    this.turn.select = playerId
    this._transitionTo(GAME_STATE.FERTILIZE_SELECTION)
    return true
  }
  
  _canDrawCard(playerId) {
    return this.deck.idx.length > 0 && 
           this.players.handForId(playerId).length < 5
  }
  
  _canDiscardFromTable(playerId) {
    return this.players.handForId(playerId).length > 4 && 
           this.players.tableForId(playerId).length > 4
  }

  // Debugging method to get current state
  getCurrentState() {
    return this.state
  }
}

// Create and export the singleton instance
export const gameLogicManager = new GameLogicManager()