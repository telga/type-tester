<template>
  <div class="min-h-screen bg-nord0">
    <header class="text-center pt-8">
      <h1 class="text-4xl font-light tracking-widest text-nord8 animate-fade-in select-none">
        brain<span class="text-nord4"> type</span>
      </h1>
    </header>
    
    <main class="max-w-3xl mx-auto">
      <TypingTest />
    </main>
  </div>
</template>

<script setup>
import TypingTest from './components/TypingTest.vue'
</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
</style>
