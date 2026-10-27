import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { applyThemeMode, readThemeMode } from './ui/SettingsScreen'
import './index.css'

applyThemeMode(readThemeMode())

let markReady: (() => void) | null = null
let ready = false
registerSW({
  immediate: true,
  onOfflineReady() {
    ready = true
    markReady?.()
  },
  onRegisteredSW(_url, reg) {
    // Zaten önbellekte kurulu bir service worker varsa uygulama çevrimdışı hazırdır.
    if (reg?.active) {
      ready = true
      markReady?.()
    }
  },
})

function Root() {
  const [offline, setOffline] = useState(ready)
  useEffect(() => {
    markReady = () => setOffline(true)
    if (ready) setOffline(true)
  }, [])
  return <App offlineReady={offline} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
