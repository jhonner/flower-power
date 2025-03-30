<template>
  <!-- <nav>
    <router-link :to="{ name: 'home' }">Back</router-link>
  </nav> -->
  <div class="ground">
    <div class="deck">
      <div class="discard" @click="discard"></div>
      <div class="deckCard" @click="draw"></div>
    </div>
    <div>
      <PlayerComp :class="isTurn(0)" :id="0" />
      <PlayerComp :class="isTurn(1)" :id="1" />
    </div>
  </div>
</template>

<script setup>
import { turnStore } from "@/stores/turn"
import { gameLogicManager } from "@/managers/gameLogicManager"
import PlayerComp from "@/components/PlayerComp.vue"

let turn = turnStore()

gameLogicManager.newGame()

function isTurn(id) {
  if (turn.id == id) {
    return "turn"
  } else {
    return "notTurn"
  }
}

function draw() {
  console.log("draw from deck")
  gameLogicManager.drawCard(turn.id)
}
</script>

<style scoped></style>
