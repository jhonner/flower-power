<template>
  <div class="ground">
    <!-- Score Display -->
    <div class="score-display">
      <span class="score ai-score">AI: {{ aiScore }}</span>
      <span class="score human-score">You: {{ humanScore }}</span>
    </div>

    <!-- Action Indicator -->
    <div v-if="actionText" class="action-indicator">
      {{ actionText }}
    </div>

    <div class="deck">
      <div class="discard"></div>
      <div class="deckCard" @click="draw">
        <span class="deck-count">{{ deckCount }}</span>
      </div>
    </div>
    <div>
      <PlayerComp :class="isTurn(0)" :id="0" />
      <PlayerComp :class="isTurn(1)" :id="1" />
    </div>

    <!-- Game Over Overlay -->
    <div v-if="isGameOver" class="game-over-overlay">
      <div class="game-over-modal">
        <h2>Game Over!</h2>
        <p class="winner">{{ winner }} wins!</p>
        <p class="final-score">Final: AI {{ aiScore }} - You {{ humanScore }}</p>
        <button class="play-again-btn" @click="restartGame">Play Again</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue"
import { turnStore } from "@/stores/turn"
import { playersStore } from "@/stores/players"
import { deckStore } from "@/stores/deck"
import { gameLogicManager } from "@/managers/gameLogicManager"
import PlayerComp from "@/components/PlayerComp.vue"

const turn = turnStore()
const players = playersStore()
const deck = deckStore()

const isGameOver = ref(false)
const winner = ref("")

gameLogicManager.newGame()

// Computed properties for scores
const aiScore = computed(() => {
  players.score()
  return players.scoreForId(0)
})

const humanScore = computed(() => {
  players.score()
  return players.scoreForId(1)
})

// Deck counter
const deckCount = computed(() => deck.idx.length)

// Action indicator
const actionText = computed(() => {
  if (turn.select === -1) return ""
  const action = gameLogicManager.currentAction
  switch (action) {
    case "Prune": return "Select a card to remove from your table"
    case "Pest": return "Select an opponent's card to destroy"
    case "Water": return "Select an opponent's card to steal"
    case "Fertilize": return "Select a card to double its points"
    default: return ""
  }
})

// Watch for game over
watch([aiScore, humanScore], () => {
  if (aiScore.value >= 20 && !isGameOver.value) {
    isGameOver.value = true
    winner.value = "AI"
  } else if (humanScore.value >= 20 && !isGameOver.value) {
    isGameOver.value = true
    winner.value = "You"
  }
})

function isTurn(id) {
  if (turn.id === id) {
    return "turn"
  } else {
    return "notTurn"
  }
}

function draw() {
  gameLogicManager.drawCard(turn.id)
}

function restartGame() {
  isGameOver.value = false
  winner.value = ""
  gameLogicManager.newGame()
}
</script>

<style scoped>
.score-display {
  display: flex;
  justify-content: space-between;
  padding: 10px 20px;
  font-size: 1.2em;
  font-weight: bold;
}

.ai-score {
  color: #e74c3c;
}

.human-score {
  color: #27ae60;
}

.deck-count {
  position: absolute;
  bottom: 5px;
  right: 5px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
}

.action-indicator {
  text-align: center;
  padding: 8px;
  background: #f39c12;
  color: white;
  font-weight: bold;
  margin-bottom: 10px;
}

.game-over-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.game-over-modal {
  background: white;
  padding: 40px;
  border-radius: 12px;
  text-align: center;
  min-width: 300px;
}

.game-over-modal h2 {
  margin: 0 0 20px 0;
  color: #333;
}

.winner {
  font-size: 1.5em;
  font-weight: bold;
  color: #27ae60;
  margin: 10px 0;
}

.final-score {
  color: #666;
  margin: 10px 0 20px 0;
}

.play-again-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 12px 30px;
  font-size: 1.1em;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.play-again-btn:hover {
  background: #2980b9;
}
</style>
