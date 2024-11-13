<template>
  <div class="flex gap-4 text-nord4">
    <div class="text-center">
      <div class="text-2xl font-bold" :class="{ 'text-nord11': accuracy < 70 }">
        {{ accuracy < 70 ? 0 : wpm }}
      </div>
      <div class="text-sm opacity-50">wpm</div>
    </div>
    <div class="text-center">
      <div class="text-2xl font-bold" :class="{ 'text-nord11': accuracy < 70 }">
        {{ accuracy }}%
      </div>
      <div class="text-sm opacity-50">accuracy</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  wpm: Number,
  accuracy: Number
})
</script> 