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
            @compositionupdate="handleCompositionUpdate"
            @compositionend="handleCompositionEnd"
            class="absolute top-0 left-0 h-full w-full cursor-default bg-transparent text-transparent outline-none focus:outline-none focus:ring-0"
            :disabled="testComplete"
          />
          
          <p class="font-mono text-center max-h-[35vh] overflow-y-auto">
            <span
              v-for="(char, index) in displayText"
              :key="index"
              :class="{
                'text-nord14 transition-colors duration-150': selectedLanguage === 'ja' 
                  ? (getJapaneseCharStatus(index) === 'correct')
                  : (index < currentIndex && typedText[index] === char),
                'text-nord11 transition-colors duration-150': selectedLanguage === 'ja'
                  ? (getJapaneseCharStatus(index) === 'incorrect')
                  : (index < currentIndex && typedText[index] !== char),
                'relative cursor-underline': index === currentIndex && !testComplete,
                'text-nord4': index > currentIndex,
                'select-none pointer-events-none opacity-50': selectedLanguage === 'ja' && char === ' '
              }"
            >{{ getDisplayCharacter(char, index) }}</span>
            <span 
              v-if="selectedLanguage === 'ja' && isComposing" 
              class="text-nord4"
            >{{ inputValue }}</span>
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
  const rawText = await generateWords(selectedWordCount.value, selectedLanguage.value)
  text.value = rawText
}

const calculateResults = () => {
  const timeInSeconds = (Date.now() - startTime.value) / 1000
  accuracy.value = calculateAccuracy()
  
  if (selectedLanguage.value === 'en') {
    const totalChars = text.value.length
    const charactersPerSecond = totalChars / timeInSeconds
    const rawWpm = Math.round((charactersPerSecond * 60) / 5)
    wpm.value = accuracy.value < 60 ? 0 : rawWpm
  } else {
    // For Japanese: only count non-space characters
    const textWithoutSpaces = text.value.replace(/\s+/g, '')
    const typedWithoutSpaces = typedText.value.replace(/\s+/g, '')
    let correctChars = 0
    
    for (let i = 0; i < typedWithoutSpaces.length; i++) {
      if (typedWithoutSpaces[i] === textWithoutSpaces[i]) {
        correctChars++
      }
    }
    
    const charactersPerSecond = correctChars / timeInSeconds
    wpm.value = Math.round((charactersPerSecond * 60) / 5)
  }
}

const calculateAccuracy = () => {
  if (currentIndex.value === 0) return 0
  
  if (selectedLanguage.value === 'ja') {
    const textWithoutSpaces = text.value.replace(/\s+/g, '')
    const typedWithoutSpaces = typedText.value.replace(/\s+/g, '')
    let correctChars = 0
    const totalChars = textWithoutSpaces.length
    
    for (let i = 0; i < totalChars && i < typedWithoutSpaces.length; i++) {
      if (typedWithoutSpaces[i] === textWithoutSpaces[i]) {
        correctChars++
      }
    }
    
    return Math.round((correctChars / totalChars) * 100)
  } else {
    const totalChars = text.value.length
    let correctChars = 0
    
    for (let i = 0; i < totalChars && i < typedText.value.length; i++) {
      if (typedText.value[i] === text.value[i]) {
        correctChars++
      }
    }
    
    return Math.round((correctChars / totalChars) * 100)
  }
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

  // For Japanese: prevent space input completely
  if (selectedLanguage.value === 'ja' && e.key === ' ') {
    e.preventDefault()
    return
  }

  // For English: only allow space where expected
  if (selectedLanguage.value === 'en' && e.key === ' ') {
    if (text.value[currentIndex.value] !== ' ') {
      e.preventDefault()
      return
    }
  }

  // Handle English typing directly through keyPress
  if (selectedLanguage.value === 'en' && !isComposing.value) {
    if (e.key.length === 1) {
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

const handleCompositionStart = (e) => {
  isComposing.value = true
  inputValue.value = e.data || ''
}

const handleCompositionUpdate = (e) => {
  if (selectedLanguage.value === 'ja') {
    // Filter out spaces during IME composition
    inputValue.value = (e.data || '').replace(/\s+/g, '')
  }
}

const handleCompositionEnd = (e) => {
  isComposing.value = false
  if (selectedLanguage.value === 'ja') {
    if (!testStarted.value) {
      testStarted.value = true
      startTime.value = Date.now()
    }
    
    // Filter out spaces from the final input
    const input = (e.data || '').replace(/\s+/g, '')
    typedText.value += input
    currentIndex.value += input.length
    
    while (displayText.value[currentIndex.value] === ' ') {
      currentIndex.value++
    }
    
    inputValue.value = ''
    
    if (currentIndex.value >= displayText.value.length) {
      testComplete.value = true
      calculateResults()
    }
  }
}

// Update handleInput function
const handleInput = (e) => {
  if (testComplete.value) return
  
  if (selectedLanguage.value === 'ja') {
    if (isComposing.value) {
      // During IME composition, filter out spaces
      inputValue.value = e.target.value.replace(/\s+/g, '')
    } else {
      const input = inputValue.value.replace(/\s+/g, '')
      if (input.length > 0) {
        if (!testStarted.value) {
          testStarted.value = true
          startTime.value = Date.now()
        }
        
        typedText.value += input
        currentIndex.value += input.length
        
        while (displayText.value[currentIndex.value] === ' ') {
          currentIndex.value++
        }
        
        inputValue.value = ''
        
        if (currentIndex.value >= displayText.value.length) {
          testComplete.value = true
          calculateResults()
        }
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

// Add this computed property
const displayText = computed(() => {
  if (selectedLanguage.value === 'ja') {
    // Split into words (assuming words are space-separated)
    const words = text.value.split(' ')
    // Add visual spaces between characters within each word
    return words.map(word => word.split('').join('')).join(' ')
  }
  return text.value
})

// Create a new computed property for the actual text to type
const actualText = computed(() => {
  if (selectedLanguage.value === 'ja') {
    // Remove spaces only for Japanese mode
    return text.value.replace(/\s+/g, '')
  }
  return text.value
})

// Add this helper function
const getJapaneseCharStatus = (displayIndex) => {
  // Convert display index to actual index by removing spaces before this position
  const textUpToIndex = displayText.value.slice(0, displayIndex)
  const actualIndex = textUpToIndex.replace(/\s/g, '').length
  
  if (actualIndex >= typedText.value.length) return 'pending'
  
  const char = displayText.value[displayIndex]
  if (char === ' ') return 'space'
  
  const actualChar = text.value.replace(/\s/g, '')[actualIndex]
  return typedText.value[actualIndex] === actualChar ? 'correct' : 'incorrect'
}

// Add this helper function
const getDisplayCharacter = (char, index) => {
  if (selectedLanguage.value === 'ja') {
    if (char === ' ') return char
    const actualIndex = displayText.value.slice(0, index).replace(/\s/g, '').length
    if (actualIndex < typedText.value.length) {
      return typedText.value[actualIndex]
    } else if (index === currentIndex.value && isComposing.value) {
      return inputValue.value || char
    }
    return char
  } else {
    return index < currentIndex.value ? typedText.value[index] : char
  }
}
</script>

<style>
@keyframes cursorBlink {
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

.cursor-underline::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 100%;
  height: 2px;
  background-color: #D8DEE9; /* nord4 color */
  animation: cursorBlink 0.8s ease infinite;
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out forwards;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
</style> 