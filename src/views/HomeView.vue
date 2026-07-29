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
      <div class="sim-controls">
        <label>
          Games:
          <input v-model.number="simGames" type="number" min="10" max="1000" />
        </label>
        <button @click="runSim" :disabled="simRunning" class="sim-btn">
          {{ simRunning ? 'Running...' : 'Run Simulation' }}
        </button>
      </div>
      <div v-if="simResults" class="sim-results">
        <p><strong>Results ({{ simResults.totalGames }} games):</strong></p>
        <p>Player 0: {{ simResults.winRate.player0 }} wins ({{ simResults.player0Wins }})</p>
        <p>Player 1: {{ simResults.winRate.player1 }} wins ({{ simResults.player1Wins }})</p>
        <p>Draws: {{ simResults.draws }}</p>
        <p>Avg game length: {{ simResults.avgTurns }} turns</p>
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
const simResults = ref(null)

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

function runSim() {
  simRunning.value = true
  simResults.value = null

  setTimeout(() => {
    const results = gameLogicManager.runSimulation(simGames.value)
    results.totalGames = simGames.value
    simResults.value = results
    simRunning.value = false
  }, 10)
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

.sim-results {
  margin-top: 20px;
  text-align: left;
  padding: 15px;
  background: white;
  border-radius: 6px;
}

.sim-results p {
  margin: 5px 0;
}
</style>
