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
    if (allowNextTurn) {
      this.nextTurn()
    }
    return allowNextTurn
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
    const opId = (playerId + 1) % K.NUM_PLAYERS
    
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
    const opId = (playerId + 1) % K.NUM_PLAYERS
    
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
    const opId = (playerId + 1) % K.NUM_PLAYERS
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
}

// Create and export the singleton instance
export const gameLogicManager = new GameLogicManager()


// import { playersStore } from "@/stores/players"
// import { deckStore } from "@/stores/deck"
// import { turnStore } from "@/stores/turn"
// import * as K from "../data/constants.js"

// class GameLogicManager {
//   constructor() {
//     console.log(`gameLogicManager init`)
//     this.currentAction = undefined
//   }

//   // set up game
//   newGame() {
//     console.log("new game")
//     this.players = playersStore()
//     this.deck = deckStore()
//     this.turn = turnStore()
//     for (let i = 0; i < K.NUM_PLAYERS; i++) {
//       this.players.addPlayer(i)
//     }
//     this.deck.create()
//     this.deck.shuffle()
//     this.turn.random()
//     this.deal()
//   }

//   // deal initial hands
//   deal() {
//     console.log("deal")
//     for (let i = 0; i < K.NUM_PLAYERS; i++) {
//       for (let j = 0; j < 5; j++) {
//         this.players.addCardToPlayer(i, this.deck.pop())
//       }
//     }
//   }

//   isGameOver() {
//     console.log("isGameOver")
//     let gameOver = false
//     for (let i = 0; i < K.NUM_PLAYERS; i++) {
//       if (this.players.scoreForId(i) >= 20) {
//         gameOver = true
//       }
//     }
//     return gameOver
//   }

//   nextTurn() {
//     console.log("nextTurn ")
//     this.turn.next()
//   }

//   drawCard(playerId) {
//     //can draw?
//     if (
//       this.deck.idx.length > 0 &&
//       this.players.handForId(playerId).length < 5
//     ) {
//       console.log("drawCard for ", playerId)
//       this.players.addCardToPlayer(playerId, this.deck.pop())
//       console.log("deck left ", this.deck.length)
//       this.nextTurn()
//     }
//   }

//   playCardForId(card, playerId) {
//     let allowNextTurn = this.handlePlayedCard(card, playerId)
//     if (allowNextTurn == true) {
//       this.nextTurn()
//     }
//   }

//   discardFromTableForId(card, playerId) {
//     //can discard?
//     if (
//       this.players.handForId(playerId).length > 4 &&
//       this.players.tableForId(playerId).length > 4
//     ) {
//       this.players.removeCardFromTable(card, playerId)
//       this.turn.select = -1
//       this.nextTurn()
//     }
//   }

//   handleCardFromTableForId(card, playerId) {
//     switch (this.currentAction) {
//       case "Prune":
//         this.endPrune(card, playerId)
//         break
//       case "Pest":
//         this.endPest(card, playerId)
//         break
//       case "Water":
//         this.endWater(card, playerId)
//         break
//       case "Fertilize":
//         this.endFertilize(card, playerId)
//         break
//       default:
//         break
//     }
//     this.currentAction = undefined
//   }

//   handlePlayedCard(card, playerId) {
//     let allowNextTurn = false

//     switch (card.type) {
//       case "Prune":
//         this.currentAction = "Prune"
//         this.startPrune(card, playerId)
//         break
//       case "Pest":
//         this.currentAction = "Pest"
//         this.startPest(card, playerId)
//         break
//       case "Water":
//         this.currentAction = "Water"
//         this.startWater(card, playerId)
//         break
//       case "Fertilize":
//         this.currentAction = "Fertilize"
//         this.startFertilize(card, playerId)
//         break
//       default:
//         // Add flower to table
//         if (this.players.tableForId(playerId).length < 5) {
//           this.currentAction = undefined
//           this.players.playCardFromHand(card, playerId)
//           allowNextTurn = true
//         }
//         break
//     }

//     return allowNextTurn
//   }

//   // prune
//   startPrune(card, playerId) {
//     //can prune?
//     if (this.players.tableForId(playerId).length == 0) {
//       console.log("nothing to prune")
//       this.currentAction = undefined
//     } else {
//       //Remove a flower from current player's table
//       this.players.removeCardFromHand(card, playerId)
//       this.turn.select = playerId
//     }
//   }

//   endPrune(card, playerId) {
//     this.players.removeCardFromTable(card, playerId)
//     this.turn.select = -1
//     this.nextTurn()
//   }

//   // pest
//   startPest(card, playerId) {
//     let opId = (playerId + 1) % K.NUM_PLAYERS
//     //can pest?
//     if (this.players.tableForId(opId).length == 0) {
//       console.log("nothing to pest")
//       this.currentAction = undefined
//     } else {
//       //Remove a flower from current player's table
//       this.players.removeCardFromHand(card, playerId)
//       this.turn.select = opId
//     }
//   }

//   endPest(card, playerId) {
//     this.players.removeCardFromTable(card, playerId)
//     this.turn.select = -1
//     this.nextTurn()
//   }

//   // water
//   startWater(card, playerId) {
//     let opId = (playerId + 1) % K.NUM_PLAYERS
//     //can pest?
//     if (
//       this.players.tableForId(playerId).length > 4 ||
//       this.players.tableForId(opId).length == 0
//     ) {
//       console.log("table full or nothing to water")
//       this.currentAction = undefined
//     } else {
//       // Move a flower from opponent's table to current player's table
//       this.players.removeCardFromHand(card, playerId)
//       this.turn.select = opId
//     }
//   }

//   endWater(card, playerId) {
//     let opId = (playerId + 1) % K.NUM_PLAYERS
//     let stolenCard = this.players.removeCardFromTable(card, playerId)
//     this.players.addCardToTable(stolenCard, opId)
//     this.turn.select = -1
//     this.nextTurn()
//   }

//   // fertilize
//   startFertilize(card, playerId) {
//     //can fertilize?
//     if (this.players.tableForId(playerId).length == 0) {
//       console.log("nothing to fertilize")
//       this.currentAction = undefined
//     } else {
//       //Remove a flower from current player's table
//       this.players.removeCardFromHand(card, playerId)
//       this.turn.select = playerId
//     }
//   }

//   endFertilize(card, playerId) {
//     this.players.doubleCardFromTable(card, playerId)
//     this.turn.select = -1
//     this.nextTurn()
//   }
// }

// export const gameLogicManager = new GameLogicManager()
