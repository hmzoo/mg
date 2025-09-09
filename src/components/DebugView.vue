<template>
  <v-dialog v-model="isOpen" max-width="900px" scrollable>
    <v-card>
      <v-toolbar color="error" density="compact">
        <v-toolbar-title>
          <v-icon class="mr-2">mdi-bug</v-icon>
          Debug API - Historique JSON
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="clearHistory">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
        <v-btn icon @click="refreshData">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text style="height: 600px;">
        <div v-if="debugStore.requests.length === 0" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-2">mdi-bug-outline</v-icon>
          <p class="text-grey mt-4">Aucune requête API enregistrée</p>
        </div>

        <v-expansion-panels v-else multiple>
          <v-expansion-panel
            v-for="(request, index) in debugStore.requests"
            :key="request.id"
            :value="index"
          >
            <v-expansion-panel-title>
              <div class="d-flex align-center w-100">
                <v-chip
                  :color="request.status === 'success' ? 'success' : 'error'"
                  size="small"
                  class="mr-3"
                >
                  {{ request.status === 'success' ? 'SUCCESS' : 'ERROR' }}
                </v-chip>
                
                <div class="flex-grow-1">
                  <strong>{{ request.type }}</strong>
                  <div class="text-caption text-grey">
                    {{ formatTimestamp(request.timestamp) }}
                  </div>
                </div>
                
                <div class="text-caption">
                  {{ request.duration }}ms
                </div>
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <v-tabs v-model="activeTab[request.id]" density="compact">
                <v-tab value="request">
                  <v-icon class="mr-1">mdi-upload</v-icon>
                  Requête
                </v-tab>
                <v-tab value="response">
                  <v-icon class="mr-1">mdi-download</v-icon>
                  Réponse
                </v-tab>
                <v-tab value="meta">
                  <v-icon class="mr-1">mdi-information</v-icon>
                  Métadonnées
                </v-tab>
              </v-tabs>

              <v-tabs-window v-model="activeTab[request.id]">
                <!-- Onglet Requête -->
                <v-tabs-window-item value="request">
                  <div class="mt-4">
                    <div class="d-flex justify-space-between align-center mb-2">
                      <h4>JSON Envoyé</h4>
                      <v-btn
                        size="small"
                        variant="text"
                        @click="copyToClipboard(request.requestJson)"
                      >
                        <v-icon>mdi-content-copy</v-icon>
                        Copier
                      </v-btn>
                    </div>
                    <pre class="json-display"><code>{{ formatJson(request.requestJson) }}</code></pre>
                  </div>
                </v-tabs-window-item>

                <!-- Onglet Réponse -->
                <v-tabs-window-item value="response">
                  <div class="mt-4">
                    <div class="d-flex justify-space-between align-center mb-2">
                      <h4>JSON Reçu</h4>
                      <v-btn
                        v-if="request.responseJson"
                        size="small"
                        variant="text"
                        @click="copyToClipboard(request.responseJson)"
                      >
                        <v-icon>mdi-content-copy</v-icon>
                        Copier
                      </v-btn>
                    </div>
                    <div v-if="!request.responseJson && request.status === 'pending'" class="text-center pa-4">
                      <v-progress-circular indeterminate color="primary"></v-progress-circular>
                      <p class="mt-2 text-grey">En attente de la réponse...</p>
                    </div>
                    <div v-else-if="!request.responseJson && request.status === 'error'" class="text-center pa-4">
                      <v-icon color="error" size="48">mdi-alert-circle</v-icon>
                      <p class="mt-2 error--text">Erreur: {{ request.error }}</p>
                    </div>
                    <pre v-else class="json-display" :class="request.status === 'error' ? 'error-response' : ''">
                      <code>{{ formatJson(request.responseJson) }}</code>
                    </pre>
                  </div>
                </v-tabs-window-item>

                <!-- Onglet Métadonnées -->
                <v-tabs-window-item value="meta">
                  <div class="mt-4">
                    <v-list density="compact">
                      <v-list-item>
                        <v-list-item-title>Type de requête</v-list-item-title>
                        <v-list-item-subtitle>{{ request.type }}</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-title>Timestamp</v-list-item-title>
                        <v-list-item-subtitle>{{ new Date(request.timestamp).toISOString() }}</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-title>Durée</v-list-item-title>
                        <v-list-item-subtitle>{{ request.duration }}ms</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item>
                        <v-list-item-title>Statut</v-list-item-title>
                        <v-list-item-subtitle>{{ request.status }}</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item v-if="request.error">
                        <v-list-item-title>Erreur</v-list-item-title>
                        <v-list-item-subtitle class="error--text">{{ request.error }}</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item v-if="request.model">
                        <v-list-item-title>Modèle</v-list-item-title>
                        <v-list-item-subtitle>{{ request.model }}</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item v-if="request.tokenCount">
                        <v-list-item-title>Tokens utilisés</v-list-item-title>
                        <v-list-item-subtitle>{{ request.tokenCount.total }} (entrée: {{ request.tokenCount.input }}, sortie: {{ request.tokenCount.output }})</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item v-if="hasContextInRequest(request)">
                        <v-list-item-title>Contexte détecté</v-list-item-title>
                        <v-list-item-subtitle class="success--text">✓ Contexte intégré dans la requête</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item v-else>
                        <v-list-item-title>Contexte</v-list-item-title>
                        <v-list-item-subtitle class="warning--text">Aucun contexte détecté</v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                  </div>
                </v-tabs-window-item>
              </v-tabs-window>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="close">Fermer</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useDebugStore } from '../stores/debug'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const debugStore = useDebugStore()
const activeTab = reactive({})

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const close = () => {
  isOpen.value = false
}

const clearHistory = () => {
  debugStore.clearHistory()
}

const refreshData = () => {
  // Force la réactivité
  console.log('Rafraîchissement des données debug, total:', debugStore.requests.length)
}

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatJson = (jsonData) => {
  if (!jsonData) return 'Aucune donnée'
  try {
    if (typeof jsonData === 'string') {
      return JSON.stringify(JSON.parse(jsonData), null, 2)
    }
    return JSON.stringify(jsonData, null, 2)
  } catch (error) {
    return jsonData
  }
}

const copyToClipboard = async (data) => {
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    await navigator.clipboard.writeText(text)
  } catch (err) {
    console.error('Erreur lors de la copie:', err)
  }
}

const hasContextInRequest = (request) => {
  if (!request.requestJson || !request.requestJson.contents) return false
  
  // Vérifier s'il y a un message système avec contexte
  const contents = request.requestJson.contents
  return contents.some(content => 
    content.parts && 
    content.parts[0] && 
    content.parts[0].text && 
    content.parts[0].text.includes('CONTEXTE IMPORTANT À PRENDRE EN COMPTE')
  )
}
</script>

<style scoped>
.json-display {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 16px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.4;
  max-height: 400px;
  overflow-y: auto;
}

.json-display code {
  color: #333;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.error-response {
  background-color: #ffebee;
  border-color: #f44336;
}

.error-response code {
  color: #c62828;
}
</style>
