<template>
    <v-card
    class="mx-auto d-flex flex-column"
    max-width="none"
    height="100%">
    <v-toolbar color="primary">
      <v-toolbar-title>Chat IA</v-toolbar-title>
    </v-toolbar>

    <v-card-text
      class="flex-grow-1 overflow-y-auto messages-container"
      ref="messagesContainer"
      style="height: 0;"
    >
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['d-flex', 'ma-2', message.sender === 'user' ? 'justify-end' : 'justify-start']"
      >
        <div :class="['d-flex', 'align-start', message.sender === 'user' ? 'flex-row-reverse' : 'flex-row']" 
             :style="message.sender === 'ia' ? 'width: 100%;' : ''">
          <v-avatar
            :color="message.sender === 'user' ? 'primary' : 'primary'"
            class="mx-2 mt-1"
            size="32"
          >
            <span class="white--text text-caption">{{ message.sender === 'user' ? 'U' : 'IA' }}</span>
          </v-avatar>
          <v-sheet
            color="white"
            class="markdown-content message-bubble"
            :class="message.sender === 'ia' ? 'pa-4 pl-6' : 'pa-3 pl-5'"
            rounded="lg"
            elevation="1"
            :style="message.sender === 'ia' ? 'width: calc(100% - 64px); flex: 1; border: 1px solid #e0e0e0; position: relative;' : 'max-width: 70%; border: 1px solid #e0e0e0; position: relative;'"
            @mouseenter="showCopyButton(message.id)"
            @mouseleave="hideCopyButton(message.id)"
            @click="handleClick"
          >
            <!-- Bouton de copie -->
            <v-btn
              v-show="copyButtonVisible === message.id"
              icon
              size="small"
              variant="text"
              color="grey"
              class="copy-button"
              @click.stop="copyMessage(message.text)"
            >
              <v-icon size="16">mdi-content-copy</v-icon>
            </v-btn>
            
            <div v-if="message.text" v-html="renderMarkdown(message.text)"></div>
            <div v-if="message.file" class="mt-2">
              <v-img
                v-if="message.file.isImage"
                :src="message.file.url"
                max-width="200"
                class="rounded-lg"
              ></v-img>
              <v-chip
                v-else
                prepend-icon="mdi-file"
                variant="tonal"
              >
                {{ message.file.name }}
              </v-chip>
            </div>
          </v-sheet>
        </div>
      </div>
    </v-card-text>

    <div v-if="attachedFile" class="pa-2 pl-4">
      <v-chip
        closable
        @click:close="removeAttachment"
        prepend-icon="mdi-file"
      >
        {{ attachedFile.name }}
      </v-chip>
    </div>

    <v-card-actions>
      <v-text-field
        v-model="newMessage"
        @keyup.enter="sendMessage"
        placeholder="Tapez votre message..."
        variant="solo"
        hide-details
        autofocus
      >
        <template v-slot:prepend-inner>
          <v-btn
            icon="mdi-paperclip"
            variant="text"
            @click="triggerFileInput"
          />
        </template>
        <template v-slot:append-inner>
          <v-btn
            icon="mdi-send"
            color="primary"
            @click="sendMessage"
            :disabled="newMessage.trim() === '' && !attachedFile || aiStore.isProcessing"
            :loading="aiStore.isProcessing"
          />
        </template>
      </v-text-field>
    </v-card-actions>

    <input
      type="file"
      ref="fileInput"
      @change="handleFileChange"
      style="display: none;"
    />
  </v-card>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { useAIStore } from '../stores/ai';
import { useContextStore } from '../stores/context';

// Configuration simple de marked
marked.setOptions({
  breaks: true,
  gfm: true
});

// Stores
const aiStore = useAIStore();
const contextStore = useContextStore();

const newMessage = ref('');
const messages = ref([]);
let nextMessageId = 1;
const messagesContainer = ref(null);
const fileInput = ref(null);
const attachedFile = ref(null);
const copyButtonVisible = ref(null);

// Fonction pour copier le contenu d'un message
const copyMessage = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Erreur lors de la copie:', err);
    // Fallback pour les navigateurs qui ne supportent pas l'API clipboard
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

const showCopyButton = (messageId) => {
  copyButtonVisible.value = messageId;
};

const hideCopyButton = (messageId) => {
  copyButtonVisible.value = null;
};

// Gestionnaire de clic pour les boutons de copie de code
const handleClick = async (event) => {
  if (event.target.classList.contains('code-copy-btn') || event.target.closest('.code-copy-btn')) {
    event.stopPropagation();
    event.preventDefault();
    
    const btn = event.target.classList.contains('code-copy-btn') ? event.target : event.target.closest('.code-copy-btn');
    const codeContent = btn.getAttribute('data-code-content');
    
    if (codeContent) {
      try {
        await navigator.clipboard.writeText(codeContent);
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<span class="mdi mdi-check"></span>';
        
        setTimeout(() => {
          btn.innerHTML = originalContent;
        }, 1000);
      } catch (err) {
        console.error('Erreur lors de la copie du code:', err);
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = codeContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    }
  }
};

const renderMarkdown = (text) => {
  const rendered = marked(text);
  
  // Créer un élément temporaire pour traiter le HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = rendered;
  
  // Appliquer highlight.js à tous les blocs de code
  const codeBlocks = tempDiv.querySelectorAll('pre code');
  codeBlocks.forEach((block, index) => {
    const classes = block.className;
    const lang = classes.replace('language-', '');
    const codeContent = block.textContent;
    
    // Créer un wrapper pour le bloc de code avec bouton de copie
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    wrapper.style.position = 'relative';
    
    // Créer le bouton de copie pour ce bloc avec attribut data
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.setAttribute('data-code-content', codeContent);
    copyBtn.innerHTML = '<span class="mdi mdi-content-copy"></span>';
    copyBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 4px 6px;
      cursor: pointer;
      font-size: 12px;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.2s;
    `;
    
    // Appliquer la coloration syntaxique
    if (lang && hljs.getLanguage(lang)) {
      const highlighted = hljs.highlight(codeContent, { language: lang }).value;
      block.innerHTML = highlighted;
      block.className = `hljs ${classes}`;
    } else {
      const highlighted = hljs.highlightAuto(codeContent).value;
      block.innerHTML = highlighted;
      block.className = `hljs ${classes}`;
    }
    
    // Remplacer le pre par le wrapper avec bouton
    const pre = block.parentElement;
    wrapper.appendChild(pre.cloneNode(true));
    wrapper.appendChild(copyBtn);
    pre.parentElement.replaceChild(wrapper, pre);
    
    // Ajouter les événements de survol pour afficher/cacher le bouton
    wrapper.addEventListener('mouseenter', () => {
      copyBtn.style.opacity = '1';
    });
    wrapper.addEventListener('mouseleave', () => {
      copyBtn.style.opacity = '0';
    });
  });
  
  return tempDiv.innerHTML;
};

const scrollToBottom = (force = false) => {
  const doScroll = (attempt = 0) => {
    // L'élément de la ref Vue est un proxy, nous devons obtenir l'élément DOM réel
    let element = null;
    
    // Méthode 1: Utiliser querySelector direct (le plus fiable)
    element = document.querySelector('.messages-container');
    let elementSource = 'querySelector-direct';
    
    // Méthode 2: Si pas trouvé, essayer d'extraire l'élément du proxy Vue
    if (!element && messagesContainer.value) {
      // Le proxy Vue peut avoir une propriété $el ou être l'élément lui-même après unwrap
      if (messagesContainer.value.$el) {
        element = messagesContainer.value.$el;
        elementSource = 'vue-ref-$el';
      } else if (messagesContainer.value.nodeType) {
        element = messagesContainer.value;
        elementSource = 'vue-ref-direct';
      }
    }
    
    if (!element) {
      console.log(`Scroll attempt ${attempt + 1}: Aucun élément trouvé`);
      if (attempt < 5) {
        setTimeout(() => doScroll(attempt + 1), 300);
      }
      return;
    }
    
    console.log(`Scroll attempt ${attempt + 1}: Élément trouvé via ${elementSource}`, {
      element: element,
      tagName: element.tagName,
      className: element.className,
      scrollTop: element.scrollTop,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      hasScrollProperties: typeof element.scrollTop !== 'undefined'
    });
    
    // Vérifier que l'élément a des dimensions et peut faire du scroll
    if (typeof element.scrollTop === 'undefined' || element.clientHeight === 0) {
      console.log(`Scroll attempt ${attempt + 1}: Élément pas encore prêt pour le scroll`);
      if (attempt < 5) {
        setTimeout(() => doScroll(attempt + 1), 300);
      }
      return;
    }
    
    if (element.scrollHeight > element.clientHeight) {
      const isAtBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 10;
      
      if (force || isAtBottom) {
        element.scrollTop = element.scrollHeight;
        console.log('✅ Scroll vers le bas effectué, nouveau scrollTop:', element.scrollTop);
      } else {
        console.log('Pas besoin de scroll, utilisateur n\'est pas en bas');
      }
    } else {
      console.log(`Contenu pas encore assez grand pour scroller (scrollHeight: ${element.scrollHeight}, clientHeight: ${element.clientHeight})`);
      if (attempt < 5) {
        setTimeout(() => doScroll(attempt + 1), 300);
      }
    }
  };
  
  // Attendre que Vue ait terminé le rendu
  nextTick(() => {
    doScroll();
  });
};const triggerFileInput = () => {
  fileInput.value.click();
};

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    attachedFile.value = file;
  }
};

const removeAttachment = () => {
  attachedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const getIaResponse = async (userMessage) => {
  try {
    // Ajouter le message de l'utilisateur à l'historique
    const history = messages.value.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Traitement du message avec le contexte actuel
    const currentContext = contextStore.contextText;
    console.log('ChatView: Contexte récupéré:', currentContext);
    const response = await aiStore.processChatMessage(userMessage, history, currentContext);
    
    // Ajouter la réponse de l'IA
    messages.value.push({
      id: nextMessageId++,
      text: response,
      sender: 'ia',
      file: null
    });
    
    // Scroll vers le bas après réception de la réponse
    setTimeout(() => scrollToBottom(true), 100);
    setTimeout(() => scrollToBottom(true), 300);
    
  } catch (error) {
    console.error('Erreur lors de la communication avec l\'IA:', error);
    
    // Afficher un message d'erreur à l'utilisateur
    messages.value.push({
      id: nextMessageId++,
      text: `**Erreur:** ${error.message}`,
      sender: 'ia',
      file: null
    });
    
    setTimeout(() => scrollToBottom(true), 100);
  }
};



const sendMessage = async () => {
  if (newMessage.value.trim() === '' && !attachedFile.value) return;

  const userMessageText = newMessage.value;
  const messagePayload = {
    id: nextMessageId++,
    text: userMessageText,
    sender: 'user',
    file: null
  };

  if (attachedFile.value) {
    messagePayload.file = {
      name: attachedFile.value.name,
      url: URL.createObjectURL(attachedFile.value),
      isImage: attachedFile.value.type.startsWith('image/')
    };
  }

  messages.value.push(messagePayload);

  newMessage.value = '';
  removeAttachment();
  
  // Scroll après ajout du message utilisateur
  setTimeout(() => scrollToBottom(true), 50);
  
  // Appeler l'IA avec le message utilisateur
  await getIaResponse(userMessageText);
};

onMounted(() => {
  // Message d'accueil
  messages.value.push({
    id: nextMessageId++,
    text: 'Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd\'hui ?',
    sender: 'ia',
    file: null
  });
  
  // Debug: vérifier l'état de l'élément
  console.log('onMounted - État de messagesContainer:', {
    refValue: messagesContainer.value,
    domElement: document.querySelector('.messages-container'),
    refType: typeof messagesContainer.value
  });
  
  // Attendre que le composant soit monté avec vérification simple
  const waitForElement = (attempt = 0) => {
    const element = document.querySelector('.messages-container');
    console.log(`waitForElement attempt ${attempt + 1}:`, {
      elementFound: !!element,
      hasScrollTop: element ? ('scrollTop' in element) : false,
      clientHeight: element ? element.clientHeight : 'N/A',
      scrollHeight: element ? element.scrollHeight : 'N/A'
    });
    
    if (element && 'scrollTop' in element && element.clientHeight > 0) {
      console.log('✅ Élément prêt, déclenchement du scroll');
      scrollToBottom(true);
    } else if (attempt < 10) {
      console.log(`⏳ Élément pas encore prêt, nouvelle tentative dans 300ms (${attempt + 1}/10)`);
      setTimeout(() => waitForElement(attempt + 1), 300);
    } else {
      console.log('❌ Abandon après 10 tentatives');
    }
  };
  
  // Attendre un peu plus longtemps pour que Vuetify termine son rendu
  setTimeout(() => waitForElement(), 500);
});
</script>

<style>
/* Import direct des styles highlight.js GitHub */
.hljs {
  display: block;
  overflow-x: auto;
  padding: 0.5em;
  color: #333;
  background: #f8f8f8;
}

.hljs-comment,
.hljs-quote {
  color: #998;
  font-style: italic;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-subst {
  color: #333;
  font-weight: bold;
}

.hljs-number,
.hljs-literal,
.hljs-variable,
.hljs-template-variable,
.hljs-tag .hljs-attr {
  color: #008080;
}

.hljs-string,
.hljs-doctag {
  color: #d14;
}

.hljs-title,
.hljs-section,
.hljs-selector-id {
  color: #900;
  font-weight: bold;
}

.hljs-subst {
  font-weight: normal;
}

.hljs-type,
.hljs-class .hljs-title {
  color: #458;
  font-weight: bold;
}

.hljs-tag,
.hljs-name,
.hljs-attribute {
  color: #000080;
  font-weight: normal;
}

.hljs-regexp,
.hljs-link {
  color: #009926;
}

.hljs-symbol,
.hljs-bullet {
  color: #990073;
}

.hljs-built_in,
.hljs-builtin-name {
  color: #0086b3;
}

.hljs-meta {
  color: #999;
  font-weight: bold;
}

.hljs-deletion {
  background: #fdd;
}

.hljs-addition {
  background: #dfd;
}

.hljs-emphasis {
  font-style: italic;
}

.hljs-strong {
  font-weight: bold;
}

/* Styles pour le contenu Markdown */
.markdown-content pre {
  margin: 12px 0;
  border-radius: 6px;
  overflow-x: auto;
  background: #f8f8f8;
}

.markdown-content code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-content pre code {
  display: block;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 6px;
  line-height: 1.45;
}

/* Styles pour le code inline */
.markdown-content code:not(.hljs) {
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 3px;
  padding: 2px 4px;
}

/* Styles pour le bouton de copie */
.message-bubble {
  position: relative;
}

.copy-button {
  position: absolute !important;
  top: 8px !important;
  right: 8px !important;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 50% !important;
  min-width: 32px !important;
  height: 32px !important;
}

.copy-button:hover {
  background: rgba(255, 255, 255, 1) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

/* Styles pour les boutons de copie des blocs de code */
.code-block-wrapper {
  position: relative;
  margin: 12px 0;
}

.code-copy-btn {
  color: #666;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.code-copy-btn:hover {
  background: rgba(255, 255, 255, 1) !important;
  color: #333;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.code-block-wrapper:hover .code-copy-btn {
  opacity: 1 !important;
}
</style>
