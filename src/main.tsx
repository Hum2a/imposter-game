import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/config'
import './index.css'
import { Root } from './Root.tsx'
import { initAnalytics, trackEvent } from './lib/analytics'
import { initTheme } from './lib/theme'

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

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
