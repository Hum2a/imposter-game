import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'

initAnalytics()

const darkMq = window.matchMedia('(prefers-color-scheme: dark)')
function syncThemeClass() {
  document.documentElement.classList.toggle('dark', darkMq.matches)
}
syncThemeClass()
darkMq.addEventListener('change', syncThemeClass)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
