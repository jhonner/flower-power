---
paths:
  - "src/components/**/*.vue"
  - "src/views/**/*.vue"
---

# Vue Component Guidelines

## Script Setup
- Use `<script setup>` syntax exclusively
- Define props with `defineProps(["name"])`
- Define emits with `defineEmits(["eventName"])`

## Reactivity
- Use `ref()` for primitive values
- Use `reactive()` for objects (sparingly)
- Use `computed()` for derived reactive state
- Never assign directly to store state outside actions

## Templates
- Add `:key` to all `v-for` loops
- Use strict equality in conditionals (`===`)
- Keep template logic simple - move complex logic to computed

## Styling
- Use `<style scoped>` for component styles
- Global styles go in `src/style.css`
- Follow existing class naming patterns
