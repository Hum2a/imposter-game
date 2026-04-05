import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Loader2, ServerCrash } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
export function AppErrorState({ message, hint }: { message: string; hint: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md shadow-md">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>{message}</AlertTitle>
            <AlertDescription>{hint}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

export function AppLoadingState({
  label,
  description,
}: {
  label: string
  description?: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-muted-foreground">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description ? (
        <p className="max-w-sm text-pretty text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export function AppConfigWarning({
  title,
  body,
  codeHint,
}: {
  title: string
  body: ReactNode
  codeHint?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ServerCrash className="size-5 text-amber-500" aria-hidden />
            {title}
          </CardTitle>
          <CardDescription className="text-pretty text-base">{body}</CardDescription>
        </CardHeader>
        {codeHint ? (
          <CardContent className="pt-0">
            <Alert>
              <AlertTitle>{t('states.quickFix')}</AlertTitle>
              <AlertDescription className="text-left">{codeHint}</AlertDescription>
            </Alert>
          </CardContent>
        ) : null}
      </Card>
    </div>
  )
}
