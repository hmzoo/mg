import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useChatStore = defineStore('chat', () => {
  // État
  const messages = ref([])
  const isTyping = ref(false)
  const currentInput = ref('')
  
  // Getters
  const messageCount = computed(() => messages.value.length)
  
  const lastMessage = computed(() => {
    return messages.value[messages.value.length - 1] || null
  })
  
  const userMessages = computed(() => {
    return messages.value.filter(msg => msg.sender === 'user')
  })
  
  const iaMessages = computed(() => {
    return messages.value.filter(msg => msg.sender === 'ia')
  })
  
  // Actions
  const addMessage = (message) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      ...message
    }
    messages.value.push(newMessage)
  }
  
  const addUserMessage = (content) => {
    addMessage({
      sender: 'user',
      content: content
    })
  }
  
  const addIAMessage = (content) => {
    addMessage({
      sender: 'ia',
      content: content
    })
  }
  
  const clearMessages = () => {
    messages.value = []
  }
  
  const deleteMessage = (messageId) => {
    const index = messages.value.findIndex(msg => msg.id === messageId)
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
  }
  
  const setTyping = (typing) => {
    isTyping.value = typing
  }
  
  const updateCurrentInput = (input) => {
    currentInput.value = input
  }
  
  return {
    // État
    messages,
    isTyping,
    currentInput,
    
    // Getters
    messageCount,
    lastMessage,
    userMessages,
    iaMessages,
    
    // Actions
    addMessage,
    addUserMessage,
    addIAMessage,
    clearMessages,
    deleteMessage,
    setTyping,
    updateCurrentInput
  }
})
