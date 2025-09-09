import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import pinia from './stores'

createApp(App).use(vuetify).use(pinia).mount('#app')