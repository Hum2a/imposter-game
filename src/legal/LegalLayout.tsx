import { useEffect, type ReactNode } from 'react'

export function LegalLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    const prev = document.title
    document.title = `${title} · Imposter`
    return () => {
      document.title = prev
    }
  }, [title])

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border/80 bg-card/50 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <a
            href="/"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ← Back to game
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <article className="space-y-6 text-sm leading-relaxed text-foreground">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {children}
        </article>
      </main>
    </div>
  )
}
