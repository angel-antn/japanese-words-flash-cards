import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'

import './index.css'
import App from './App.tsx'
import { FlashcardsProvider } from '@/context/FlashcardsContext'

registerSW({ immediate: true })

// Capture Android/Chrome's install prompt as early as possible so the install
// screen can offer a native "Instalar" button.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as Window & { __bipEvent?: Event }).__bipEvent = e
  window.dispatchEvent(new Event('bip-available'))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FlashcardsProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </FlashcardsProvider>
  </StrictMode>
)
