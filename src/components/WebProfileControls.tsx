import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { isSupabaseConfigured } from '@/lib/supabase-client'

type WebProfileControlsProps = {
  displayName: string
  onSave: (name: string) => void
}

export function WebProfileControls({ displayName, onSave }: WebProfileControlsProps) {
  const [draft, setDraft] = useState(displayName)

  useEffect(() => {
    setDraft(displayName)
  }, [displayName])

  return (
    <header className="border-b bg-card/90 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">Web player</span>
            <Separator orientation="vertical" className="hidden h-4 sm:block" />
            {isSupabaseConfigured() ? (
              <Badge variant="secondary" className="font-normal">
                Cloud profile sync on
              </Badge>
            ) : (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                Local guest — add Supabase env for cloud id
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:max-w-sm">
            <Label htmlFor="web-display-name">Display name</Label>
            <Input
              id="web-display-name"
              type="text"
              value={draft}
              maxLength={40}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="How others see you"
              aria-label="Display name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave(draft)
              }}
            />
          </div>
        </div>
        <Button type="button" className="shrink-0 sm:min-w-[5rem]" onClick={() => onSave(draft)}>
          Save
        </Button>
      </div>
    </header>
  )
}
