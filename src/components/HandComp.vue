<template>
  <div class="hand cardFlex">
    <CardComp v-for="card in hand" :key="card.id" :card="card" :id="id" />
  </div>
</template>

<script setup>
import { computed } from "vue"
import { playersStore } from "@/stores/players"
import CardComp from "@/components/CardComp.vue"

const props = defineProps(["id"])

const players = playersStore()
const hand = computed(() => players.handForId(props.id))
</script>

<style scoped></style>
