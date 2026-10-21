<template>
  <main>
    <h1>Flower Power</h1>

    <div class="difficulty-section">
      <h3>Difficulty</h3>
      <div class="difficulty-buttons">
        <button
          v-for="level in ['EASY', 'MEDIUM', 'HARD']"
          :key="level"
          :class="['diff-btn', { active: selectedDifficulty === level }]"
          @click="selectDifficulty(level)"
        >
          {{ level }}
        </button>
      </div>
      <p class="diff-description">{{ difficultyDescription }}</p>
    </div>

    <nav>
      <router-link :to="{ name: 'game' }" class="start-btn">Start Game</router-link>
      <router-link :to="{ name: 'rules' }">Rules</router-link>
    </nav>

    <div class="simulation-section">
      <h3>AI vs AI Simulation</h3>
      <p class="sim-subtitle">Simulate AI matchups to test balance and strategy at <strong>{{ selectedDifficulty }}</strong> difficulty.</p>

      <div class="sim-controls">
        <label>
          Games:
          <input
            v-model.number="simGames"
            type="number"
            min="10"
            max="1000"
            step="10"
            :disabled="simRunning"
          />
        </label>
        <button @click="runSim" :disabled="simRunning" class="sim-btn">
          {{ simRunning ? 'Simulating...' : 'Run Simulation' }}
        </button>
      </div>

      <!-- Error Banner -->
      <div v-if="simError" class="sim-error">
        ⚠️ {{ simError }}
      </div>

      <!-- Progress Indicator -->
      <div v-if="simRunning" class="sim-progress-wrapper">
        <div class="sim-progress-track">
          <div class="sim-progress-fill" :style="{ width: simProgress + '%' }"></div>
        </div>
        <p class="sim-progress-label">Simulating: {{ simCompletedGames }} / {{ simTargetGames }} games ({{ simProgress }}%)</p>
      </div>

      <!-- Simulation Results Card -->
      <div v-if="simResults && !simRunning" class="sim-results">
        <div class="sim-results-header">
          <h4>Results ({{ simResults.totalGames }} games):</h4>
          <span class="sim-diff-badge">{{ selectedDifficulty }}</span>
        </div>

        <!-- Visual Distribution Bar -->
        <div class="sim-bar-wrapper">
          <div
            class="sim-bar p0"
            :style="{ width: simResults.winRate.player0 }"
            :title="'Player 0: ' + simResults.winRate.player0"
          >
            {{ parseFloat(simResults.winRate.player0) >= 12 ? 'P0: ' + simResults.winRate.player0 : '' }}
          </div>
          <div
            v-if="simResults.draws > 0"
            class="sim-bar draw"
            :style="{ width: simResults.drawRate }"
            :title="'Draws: ' + simResults.drawRate"
          >
            {{ parseFloat(simResults.drawRate) >= 12 ? 'Draw: ' + simResults.drawRate : '' }}
          </div>
          <div
            class="sim-bar p1"
            :style="{ width: simResults.winRate.player1 }"
            :title="'Player 1: ' + simResults.winRate.player1"
          >
            {{ parseFloat(simResults.winRate.player1) >= 12 ? 'P1: ' + simResults.winRate.player1 : '' }}
          </div>
        </div>

        <div class="sim-stats-grid">
          <div class="sim-stat-card p0-card">
            <span class="stat-role">Player 0 (AI 1):</span>
            <span class="stat-main">{{ simResults.winRate.player0 }} wins</span>
            <span class="stat-count">({{ simResults.player0Wins }})</span>
          </div>
          <div class="sim-stat-card draw-card">
            <span class="stat-role">Draws:</span>
            <span class="stat-main">{{ simResults.draws }}</span>
            <span class="stat-count">({{ simResults.drawRate }})</span>
          </div>
          <div class="sim-stat-card p1-card">
            <span class="stat-role">Player 1 (AI 2):</span>
            <span class="stat-main">{{ simResults.winRate.player1 }} wins</span>
            <span class="stat-count">({{ simResults.player1Wins }})</span>
          </div>
        </div>

        <div class="sim-details">
          <p><strong>Detailed Breakdown:</strong></p>
          <p>Player 0: {{ simResults.winRate.player0 }} wins ({{ simResults.player0Wins }})</p>
          <p>Player 1: {{ simResults.winRate.player1 }} wins ({{ simResults.player1Wins }})</p>
          <p>Draws: {{ simResults.draws }}</p>
          <p>Avg game length: {{ simResults.avgTurns }} turns</p>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from "vue"
import * as K from "@/data/constants.js"
import { gameLogicManager } from "@/managers/gameLogicManager"

const selectedDifficulty = ref(K.currentDifficulty)
const simGames = ref(100)
const simRunning = ref(false)
const simProgress = ref(0)
const simCompletedGames = ref(0)
const simTargetGames = ref(100)
const simResults = ref(null)
const simError = ref(null)

const difficultyDescription = computed(() => {
  switch (selectedDifficulty.value) {
    case "EASY":
      return "AI plays basic strategy - only flowers, Pest, and Fertilize"
    case "MEDIUM":
      return "AI also uses Water cards to steal your plants"
    case "HARD":
      return "AI uses all cards and plays defensively when you're winning"
    default:
      return ""
  }
})

function selectDifficulty(level) {
  selectedDifficulty.value = level
  K.setDifficulty(level)
}

async function runSim() {
  simRunning.value = true
  simResults.value = null
  simError.value = null
  simProgress.value = 0

  const count = Math.min(1000, Math.max(10, parseInt(simGames.value, 10) || 100))
  simGames.value = count
  simTargetGames.value = count
  simCompletedGames.value = 0

  try {
    const results = await gameLogicManager.runSimulationAsync(count, (completed, total) => {
      simCompletedGames.value = completed
      simProgress.value = Math.round((completed / total) * 100)
    })
    simResults.value = results
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Simulation error:', err)
    simError.value = `Simulation failed: ${err.message || 'Unknown error'}`
  } finally {
    simRunning.value = false
  }
}
</script>

<style scoped>
main {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

h1 {
  color: #27ae60;
  margin-bottom: 30px;
}

.difficulty-section {
  margin: 30px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.difficulty-section h3 {
  margin: 0 0 15px 0;
}

.difficulty-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.diff-btn {
  padding: 10px 20px;
  border: 2px solid #3498db;
  background: white;
  color: #3498db;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}

.diff-btn:hover {
  background: #ecf0f1;
}

.diff-btn.active {
  background: #3498db;
  color: white;
}

.diff-description {
  margin-top: 15px;
  color: #666;
  font-size: 0.9em;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
  margin: 30px 0;
}

nav a {
  text-decoration: none;
  color: #3498db;
}

.start-btn {
  background: #27ae60;
  color: white !important;
  padding: 15px 40px;
  border-radius: 8px;
  font-size: 1.2em;
  font-weight: bold;
}

.start-btn:hover {
  background: #219a52;
}

.simulation-section {
  margin-top: 40px;
  padding: 20px;
  background: #f0f0f0;
  border-radius: 8px;
}

.simulation-section h3 {
  margin: 0 0 15px 0;
  color: #666;
}

.sim-controls {
  display: flex;
  gap: 15px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.sim-controls input {
  width: 80px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.sim-btn {
  padding: 10px 20px;
  background: #9b59b6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.sim-btn:hover:not(:disabled) {
  background: #8e44ad;
}

.sim-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.sim-subtitle {
  font-size: 0.9em;
  color: #666;
  margin-top: -5px;
  margin-bottom: 15px;
}

.sim-error {
  margin-top: 15px;
  padding: 10px 14px;
  background: #fde8e8;
  color: #c0392b;
  border: 1px solid #f8b4b4;
  border-radius: 6px;
  font-size: 0.95em;
  font-weight: 500;
}

.sim-progress-wrapper {
  margin-top: 20px;
}

.sim-progress-track {
  width: 100%;
  height: 12px;
  background: #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.sim-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #9b59b6, #8e44ad);
  transition: width 0.15s ease-out;
}

.sim-progress-label {
  font-size: 0.85em;
  color: #64748b;
  margin-top: 6px;
  font-weight: 500;
}

.sim-results {
  margin-top: 20px;
  text-align: left;
  padding: 18px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.sim-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sim-results-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.05em;
}

.sim-diff-badge {
  font-size: 0.75em;
  padding: 3px 8px;
  background: #e8f4f8;
  color: #2980b9;
  border-radius: 12px;
  font-weight: bold;
}

.sim-bar-wrapper {
  display: flex;
  width: 100%;
  height: 24px;
  background: #eef2f5;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
  font-size: 0.75em;
  font-weight: bold;
  color: white;
  text-align: center;
  line-height: 24px;
}

.sim-bar.p0 {
  background: #27ae60;
  transition: width 0.3s ease;
}

.sim-bar.draw {
  background: #95a5a6;
  transition: width 0.3s ease;
}

.sim-bar.p1 {
  background: #e67e22;
  transition: width 0.3s ease;
}

.sim-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.sim-stat-card {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 6px;
  text-align: center;
}

.sim-stat-card.p0-card {
  background: #f0fbf4;
  border: 1px solid #d4f3de;
}

.sim-stat-card.draw-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.sim-stat-card.p1-card {
  background: #fdf6ec;
  border: 1px solid #fae4c8;
}

.stat-role {
  font-size: 0.75em;
  color: #7f8c8d;
  font-weight: 600;
  margin-bottom: 2px;
}

.stat-main {
  font-size: 1.1em;
  font-weight: bold;
  color: #2c3e50;
}

.stat-count {
  font-size: 0.8em;
  color: #95a5a6;
}

.sim-details {
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
}

.sim-details p {
  margin: 4px 0;
  font-size: 0.9em;
  color: #475569;
}
</style>
