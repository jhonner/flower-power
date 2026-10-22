<template>
  <div class="game-view-wrapper">
    <div class="ground">
      <!-- Score Display -->
      <div class="score-display">
        <span class="score ai-score" :class="{ 'score-winner': isCelebrating && winner === 'AI' }">
          <span v-if="isCelebrating && winner === 'AI'">👑 </span>AI: {{ aiScore }}
        </span>
        <span class="target-goal">First to {{ winScore }} pts</span>
        <span class="score human-score" :class="{ 'score-winner': isCelebrating && winner === 'You' }">
          <span v-if="isCelebrating && winner === 'You'">👑 </span>You: {{ humanScore }}
        </span>
      </div>

      <!-- Real-time Activity Toast -->
      <Transition name="toast-slide">
        <div v-if="toastVisible" class="activity-toast" :class="`toast-${toastType}`">
          <span class="toast-dot"></span>
          <span class="toast-text">{{ toastMessage }}</span>
        </div>
      </Transition>

      <!-- Action Casting Arena / Floating Indicator -->
      <Transition name="cast-pop">
        <div v-if="pendingActionCard" class="action-cast-arena">
          <div class="cast-card-box">
            <CardComp :id="-1" :card="pendingActionCard" />
          </div>
          <div class="cast-details">
            <div class="cast-header">
              <span class="cast-caster-tag" :class="pendingPlayerId === 0 ? 'tag-ai' : 'tag-you'">
                {{ pendingPlayerId === 0 ? 'AI is casting' : 'You are casting' }}
              </span>
              <span class="cast-card-name">{{ pendingActionCard.type }}</span>
            </div>
            <p class="cast-prompt">{{ actionText }}</p>
            <button v-if="canCancelAction" class="cancel-action-btn" @click="cancelAction">
              Cancel Action ✕
            </button>
          </div>
        </div>
      </Transition>

      <!-- Main Game Board Area (Players on left, Deck on right) -->
      <div class="game-board-area">
        <div class="players-column">
          <PlayerComp :class="[isTurn(0), { 'player-winner': isCelebrating && winner === 'AI' }]" :id="0" />
          <PlayerComp :class="[isTurn(1), { 'player-winner': isCelebrating && winner === 'You' }]" :id="1" />
        </div>

        <div class="deck-column">
          <div class="deck">
            <div class="discard" :class="{ 'has-card': topDiscard }">
              <Transition name="discard-receive">
                <div v-if="topDiscard" :key="topDiscard.id" class="discard-card-wrapper">
                  <CardComp :id="-1" :card="topDiscard" />
                  <span class="discard-badge">{{ discardCount }}</span>
                </div>
              </Transition>
              <div v-if="!topDiscard" class="discard-placeholder">
                <span class="discard-icon">🍂</span>
                <span class="discard-text">Discard</span>
              </div>
            </div>
            <div
              class="deckCard"
              :class="{ 'deck-empty': deckCount === 0 }"
              @click="draw"
              :title="deckCount === 0 ? 'Deck is empty' : 'Click to draw a card'"
            >
              <template v-if="deckCount > 0">
                <span class="deck-count">{{ deckCount }}</span>
              </template>
              <div v-else class="deck-empty-placeholder">
                <span class="deck-empty-icon">🎴</span>
                <span class="deck-empty-label">Empty</span>
              </div>
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
        </div>
      </div>

      <!-- Game Over Overlay -->
      <Transition name="game-over-fade">
        <div v-if="showGameOverModal && !isInspectingBoard" class="game-over-overlay">
          <!-- Floating Petals Celebration (When You Win) -->
          <div v-if="winner === 'You'" class="victory-particles" aria-hidden="true">
            <span v-for="n in 12" :key="n" :class="`particle petal-${n}`">{{ n % 3 === 0 ? '🌸' : n % 3 === 1 ? '🌺' : '🌼' }}</span>
          </div>

          <Transition name="modal-pop" appear>
            <div class="game-over-modal" :class="`modal-${winner === 'You' ? 'victory' : winner === 'AI' ? 'defeat' : 'tie'}`">
              <!-- Modal Header / Icon -->
              <div class="modal-icon-badge">
                <span v-if="winner === 'You'" class="big-icon">🏆</span>
                <span v-else-if="winner === 'AI'" class="big-icon">🥀</span>
                <span v-else class="big-icon">⚖️</span>
              </div>

              <h2 class="modal-title">
                <span v-if="winner === 'You'">Victory!</span>
                <span v-else-if="winner === 'AI'">Defeat</span>
                <span v-else>Game Tied!</span>
              </h2>

              <p class="winner-subtitle" v-if="winner === 'You'">
                Your garden blossomed to perfection!
              </p>
              <p class="winner-subtitle" v-else-if="winner === 'AI'">
                The AI bloomed faster this season.
              </p>
              <p class="winner-subtitle" v-else>
                A rare, perfectly balanced duel!
              </p>

              <div class="reason-pill">{{ gameOverReason }}</div>

              <!-- Score Comparison Card -->
              <div class="score-card-box">
                <div class="score-col human-col" :class="{ 'score-winner-col': winner === 'You' }">
                  <span class="col-label">You</span>
                  <span class="col-score">{{ humanScore }}</span>
                  <span v-if="winner === 'You'" class="crown-tag">Winner ⭐</span>
                </div>
                <div class="score-divider">vs</div>
                <div class="score-col ai-col" :class="{ 'score-winner-col': winner === 'AI' }">
                  <span class="col-label">AI</span>
                  <span class="col-score">{{ aiScore }}</span>
                  <span v-if="winner === 'AI'" class="crown-tag">Winner ⭐</span>
                </div>
              </div>

              <!-- Modal Actions -->
              <div class="modal-actions">
                <button class="play-again-btn" @click="restartGame">
                  🔄 Play Again
                </button>
                <button class="inspect-board-btn" @click="isInspectingBoard = true" title="Hide modal and view final board">
                  👁️ Inspect Board
                </button>
                <button class="download-log-modal-btn" @click="downloadLog" title="Download game debug log">
                  ⬇ Download Log
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>

      <!-- Minimized Board Inspection Banner -->
      <Transition name="banner-slide">
        <div v-if="showGameOverModal && isInspectingBoard" class="inspect-board-banner">
          <div class="banner-content">
            <span class="banner-badge">
              {{ winner === 'You' ? '🏆 Victory' : winner === 'AI' ? '🥀 Defeat' : '⚖️ Tie' }}
            </span>
            <span class="banner-score">Final: You {{ humanScore }} - AI {{ aiScore }}</span>
            <span class="banner-tip">Viewing final board</span>
          </div>
          <div class="banner-actions">
            <button class="reopen-modal-btn" @click="isInspectingBoard = false">
              📋 Show Summary
            </button>
            <button class="play-again-mini-btn" @click="restartGame">
              🔄 Play Again
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Game Flow Log Panel (Dev Debug) -->
    <div class="game-log-panel dev-log-floating-panel">
      <div class="game-log-header">
        <div class="game-log-title">
          <span class="dev-badge">DEV LOG</span>
          <span>📜 Game Flow ({{ logEntries.length }})</span>
        </div>
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
import CardComp from "@/components/CardComp.vue"

const turn = turnStore()
const players = playersStore()
const deck = deckStore()
const winScore = K.WIN_SCORE

const isGameOver = ref(false)
const showGameOverModal = ref(false)
const isCelebrating = ref(false)
const isInspectingBoard = ref(false)
const winner = ref("")
const gameOverReason = ref("")
let gameOverTimer = null

// Discard pile
const topDiscard = computed(() => deck.topDiscard)
const discardCount = computed(() => deck.discardCount)

// Real-time activity toast
const toastMessage = ref("")
const toastType = ref("info")
const toastVisible = ref(false)
let toastTimeout = null

function triggerToast(message, type = "info") {
  toastMessage.value = message
  toastType.value = type
  toastVisible.value = true
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => {
    toastVisible.value = false
  }, 2600)
}

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

const pendingActionCard = computed(() => gameLogicManager.pendingActionCard)
const pendingPlayerId = computed(() => gameLogicManager.pendingPlayerId)
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
    isGameOver.value = true
    const winnerId = gameLogicManager.getWinner()
    if (winnerId === 0) {
      winner.value = "AI"
    } else if (winnerId === 1) {
      winner.value = "You"
    } else {
      winner.value = "Nobody (Tie)"
    }

    if (aiScore.value >= winScore || humanScore.value >= winScore) {
      gameOverReason.value = `Goal of ${winScore} points achieved!`
    } else {
      gameOverReason.value = "Deck exhausted • Decided by highest garden score"
    }

    isCelebrating.value = true

    if (winner.value === "You") {
      triggerToast(`🏆 Victory! You reached ${humanScore.value} points!`, "win")
    } else if (winner.value === "AI") {
      triggerToast(`🥀 Defeat! AI reached ${aiScore.value} points!`, "action")
    } else {
      triggerToast(`🤝 It's a Tie! Both players tied at ${humanScore.value} points!`, "info")
    }

    if (gameOverTimer) clearTimeout(gameOverTimer)
    gameOverTimer = setTimeout(() => {
      showGameOverModal.value = true
    }, 1400)
  }
}

onMounted(() => {
  logEntries.value = [...gameLogicManager.logHistory]
  unsub = gameLogicManager.onLog((entry) => {
    logEntries.value.push(entry)
    checkGameOverState()
    if (entry.type === "action" || entry.type === "play" || entry.type === "win" || entry.message.includes("passing turn")) {
      triggerToast(entry.message, entry.type)
    }
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
  if (toastTimeout) clearTimeout(toastTimeout)
  if (gameOverTimer) clearTimeout(gameOverTimer)
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
  if (gameOverTimer) clearTimeout(gameOverTimer)
  isGameOver.value = false
  showGameOverModal.value = false
  isCelebrating.value = false
  isInspectingBoard.value = false
  winner.value = ""
  gameOverReason.value = ""
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

.score-winner {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  animation: winner-score-bounce 1s infinite alternate cubic-bezier(0.18, 0.89, 0.32, 1.25);
  text-shadow: 0 0 12px currentColor;
}

@keyframes winner-score-bounce {
  0% { transform: scale(1.05); }
  100% { transform: scale(1.22); filter: brightness(1.25); }
}

.player-winner {
  border-radius: 8px;
  animation: winner-pulse 1.5s infinite alternate ease-in-out;
}

@keyframes winner-pulse {
  0% {
    box-shadow: 0 0 10px rgba(46, 204, 113, 0.4), inset 0 0 10px rgba(46, 204, 113, 0.2);
  }
  100% {
    box-shadow: 0 0 25px rgba(241, 196, 15, 0.8), inset 0 0 15px rgba(241, 196, 15, 0.3);
  }
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

/* Activity Toast */
.activity-toast {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 6px 14px;
  border-radius: 18px;
  font-size: 0.85em;
  font-weight: 600;
  max-width: 480px;
  white-space: nowrap;
  text-align: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  pointer-events: none;
}

.toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f1c40f;
  flex-shrink: 0;
}

.toast-play {
  background: rgba(39, 174, 96, 0.92);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
}
.toast-play .toast-dot {
  background: #2ecc71;
}

.toast-action {
  background: rgba(41, 128, 185, 0.92);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
}
.toast-action .toast-dot {
  background: #f39c12;
}

.toast-info {
  background: rgba(52, 73, 94, 0.92);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.toast-win {
  background: rgba(241, 196, 15, 0.95);
  color: #2c3e50;
  font-weight: 700;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.25s ease;
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

/* Discard Pile */
.discard {
  position: relative;
  width: 100px;
  height: 140px;
  border-radius: 8px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.discard.has-card {
  border: none;
}

.discard:not(.has-card) {
  border: 2px dashed rgba(255, 255, 255, 0.25);
  background: rgba(0, 0, 0, 0.25);
}

.discard-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.78em;
  user-select: none;
}

.discard-icon {
  font-size: 1.8em;
}

.discard-badge {
  position: absolute;
  bottom: 5px;
  left: 5px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: 700;
  z-index: 6;
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

/* Empty Deck Slot */
.deckCard.deck-empty {
  background-image: none !important;
  border: 2px dashed rgba(255, 255, 255, 0.25) !important;
  background-color: rgba(0, 0, 0, 0.25) !important;
  cursor: not-allowed;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.deck-empty-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.4);
  user-select: none;
}

.deck-empty-icon {
  font-size: 1.8em;
  opacity: 0.45;
}

.deck-empty-label {
  font-size: 0.75em;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* Action Cast Arena */
.action-cast-arena {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(18, 22, 28, 0.95);
  border: 2px solid #f39c12;
  box-shadow: 0 0 20px rgba(243, 156, 18, 0.35), 0 8px 24px rgba(0, 0, 0, 0.5);
  border-radius: 14px;
  padding: 10px 20px;
  margin: 0 auto 12px auto;
  max-width: 520px;
}

.cast-card-box {
  transform: scale(0.85);
  transform-origin: center;
  margin: -10px 0;
  animation: float-glow 2s infinite alternate ease-in-out;
}

@keyframes float-glow {
  0% {
    transform: scale(0.85) translateY(0);
    filter: drop-shadow(0 0 8px rgba(243, 156, 18, 0.4));
  }
  100% {
    transform: scale(0.85) translateY(-4px);
    filter: drop-shadow(0 0 16px rgba(243, 156, 18, 0.8));
  }
}

.cast-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.cast-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cast-caster-tag {
  font-size: 0.72em;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tag-you {
  background: #27ae60;
  color: white;
}

.tag-ai {
  background: #e74c3c;
  color: white;
}

.cast-card-name {
  font-size: 1.1em;
  font-weight: 800;
  color: #f1c40f;
}

.cast-prompt {
  font-size: 0.88em;
  color: #ecf0f1;
  margin: 2px 0 6px 0;
}

.cancel-action-btn {
  background: #c0392b;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8em;
  font-weight: bold;
  align-self: flex-start;
  transition: background 0.15s;
}

.cancel-action-btn:hover {
  background: #e74c3c;
}

/* Cast Arena Transition (Delayed 0.18s so card leaves hand first) */
.cast-pop-enter-active {
  animation: cast-pop-in 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.25) 0.18s backwards;
}

.cast-pop-leave-active {
  animation: cast-pop-out 0.2s ease-in forwards;
}

@keyframes cast-pop-in {
  0% {
    opacity: 0;
    transform: scale(0.85) translateY(-8px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes cast-pop-out {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.85) translateY(-8px);
  }
}

/* Discard Card Receiving Animation (Delayed 0.22s so table card arrives first) */
.discard-card-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.discard-receive-enter-active {
  animation: discard-receive-pop 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.25) 0.22s backwards;
}

.discard-receive-leave-active {
  position: absolute;
  animation: discard-fade-out 0.15s ease-in;
}

@keyframes discard-receive-pop {
  0% {
    opacity: 0;
    transform: scale(0.85);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes discard-fade-out {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

/* Floating Petals Celebration */
.victory-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 1001;
}

.particle {
  position: absolute;
  top: -40px;
  font-size: 1.6em;
  opacity: 0;
  animation: petal-fall 3.2s linear infinite;
  user-select: none;
}

.petal-1 { left: 8%; animation-delay: 0s; animation-duration: 3.5s; font-size: 1.4em; }
.petal-2 { left: 16%; animation-delay: 0.8s; animation-duration: 4s; font-size: 1.8em; }
.petal-3 { left: 24%; animation-delay: 1.6s; animation-duration: 3.2s; font-size: 1.2em; }
.petal-4 { left: 33%; animation-delay: 0.3s; animation-duration: 4.2s; font-size: 1.6em; }
.petal-5 { left: 42%; animation-delay: 1.1s; animation-duration: 3.6s; font-size: 1.5em; }
.petal-6 { left: 51%; animation-delay: 0.6s; animation-duration: 3.8s; font-size: 1.9em; }
.petal-7 { left: 60%; animation-delay: 1.9s; animation-duration: 3.4s; font-size: 1.3em; }
.petal-8 { left: 69%; animation-delay: 0.2s; animation-duration: 4.1s; font-size: 1.7em; }
.petal-9 { left: 78%; animation-delay: 1.4s; animation-duration: 3.7s; font-size: 1.4em; }
.petal-10 { left: 86%; animation-delay: 0.7s; animation-duration: 3.9s; font-size: 1.8em; }
.petal-11 { left: 93%; animation-delay: 1.3s; animation-duration: 4.3s; font-size: 1.5em; }
.petal-12 { left: 4%; animation-delay: 2.1s; animation-duration: 3.3s; font-size: 1.6em; }

@keyframes petal-fall {
  0% {
    transform: translateY(0) rotate(0deg) scale(0.8);
    opacity: 0;
  }
  15% {
    opacity: 0.9;
  }
  90% {
    opacity: 0.9;
  }
  100% {
    transform: translateY(105vh) rotate(360deg) scale(1.1);
    opacity: 0;
  }
}

/* Game Over Overlay */
.game-over-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(10, 15, 24, 0.78);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  box-sizing: border-box;
}

.game-over-modal {
  background: #181d26;
  border-radius: 16px;
  padding: 34px 30px 28px 30px;
  text-align: center;
  min-width: 380px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 1002;
  box-sizing: border-box;
}

/* Modal Themes */
.modal-victory {
  border-top: 4px solid #2ecc71;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(46, 204, 113, 0.25);
}

.modal-defeat {
  border-top: 4px solid #e74c3c;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(231, 76, 60, 0.25);
}

.modal-tie {
  border-top: 4px solid #f39c12;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(243, 156, 18, 0.25);
}

.modal-icon-badge {
  font-size: 3em;
  margin-bottom: 6px;
  line-height: 1;
}

.modal-title {
  margin: 0 0 6px 0;
  font-size: 2em;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.modal-victory .modal-title {
  color: #2ecc71;
}

.modal-defeat .modal-title {
  color: #e74c3c;
}

.modal-tie .modal-title {
  color: #f1c40f;
}

.winner-subtitle {
  font-size: 0.92em;
  color: #a0aec0;
  margin: 0 0 14px 0;
}

.reason-pill {
  display: inline-block;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.78em;
  font-weight: 600;
  margin-bottom: 20px;
}

/* Score Comparison Box */
.score-card-box {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 22px;
}

.score-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.col-label {
  font-size: 0.85em;
  font-weight: 700;
  color: #a0aec0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.col-score {
  font-size: 2.2em;
  font-weight: 800;
  line-height: 1.1;
  color: #fff;
}

.human-col .col-score {
  color: #2ecc71;
}

.ai-col .col-score {
  color: #e74c3c;
}

.crown-tag {
  font-size: 0.7em;
  font-weight: 800;
  background: #f1c40f;
  color: #1a202c;
  padding: 1px 6px;
  border-radius: 8px;
  letter-spacing: 0.3px;
  margin-top: 2px;
}

.score-divider {
  font-size: 1em;
  font-weight: 800;
  color: #718096;
  padding: 0 16px;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.play-again-btn {
  background: #27ae60;
  color: white;
  border: none;
  padding: 12px 20px;
  font-size: 1.05em;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
}

.play-again-btn:hover {
  background: #2ecc71;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(39, 174, 96, 0.5);
}

.inspect-board-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #edf2f7;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 10px 18px;
  font-size: 0.95em;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.inspect-board-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.download-log-modal-btn {
  background: transparent;
  color: #a0aec0;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  font-size: 0.85em;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.download-log-modal-btn:hover {
  color: white;
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

/* Minimized Inspect Board Floating Banner */
.inspect-board-banner {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(18, 24, 33, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
  border-radius: 12px;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 999;
  backdrop-filter: blur(8px);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.banner-badge {
  font-weight: 800;
  font-size: 0.9em;
}

.banner-score {
  color: #e2e8f0;
  font-weight: 700;
  font-size: 0.9em;
}

.banner-tip {
  color: #718096;
  font-size: 0.78em;
  font-style: italic;
}

.banner-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.reopen-modal-btn {
  background: #34495e;
  color: white;
  border: 1px solid #4a6572;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.82em;
  font-weight: 700;
  transition: background 0.15s;
}

.reopen-modal-btn:hover {
  background: #4a6572;
}

.play-again-mini-btn {
  background: #27ae60;
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.82em;
  font-weight: 700;
  transition: background 0.15s;
}

.play-again-mini-btn:hover {
  background: #2ecc71;
}

/* Transitions */
.game-over-fade-enter-active,
.game-over-fade-leave-active {
  transition: opacity 0.4s ease;
}

.game-over-fade-enter-from,
.game-over-fade-leave-to {
  opacity: 0;
}

.modal-pop-enter-active {
  animation: modal-spring-in 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.25);
}

.modal-pop-leave-active {
  animation: modal-spring-out 0.25s ease-in forwards;
}

@keyframes modal-spring-in {
  0% {
    opacity: 0;
    transform: scale(0.82) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modal-spring-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.88) translateY(-15px);
  }
}

.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 25px);
}

/* Board Area (Players on left, Deck vertically centered on right) */
.game-board-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  width: 100%;
}

.players-column {
  flex: 0 0 560px;
}

.deck-column {
  flex: 0 0 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Outer layout wrapper */
.game-view-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 20px;
  margin: 10px auto;
  width: 100%;
  max-width: 1120px;
  position: relative;
}

@media (max-width: 1100px) {
  .game-view-wrapper {
    flex-direction: column;
    align-items: center;
  }
}

/* Floating Game Log Panel (Dev only) */
.game-log-panel {
  background: rgba(20, 24, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.dev-log-floating-panel {
  width: 320px;
  max-height: 85vh;
  margin-top: 0;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 15px;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.game-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 0.9em;
  color: #ddd;
  margin-bottom: 8px;
}

.game-log-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dev-badge {
  background: #e67e22;
  color: white;
  font-size: 0.65em;
  font-weight: 800;
  padding: 2px 5px;
  border-radius: 4px;
  letter-spacing: 0.5px;
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
  max-height: 70vh;
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
