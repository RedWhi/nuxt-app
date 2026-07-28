import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)

  const doubleCount = computed(() => count.value * 2)

  function increment(): void {
    count.value += 1
  }

  function reset(): void {
    count.value = 0
  }

  return {
    count,
    doubleCount,
    increment,
    reset,
  }
})
