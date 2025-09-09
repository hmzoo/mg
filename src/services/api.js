import { GoogleGenAI } from '@google/genai'

class GeminiAPIService {
  constructor() {
    this.genAI = null
    this.isInitialized = false
    this.apiKey = null
    this.debugStore = null
  }

  /**
   * Définit le store de debug
   * @param {Object} debugStore - Instance du store debug
   */
  setDebugStore(debugStore) {
    this.debugStore = debugStore
  }

  /**
   * Initialise le service avec le token API
   * @param {string} apiKey - Token API Gemini
   * @param {Object} config - Configuration additionnelle
   */
  initialize(apiKey, config = {}) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Token API Gemini requis')
    }

    try {
      console.log('Initialisation du service Gemini avec la clé:', apiKey.substring(0, 10) + '...')
      
      this.apiKey = apiKey.trim()
      
      // Nouvelle API @google/genai
      this.genAI = new GoogleGenAI({ apiKey: this.apiKey })
      
      this.isInitialized = true
      console.log('Service Gemini API initialisé avec succès')
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service Gemini:', error)
      this.isInitialized = false
      throw new Error(`Impossible d'initialiser le service Gemini: ${error.message}`)
    }
  }

  /**
   * Vérifie si le service est initialisé
   */
  checkInitialization() {
    if (!this.isInitialized || !this.genAI) {
      throw new Error('Service Gemini non initialisé. Appelez initialize() d\'abord.')
    }
  }

  /**
   * Génère du contenu basé sur un prompt
   * @param {string} prompt - Le prompt à envoyer à l'IA
   * @param {Object} options - Options additionnelles
   * @returns {Promise<string>} - Réponse de l'IA
   */
  async generateContent(prompt, options = {}) {
    this.checkInitialization()

    if (!prompt || prompt.trim() === '') {
      throw new Error('Prompt requis')
    }

    try {
      console.log('Envoi du prompt à Gemini:', prompt.substring(0, 100) + '...')
      
      // Nouvelle API @google/genai
      const response = await this.genAI.models.generateContent({
        model: options.model || 'gemini-2.0-flash-001',
        contents: prompt,
        config: {
          generationConfig: {
            temperature: options.temperature || 0.9,
            maxOutputTokens: options.maxTokens || 2048,
          }
        }
      })
      
      console.log('Réponse reçue de Gemini:', response)
      
      const text = response.text
      
      console.log('Texte extrait:', text ? text.substring(0, 100) + '...' : 'VIDE')
      
      if (!text || text.trim() === '') {
        throw new Error('Réponse vide de l\'API Gemini')
      }

      return text
      
    } catch (error) {
      console.error('Erreur complète:', error)
      console.error('Type d\'erreur:', typeof error)
      console.error('Message d\'erreur:', error.message)
      console.error('Status:', error.status)
      console.error('Stack:', error.stack)
      
      // Gestion des erreurs spécifiques de l'API Gemini
      let errorMessage = 'Erreur inconnue'
      
      if (error.status) {
        switch (error.status) {
          case 400:
            errorMessage = 'Requête invalide - Vérifiez le format du prompt'
            break
          case 401:
            errorMessage = 'Token API invalide - Vérifiez votre clé d\'API'
            break
          case 403:
            errorMessage = 'Accès refusé - Vérifiez les permissions de votre token'
            break
          case 404:
            errorMessage = 'Ressource non trouvée - Le modèle ou l\'endpoint n\'existe pas'
            break
          case 429:
            errorMessage = 'Limite de taux dépassée - Veuillez réessayer plus tard'
            break
          case 500:
            errorMessage = 'Erreur serveur Google - Veuillez réessayer plus tard'
            break
          default:
            errorMessage = `Erreur HTTP ${error.status}: ${error.message}`
        }
      } else if (error.message) {
        if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key')) {
          errorMessage = 'Token API invalide ou manquant'
        } else if (error.message.includes('RATE_LIMIT') || error.message.includes('quota')) {
          errorMessage = 'Limite de taux dépassée'
        } else if (error.message.includes('SAFETY') || error.message.includes('blocked')) {
          errorMessage = 'Contenu bloqué pour des raisons de sécurité'
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = 'Problème de connexion réseau'
        } else {
          errorMessage = error.message
        }
      }
      
      throw new Error(errorMessage)
    }
  }

  /**
   * Génère du contenu avec streaming (pour les longues réponses)
   * @param {string} prompt - Le prompt à envoyer à l'IA
   * @param {Function} onChunk - Callback appelé pour chaque chunk
   * @returns {Promise<string>} - Réponse complète
   */
  async generateContentStream(prompt, onChunk) {
    this.checkInitialization()

    if (!prompt || prompt.trim() === '') {
      throw new Error('Prompt requis')
    }

    try {
      // Nouvelle API @google/genai pour streaming
      const response = await this.genAI.models.generateContentStream({
        model: 'gemini-2.0-flash-001',
        contents: prompt
      })
      
      let fullResponse = ''

      for await (const chunk of response) {
        const chunkText = chunk.text || ''
        fullResponse += chunkText
        
        if (onChunk && typeof onChunk === 'function') {
          onChunk(chunkText)
        }
      }

      return fullResponse
    } catch (error) {
      console.error('Erreur lors du streaming:', error)
      throw new Error(`Erreur streaming Gemini: ${error.message}`)
    }
  }

  /**
   * Traite un prompt de contexte spécifique
   * @param {string} prompt - L'instruction pour modifier le contexte
   * @param {string} currentContext - Le contexte actuel
   * @returns {Promise<string>} - Nouveau contexte généré
   */
  async processContextPrompt(prompt, currentContext = '') {
    this.checkInitialization()

    const fullPrompt = this.buildContextPrompt(prompt, currentContext)
    return await this.generateContent(fullPrompt)
  }

  /**
   * Construit un prompt structuré pour le traitement de contexte
   * @param {string} instruction - L'instruction utilisateur
   * @param {string} context - Le contexte actuel
   * @returns {string} - Prompt structuré
   */
  buildContextPrompt(instruction, context) {
    const systemPrompt = `Tu es un assistant IA spécialisé dans la modification et l'amélioration de textes contextuels.

Contexte actuel:
${context || '[Aucun contexte]'}

Instruction: ${instruction}

Règles:
- Si l'instruction demande de résumer, crée un résumé concis
- Si l'instruction demande d'étendre, ajoute des informations pertinentes
- Si l'instruction demande de réécrire, reformule en gardant le sens
- Si l'instruction demande de structurer, organise le contenu avec des titres
- Si l'instruction demande de nettoyer, corrige la grammaire et la mise en forme
- Réponds uniquement avec le contenu modifié, sans explication

Contenu modifié:`

    return systemPrompt
  }

  /**
   * Traite un message de chat avec historique et contexte
   * @param {string} message - Message de l'utilisateur
   * @param {Array} history - Historique des messages (optionnel)
   * @param {string} context - Contexte additionnel (optionnel)
   * @returns {Promise<string>} - Réponse de l'IA
   */
  async processChatMessage(message, history = [], context = '') {
    this.checkInitialization()
    
    let requestId = null

    try {
      console.log('=== DEBUG CONTEXTE ===')
      console.log('Traitement du message chat:', message)
      console.log('Historique fourni:', history?.length || 0, 'messages')
      console.log('Contexte fourni:', context)
      console.log('Contexte non vide?', context && context.trim() !== '')
      console.log('Longueur contexte:', context ? context.length : 0)
      console.log('=== FIN DEBUG CONTEXTE ===')
      
      // Utiliser directement l'API Gemini avec l'historique
      const contents = []
      
      // Ajouter un message système avec le contexte si fourni
      if (context && context.trim() !== '') {
        contents.push({
          role: 'user',
          parts: [{
            text: `CONTEXTE IMPORTANT À PRENDRE EN COMPTE POUR TOUTES MES RÉPONSES:

${context.trim()}

---

Tu dois utiliser ce contexte pour répondre de manière plus précise et pertinente à mes questions. N'hésite pas à faire référence aux éléments du contexte quand c'est approprié.`
          }]
        })
        
        // Réponse de l'IA confirmant la prise en compte du contexte
        contents.push({
          role: 'model',
          parts: [{
            text: "J'ai bien pris en compte le contexte fourni. Je l'utiliserai pour répondre de manière plus précise et pertinente à vos questions."
          }]
        })
      }
      
      // Ajouter l'historique existant
      history.forEach(msg => {
        if (msg.parts && msg.parts[0] && msg.parts[0].text) {
          contents.push({
            role: msg.role,
            parts: [{ text: msg.parts[0].text }]
          })
        }
      })
      
      // Ajouter le message actuel de l'utilisateur
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      })
      
      const requestPayload = {
        model: 'gemini-2.0-flash-001',
        contents: contents,
        config: {
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }
      }
      
      console.log('Contents envoyés à Gemini:', contents)
      
      // Enregistrer la requête pour debug
      if (this.debugStore) {
        requestId = this.debugStore.logApiRequest('Chat Message', requestPayload, Date.now())
        console.log('Debug: requête enregistrée avec ID:', requestId)
      } else {
        console.log('Debug: aucun debug store disponible')
      }
      
      const response = await this.genAI.models.generateContent(requestPayload)
      
      console.log('Réponse brute de Gemini:', response)
      
      const text = response.text
      
      if (!text || text.trim() === '') {
        throw new Error('Réponse vide de l\'API Gemini')
      }

      // Enregistrer la réponse pour debug
      if (this.debugStore && requestId) {
        console.log('Debug: Avant logApiResponse, requestId:', requestId, 'response:', response)
        this.debugStore.logApiResponse(
          requestId, 
          response, 
          null, 
          response.usageMetadata || null,
          'gemini-2.0-flash-001'
        )
        console.log('Debug: Après logApiResponse')
      } else {
        console.log('Debug: Pas de debug store ou requestId manquant', { debugStore: !!this.debugStore, requestId })
      }

      return text.trim()
      
    } catch (error) {
      console.error('Erreur dans processChatMessage:', error)
      
      // Enregistrer l'erreur pour debug
      if (this.debugStore && requestId) {
        this.debugStore.logApiResponse(requestId, null, error.message)
        console.log('Debug: erreur enregistrée pour ID:', requestId)
      }
      
      throw new Error(`Erreur lors du traitement du message: ${error.message}`)
    }
  }

  /**
   * Teste la connexion à l'API
   * @returns {Promise<boolean>} - True si la connexion fonctionne
   */
  async testConnection() {
    let requestId = null
    
    try {
      this.checkInitialization()
      
      console.log('Test de connexion démarré...')
      console.log('API Key (masquée):', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'MANQUANTE')
      
      const requestPayload = {
        model: 'gemini-2.0-flash-001',
        contents: [{
          role: 'user',
          parts: [{ text: 'Hi' }]
        }],
        config: {
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10
          }
        }
      }
      
      // Enregistrer la requête pour debug
      if (this.debugStore) {
        requestId = this.debugStore.logApiRequest('Test Connection', requestPayload, Date.now())
        console.log('Debug: test connection enregistré avec ID:', requestId)
      }
      
      // Test simple avec un prompt minimal
      const testResponse = await this.generateContent('Hi')
      
      console.log('Test de connexion réussi, réponse:', testResponse)
      
      // Enregistrer la réponse pour debug
      if (this.debugStore && requestId) {
        this.debugStore.logApiResponse(
          requestId, 
          { text: testResponse }, 
          null, 
          null,
          'gemini-2.0-flash-001'
        )
        console.log('Debug: test connection réponse enregistrée pour ID:', requestId)
      }
      
      // Vérifier que nous avons reçu une réponse
      return typeof testResponse === 'string' && testResponse.trim().length > 0
    } catch (error) {
      console.error('Test de connexion échoué:', error)
      
      // Enregistrer l'erreur pour debug
      if (this.debugStore && requestId) {
        this.debugStore.logApiResponse(requestId, null, error.message)
        console.log('Debug: test connection erreur enregistrée pour ID:', requestId)
      }
      
      // Re-lancer l'erreur pour que l'appelant puisse la gérer
      throw error
    }
  }
  
  /**
   * Diagnostic du service
   */
  diagnose() {
    console.log('=== DIAGNOSTIC GEMINI SERVICE ===')
    console.log('isInitialized:', this.isInitialized)
    console.log('genAI existe:', !!this.genAI)
    console.log('apiKey existe:', !!this.apiKey)
    console.log('apiKey (masquée):', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'MANQUANTE')
    
    if (this.genAI) {
      console.log('genAI type:', typeof this.genAI)
      console.log('genAI constructor:', this.genAI.constructor.name)
      console.log('genAI.models existe:', !!this.genAI.models)
    }
    
    console.log('SDK utilisé: @google/genai (nouvelle version)')
    console.log('================================')
  }

  /**
   * Réinitialise le service
   */
  reset() {
    this.genAI = null
    this.isInitialized = false
    this.apiKey = null
  }

  /**
   * Obtient les informations du modèle
   * @returns {Object} - Informations sur le modèle actuel
   */
  getModelInfo() {
    return {
      isInitialized: this.isInitialized,
      modelName: this.isInitialized ? 'gemini-2.0-flash-001' : null,
      hasGenAI: !!this.genAI,
      sdkVersion: '@google/genai'
    }
  }
}

// Instance singleton
const geminiService = new GeminiAPIService()

export default geminiService

// Export de la classe pour les tests
export { GeminiAPIService }
