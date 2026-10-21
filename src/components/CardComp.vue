<template>
  <div style class="card" :class="isOpponent" @click="select">
    <p v-if="!isFaceDown" class="lisible">{{ card.type }} {{ card.points }}</p>
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

function isFromHand() {
  return players.isFromHand(props.card, props.id)
}

const isFaceDown = computed(() => props.id === 0 && isFromHand())

const isOpponent = computed(() => ({
  opponent: isFaceDown.value
}))

function select() {
  if (isFaceDown.value) return

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

<style scoped></style>
