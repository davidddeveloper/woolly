import '@fontsource-variable/nunito'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { openDb } from './db/sqlite'
import { StoreProvider } from './store'

registerSW({ immediate: true })
// Start fetching the SQLite WASM now rather than after the first render.
openDb()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
