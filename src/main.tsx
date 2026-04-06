import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/config'
import './index.css'
import App from './App.tsx'
import { PrivacyPage } from './legal/PrivacyPage'
import { TermsPage } from './legal/TermsPage'
import { initAnalytics, trackEvent } from './lib/analytics'
import { initTheme } from './lib/theme'

function normalizePath(pathname: string) {
  const p = pathname.replace(/\/+$/, '') || '/'
  return p
}

function Root() {
  if (typeof window !== 'undefined') {
    const path = normalizePath(window.location.pathname)
    if (path === '/terms') {
      return <TermsPage />
    }
    if (path === '/privacy') {
      return <PrivacyPage />
    }
  }
  return <App />
}

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
