import { Fragment, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  formatPairsForPaste,
  parseAllPastedPairs,
} from '@/lib/paste-word-pairs'
import {
  deleteSavedWordList,
  fetchSavedWordLists,
  insertSavedWordList,
  randomPairFromList,
  type SavedWordListRow,
} from '@/lib/saved-word-lists'
import { cn } from '@/lib/utils'

type SavedWordListsPanelProps = {
  pasteText: string
  onPasteTextChange: (value: string) => void
  onLoadPairIntoFields: (crew: string, imposter: string) => void
  onClearPasteHint?: () => void
}

export function SavedWordListsPanel({
  pasteText,
  onPasteTextChange,
  onLoadPairIntoFields,
  onClearPasteHint,
}: SavedWordListsPanelProps) {
  const { t } = useTranslation()
  const [lists, setLists] = useState<SavedWordListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [saveName, setSaveName] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; i18nKey: string } | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const next = await fetchSavedWordLists()
      setLists(next)
      setSelectedId((prev) => {
        if (prev && next.some((l) => l.id === prev)) return prev
        return ''
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selected = lists.find((l) => l.id === selectedId) ?? null

  const showMessage = (i18nKey: string, tone: 'ok' | 'err') => {
    setFeedback({ tone, i18nKey })
    window.setTimeout(() => setFeedback(null), 4000)
  }

  const saveErrorKey = (code: string): string => {
    switch (code) {
      case 'empty_name':
        return 'lobby.savedListsErrName'
      case 'no_pairs':
        return 'lobby.savedListsSaveNoPairs'
      case 'no_session':
        return 'lobby.savedListsErrSession'
      case 'limit_lists':
        return 'lobby.savedListsErrLimit'
      default:
        return 'lobby.savedListsErrGeneric'
    }
  }

  const handleSaveFromPaste = async () => {
    const pairs = parseAllPastedPairs(pasteText)
    if (pairs.length === 0) {
      showMessage('lobby.savedListsSaveNoPairs', 'err')
      return
    }
    setBusy(true)
    const listName = saveName.trim().slice(0, 120) || t('lobby.savedListsDefaultName')
    const res = await insertSavedWordList(listName, pairs)
    setBusy(false)
    if (res.ok) {
      setSaveName('')
      showMessage('lobby.savedListsSaveOk', 'ok')
      await refresh()
      setSelectedId(res.id)
    } else {
      showMessage(saveErrorKey(res.error), 'err')
    }
  }

  const handleRandomFromSaved = () => {
    if (!selected?.pairs.length) return
    const pick = randomPairFromList(selected.pairs)
    if (!pick) return
    onClearPasteHint?.()
    onLoadPairIntoFields(pick.crew, pick.imposter)
    showMessage('lobby.savedListsRandomOk', 'ok')
  }

  const handlePutInEditor = () => {
    if (!selected?.pairs.length) return
    onPasteTextChange(formatPairsForPaste(selected.pairs))
    onClearPasteHint?.()
    showMessage('lobby.savedListsEditorOk', 'ok')
  }

  const performDelete = async () => {
    if (!selectedId) return
    setBusy(true)
    const ok = await deleteSavedWordList(selectedId)
    setBusy(false)
    if (ok) {
      setSelectedId('')
      showMessage('lobby.savedListsDeleteOk', 'ok')
      await refresh()
    } else {
      showMessage('lobby.savedListsDeleteErr', 'err')
    }
  }

  return (
    <Fragment>
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('lobby.savedListsSection')}
      </p>
      <p className="text-sm text-muted-foreground">{t('lobby.savedListsHelp')}</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('lobby.savedListsLoading')}</p>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="saved-word-list">{t('lobby.savedListsPick')}</Label>
            <select
              id="saved-word-list"
              className={cn(
                'h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-xs transition-[color,box-shadow] outline-none md:text-sm dark:bg-input/30',
                'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
              )}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              aria-label={t('lobby.savedListsPickAria')}
            >
              <option value="">{t('lobby.savedListsNone')}</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.pairs.length})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11"
              disabled={!selected?.pairs.length || busy}
              onClick={handleRandomFromSaved}
            >
              {t('lobby.savedListsRandom')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={!selected?.pairs.length || busy}
              onClick={handlePutInEditor}
            >
              {t('lobby.savedListsToEditor')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 text-destructive hover:text-destructive"
              disabled={!selectedId || busy}
              onClick={() => setDeleteModalOpen(true)}
            >
              {t('lobby.savedListsDelete')}
            </Button>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <Label htmlFor="save-list-name">{t('lobby.savedListsSaveName')}</Label>
            <Input
              id="save-list-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t('lobby.savedListsSaveNamePh')}
              maxLength={120}
              autoComplete="off"
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              className="min-h-11 w-full sm:w-auto"
              disabled={busy}
              onClick={handleSaveFromPaste}
            >
              {t('lobby.savedListsSaveFromBox')}
            </Button>
          </div>
        </>
      )}

      {feedback ? (
        <p
          className={cn(
            'text-sm',
            feedback.tone === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
          )}
          role="status"
        >
          {t(feedback.i18nKey)}
        </p>
      ) : null}
    </div>
    <ConfirmModal
      open={deleteModalOpen}
      onOpenChange={setDeleteModalOpen}
      title={t('lobby.savedListsDeleteTitle')}
      description={t('lobby.savedListsDeleteDesc')}
      confirmLabel={t('common.delete')}
      cancelLabel={t('common.cancel')}
      variant="destructive"
      onConfirm={() => void performDelete()}
    />
    </Fragment>
  )
}
