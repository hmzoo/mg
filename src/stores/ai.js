import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useConfigStore } from './config'
import { useContextStore } from './context'
import { useDebugStore } from './debug'
import geminiService from '../services/api'

export const useAIStore = defineStore('ai', () => {
  // État
  const isProcessing = ref(false)
  const lastError = ref(null)
  const requestCount = ref(0)
  const isServiceInitialized = ref(false)
  
  // Getters
  const canMakeRequest = computed(() => {
    const configStore = useConfigStore()
    return configStore.isGeminiConfigured && !isProcessing.value && isServiceInitialized.value
  })
  
  // Actions
  const initializeService = async () => {
    const configStore = useConfigStore()
    const debugStore = useDebugStore()
    
    if (!configStore.isGeminiConfigured) {
      throw new Error('Configuration Gemini manquante')
    }
    
    try {
      console.log('Initialisation du service AI...')
      console.log('Config disponible:', configStore.config)
      
      // Configurer le debug store
      geminiService.setDebugStore(debugStore)
      
      geminiService.initialize(configStore.geminiToken, {
        temperature: configStore.config.temperature,
        maxTokens: configStore.config.maxTokens,
        model: 'gemini-pro'
      })
      
      // Diagnostic après initialisation
      geminiService.diagnose()
      
      // Test de connexion
      console.log('Test de connexion...')
      const connectionTest = await geminiService.testConnection()
      if (!connectionTest) {
        throw new Error('Test de connexion échoué')
      }
      
      isServiceInitialized.value = true
      console.log('Service Gemini initialisé avec succès')
    } catch (error) {
      isServiceInitialized.value = false
      lastError.value = error.message
      console.error('Erreur initialisation service:', error)
      
      // Diagnostic en cas d'erreur
      try {
        geminiService.diagnose()
      } catch (diagError) {
        console.error('Erreur de diagnostic:', diagError)
      }
      
      throw error
    }
  }
  
  const processPrompt = async (prompt, currentContext) => {
    const configStore = useConfigStore()
    const contextStore = useContextStore()
    
    if (!configStore.isGeminiConfigured) {
      configStore.openConfigModal()
      throw new Error('Token Gemini non configuré')
    }
    
    // Initialiser le service si nécessaire
    if (!isServiceInitialized.value) {
      await initializeService()
    }
    
    isProcessing.value = true
    lastError.value = null
    requestCount.value++
    
    try {
      contextStore.setProcessingPrompt(true)
      contextStore.addPromptToHistory(prompt)
      
      // Utiliser le service Gemini
      const response = await geminiService.processContextPrompt(prompt, currentContext)
      
      return response
    } catch (error) {
      lastError.value = error.message
      console.error('Erreur IA:', error)
      
      // Si erreur d'authentification, réinitialiser le service
      if (error.message.includes('Token API invalide')) {
        isServiceInitialized.value = false
        configStore.openConfigModal()
      }
      
      throw error
    } finally {
      isProcessing.value = false
      contextStore.setProcessingPrompt(false)
    }
  }
  
  const processChatMessage = async (message, history = [], context = '') => {
    const configStore = useConfigStore()
    const debugStore = useDebugStore()
    
    if (!configStore.isGeminiConfigured) {
      configStore.openConfigModal()
      throw new Error('Token Gemini non configuré')
    }
    
    // Initialiser le service si nécessaire
    if (!isServiceInitialized.value) {
      await initializeService()
    }
    
    // S'assurer que le debug store est configuré
    geminiService.setDebugStore(debugStore)
    
    isProcessing.value = true
    lastError.value = null
    requestCount.value++
    
    try {
      const response = await geminiService.processChatMessage(message, history, context)
      return response
    } catch (error) {
      lastError.value = error.message
      console.error('Erreur chat IA:', error)
      throw error
    } finally {
      isProcessing.value = false
    }
  }
  
  const processPromptWithStreaming = async (prompt, currentContext, onChunk) => {
    const configStore = useConfigStore()
    const contextStore = useContextStore()
    
    if (!configStore.isGeminiConfigured) {
      configStore.openConfigModal()
      throw new Error('Token Gemini non configuré')
    }
    
    // Initialiser le service si nécessaire
    if (!isServiceInitialized.value) {
      await initializeService()
    }
    
    isProcessing.value = true
    lastError.value = null
    requestCount.value++
    
    try {
      contextStore.setProcessingPrompt(true)
      contextStore.addPromptToHistory(prompt)
      
      const fullPrompt = geminiService.buildContextPrompt(prompt, currentContext)
      const response = await geminiService.generateContentStream(fullPrompt, onChunk)
      
      return response
    } catch (error) {
      lastError.value = error.message
      console.error('Erreur streaming IA:', error)
      throw error
    } finally {
      isProcessing.value = false
      contextStore.setProcessingPrompt(false)
    }
  }
  
  const testConnection = async () => {
    const debugStore = useDebugStore()
    
    try {
      if (!isServiceInitialized.value) {
        await initializeService()
      }
      
      // S'assurer que le debug store est configuré
      geminiService.setDebugStore(debugStore)
      
      // Le service lance une exception en cas d'erreur
      const result = await geminiService.testConnection()
      return result
    } catch (error) {
      lastError.value = error.message
      console.error('Test de connexion échoué:', error)
      
      // Re-lancer l'erreur pour que l'interface puisse l'afficher
      throw error
    }
  }
  
  const clearError = () => {
    lastError.value = null
  }
  
  const resetStats = () => {
    requestCount.value = 0
    lastError.value = null
  }
  
  const resetService = () => {
    geminiService.reset()
    isServiceInitialized.value = false
    isProcessing.value = false
    lastError.value = null
  }
  
  const getServiceInfo = () => {
    return {
      ...geminiService.getModelInfo(),
      requestCount: requestCount.value,
      lastError: lastError.value,
      isProcessing: isProcessing.value
    }
  }
  
  return {
    // État
    isProcessing,
    lastError,
    requestCount,
    isServiceInitialized,
    
    // Getters
    canMakeRequest,
    
    // Actions
    initializeService,
    processPrompt,
    processChatMessage,
    processPromptWithStreaming,
    testConnection,
    clearError,
    resetStats,
    resetService,
    getServiceInfo
  }
})
