/**
 * Privacy-friendly analytics (R2). Enable with `VITE_PLAUSIBLE_DOMAIN` (and optional script URL).
 * Events use generic names; props are coerced to strings (no PII).
 */

export type AnalyticsProps = Record<string, string | number | boolean>

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, string | number | boolean> }
    ) => void
  }
}

let initStarted = false

function toPlausibleProps(props: AnalyticsProps): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(props)) {
    out[k] = typeof v === 'boolean' || typeof v === 'number' ? v : String(v).slice(0, 64)
  }
  return out
}

/** Fire a custom event when Plausible is loaded, or log in dev when disabled. */
export function trackEvent(name: string, props?: AnalyticsProps): void {
  if (typeof window === 'undefined') return
  if (window.plausible) {
    window.plausible(name, props ? { props: toPlausibleProps(props) } : undefined)
    return
  }
  if (import.meta.env.DEV) {
    console.debug('[analytics]', name, props ?? '')
  }
}

/**
 * Injects Plausible when `VITE_PLAUSIBLE_DOMAIN` is set; otherwise no third-party script.
 * First `AppOpen` runs after script load (or via dev console when analytics is off).
 */
export function initAnalytics(): void {
  if (initStarted || typeof window === 'undefined') return
  initStarted = true

  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim()
  if (!domain) {
    trackEvent('AppOpen')
    return
  }

  const src =
    import.meta.env.VITE_PLAUSIBLE_SCRIPT_URL?.trim() || 'https://plausible.io/js/script.js'
  const s = document.createElement('script')
  s.defer = true
  s.setAttribute('data-domain', domain)
  s.src = src
  s.onload = () => {
    window.plausible?.('AppOpen')
  }
  document.head.appendChild(s)
}
