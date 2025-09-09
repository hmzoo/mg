import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useContextStore = defineStore('context', () => {
  // État
  const contextText = ref('')
  const isProcessingPrompt = ref(false)
  const lastPrompt = ref('')
  const promptHistory = ref([])
  
  // Getters
  const hasContext = computed(() => {
    return contextText.value.trim().length > 0
  })
  
  const contextWordCount = computed(() => {
    if (!contextText.value.trim()) return 0
    return contextText.value.trim().split(/\s+/).length
  })
  
  const contextCharCount = computed(() => {
    return contextText.value.length
  })
  
  // Actions
  const updateContext = (newContext) => {
    contextText.value = newContext
  }
  
  const clearContext = () => {
    contextText.value = ''
  }
  
  const appendToContext = (text) => {
    if (contextText.value.trim()) {
      contextText.value += '\n\n' + text
    } else {
      contextText.value = text
    }
  }
  
  const setProcessingPrompt = (processing) => {
    isProcessingPrompt.value = processing
  }
  
  const addPromptToHistory = (prompt) => {
    lastPrompt.value = prompt
    promptHistory.value.unshift({
      id: Date.now(),
      prompt: prompt,
      timestamp: new Date()
    })
    
    // Garder seulement les 10 derniers prompts
    if (promptHistory.value.length > 10) {
      promptHistory.value = promptHistory.value.slice(0, 10)
    }
  }
  
  const clearPromptHistory = () => {
    promptHistory.value = []
    lastPrompt.value = ''
  }
  
  return {
    // État
    contextText,
    isProcessingPrompt,
    lastPrompt,
    promptHistory,
    
    // Getters
    hasContext,
    contextWordCount,
    contextCharCount,
    
    // Actions
    updateContext,
    clearContext,
    appendToContext,
    setProcessingPrompt,
    addPromptToHistory,
    clearPromptHistory
  }
})
