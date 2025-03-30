<template>
  <div class="hand cardFlex">
    <CardComp v-for="card in hand" :card="card" :id="id" />
  </div>
</template>

<script setup>
import { playersStore } from "@/stores/players"
import CardComp from "@/components/CardComp.vue"

const props = defineProps(["id"])

let players = playersStore()
let hand = players.handForId(props.id)
</script>

<style scoped></style>
