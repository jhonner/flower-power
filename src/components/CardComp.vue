<template>
  <div
    class="card"
    :class="[cardThemeClass, isOpponent, { 'target-eligible': isTargetEligible }]"
    @click="select"
  >
    <template v-if="!isFaceDown">
      <!-- Fertilize Seal -->
      <div v-if="card?.fertilized" class="fertilized-seal" title="Fertilized: 2x points">
        🌱 2x
      </div>

      <!-- Card Inner Layout -->
      <div class="card-inner">
        <!-- Card Header -->
        <div class="card-header">
          <span class="card-icon">{{ cardMeta.icon }}</span>
          <span class="card-name">{{ card?.type }}</span>
        </div>

        <!-- Center Art -->
        <div class="card-art">
          <span class="card-emoji">{{ cardMeta.emoji }}</span>
        </div>

        <!-- Card Footer -->
        <div class="card-footer">
          <span v-if="isFlower" class="point-badge">+{{ card?.points }} pts</span>
          <span v-else class="action-badge">{{ cardMeta.actionText }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { turnStore } from "@/stores/turn"
import { playersStore } from "@/stores/players"
import { gameLogicManager } from "@/managers/gameLogicManager"

const props = defineProps(["id", "card"])
const turn = turnStore()
const players = playersStore()

const CARD_METADATA = {
  Rose: { emoji: "🌹", icon: "🌹", theme: "theme-rose", actionText: "" },
  Sunflower: { emoji: "🌻", icon: "🌻", theme: "theme-sunflower", actionText: "" },
  Daisy: { emoji: "🌼", icon: "🌼", theme: "theme-daisy", actionText: "" },
  Lily: { emoji: "🌷", icon: "🌷", theme: "theme-lily", actionText: "" },
  Water: { emoji: "💧", icon: "💧", theme: "theme-water", actionText: "Steal Plant" },
  Prune: { emoji: "✂️", icon: "✂️", theme: "theme-prune", actionText: "Prune Plant" },
  Fertilize: { emoji: "🌱", icon: "🌱", theme: "theme-fertilize", actionText: "x2 Points" },
  Pest: { emoji: "🐛", icon: "🐛", theme: "theme-pest", actionText: "Destroy Plant" }
}

function isFromHand() {
  if (props.id === -1 || !props.card) return false
  return players.isFromHand(props.card, props.id)
}

const isFaceDown = computed(() => props.id === 0 && isFromHand())

const isOpponent = computed(() => ({
  opponent: isFaceDown.value
}))

const cardMeta = computed(() => {
  const type = props.card?.type
  return CARD_METADATA[type] || { emoji: "🌸", icon: "🌸", theme: "theme-generic", actionText: "" }
})

const isFlower = computed(() => props.card && props.card.points !== undefined)

const cardThemeClass = computed(() => {
  if (isFaceDown.value) return "card-back"
  return cardMeta.value.theme
})

const isTargetEligible = computed(() => {
  if (isFaceDown.value) return false
  if (isFromHand()) return false
  if (turn.select === -1) return false
  if (turn.select !== props.id) return false

  const action = gameLogicManager.currentAction
  if (action === "Fertilize") {
    return !props.card?.fertilized
  }
  return true
})

function select() {
  if (isFaceDown.value || props.id === -1) return

  if (turn.select === props.id) {
    if (!isFromHand()) {
      gameLogicManager.handleCardFromTableForId(props.card, turn.select)
    }
  } else {
    if (turn.select === -1 && turn.id === props.id && isFromHand()) {
      gameLogicManager.playCardForId(props.card, props.id)
    } else if (turn.select === -1 && turn.id === props.id && !isFromHand()) {
      gameLogicManager.discardFromTableForId(props.card, props.id)
    }
  }
}
</script>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 4px;
  user-select: none;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;
}

.card:hover:not(.opponent) {
  transform: translateY(-4px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
}

.card-back {
  background-image: url("@/assets/back.png");
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
}

.card-inner {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  width: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.72em;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 1px 2px;
}

.card-icon {
  font-size: 0.95em;
}

.card-name {
  letter-spacing: 0.2px;
}

.card-art {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  font-size: 2.2em;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
  transition: transform 0.18s ease;
}

.card:hover:not(.opponent) .card-emoji {
  transform: scale(1.1);
}

.card-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 2px;
}

.point-badge {
  font-size: 0.72em;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  letter-spacing: 0.3px;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.action-badge {
  font-size: 0.65em;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.fertilized-seal {
  position: absolute;
  top: 3px;
  right: 3px;
  background: #f1c40f;
  color: #1b1b1b;
  font-size: 0.62em;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 8px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.6);
  border: 1px solid #fff;
  z-index: 5;
  letter-spacing: 0.4px;
}

/* Theme Gradients & Accents */
.theme-rose {
  background: linear-gradient(145deg, #2a1114, #4e1920);
  border: 1.5px solid #e17076;
  color: #fff;
}
.theme-rose .point-badge {
  background: #b33939;
  color: #fff;
}

.theme-sunflower {
  background: linear-gradient(145deg, #2b2105, #553e0d);
  border: 1.5px solid #f1c40f;
  color: #fff;
}
.theme-sunflower .point-badge {
  background: #d35400;
  color: #fff;
}

.theme-daisy {
  background: linear-gradient(145deg, #17261d, #2a4736);
  border: 1.5px solid #a8e6cf;
  color: #fff;
}
.theme-daisy .point-badge {
  background: #27ae60;
  color: #fff;
}

.theme-lily {
  background: linear-gradient(145deg, #21122f, #4a2468);
  border: 1.5px solid #dcd6f7;
  color: #fff;
}
.theme-lily .point-badge {
  background: #8e44ad;
  color: #fff;
}

.theme-water {
  background: linear-gradient(145deg, #0b223f, #18467b);
  border: 1.5px solid #74b9ff;
  color: #fff;
}
.theme-water .action-badge {
  background: #0984e3;
  color: #fff;
}

.theme-prune {
  background: linear-gradient(145deg, #0e2920, #1b5643);
  border: 1.5px solid #55efc4;
  color: #fff;
}
.theme-prune .action-badge {
  background: #00b894;
  color: #fff;
}

.theme-fertilize {
  background: linear-gradient(145deg, #1b260f, #3e531c);
  border: 1.5px solid #a3cb38;
  color: #fff;
}
.theme-fertilize .action-badge {
  background: #6ab04c;
  color: #fff;
}

.theme-pest {
  background: linear-gradient(145deg, #321712, #6b281c);
  border: 1.5px solid #e17055;
  color: #fff;
}
.theme-pest .action-badge {
  background: #d63031;
  color: #fff;
}

.theme-generic {
  background: #2f3640;
  border: 1.5px solid #718093;
  color: #fff;
}

/* Pulsing Target Glow */
.target-eligible {
  box-shadow: 0 0 10px #2ecc71, inset 0 0 6px rgba(46, 204, 113, 0.45);
  border-color: #2ecc71 !important;
  cursor: pointer;
  animation: pulse-glow 1.2s infinite alternate ease-in-out;
  transform: translateY(-2px);
}

@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 4px #2ecc71;
  }
  100% {
    box-shadow: 0 0 14px #2ecc71, 0 0 4px #a8e6cf;
  }
}
</style>
