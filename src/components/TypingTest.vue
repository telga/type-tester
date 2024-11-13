<template>
  <div class="h-[80vh] flex items-center justify-center">
    <div class="flex flex-col items-center gap-6 py-8">
      <!-- Add language selector next to word count -->
      <div class="flex items-center gap-4 animate-fade-in">
        <div class="relative">
          <button
            @click="isDropupOpen = !isDropupOpen"
            :disabled="testStarted"
            class="bg-nord1 text-nord4 focus:outline-none border-none cursor-pointer px-3 py-1.5 rounded hover:bg-nord2 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {{ selectedLanguage === 'en' ? 'English' : '日本語' }}
            <span class="transform rotate-180 text-[16px] pr-1.5 opacity-40 translate-y-[0.5px]">▾</span>
          </button>
          
          <!-- Dropup menu -->
          <div
            v-if="isDropupOpen"
            class="absolute bottom-full left-0 mb-1 bg-nord1 rounded shadow-lg overflow-hidden animate-fade-in"
          >
            <button
              v-for="lang in languages"
              :key="lang.code"
              @click="selectLanguage(lang.code)"
              class="w-full px-4 py-2 text-left text-nord4 hover:bg-nord2 transition-colors whitespace-nowrap"
              :class="{ 'bg-nord2': selectedLanguage === lang.code }"
            >
              {{ lang.label }}
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Your existing word count input -->
          <input
            type="number"
            v-model.number="selectedWordCount"
            @blur="handleWordCountChange"
            @keydown.enter="handleEnterKey"
            @focus="handleFocus"
            :disabled="testStarted"
            class="w-12 bg-nord1 text-center text-nord4 focus:outline-none focus:bg-nord2 px-2 py-1.5 rounded transition-colors duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            :class="{ 'opacity-50': testStarted }"
          />
          <span class="text-sm text-nord4 opacity-50">{{ selectedLanguage === 'en' ? 'words' : '言葉' }}</span>
        </div>
      </div>

      <div v-if="testComplete" class="animate-slide-up">
        <Stats :wpm="wpm" :accuracy="accuracy" />
        <span v-if="selectedLanguage === 'en' && accuracy < 60" 
              class="text-nord11 text-sm text-center block mt-2 animate-fade-in">
          invalid: ur cheating or ur really bad at typing
        </span>
      </div>
      
      <!-- Main typing area -->
      <div class="w-full max-w-2xl px-4">
        <div 
          class="w-full text-2xl leading-relaxed focus:outline-none relative"
          :class="{'opacity-50 transition-opacity duration-300': testComplete}"
        >
          <!-- Add hidden input field for IME -->
          <input
            type="text"
            ref="textContainer"
            v-model="inputValue"
            @input="handleInput"
            @keydown="handleKeyPress"
            @compositionstart="handleCompositionStart"
            @compositionend="handleCompositionEnd"
            class="opacity-0 absolute top-0 left-0 h-full w-full cursor-default"
            :disabled="testComplete"
          />
          
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
        {{ selectedLanguage === 'en' ? 'restart' : 'リセット' }}
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
const isComposing = ref(false)
const inputValue = ref('')

const wpm = ref(0)
const accuracy = ref(100)

const selectedLanguage = ref(localStorage.getItem('lastLanguage') || 'en')

const isDropupOpen = ref(false)
const languages = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語（ひらがな）' }
]

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
  text.value = await generateWords(selectedWordCount.value, selectedLanguage.value)
}

const calculateResults = () => {
  const timeInSeconds = (Date.now() - startTime.value) / 1000
  accuracy.value = calculateAccuracy()
  
  if (selectedLanguage.value === 'en') {
    // For English: (characters typed / 5) / minutes
    const totalChars = text.value.length
    const charactersPerSecond = totalChars / timeInSeconds
    const rawWpm = Math.round((charactersPerSecond * 60) / 5)
    // Show 0 WPM if accuracy is under 60%
    wpm.value = accuracy.value < 60 ? 0 : rawWpm
  } else {
    // For Japanese: only count correctly typed characters
    let correctChars = 0
    for (let i = 0; i < typedText.value.length; i++) {
      if (typedText.value[i] === text.value[i]) {
        correctChars++
      }
    }
    const charactersPerSecond = correctChars / timeInSeconds
    wpm.value = Math.round((charactersPerSecond * 60) / 5)
  }
}

const calculateAccuracy = () => {
  if (currentIndex.value === 0) return 0
  
  const totalChars = text.value.length
  let correctChars = 0
  
  for (let i = 0; i < totalChars && i < typedText.value.length; i++) {
    if (typedText.value[i] === text.value[i]) {
      correctChars++
    }
  }
  
  return Math.round((correctChars / totalChars) * 100)
}

const handleFocus = (e) => {
  e.target.value = ''
}

const handleKeyPress = (e) => {
  if (testComplete.value) return

  if (e.key === 'r' && e.ctrlKey) {
    e.preventDefault()
    resetTest()
    return
  }

  // Handle English typing directly through keyPress
  if (selectedLanguage.value === 'en' && !isComposing.value) {
    if (e.key.length === 1) { // Regular character
      e.preventDefault()
      if (!testStarted.value && e.key === text.value[0]) {
        testStarted.value = true
        startTime.value = Date.now()
      }
      typedText.value += e.key
      currentIndex.value++
    }
  }

  if (e.key === 'Backspace' && currentIndex.value > 0) {
    e.preventDefault()
    typedText.value = typedText.value.slice(0, -1)
    currentIndex.value--
  }

  if (currentIndex.value === text.value.length) {
    testComplete.value = true
    calculateResults()
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
  inputValue.value = ''
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

const selectLanguage = (langCode) => {
  selectedLanguage.value = langCode
  isDropupOpen.value = false
  localStorage.setItem('lastLanguage', langCode)
  resetTest()
}

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = (e) => {
  isComposing.value = false
  if (e.data && selectedLanguage.value === 'ja') {
    // Start the test if this is the first character
    if (!testStarted.value) {
      testStarted.value = true
      startTime.value = Date.now()
    }
    
    typedText.value += e.data
    currentIndex.value += e.data.length
    inputValue.value = ''
    
    // Check if we've reached or exceeded the target length
    if (typedText.value.length >= text.value.length) {
      testComplete.value = true
      calculateResults()
    }
  }
}

// Update or add these handlers
const handleInput = (e) => {
  if (testComplete.value) return
  
  if (selectedLanguage.value === 'ja' && !isComposing.value) {
    const input = inputValue.value
    if (input.length > 0) {
      // Start the test if this is the first character
      if (!testStarted.value) {
        testStarted.value = true
        startTime.value = Date.now()
      }
      
      typedText.value += input
      currentIndex.value += input.length
      inputValue.value = ''
      
      // Check if we've reached or exceeded the target length
      if (typedText.value.length >= text.value.length) {
        testComplete.value = true
        calculateResults()
      }
    }
  }
}

// Make sure to update onMounted to focus the input
onMounted(async () => {
  await loadNewWords()
  textContainer.value?.focus()
  document.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.relative')
    if (dropdown && !dropdown.contains(e.target)) {
      isDropupOpen.value = false
    }
  })
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