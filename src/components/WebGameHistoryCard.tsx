import { useCallback, useEffect, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { ChevronDown, History } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  fetchPlayerRoundsPage,
  type PlayerRoundRow,
} from '@/lib/record-player-round'
import { wordPackLabel } from '@/lib/word-pack-i18n'

const PAGE_SIZE = 15

function outcomeLabel(winner: string, t: TFunction) {
  if (winner === 'crew') return t('profile.historyOutcomeCrew')
  if (winner === 'imposter') return t('profile.historyOutcomeImposter')
  return t('profile.historyOutcomeNone')
}

function reasonShort(r: PlayerRoundRow, t: TFunction) {
  if (r.reveal_reason === 'wrong_accusation') return t('profile.historyReasonWrongShort')
  if (r.reveal_reason === 'caught_imposter') return t('profile.historyReasonCaughtShort')
  return ''
}

function detail(
  label: string,
  value: string | number | null | undefined,
  empty?: string
): { label: string; value: string } | null {
  if (value === null || value === undefined || value === '') {
    if (empty === undefined) return null
    return { label, value: empty }
  }
  return { label, value: String(value) }
}

export function WebGameHistoryCard() {
  const { t, i18n } = useTranslation()
  const [rows, setRows] = useState<PlayerRoundRow[] | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadPage = useCallback(async (start: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const { rows: next, hasMore: more } = await fetchPlayerRoundsPage({
        limit: PAGE_SIZE,
        offset: start,
      })
      setHasMore(more)
      setOffset(start + next.length)
      setRows((prev) => (append && prev ? [...prev, ...next] : next))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    void loadPage(0, false)
  }, [loadPage])

  const loadMore = () => {
    void loadPage(offset, true)
  }

  const voteLine = (r: PlayerRoundRow) => {
    if (r.vote_was_skip === true) return t('profile.historyVoteSkip')
    if (r.voted_target_name) return r.voted_target_name
    if (r.voted_for) return t('profile.historyVoteUnknownTarget')
    return t('profile.historyVoteNone')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" aria-hidden />
          {t('profile.gameHistoryTitle')}
        </CardTitle>
        <CardDescription>
          {t('profile.gameHistoryDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading || rows === null ? (
          <p className="text-sm text-muted-foreground">{t('profile.roundHistoryLoading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('profile.roundHistoryEmpty')}</p>
        ) : (
          <ul className="max-h-[min(28rem,70vh)] space-y-2 overflow-y-auto pr-1">
            {rows.map((r) => {
              const when = new Date(r.created_at).toLocaleString(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
              const reason = reasonShort(r, t)
              const roleLabel = r.was_imposter
                ? t('profile.roundRoleImposter')
                : t('profile.roundRoleCrew')
              const summary = reason
                ? t('profile.historySummaryWithReason', {
                    when,
                    n: r.round_index,
                    outcome: outcomeLabel(r.winner, t),
                    role: roleLabel,
                    reason,
                  })
                : t('profile.historySummary', {
                    when,
                    n: r.round_index,
                    outcome: outcomeLabel(r.winner, t),
                    role: roleLabel,
                  })
              const items: { label: string; value: string }[] = []
              const push = (x: { label: string; value: string } | null) => {
                if (x) items.push(x)
              }
              push(detail(t('profile.historyWhen'), when))
              push(detail(t('profile.historyRoom'), r.party_room_id, t('profile.historyUnknown')))
              push(detail(t('profile.historyOutcome'), outcomeLabel(r.winner, t)))
              push(detail(t('profile.historyYourRole'), roleLabel))
              push(detail(t('profile.historyVote'), voteLine(r)))
              if (reason) push(detail(t('profile.historyReason'), reason))
              push(
                detail(
                  t('profile.historyHost'),
                  r.was_host == null
                    ? null
                    : r.was_host
                      ? t('profile.historyYes')
                      : t('profile.historyNo'),
                  t('profile.historyUnknown')
                )
              )
              push(
                detail(
                  t('profile.historyPlayers'),
                  r.player_count != null && r.player_count > 0
                    ? r.player_count
                    : null,
                  t('profile.historyUnknown')
                )
              )
              push(
                detail(
                  t('profile.historyImposter'),
                  r.imposter_display_name,
                  t('profile.historyUnknown')
                )
              )
              push(
                detail(
                  t('profile.historyWordPack'),
                  r.word_pack_id ? wordPackLabel(r.word_pack_id, t) : null,
                  t('profile.historyUnknown')
                )
              )
              push(
                detail(
                  t('profile.historyClueCycle'),
                  r.clue_cycle != null ? `${r.clue_cycle} / ${r.max_clue_rounds ?? '—'}` : null,
                  t('profile.historyUnknown')
                )
              )
              push(
                detail(
                  t('profile.historyWriteTimer'),
                  r.write_seconds != null ? `${r.write_seconds}s` : null,
                  t('profile.historyUnknown')
                )
              )
              push(
                detail(
                  t('profile.historyRoomRecord'),
                  r.room_rounds_completed != null
                    ? t('profile.historyRoomRecordValue', {
                        rounds: r.room_rounds_completed,
                        crew: r.room_crew_wins ?? '—',
                        imp: r.room_imposter_wins ?? '—',
                      })
                    : null,
                  t('profile.historyUnknown')
                )
              )

              return (
                <li key={r.id}>
                  <details className="group rounded-md border border-border/70 bg-muted/20 open:bg-muted/35">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      <span className="text-left font-medium text-foreground">{summary}</span>
                    </summary>
                    <dl className="grid gap-x-4 gap-y-2 border-t border-border/60 px-3 py-3 text-xs sm:grid-cols-2">
                      {items.map((row) => (
                        <div key={row.label} className="min-w-0 sm:even:border-l sm:even:border-border/50 sm:even:pl-4">
                          <dt className="text-muted-foreground">{row.label}</dt>
                          <dd className="break-words font-medium text-foreground">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </li>
              )
            })}
          </ul>
        )}
        {hasMore ? (
          <div className="mt-3 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? t('profile.roundHistoryLoading') : t('profile.historyLoadMore')}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
