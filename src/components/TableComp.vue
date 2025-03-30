<template>
  <div class="table">
    <div class="frontTable cardFlex" :class="isSelectable(id)">
      <CardComp v-for="card in table" :card="card" :id="id" />
    </div>
    <div class="backTable cardFlex">
      <div class="card"></div>
      <div class="card"></div>
      <div class="card"></div>
      <div class="card"></div>
      <div class="card"></div>
    </div>
  </div>
</template>

<script setup>
import { turnStore } from "@/stores/turn"
import { playersStore } from "@/stores/players"
import CardComp from "@/components/CardComp.vue"

const props = defineProps(["id", "as"])

let turn = turnStore()
let players = playersStore()
let table = players.tableForId(props.id)

function isSelectable(id) {
  if (turn.select == id) {
    return "selectable"
  } else {
    return "notSelectable"
  }
}
</script>

<style scoped></style>
