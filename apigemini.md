# 🚀 API Gemini - Structure des requêtes JSON

## 📋 **Vue d'ensemble**

Ce document décrit la structure JSON des requêtes envoyées à l'API Google Gemini via le SDK `@google/genai` pour les fonctionnalités de chat de l'application.

## 🔗 **Endpoint et Configuration**

- **SDK utilisé** : `@google/genai` (remplacement de `@google/generative-ai`)
- **Modèle par défaut** : `gemini-2.0-flash-001`
- **Méthode** : `genAI.models.generateContent()`

## 📨 **Structure de la requête JSON**

### **Requête Chat Standard**

```json
{
  "model": "gemini-2.0-flash-001",
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Première question de l'utilisateur"
        }
      ]
    },
    {
      "role": "model",
      "parts": [
        {
          "text": "Réponse de l'IA"
        }
      ]
    },
    {
      "role": "user",
      "parts": [
        {
          "text": "Message actuel de l'utilisateur"
        }
      ]
    }
  ],
  "config": {
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 2048
    }
  }
}
```

### **Requête Chat avec Contexte Intégré**

```json
{
  "model": "gemini-2.0-flash-001",
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "CONTEXTE IMPORTANT À PRENDRE EN COMPTE POUR TOUTES MES RÉPONSES:\n\n[Contenu du ContextView]\n\n---\n\nTu dois utiliser ce contexte pour répondre de manière plus précise et pertinente à mes questions. N'hésite pas à faire référence aux éléments du contexte quand c'est approprié."
        }
      ]
    },
    {
      "role": "model",
      "parts": [
        {
          "text": "J'ai bien pris en compte le contexte fourni. Je l'utiliserai pour répondre de manière plus précise et pertinente à vos questions."
        }
      ]
    },
    {
      "role": "user",
      "parts": [
        {
          "text": "Première question de l'utilisateur"
        }
      ]
    },
    {
      "role": "model",
      "parts": [
        {
          "text": "Réponse de l'IA utilisant le contexte"
        }
      ]
    },
    {
      "role": "user",
      "parts": [
        {
          "text": "Message actuel de l'utilisateur"
        }
      ]
    }
  ],
  "config": {
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 2048
    }
  }
}
```

## 🎯 **Intégration du contexte dans le chat**

### **Principe de fonctionnement**

Le contexte du `ContextView` est automatiquement intégré à **chaque** conversation de chat pour que l'IA prenne en compte ces informations dans toutes ses réponses.

### **Flux d'intégration**

1. **Récupération** : Le contexte est lu depuis `contextStore.context`
2. **Injection** : Ajouté au début de la conversation comme message système
3. **Persistance** : L'IA "se souvient" du contexte pour toute la session
4. **Référencement** : L'IA peut faire référence au contexte dans ses réponses

### **Structure de l'injection**

```javascript
// 1. Message système avec le contexte (si contexte non vide)
{
  role: 'user',
  parts: [{
    text: `CONTEXTE IMPORTANT À PRENDRE EN COMPTE POUR TOUTES MES RÉPONSES:

${context.trim()}

---

Tu dois utiliser ce contexte pour répondre de manière plus précise et pertinente à mes questions. N'hésite pas à faire référence aux éléments du contexte quand c'est approprié.`
  }]
}

// 2. Réponse de confirmation de l'IA
{
  role: 'model',
  parts: [{
    text: "J'ai bien pris en compte le contexte fourni. Je l'utiliserai pour répondre de manière plus précise et pertinente à vos questions."
  }]
}

// 3. Historique normal de la conversation
// 4. Nouveau message utilisateur
```

### **Avantages de cette approche**

- ✅ **Contexte permanent** : L'IA garde le contexte en mémoire
- ✅ **Réponses enrichies** : Utilisation intelligente du contexte
- ✅ **Transparence** : L'utilisateur sait que le contexte est pris en compte
- ✅ **Flexibilité** : Contexte modifiable à tout moment

### **Cas d'usage**

- **Documentation projet** : Ajouter les spécifications techniques
- **Code source** : Inclure des extraits de code à analyser
- **Instructions spéciales** : Définir le style de réponse souhaité
- **Données métier** : Fournir des informations sur le domaine

## 🔧 **Paramètres de configuration**

### **GenerationConfig**

| Paramètre | Type | Valeur par défaut | Description |
|-----------|------|-------------------|-------------|
| `temperature` | number | 0.7 | Contrôle la créativité (0.0 = déterministe, 2.0 = très créatif) |
| `maxOutputTokens` | number | 2048 | Limite maximale de tokens dans la réponse |

### **Modèles disponibles**

- `gemini-2.0-flash-001` (par défaut)
- `gemini-pro`
- `gemini-pro-vision` (pour images)

## 📊 **Types de contenus**

### **Rôles disponibles**

- `user` : Messages de l'utilisateur
- `model` : Réponses de l'IA

### **Structure des parts**

```json
{
  "parts": [
    {
      "text": "Texte du message"
    }
    // Support futur pour images, documents, etc.
  ]
}
```

## 🔄 **Flux de traitement**

### **1. Chat Standard avec Contexte (`processChatMessage`)**

```javascript
// Construction de la requête avec contexte intégré
const contents = []

// Ajouter le contexte si fourni
if (context && context.trim() !== '') {
  // Message système avec contexte
  contents.push({
    role: 'user',
    parts: [{ text: `CONTEXTE IMPORTANT À PRENDRE EN COMPTE...` }]
  })
  
  // Confirmation de l'IA
  contents.push({
    role: 'model', 
    parts: [{ text: "J'ai bien pris en compte le contexte..." }]
  })
}

// Ajouter l'historique existant
history.forEach(msg => {
  contents.push({
    role: msg.role,
    parts: [{ text: msg.parts[0].text }]
  })
})

// Ajouter le nouveau message
contents.push({
  role: 'user',
  parts: [{ text: message }]
})
```

### **2. Context Prompt (`processContextPrompt`)**

```javascript
// Construction du prompt enrichi
const fullPrompt = `Tu es un assistant IA spécialisé...

Contexte fourni:
${currentContext}

Prompt/Instruction:
${prompt}`

// Envoi simple
const contents = [{
  role: 'user',
  parts: [{ text: fullPrompt }]
}]
```

## 📤 **Exemple de réponse Gemini**

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "Réponse générée par Gemini..."
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0,
      "safetyRatings": [...]
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 156,
    "candidatesTokenCount": 342,
    "totalTokenCount": 498
  }
}
```

## ⚠️ **Gestion des erreurs**

### **Types d'erreurs courantes**

```json
// Erreur d'authentification (401)
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials."
  }
}

// Erreur de quota (429)
{
  "error": {
    "code": 429,
    "message": "Quota exceeded"
  }
}

// Erreur de contenu (400)
{
  "error": {
    "code": 400,
    "message": "Invalid request content"
  }
}
```

## 🔒 **Sécurité et authentification**

- **API Key** : Passée dans l'en-tête `Authorization: Bearer [TOKEN]`
- **Validation** : Token vérifié via `testConnection()`
- **Stockage** : Token stocké en localStorage (chiffré recommandé)

## 📝 **Notes techniques**

1. **Historique de conversation** : Maintenu côté client et envoyé à chaque requête
2. **Limite de contexte** : Respecter les limites de tokens du modèle
3. **Streaming** : Support via `generateContentStream()` pour réponses en temps réel
4. **Retry** : Gestion automatique des tentatives de reconnexion

## 🔗 **Fichiers source**

- **Service API** : [`src/services/api.js`](src/services/api.js)
- **Store AI** : [`src/stores/ai.js`](src/stores/ai.js)
- **Chat Interface** : [`src/components/ChatView.vue`](src/components/ChatView.vue)
- **Context Interface** : [`src/components/ContextView.vue`](src/components/ContextView.vue)
