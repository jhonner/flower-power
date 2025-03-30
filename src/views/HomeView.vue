<template>
  <main>
    <h1>Home</h1>
    <nav>
      <router-link :to="{ name: 'game' }">Game</router-link>
      <router-link :to="{ name: 'rules' }">Rules</router-link>
    </nav>
  </main>
</template>

<script setup></script>

<style scoped></style>
