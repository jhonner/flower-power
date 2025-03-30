<template>
  <main>
    <div v-if="id == 0">
      <HandComp :id="id" />
      <TableComp :id="id" />
    </div>
    <div class="spacer"></div>
    <div v-if="id == 1">
      <TableComp :id="id" />
      <HandComp :id="id" />
    </div>
  </main>
</template>

<script setup>
// import { storeToRefs } from "pinia"
// import { playersStore } from "@/stores/players"

// const players = playersStore()

import HandComp from "@/components/HandComp.vue"
import TableComp from "@/components/TableComp.vue"

const props = defineProps(["id"])
</script>

<style scoped></style>
