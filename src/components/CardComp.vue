<template>
  <div style class="card" :class="isOpponent" @click="select">
    <p class="lisible">{{ card.type }} {{ card.points }}</p>
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

const isOpponent = computed(() => ({
  opponent: props.id == "0"
}))

function isFromHand() {
  return players.isFromHand(props.card, props.id)
}

function select() {
  if (turn.select == props.id) {
    gameLogicManager.handleCardFromTableForId(props.card, turn.select)
  } else {
    if (turn.select == -1 && turn.id == props.id && isFromHand()) {
      gameLogicManager.playCardForId(props.card, props.id)
    } else {
      gameLogicManager.discardFromTableForId(props.card, props.id)
    }
  }
}
</script>

<style scoped></style>
