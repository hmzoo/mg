<template>
  <v-dialog
    v-model="dialog"
    max-width="600"
    persistent
  >
    <v-card>
      <v-card-title class="text-h5 pa-4">
        <v-icon left class="mr-2">mdi-cog</v-icon>
        Configuration
      </v-card-title>
      
      <v-divider />
      
      <v-card-text class="pa-4" style="max-height: 70vh; overflow-y: auto;">
        <!-- Section API Gemini -->
        <div class="mb-6">
          <h6 class="text-subtitle-1 mb-3">
            <v-icon class="mr-2">mdi-robot</v-icon>
            API Gemini
          </h6>
          
          <v-text-field
            v-model="localConfig.geminiToken"
            label="Token API Gemini"
            placeholder="Entrez votre token API Gemini..."
            variant="outlined"
            density="comfortable"
            :type="showToken ? 'text' : 'password'"
            :append-inner-icon="showToken ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showToken = !showToken"
            hint="Ce token sera utilisé pour les requêtes à l'API Gemini"
            persistent-hint
            class="mb-3"
          />
          
          <!-- Bouton de test de connectivité -->
          <v-btn
            v-if="localConfig.geminiToken.trim()"
            color="success"
            variant="outlined"
            size="small"
            class="mb-3"
            @click="testConnection"
            :loading="isTestingConnection"
            :disabled="isTestingConnection || !localConfig.geminiToken.trim()"
          >
            <v-icon start>mdi-connection</v-icon>
            {{ connectionTestResult === null ? 'Tester la connexion' : 
               connectionTestResult ? 'Retester' : 'Réessayer le test' }}
          </v-btn>
        </div>
        
        <!-- Section Paramètres IA -->
        <div class="mb-6">
          <h6 class="text-subtitle-1 mb-3">
            <v-icon class="mr-2">mdi-tune</v-icon>
            Paramètres IA
          </h6>
          
          <v-slider
            v-model="localConfig.maxTokens"
            label="Tokens maximum"
            min="1024"
            max="32768"
            step="1024"
            thumb-label
            class="mb-3"
          />
          
          <v-slider
            v-model="localConfig.temperature"
            label="Température"
            min="0"
            max="2"
            step="0.1"
            thumb-label
            class="mb-3"
          />
        </div>
        
        <!-- Section Préférences -->
        <div class="mb-4">
          <h6 class="text-subtitle-1 mb-3">
            <v-icon class="mr-2">mdi-account-cog</v-icon>
            Préférences
          </h6>
          
          <v-switch
            v-model="localConfig.autoSave"
            label="Sauvegarde automatique"
            color="primary"
            class="mb-2"
          />
          
          <v-select
            v-model="localConfig.theme"
            label="Thème"
            :items="['light', 'dark', 'auto']"
            variant="outlined"
            density="comfortable"
          />
        </div>
        
        <!-- Alertes de statut -->
        <v-alert
          v-if="!localConfig.geminiToken.trim()"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          Un token API est requis pour utiliser les fonctionnalités IA
        </v-alert>
        
        <v-alert
          v-else-if="connectionTestResult === true"
          type="success"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          ✅ Token validé - Connexion à l'API Gemini réussie
        </v-alert>
        
        <v-alert
          v-else-if="connectionTestResult === false"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          ❌ {{ connectionErrorMessage || 'Échec de la connexion à l\'API Gemini' }}
        </v-alert>
        
        <v-alert
          v-else-if="localConfig.geminiToken.trim()"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          Token configuré - Cliquez sur "Tester la connexion" pour valider
        </v-alert>
        
        <!-- Actions d'export/import -->
        <div class="mb-3">
          <v-btn
            color="info"
            variant="outlined"
            size="small"
            class="mr-2 mb-2"
            @click="exportConfiguration"
          >
            <v-icon start>mdi-export</v-icon>
            Exporter
          </v-btn>
          
          <v-btn
            color="info"
            variant="outlined"
            size="small"
            class="mb-2"
            @click="importConfiguration"
          >
            <v-icon start>mdi-import</v-icon>
            Importer
          </v-btn>
        </div>
      </v-card-text>
      
      <v-divider />
      
      <v-card-actions class="pa-4">
        <v-btn
          color="error"
          variant="outlined"
          @click="resetToDefaults"
        >
          <v-icon start>mdi-restore</v-icon>
          Réinitialiser
        </v-btn>
        
        <v-spacer />
        
        <v-btn
          color="grey"
          variant="text"
          @click="cancel"
        >
          Annuler
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          @click="save"
          :disabled="!localConfig.geminiToken.trim() || isTestingConnection"
        >
          {{ connectionTestResult === true ? 'Sauvegarder' : 
             connectionTestResult === false ? 'Sauvegarder quand même' : 
             'Sauvegarder (test recommandé)' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  config: {
    type: Object,
    default: () => ({})
  }
})

// Émissions
const emit = defineEmits(['update:modelValue', 'save-config', 'test-connection'])

// État local
const dialog = ref(props.modelValue)
const showToken = ref(false)
const isTestingConnection = ref(false)
const connectionTestResult = ref(null) // null = pas testé, true = succès, false = échec
const connectionErrorMessage = ref('')

// Configuration locale (copie de la prop)
const localConfig = ref({
  geminiToken: '',
  maxTokens: 8192,
  temperature: 0.7,
  autoSave: true,
  theme: 'light',
  model: 'gemini-2.0-flash-001',
  ...props.config
})

// Synchroniser avec les props
watch(() => props.modelValue, (newValue) => {
  dialog.value = newValue
  if (newValue) {
    // Réinitialiser la config locale quand on ouvre la modal
    localConfig.value = {
      geminiToken: '',
      maxTokens: 8192,
      temperature: 0.7,
      autoSave: true,
      theme: 'light',
      model: 'gemini-2.0-flash-001',
      ...props.config
    }
    // Réinitialiser l'état du test
    connectionTestResult.value = null
    connectionErrorMessage.value = ''
  }
})

watch(() => props.config, (newConfig) => {
  localConfig.value = { ...localConfig.value, ...newConfig }
}, { deep: true })

// Réinitialiser le test quand le token change
watch(() => localConfig.value.geminiToken, () => {
  connectionTestResult.value = null
  connectionErrorMessage.value = ''
})

// Synchroniser la fermeture de la modal
watch(dialog, (newValue) => {
  if (!newValue) {
    emit('update:modelValue', false)
  }
})

// Actions
const testConnection = async () => {
  if (!localConfig.value.geminiToken.trim()) {
    return
  }
  
  isTestingConnection.value = true
  connectionTestResult.value = null
  connectionErrorMessage.value = ''
  
  try {
    // Émettre l'événement de test avec la configuration temporaire
    const testResult = await new Promise((resolve, reject) => {
      emit('test-connection', {
        config: { ...localConfig.value },
        callback: (success, error) => {
          if (success) {
            resolve(true)
          } else {
            reject(new Error(error || 'Test de connexion échoué'))
          }
        }
      })
      
      // Timeout de 30 secondes
      setTimeout(() => {
        reject(new Error('Timeout - Test de connexion trop long'))
      }, 30000)
    })
    
    connectionTestResult.value = true
    console.log('Test de connexion réussi')
  } catch (error) {
    connectionTestResult.value = false
    connectionErrorMessage.value = error.message
    console.error('Test de connexion échoué:', error.message)
  } finally {
    isTestingConnection.value = false
  }
}
const save = () => {
  emit('save-config', { ...localConfig.value })
  dialog.value = false
}

const cancel = () => {
  // Remettre la configuration originale
  localConfig.value = { ...props.config }
  dialog.value = false
}

const resetToDefaults = () => {
  localConfig.value = {
    geminiToken: '',
    maxTokens: 8192,
    temperature: 0.7,
    autoSave: true,
    theme: 'light',
    model: 'gemini-2.0-flash-001'
  }
}

const exportConfiguration = () => {
  const configToExport = { ...localConfig.value }
  // Masquer le token pour l'export
  if (configToExport.geminiToken) {
    configToExport.geminiToken = '[TOKEN_MASQUÉ]'
  }
  
  const dataStr = JSON.stringify(configToExport, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = 'chat-ai-config.json'
  link.click()
  
  URL.revokeObjectURL(url)
}

const importConfiguration = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  
  input.onchange = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedConfig = JSON.parse(e.target.result)
          // Ne pas importer le token masqué
          if (importedConfig.geminiToken === '[TOKEN_MASQUÉ]') {
            delete importedConfig.geminiToken
          }
          localConfig.value = { ...localConfig.value, ...importedConfig }
        } catch (error) {
          console.error('Erreur lors de l\'import:', error)
          alert('Erreur lors de l\'import du fichier de configuration')
        }
      }
      reader.readAsText(file)
    }
  }
  
  input.click()
}
</script>

<style scoped>
.v-card-title {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}
</style>
