<template>
  <v-app>
    <!-- Barre d'en-tête -->
    <v-app-bar
      color="white"
      elevation="1"
      height="56"
      app
    >
      <v-app-bar-title class="text-h6 font-weight-medium">
        Chat IA avec Contexte
      </v-app-bar-title>
      
      <v-spacer />
      
      <v-btn
        icon="mdi-cog"
        variant="text"
        size="small"
        @click="configStore.openConfigModal"
      />
      
      <v-btn
        icon="mdi-bug"
        variant="text"
        size="small"
        @click="showDebugModal = true"
        :color="debugStore.requests.length > 0 ? 'primary' : 'default'"
      />
      
      <v-btn
        icon="mdi-help-circle-outline"
        variant="text"
        size="small"
      />
    </v-app-bar>

    <v-main>
      <div class="d-flex h-100">
        <div class="chat-container">
          <ChatView />
        </div>
        <div class="context-container">
          <ContextView 
            v-model="contextStore.contextText" 
            @prompt-request="handlePromptRequest"
          />
        </div>
      </div>
    </v-main>
    
    <!-- Modal de configuration -->
    <ConfigView
      v-model="configStore.showConfigModal"
      :config="configStore.config"
      @save-config="handleSaveConfig"
      @test-connection="handleTestConnection"
    />

    <!-- Modal de debug -->
    <DebugView v-model="showDebugModal" />
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ChatView from './components/ChatView.vue'
import ContextView from './components/ContextView.vue'
import ConfigView from './components/ConfigView.vue'
import DebugView from './components/DebugView.vue'
import { useConfigStore } from './stores/config'
import { useContextStore } from './stores/context'
import { useAIStore } from './stores/ai'
import { useDebugStore } from './stores/debug'

// État
const showDebugModal = ref(false)

// Stores
const configStore = useConfigStore()
const contextStore = useContextStore()
const aiStore = useAIStore()
const debugStore = useDebugStore()

// Charger la configuration au démarrage
onMounted(() => {
  configStore.loadConfig()
})

// Sauvegarder la configuration
const handleSaveConfig = (config) => {
  configStore.saveConfig(config)
  console.log('Configuration sauvegardée:', config)
}

// Tester la connexion
const handleTestConnection = async ({ config, callback }) => {
  try {
    console.log('Test de connexion avec config:', config)
    
    // Créer une instance temporaire du service AI pour le test
    const tempConfigStore = { ...configStore.config, ...config }
    
    // Réinitialiser le service AI pour utiliser la nouvelle config
    aiStore.resetService()
    
    // Sauvegarder temporairement la config pour le test
    const originalConfig = { ...configStore.config }
    configStore.saveConfig(config)
    
    try {
      // Initialiser et tester
      await aiStore.initializeService()
      const testResult = await aiStore.testConnection()
      
      if (testResult) {
        callback(true, null)
      } else {
        callback(false, 'Test de connexion échoué - Vérifiez votre token')
      }
    } catch (error) {
      // Restaurer la config originale en cas d'échec
      configStore.saveConfig(originalConfig)
      callback(false, error.message)
    }
  } catch (error) {
    console.error('Erreur lors du test de connexion:', error)
    callback(false, error.message)
  }
}

// Gérer les demandes de prompt pour l'IA
const handlePromptRequest = async ({ prompt, currentContext, callback }) => {
  try {
    const aiResponse = await aiStore.processPrompt(prompt, currentContext)
    callback(aiResponse)
  } catch (error) {
    console.error('Erreur lors du traitement du prompt:', error)
    callback(currentContext)
  }
}
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #f0f2f5;
}

.chat-container {
  flex: 2;
  height: calc(100vh - 56px);
  padding: 20px;
  padding-right: 10px;
}

.context-container {
  flex: 1;
  height: calc(100vh - 56px);
  padding: 20px;
  padding-left: 10px;
}
</style>