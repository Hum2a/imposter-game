import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/config'
import './index.css'
import App from './App.tsx'
import { initAnalytics, trackEvent } from './lib/analytics'

initAnalytics()

if (typeof window !== 'undefined') {
  const throttleMs = 5000
  let lastUncaughtJs = 0
  let lastUnhandledRejection = 0
  window.addEventListener('error', () => {
    const now = Date.now()
    if (now - lastUncaughtJs < throttleMs) return
    lastUncaughtJs = now
    trackEvent('ClientError', { area: 'uncaught_js' })
  })
  window.addEventListener('unhandledrejection', () => {
    const now = Date.now()
    if (now - lastUnhandledRejection < throttleMs) return
    lastUnhandledRejection = now
    trackEvent('ClientError', { area: 'unhandled_rejection' })
  })
}

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
