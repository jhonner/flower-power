<template>
  <div class="ground">
    <!-- Score Display -->
    <div class="score-display">
      <span class="score ai-score">AI: {{ aiScore }}</span>
      <span class="target-goal">First to {{ winScore }} pts</span>
      <span class="score human-score">You: {{ humanScore }}</span>
    </div>

    <!-- Action Indicator -->
    <div v-if="actionText" class="action-indicator">
      <span>{{ actionText }}</span>
      <button v-if="canCancelAction" class="cancel-action-btn" @click="cancelAction">Cancel</button>
    </div>

    <div class="deck">
      <div class="discard"></div>
      <div class="deckCard" @click="draw">
        <span class="deck-count">{{ deckCount }}</span>
      </div>
      <button
        v-if="canPassTurn"
        class="pass-turn-btn"
        @click="passTurn"
        title="Pass turn when deck is empty"
      >
        Pass Turn ⏭
      </button>
    </div>
    <div>
      <PlayerComp :class="isTurn(0)" :id="0" />
      <PlayerComp :class="isTurn(1)" :id="1" />
    </div>

    <!-- Game Flow Log Panel -->
    <div class="game-log-panel">
      <div class="game-log-header">
        <span>📜 Game Flow Log ({{ logEntries.length }})</span>
        <div class="log-actions">
          <button class="download-log-btn" @click="downloadLog" title="Download full game log & board state">
            ⬇ Download Log
          </button>
          <button class="toggle-log-btn" @click="showLog = !showLog">
            {{ showLog ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>
      <div v-if="showLog" class="game-log-entries" ref="logContainer">
        <div v-for="(entry, index) in logEntries" :key="index" :class="['log-entry', `log-${entry.type}`]">
          <span class="log-time">{{ entry.timestamp }}</span>
          <span class="log-msg">{{ entry.message }}</span>
        </div>
        <div v-if="logEntries.length === 0" class="log-empty">Game started. Waiting for moves...</div>
      </div>
    </div>

    <!-- Game Over Overlay -->
    <div v-if="isGameOver" class="game-over-overlay">
      <div class="game-over-modal">
        <h2>Game Over!</h2>
        <p class="winner" v-if="winner !== 'Nobody (Tie)'">{{ winner }} wins!</p>
        <p class="winner" v-else>It's a Tie!</p>
        <p class="final-score">Final: AI {{ aiScore }} - You {{ humanScore }}</p>
        <div class="modal-actions">
          <button class="play-again-btn" @click="restartGame">Play Again</button>
          <button class="download-log-modal-btn" @click="downloadLog">⬇ Download Log</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue"
import * as K from "@/data/constants.js"
import { turnStore } from "@/stores/turn"
import { playersStore } from "@/stores/players"
import { deckStore } from "@/stores/deck"
import { gameLogicManager } from "@/managers/gameLogicManager"
import PlayerComp from "@/components/PlayerComp.vue"

const turn = turnStore()
const players = playersStore()
const deck = deckStore()
const winScore = K.WIN_SCORE

const isGameOver = ref(false)
const winner = ref("")

// Preserve active game if Vite HMR reloads while a match is in progress
const hasActiveGame =
  players.players[0] &&
  players.players[1] &&
  gameLogicManager.logHistory.length > 0 &&
  (players.players[0].hand.length > 0 ||
   players.players[0].table.length > 0 ||
   players.players[1].hand.length > 0 ||
   players.players[1].table.length > 0)

if (hasActiveGame) {
  gameLogicManager.players = players
  gameLogicManager.deck = deck
  gameLogicManager.turn = turn
} else {
  gameLogicManager.newGame()
}

// Computed properties for scores
const aiScore = computed(() => {
  // Calculate AI score from table cards
  return players.tableForId(0).reduce((sum, card) => sum + (card.points || 0), 0)
})

const humanScore = computed(() => {
  // Calculate human score from table cards
  return players.tableForId(1).reduce((sum, card) => sum + (card.points || 0), 0)
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

const canCancelAction = computed(() => turn.select !== -1 && turn.id === 1)
const canPassTurn = computed(() => turn.id === 1 && deckCount.value === 0 && !isGameOver.value)

function cancelAction() {
  gameLogicManager.cancelCurrentAction(1)
}

function passTurn() {
  gameLogicManager.passTurn(1)
}

const showLog = ref(true)
const logEntries = ref([...gameLogicManager.logHistory])
const logContainer = ref(null)

let unsub = null

function checkGameOverState() {
  if (isGameOver.value) return
  if (gameLogicManager.isGameOver()) {
    const winnerId = gameLogicManager.getWinner()
    isGameOver.value = true
    if (winnerId === 0) {
      winner.value = "AI"
    } else if (winnerId === 1) {
      winner.value = "You"
    } else {
      winner.value = "Nobody (Tie)"
    }
  }
}

onMounted(() => {
  logEntries.value = [...gameLogicManager.logHistory]
  unsub = gameLogicManager.onLog((entry) => {
    logEntries.value.push(entry)
    checkGameOverState()
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight
      }
    })
  })
  checkGameOverState()
  if (hasActiveGame && !isGameOver.value && turn.id === K.AI_PLAYER_ID) {
    setTimeout(() => gameLogicManager.doNextTurn(), 300)
  }
})

onUnmounted(() => {
  if (unsub) unsub()
})

// Watch for game over (reaching WIN_SCORE points, turn passes, or deck depletion stalemate)
watch([aiScore, humanScore, deckCount, () => turn.count, () => turn.id], () => {
  checkGameOverState()
})

function isTurn(id) {
  if (turn.id === id) {
    return "turn"
  } else {
    return "notTurn"
  }
}

function draw() {
  if (turn.id !== 1 || turn.select !== -1) return
  gameLogicManager.drawCard(1)
}

function downloadLog() {
  const reportText = gameLogicManager.exportGameLogReport()
  const blob = new window.Blob([reportText], { type: "text/plain;charset=utf-8" })
  const url = window.URL.createObjectURL(blob)
  const link = window.document.createElement("a")
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  link.href = url
  link.download = `flower-power-log-${timestamp}.txt`
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function restartGame() {
  isGameOver.value = false
  winner.value = ""
  gameLogicManager.newGame()
  logEntries.value = [...gameLogicManager.logHistory]
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

.target-goal {
  background: rgba(255, 255, 255, 0.1);
  padding: 3px 12px;
  border-radius: 12px;
  font-size: 0.8em;
  color: #f1c40f;
  border: 1px solid rgba(241, 196, 15, 0.35);
  font-weight: 600;
  display: flex;
  align-items: center;
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

.pass-turn-btn {
  margin-top: 8px;
  padding: 6px 12px;
  background: #e67e22;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.82em;
  width: 100%;
  transition: background 0.15s;
}

.pass-turn-btn:hover {
  background: #d35400;
}

.action-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 8px;
  background: #f39c12;
  color: white;
  font-weight: bold;
  margin-bottom: 10px;
  border-radius: 6px;
}

.cancel-action-btn {
  background: #c0392b;
  color: white;
  border: none;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: bold;
  transition: background 0.2s;
}

.cancel-action-btn:hover {
  background: #e74c3c;
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

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.play-again-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 1.05em;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.play-again-btn:hover {
  background: #2980b9;
}

.download-log-modal-btn {
  background: #2c3e50;
  color: white;
  border: none;
  padding: 12px 20px;
  font-size: 1.05em;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.download-log-modal-btn:hover {
  background: #1a252f;
}

.game-log-panel {
  margin-top: 15px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 10px 14px;
}

.game-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 0.9em;
  color: #ddd;
  margin-bottom: 6px;
}

.log-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.download-log-btn {
  background: #27ae60;
  color: white;
  border: 1px solid #2ecc71;
  padding: 2px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
  font-weight: bold;
  transition: background 0.2s;
}

.download-log-btn:hover {
  background: #219a52;
}

.toggle-log-btn {
  background: transparent;
  color: #aaa;
  border: 1px solid #555;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
}

.toggle-log-btn:hover {
  color: white;
  border-color: #888;
}

.game-log-entries {
  max-height: 120px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.82em;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-right: 4px;
}

.log-entry {
  display: flex;
  gap: 8px;
  line-height: 1.4;
}

.log-time {
  color: #777;
  font-size: 0.85em;
  min-width: 60px;
}

.log-msg {
  color: #ccc;
}

.log-turn .log-msg {
  color: #68b0f7;
  font-weight: bold;
}

.log-play .log-msg {
  color: #55efc4;
}

.log-action .log-msg {
  color: #ffeaa7;
}

.log-draw .log-msg {
  color: #d6a2e8;
}

.log-cancel .log-msg {
  color: #ff7675;
}

.log-win .log-msg {
  color: #fdcb6e;
  font-weight: bold;
}

.log-empty {
  color: #888;
  font-style: italic;
  font-size: 0.85em;
}
</style>
