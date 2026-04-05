import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase-client'

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
    <div className="flex flex-wrap items-center justify-center gap-2 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-300">
      <span className="text-zinc-500">Web player</span>
      <input
        type="text"
        value={draft}
        maxLength={40}
        onChange={(e) => setDraft(e.target.value)}
        className="w-40 rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-zinc-100 outline-none focus:border-violet-500 sm:w-52"
        placeholder="Display name"
        aria-label="Display name"
      />
      <button
        type="button"
        onClick={() => onSave(draft)}
        className="rounded bg-zinc-700 px-3 py-1 font-medium text-white hover:bg-zinc-600"
      >
        Save
      </button>
      {isSupabaseConfigured() ? (
        <span className="text-xs text-emerald-600/90">Supabase sync on</span>
      ) : (
        <span className="text-xs text-zinc-600">Local guest (add Supabase env for cloud id)</span>
      )}
    </div>
  )
}
