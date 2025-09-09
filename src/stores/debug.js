import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDebugStore = defineStore('debug', () => {
  // État
  const requests = ref([])
  const isEnabled = ref(true)
  const maxRequests = ref(50) // Limite pour éviter la surcharge mémoire

  // Actions
  const addRequest = (requestData) => {
    if (!isEnabled.value) return

    const request = {
      id: requestData.id || Date.now() + Math.random(),
      timestamp: requestData.timestamp || Date.now(),
      ...requestData
    }

    requests.value.unshift(request) // Ajouter au début

    // Limiter le nombre de requêtes stockées
    if (requests.value.length > maxRequests.value) {
      requests.value = requests.value.slice(0, maxRequests.value)
    }
    
    return request.id
  }

  const logApiRequest = (type, requestJson, startTime) => {
    console.log('Debug: Enregistrement requête', type)
    
    const requestId = Date.now() + Math.random() // Générer un ID unique
    const request = {
      id: requestId,
      timestamp: Date.now(),
      type,
      requestJson,
      startTime,
      status: 'pending'
    }
    
    const actualId = addRequest(request)
    console.log('Debug: Requête ajoutée avec ID:', actualId, 'total:', requests.value.length)
    return actualId
  }

  const logApiResponse = (requestId, responseJson, error = null, tokenCount = null, model = null) => {
    console.log('Debug: Enregistrement réponse pour ID:', requestId, 'Error:', error)
    console.log('Debug: Liste des IDs disponibles:', requests.value.map(r => r.id))
    
    const requestIndex = requests.value.findIndex(r => r.id === requestId)
    if (requestIndex === -1) {
      console.error('Debug: Requête non trouvée pour ID:', requestId)
      console.log('Debug: Requêtes disponibles:', requests.value)
      return
    }

    const request = requests.value[requestIndex]
    const endTime = Date.now()
    
    const updatedRequest = {
      ...request,
      responseJson,
      status: error ? 'error' : 'success',
      error,
      duration: endTime - request.startTime,
      tokenCount,
      model
    }
    
    requests.value[requestIndex] = updatedRequest
    
    console.log('Debug: Réponse mise à jour, statut:', updatedRequest.status)
    console.log('Debug: Requête complète:', updatedRequest)
  }

  const clearHistory = () => {
    requests.value = []
  }

  const toggleDebug = () => {
    isEnabled.value = !isEnabled.value
  }

  const getStats = () => {
    const total = requests.value.length
    const success = requests.value.filter(r => r.status === 'success').length
    const errors = requests.value.filter(r => r.status === 'error').length
    const avgDuration = total > 0 
      ? requests.value
          .filter(r => r.duration)
          .reduce((sum, r) => sum + r.duration, 0) / total
      : 0

    return {
      total,
      success,
      errors,
      avgDuration: Math.round(avgDuration)
    }
  }

  return {
    // État
    requests,
    isEnabled,
    maxRequests,

    // Actions
    addRequest,
    logApiRequest,
    logApiResponse,
    clearHistory,
    toggleDebug,
    getStats
  }
})
