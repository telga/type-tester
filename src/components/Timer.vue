<template>
  <div class="text-center mb-4">
    <p class="text-xl font-semibold text-secondary">
      {{ formatTime(timeLeft) }}
    </p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  isActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['timeUp'])
const timeLeft = ref(60) // 60 seconds test
const timer = ref(null)

const formatTime = (seconds) => {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
}

watch(() => props.isActive, (newValue) => {
  if (newValue) {
    timeLeft.value = 60
    timer.value = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 0) {
        clearInterval(timer.value)
        emit('timeUp')
      }
    }, 1000)
  } else {
    clearInterval(timer.value)
  }
})
</script> 