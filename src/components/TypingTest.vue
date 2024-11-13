<template>
  <div class="h-[80vh] flex items-center justify-center">
    <div class="flex flex-col items-center gap-6 py-8">
      <!-- Word Count Input -->
      <div class="flex items-center gap-2 animate-fade-in">
        <input
          type="number"
          v-model.number="selectedWordCount"
          @blur="handleWordCountChange"
          @keydown.enter="handleEnterKey"
          @focus="handleFocus"
          :disabled="testStarted"
          class="w-12 bg-transparent text-center text-nord4 focus:outline-none transition-colors duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          :class="{ 'opacity-50': testStarted }"
        />
        <span class="text-sm text-nord4 opacity-50">words</span>
      </div>

      <div v-if="testComplete" class="animate-slide-up">
        <Stats :wpm="wpm" :accuracy="accuracy" />
        <span v-if="accuracy < 70" 
              class="text-nord11 text-sm text-center block mt-2 animate-fade-in">
          invalid: ur cheating or ur really bad at typing
        </span>
      </div>
      
      <!-- Main typing area -->
      <div class="w-full max-w-2xl px-4">
        <div 
          class="w-full text-2xl leading-relaxed focus:outline-none"
          @keydown="handleKeyPress"
          tabindex="0"
          ref="textContainer"
          :class="{'opacity-50 transition-opacity duration-300': testComplete}"
        >
          <p class="font-mono text-center max-h-[35vh] overflow-y-auto">
            <span
              v-for="(char, index) in text"
              :key="index"
              :class="{
                'text-nord14 transition-colors duration-150': index < currentIndex && typedText[index] === char,
                'text-nord11 transition-colors duration-150': index < currentIndex && typedText[index] !== char,
                'bg-nord2 animate-cursor': index === currentIndex && !testComplete,
                'text-nord4': index > currentIndex
              }"
            >{{ char }}</span>
          </p>
        </div>
      </div>
      
      <!-- Restart button -->
      <button
        @click="resetTest"
        @keydown.enter="resetTest"
        tabindex="0"
        class="px-6 py-2 bg-nord3 text-nord6 rounded-lg transition-all duration-200 hover:bg-nord2 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-nord8 focus:outline-none">
        restart test
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Stats from './Stats.vue'
import { generateWords } from '../services/wordService'

// Get saved word count or default to 25
const savedWordCount = localStorage.getItem('lastWordCount')
const selectedWordCount = ref(savedWordCount ? parseInt(savedWordCount) : 25)
const text = ref('')
const typedText = ref('')
const currentIndex = ref(0)
const testStarted = ref(false)
const testComplete = ref(false)
const startTime = ref(null)
const textContainer = ref(null)

const wpm = ref(0)
const accuracy = ref(100)

const handleWordCountChange = () => {
  if (selectedWordCount.value < 8) selectedWordCount.value = 8
  if (selectedWordCount.value > 100) selectedWordCount.value = 100
  selectedWordCount.value = Math.round(selectedWordCount.value)
  // Save to localStorage whenever it changes
  localStorage.setItem('lastWordCount', selectedWordCount.value.toString())
  resetTest()
}

const handleEnterKey = (e) => {
  e.preventDefault()
  e.target.blur()
  handleWordCountChange()
  textContainer.value?.focus()
}

const loadNewWords = async () => {
  text.value = await generateWords(selectedWordCount.value)
}

const calculateResults = () => {
  const timeInMinutes = (Date.now() - startTime.value) / 60000
  const wordsTyped = text.value.split(' ').length
  const rawWpm = Math.round(wordsTyped / timeInMinutes)
  
  const totalChars = currentIndex.value
  const correctChars = Array.from(typedText.value).reduce((acc, char, i) => {
    return acc + (char === text.value[i] ? 1 : 0)
  }, 0)
  
  accuracy.value = Math.round((correctChars / totalChars) * 100)
  wpm.value = accuracy.value >= 70 ? rawWpm : 0
}

const handleFocus = (e) => {
  e.target.select()
}

const handleKeyPress = (e) => {
  if (testComplete.value) return

  if (e.key === 'r' && e.ctrlKey) {
    e.preventDefault()
    resetTest()
    return
  }

  if (e.key === 'Tab') {
    return
  }

  if (e.key === text.value[0] && !testStarted.value) {
    testStarted.value = true
    startTime.value = Date.now()
  }

  if (e.key === 'Backspace' && currentIndex.value > 0) {
    typedText.value = typedText.value.slice(0, -1)
    currentIndex.value--
  } else if (e.key.length === 1) {
    typedText.value += e.key
    currentIndex.value++
  }

  if (currentIndex.value === text.value.length) {
    testComplete.value = true
    calculateResults()
  }

  if (e.key !== 'Tab') {
    e.preventDefault()
  }
}

const resetTest = async () => {
  await loadNewWords()
  typedText.value = ''
  currentIndex.value = 0
  testStarted.value = false
  testComplete.value = false
  startTime.value = null
  wpm.value = 0
  accuracy.value = 100
  textContainer.value?.focus()
}

const getDisplayChar = (char, index) => {
  if (char === ' ' && 
      index < currentIndex.value && 
      typedText.value[index] !== char) {
    return '_'
  }
  return char
}

onMounted(async () => {
  await loadNewWords()
  textContainer.value?.focus()
})
</script>

<style>
@keyframes cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-cursor {
  animation: cursor 0.8s ease infinite;
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out forwards;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
</style> 