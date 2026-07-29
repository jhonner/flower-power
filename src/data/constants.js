export const NUM_PLAYERS = 2
export const DECK_SIZE = 32
export const ACTION_TYPES = ["Water", "Prune", "Fertilize", "Pest"]
export const FLOWER_TYPES = ["Rose", "Sunflower", "Daisy", "Lily"]
export const POINT_VALUES = [1, 3, 5, 10]
export const AI_PLAYER_ID = 0

export const DIFFICULTY = {
  EASY: { useWater: false, usePrune: false, defensivePlay: false },
  MEDIUM: { useWater: true, usePrune: false, defensivePlay: false },
  HARD: { useWater: true, usePrune: true, defensivePlay: true }
}

export let currentDifficulty = "HARD"

export function setDifficulty(level) {
  currentDifficulty = level
}
