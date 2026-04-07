import App from './App.tsx'
import { PrivacyPage } from './legal/PrivacyPage'
import { TermsPage } from './legal/TermsPage'

function normalizePath(pathname: string) {
  const p = pathname.replace(/\/+$/, '') || '/'
  return p
}

export function Root() {
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
