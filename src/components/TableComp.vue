<template>
  <div class="table">
    <div class="frontTable cardFlex" :class="isSelectable(id)">
      <CardComp v-for="card in table" :key="card.id" :card="card" :id="id" />
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
import { computed } from "vue"
import { turnStore } from "@/stores/turn"
import { playersStore } from "@/stores/players"
import CardComp from "@/components/CardComp.vue"

const props = defineProps(["id", "as"])

const turn = turnStore()
const players = playersStore()
const table = computed(() => players.tableForId(props.id))

function isSelectable(id) {
  if (turn.select === id) {
    return "selectable"
  } else {
    return "notSelectable"
  }
}
</script>

<style scoped></style>
