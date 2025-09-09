<template>
  <v-card class="context-view" height="100%">
    <v-card-title class="text-h6 pa-3">
      Contexte
    </v-card-title>
    <v-card-text class="pa-3 d-flex flex-column" style="height: calc(100% - 64px);">
      <!-- Zone de prompt pour l'IA -->
      <div class="prompt-section mb-3">
        <v-text-field
          v-model="promptText"
          placeholder="Entrez un prompt pour modifier le contexte avec l'IA..."
          variant="outlined"
          density="compact"
          append-inner-icon="mdi-send"
          @click:append-inner="processPrompt"
          @keydown.enter="processPrompt"
          :loading="isProcessing"
          :disabled="isProcessing"
        />
        <v-btn
          v-if="contextText.trim()"
          color="error"
          variant="outlined"
          size="small"
          class="mt-2"
          @click="clearContext"
          :disabled="isProcessing"
        >
          <v-icon start>mdi-delete</v-icon>
          Effacer le contexte
        </v-btn>
      </div>
      
      <!-- Textarea principal -->
      <v-textarea
        v-model="contextText"
        placeholder="Le contexte apparaîtra ici..."
        variant="outlined"
        no-resize
        class="flex-grow-1"
        style="height: 100%;"
        @input="onContextChange"
        :disabled="isProcessing"
      />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue'

// Props pour recevoir le contexte initial
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

// Émissions pour communiquer les changements
const emit = defineEmits(['update:modelValue', 'prompt-request'])

// État local
const contextText = ref(props.modelValue)
const promptText = ref('')
const isProcessing = ref(false)

// Synchroniser avec le prop
watch(() => props.modelValue, (newValue) => {
  contextText.value = newValue
})

// Émettre les changements
const onContextChange = () => {
  emit('update:modelValue', contextText.value)
}

// Traiter le prompt avec l'IA
const processPrompt = async () => {
  if (!promptText.value.trim()) return
  
  isProcessing.value = true
  
  try {
    // Émettre l'événement avec le prompt et le contexte actuel
    emit('prompt-request', {
      prompt: promptText.value,
      currentContext: contextText.value,
      callback: (newContext) => {
        contextText.value = newContext
        onContextChange()
        isProcessing.value = false
        promptText.value = ''
      }
    })
  } catch (error) {
    console.error('Erreur lors du traitement du prompt:', error)
    isProcessing.value = false
  }
}

// Effacer le contexte
const clearContext = () => {
  contextText.value = ''
  onContextChange()
}
</script>

<style scoped>
.context-view {
  border-left: 1px solid #e0e0e0;
}

.prompt-section {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 12px;
}

.v-textarea :deep(.v-field__input) {
  height: 100% !important;
  min-height: 100% !important;
}

.v-textarea :deep(.v-field__field) {
  height: 100% !important;
}

.v-textarea :deep(.v-input__control) {
  height: 100% !important;
}
</style>
