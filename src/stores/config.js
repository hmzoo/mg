import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const CONFIG_STORAGE_KEY = 'chat-ai-config'

export const useConfigStore = defineStore('config', () => {
  // État
  const config = ref({
    geminiToken: '',
    maxTokens: 8192,
    temperature: 0.7,
    autoSave: true,
    theme: 'light',
    model: 'gemini-2.0-flash-001'
  })
  
  const showConfigModal = ref(false)
  
  // Getters
  const isGeminiConfigured = computed(() => {
    return config.value.geminiToken.trim().length > 0
  })
  
  const maskedToken = computed(() => {
    if (!config.value.geminiToken) return ''
    return config.value.geminiToken.substring(0, 10) + '...'
  })
  
  const geminiToken = computed(() => config.value.geminiToken)
  
  // Watcher pour sauvegarder automatiquement
  watch(
    () => config.value,
    (newConfig) => {
      if (newConfig.autoSave) {
        saveToLocalStorage()
      }
    },
    { deep: true }
  )
  
  // Actions
  const loadConfig = () => {
    try {
      const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY)
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig)
        // Fusionner avec la configuration par défaut pour gérer les nouvelles propriétés
        config.value = { ...config.value, ...parsedConfig }
        console.log('Configuration chargée depuis localStorage')
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error)
    }
  }
  
  const saveToLocalStorage = () => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config.value))
      console.log('Configuration sauvegardée en localStorage')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    }
  }
  
  const saveConfig = (newConfig) => {
    // Mettre à jour la configuration
    config.value = { ...config.value, ...newConfig }
    
    // Sauvegarder immédiatement
    saveToLocalStorage()
  }
  
  const updateGeminiToken = (token) => {
    config.value.geminiToken = token
    saveToLocalStorage()
  }
  
  const clearConfig = () => {
    config.value = {
      geminiToken: '',
      maxTokens: 8192,
      temperature: 0.7,
      autoSave: true,
      theme: 'light',
      model: 'gemini-2.0-flash-001'
    }
    localStorage.removeItem(CONFIG_STORAGE_KEY)
    console.log('Configuration effacée')
  }
  
  const exportConfig = () => {
    const configToExport = { ...config.value }
    // Masquer le token pour l'export
    configToExport.geminiToken = configToExport.geminiToken ? '[TOKEN_MASQUÉ]' : ''
    return JSON.stringify(configToExport, null, 2)
  }
  
  const importConfig = (configJson) => {
    try {
      const importedConfig = JSON.parse(configJson)
      // Ne pas importer le token masqué
      if (importedConfig.geminiToken === '[TOKEN_MASQUÉ]') {
        delete importedConfig.geminiToken
      }
      config.value = { ...config.value, ...importedConfig }
      saveToLocalStorage()
      return true
    } catch (error) {
      console.error('Erreur lors de l\'import:', error)
      return false
    }
  }
  
  const openConfigModal = () => {
    showConfigModal.value = true
  }
  
  const closeConfigModal = () => {
    showConfigModal.value = false
  }
  
  return {
    // État
    config,
    showConfigModal,
    
    // Getters
    isGeminiConfigured,
    maskedToken,
    geminiToken,
    
    // Actions
    loadConfig,
    saveConfig,
    updateGeminiToken,
    clearConfig,
    exportConfig,
    importConfig,
    saveToLocalStorage,
    openConfigModal,
    closeConfigModal
  }
})
