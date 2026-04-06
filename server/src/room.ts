import type * as Party from 'partykit/server'
import {
  discordActivityOriginsAllowed,
  isWebSocketOriginAllowed,
  parseAllowedWebOrigins,
} from './allowed-origins'
import { verifyPartyJoinJwt } from './join-jwt'
import { DEFAULT_WORD_PACK_ID, getWordPack, isValidPackId } from './word-packs'
import { pairFailsProfanityFilter, textFailsProfanityFilter } from './word-profanity'

type Phase = 'lobby' | 'clue_write' | 'clue_reveal' | 'voting' | 'reveal'

interface RoomStats {
  roundsCompleted: number
  crewWins: number
  imposterWins: number
}

interface GameSettings {
  writeSeconds: number
  maxClueRounds: number
  voteSeconds: number
  newWordPairEachClueCycle: boolean
}

type RevealReason = 'wrong_accusation' | 'caught_imposter' | null

interface Player {
  id: string
  name: string
  avatar: string
  isImposter: boolean
  hasVoted: boolean
  votedFor: string | null
  eliminated: boolean
  isSpectator: boolean
}

interface NextRoundWords {
  word: string
  imposterWord: string
}

interface GameState {
  phase: Phase
  players: Record<string, Player>
  hostId: string
  word: string
  imposterWord: string
  votes: Record<string, string>
  round: number
  winner: 'crew' | 'imposter' | null
  clueEndsAt: number | null
  stats: RoomStats
  hasCustomNextRound: boolean
  wordPackId: string
  gameSettings: GameSettings
  clueCycle: number
  revealedClues: Record<string, string>
  suspicion: Record<string, number>
  revealReason: RevealReason
  /** Increments each time voting starts (skip return or call vote); clients can key UI. */
  voteSession: number
  voteEndsAt: number | null
}

const STORAGE_STATS = 'imposter:stats:v1'
const STORAGE_ROUND = 'imposter:round:v1'

const VOTE_SKIP = '__SKIP__'

const DEFAULT_WRITE_SECONDS = 20
const DEFAULT_MAX_CLUE_ROUNDS = 5
const MIN_WRITE_SECONDS = 10
const MAX_WRITE_SECONDS = 120
const MIN_CLUE_ROUNDS = 1
const MAX_CLUE_ROUNDS = 20
const DEFAULT_VOTE_SECONDS = 90
const MIN_VOTE_SECONDS = 15
const MAX_VOTE_SECONDS = 180

/** Re-broadcast during clue_write so clients resync `clueEndsAt` after tab sleep / skew. */
const CLUE_RESYNC_MS = 25_000
const DISCONNECT_GRACE_MS = 45_000
const WORD_MAX_LEN = 40
const WORD_MIN_LEN = 1

function defaultStats(): RoomStats {
  return { roundsCompleted: 0, crewWins: 0, imposterWins: 0 }
}

function defaultGameSettings(): GameSettings {
  return {
    writeSeconds: DEFAULT_WRITE_SECONDS,
    maxClueRounds: DEFAULT_MAX_CLUE_ROUNDS,
    voteSeconds: DEFAULT_VOTE_SECONDS,
    newWordPairEachClueCycle: false,
  }
}

function joinVerifyEnabled(env: Record<string, unknown>): boolean {
  const v = env.JOIN_VERIFY
  return v === 'true' || v === true || v === '1'
}

function joinJwtRequired(env: Record<string, unknown>): boolean {
  const v = env.JOIN_JWT_REQUIRED
  return v === 'true' || v === true || v === '1'
}

function joinJwtSecret(env: Record<string, unknown>): string | null {
  const s = env.JOIN_JWT_SECRET
  return typeof s === 'string' && s.length > 0 ? s : null
}

function joinRateLimitEnabled(env: Record<string, unknown>): boolean {
  const v = env.JOIN_RATE_LIMIT
  return !(v === 'false' || v === false || v === '0')
}

function joinRateWindowMs(env: Record<string, unknown>): number {
  const n = parseInt(String(env.JOIN_RATE_WINDOW_MS ?? ''), 10)
  if (Number.isFinite(n) && n >= 1000 && n <= 120_000) return n
  return 15_000
}

function joinRateMaxPerConn(env: Record<string, unknown>): number {
  const n = parseInt(String(env.JOIN_MAX_PER_CONN ?? ''), 10)
  if (Number.isFinite(n) && n >= 1 && n <= 200) return n
  return 20
}

function joinRateMaxPerUser(env: Record<string, unknown>): number {
  const n = parseInt(String(env.JOIN_MAX_PER_USER ?? ''), 10)
  if (Number.isFinite(n) && n >= 1 && n <= 200) return n
  return 12
}

function profanityFilterEnabled(env: Record<string, unknown>): boolean {
  const v = env.WORD_PROFANITY_FILTER
  return v === 'true' || v === true || v === '1'
}

/** When true (default), clues must be one run of Unicode letters only (no digits, hyphens, punctuation). Set `CLUE_STRICT_WORD=false` for legacy lenient clues. */
function strictClueWordEnabled(env: Record<string, unknown>): boolean {
  const v = env.CLUE_STRICT_WORD
  if (v === 'false' || v === false || v === '0') return false
  return true
}

async function verifyDiscordUserId(
  accessToken: string,
  expectedUserId: string
): Promise<boolean> {
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return false
  const u = (await res.json()) as { id?: string }
  return typeof u.id === 'string' && u.id === expectedUserId
}

function normalizeWordPair(
  rawWord: string,
  rawImposter: string
): NextRoundWords | null {
  const word = rawWord.trim().slice(0, WORD_MAX_LEN)
  const imposterWord = rawImposter.trim().slice(0, WORD_MAX_LEN)
  if (word.length < WORD_MIN_LEN || imposterWord.length < WORD_MIN_LEN) return null
  if (word.toLowerCase() === imposterWord.toLowerCase()) return null
  return { word, imposterWord }
}

const STRICT_CLUE_LETTERS_ONLY = /^[\p{L}]+$/u

type ClueValidation = { ok: string } | { err: 'INVALID_CLUE' | 'CLUE_STRICT_REJECTED' }

function validateClueText(raw: string, env: Record<string, unknown>): ClueValidation {
  const t = raw.trim().slice(0, WORD_MAX_LEN)
  if (t.length < WORD_MIN_LEN || /\s/.test(t)) return { err: 'INVALID_CLUE' }
  if (strictClueWordEnabled(env) && !STRICT_CLUE_LETTERS_ONLY.test(t)) {
    return { err: 'CLUE_STRICT_REJECTED' }
  }
  return { ok: t }
}

export default class ImposterRoom implements Party.Server {
  static onBeforeConnect(request: Party.Request, lobby: Party.Lobby) {
    const raw = lobby.env.ALLOWED_WEB_ORIGINS
    const allowed = parseAllowedWebOrigins(typeof raw === 'string' ? raw : undefined)
    if (allowed.length === 0) return request
    const allowDiscord = discordActivityOriginsAllowed(
      typeof lobby.env.ALLOW_DISCORD_ACTIVITY_ORIGINS === 'string'
        ? lobby.env.ALLOW_DISCORD_ACTIVITY_ORIGINS
        : undefined
    )
    const origin = request.headers.get('Origin')
    if (!isWebSocketOriginAllowed(origin, allowed, allowDiscord)) {
      return new Response('Forbidden origin', { status: 403 })
    }
    return request
  }

  state: GameState
  private readonly connToUser = new Map<string, string>()
  /** Sliding-window JOIN counts (mitigate scripted / repeater floods). */
  private readonly joinRateByConn = new Map<string, number[]>()
  private readonly joinRateByUser = new Map<string, number[]>()
  private clueTimer: ReturnType<typeof setTimeout> | null = null
  private clueResync: ReturnType<typeof setInterval> | null = null
  private voteEndTimer: ReturnType<typeof setTimeout> | null = null
  private nextCustomPair: NextRoundWords | null = null
  private readonly disconnectGrace = new Map<string, ReturnType<typeof setTimeout>>()
  /** Server-only during clue_write; copied to `revealedClues` on reveal. */
  private privateClues: Record<string, string> = {}

  constructor(readonly room: Party.Room) {
    this.state = this.defaultState()
  }

  async onStart() {
    try {
      const statsRaw = await this.room.storage.get<string>(STORAGE_STATS)
      if (statsRaw) {
        const parsed = JSON.parse(statsRaw) as Partial<RoomStats>
        this.state.stats = { ...defaultStats(), ...parsed }
      }
      const roundRaw = await this.room.storage.get<string>(STORAGE_ROUND)
      if (roundRaw) {
        const r = parseInt(roundRaw, 10)
        if (!Number.isNaN(r) && r >= 1) this.state.round = r
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  private userForConn(sender: Party.Connection): string | undefined {
    return this.connToUser.get(sender.id)
  }

  /** Returns false if this JOIN should be rejected (rate limited). */
  private allowJoinAttempt(sender: Party.Connection, userId: string): boolean {
    if (!joinRateLimitEnabled(this.room.env)) return true
    const env = this.room.env
    const windowMs = joinRateWindowMs(env)
    const maxConn = joinRateMaxPerConn(env)
    const maxUser = joinRateMaxPerUser(env)
    const now = Date.now()
    const prune = (arr: number[]) => arr.filter((t) => now - t < windowMs)

    let connArr = prune(this.joinRateByConn.get(sender.id) ?? [])
    let userArr = prune(this.joinRateByUser.get(userId) ?? [])

    if (connArr.length >= maxConn || userArr.length >= maxUser) {
      this.joinRateByConn.set(sender.id, connArr)
      this.joinRateByUser.set(userId, userArr)
      return false
    }

    connArr = [...connArr, now]
    userArr = [...userArr, now]
    this.joinRateByConn.set(sender.id, connArr)
    this.joinRateByUser.set(userId, userArr)
    return true
  }

  defaultState(): GameState {
    return {
      phase: 'lobby',
      players: {},
      hostId: '',
      word: '',
      imposterWord: '',
      votes: {},
      round: 1,
      winner: null,
      clueEndsAt: null,
      stats: defaultStats(),
      hasCustomNextRound: false,
      wordPackId: DEFAULT_WORD_PACK_ID,
      gameSettings: defaultGameSettings(),
      clueCycle: 1,
      revealedClues: {},
      suspicion: {},
      revealReason: null,
      voteSession: 0,
      voteEndsAt: null,
    }
  }

  private clearVoteScheduling() {
    if (this.voteEndTimer) {
      clearTimeout(this.voteEndTimer)
      this.voteEndTimer = null
    }
  }

  private clearClueScheduling() {
    if (this.clueTimer) {
      clearTimeout(this.clueTimer)
      this.clueTimer = null
    }
    if (this.clueResync) {
      clearInterval(this.clueResync)
      this.clueResync = null
    }
  }

  private scheduleClueEnd() {
    this.clearClueScheduling()
    const ends = this.state.clueEndsAt
    if (!ends || this.state.phase !== 'clue_write') return
    const ms = ends - Date.now()
    if (ms <= 0) {
      this.finishClueWritePhase()
      void this.persistMeta()
      this.broadcast()
      return
    }
    this.clueTimer = setTimeout(() => {
      this.clueTimer = null
      if (this.clueResync) {
        clearInterval(this.clueResync)
        this.clueResync = null
      }
      if (this.state.phase === 'clue_write') {
        this.finishClueWritePhase()
        void this.persistMeta()
        this.broadcast()
      }
    }, ms)

    this.clueResync = setInterval(() => {
      if (this.state.phase !== 'clue_write') {
        if (this.clueResync) {
          clearInterval(this.clueResync)
          this.clueResync = null
        }
        return
      }
      this.broadcast()
    }, CLUE_RESYNC_MS)
  }

  /** Merge private clues into broadcast state and open reveal phase. */
  private finishClueWritePhase() {
    this.clearClueScheduling()
    const revealed: Record<string, string> = {}
    for (const p of Object.values(this.state.players)) {
      if (p.isSpectator) continue
      const v = this.privateClues[p.id]
      revealed[p.id] = v !== undefined ? v : ''
    }
    this.state.revealedClues = revealed
    this.state.clueEndsAt = null
    this.state.phase = 'clue_reveal'
  }

  private scheduleVoteEnd() {
    if (this.voteEndTimer) {
      clearTimeout(this.voteEndTimer)
      this.voteEndTimer = null
    }
    const ends = this.state.voteEndsAt
    if (!ends || this.state.phase !== 'voting') return
    const ms = ends - Date.now()
    if (ms <= 0) {
      this.applyVoteDeadline()
      return
    }
    this.voteEndTimer = setTimeout(() => {
      this.voteEndTimer = null
      this.applyVoteDeadline()
    }, ms)
  }

  /** Auto–skip vote for anyone who has not voted when the deadline hits. */
  private applyVoteDeadline() {
    if (this.state.phase !== 'voting') return
    const voters = Object.values(this.state.players).filter((p) => !p.isSpectator)
    for (const p of voters) {
      if (!p.hasVoted) {
        this.state.votes[p.id] = VOTE_SKIP
        p.hasVoted = true
        p.votedFor = VOTE_SKIP
      }
    }
    this.state.voteEndsAt = null
    this.clearVoteScheduling()
    this.tryCompleteVotingIfReady()
  }

  private startVotingPhase() {
    this.clearClueScheduling()
    this.clearVoteScheduling()
    for (const p of Object.values(this.state.players)) {
      p.hasVoted = false
      p.votedFor = null
    }
    this.state.votes = {}
    this.state.voteSession += 1
    this.state.phase = 'voting'
    const vs = this.state.gameSettings.voteSeconds
    const sec =
      typeof vs === 'number' && Number.isFinite(vs)
        ? Math.min(MAX_VOTE_SECONDS, Math.max(MIN_VOTE_SECONDS, Math.round(vs)))
        : DEFAULT_VOTE_SECONDS
    this.state.voteEndsAt = Date.now() + sec * 1000
    this.broadcast()
    this.scheduleVoteEnd()
  }

  /** Majority skip: skipCount * 2 > n (strict majority of eligible voters). */
  private enterClueWriteAfterSkip() {
    this.clearVoteScheduling()
    this.state.voteEndsAt = null
    this.clearClueScheduling()
    for (const p of Object.values(this.state.players)) {
      p.hasVoted = false
      p.votedFor = null
    }
    this.state.votes = {}
    this.privateClues = {}
    this.state.revealedClues = {}
    this.state.suspicion = {}
    this.state.phase = 'clue_write'
    this.state.clueEndsAt = Date.now() + this.state.gameSettings.writeSeconds * 1000
    this.scheduleClueEnd()
  }

  private tryEarlyClueReveal() {
    if (this.state.phase !== 'clue_write') return
    const active = Object.values(this.state.players).filter((p) => !p.isSpectator)
    if (active.length === 0) return
    const allIn = active.every((p) => this.privateClues[p.id] !== undefined)
    if (!allIn) return
    this.finishClueWritePhase()
    void this.persistMeta()
    this.broadcast()
  }

  private serializeForViewer(viewerId: string | undefined): Record<string, unknown> {
    const base: Record<string, unknown> = { ...this.state }
    if (this.state.phase === 'clue_write') {
      const cluesSubmitted: Record<string, boolean> = {}
      for (const p of Object.values(this.state.players)) {
        if (p.isSpectator) continue
        cluesSubmitted[p.id] = this.privateClues[p.id] !== undefined
      }
      base.cluesSubmitted = cluesSubmitted
      base.revealedClues = {}
      if (viewerId) {
        const mine = this.privateClues[viewerId]
        base.myClue = mine !== undefined ? mine : null
      } else {
        base.myClue = null
      }
    } else {
      base.myClue = undefined
      base.cluesSubmitted = undefined
    }
    base.clueStrictWord = strictClueWordEnabled(this.room.env)
    return base
  }

  private async persistMeta() {
    try {
      await this.room.storage.put(STORAGE_STATS, JSON.stringify(this.state.stats))
      await this.room.storage.put(STORAGE_ROUND, String(this.state.round))
    } catch {
      /* storage failures should not crash the room */
    }
  }

  onConnect(conn: Party.Connection) {
    const uid = this.connToUser.get(conn.id)
    conn.send(JSON.stringify(this.serializeForViewer(uid)))
  }

  async onMessage(message: string, sender: Party.Connection) {
    const parsed: unknown = JSON.parse(message)
    const msg = parsed as {
      type: string
      userId?: string
      name?: string
      avatar?: string
      targetId?: string
      skip?: boolean
      accessToken?: string
      partyJwt?: string
      word?: string
      imposterWord?: string
      packId?: string
      text?: string
      writeSeconds?: number
      maxClueRounds?: number
    }

    switch (msg.type) {
      case 'JOIN':
        if (
          typeof msg.userId === 'string' &&
          msg.userId.length > 0 &&
          typeof msg.name === 'string'
        ) {
          await this.handleJoin(
            {
              userId: msg.userId,
              name: msg.name,
              avatar: msg.avatar ?? '',
              accessToken: msg.accessToken,
              partyJwt: msg.partyJwt,
            },
            sender
          )
        }
        break
      case 'START_GAME':
        if (this.userForConn(sender) === this.state.hostId) {
          if (!this.nextCustomPair) {
            const pack = getWordPack(this.state.wordPackId)
            if (pack.pairs.length === 0) {
              sender.send(JSON.stringify({ type: 'ERROR', code: 'EMPTY_WORD_PACK' }))
              break
            }
          }
          this.startGame()
        }
        break
      case 'CAST_VOTE': {
        const voterId = this.userForConn(sender)
        if (!voterId) break
        if (msg.skip === true) {
          this.handleVote(voterId, VOTE_SKIP)
        } else if (typeof msg.targetId === 'string' && msg.targetId.length > 0) {
          this.handleVote(voterId, msg.targetId)
        }
        break
      }
      case 'NEXT_ROUND':
        if (this.userForConn(sender) === this.state.hostId) await this.nextRound()
        break
      case 'BACK_TO_LOBBY':
        if (this.userForConn(sender) === this.state.hostId) this.backToLobby()
        break
      case 'END_GAME':
        if (this.userForConn(sender) === this.state.hostId) this.endGame()
        break
      case 'SET_NEXT_WORDS':
        if (
          this.userForConn(sender) === this.state.hostId &&
          this.state.phase === 'lobby' &&
          typeof msg.word === 'string' &&
          typeof msg.imposterWord === 'string'
        ) {
          const pair = normalizeWordPair(msg.word, msg.imposterWord)
          if (!pair) {
            sender.send(JSON.stringify({ type: 'ERROR', code: 'INVALID_NEXT_WORDS' }))
          } else if (
            profanityFilterEnabled(this.room.env) &&
            pairFailsProfanityFilter(pair.word, pair.imposterWord)
          ) {
            sender.send(JSON.stringify({ type: 'ERROR', code: 'WORDS_PROFANITY' }))
          } else {
            this.nextCustomPair = pair
            this.state.hasCustomNextRound = true
            this.broadcast()
          }
        }
        break
      case 'SET_WORD_PACK':
        if (
          this.userForConn(sender) === this.state.hostId &&
          this.state.phase === 'lobby' &&
          typeof msg.packId === 'string'
        ) {
          if (!isValidPackId(msg.packId)) {
            sender.send(JSON.stringify({ type: 'ERROR', code: 'INVALID_WORD_PACK' }))
          } else {
            this.state.wordPackId = msg.packId
            this.broadcast()
          }
        }
        break
      case 'ROLL_PACK_PAIR':
        if (this.userForConn(sender) === this.state.hostId && this.state.phase === 'lobby') {
          const pack = getWordPack(this.state.wordPackId)
          const pairs = pack.pairs
          if (pairs.length === 0) {
            sender.send(JSON.stringify({ type: 'ERROR', code: 'EMPTY_WORD_PACK' }))
          } else {
            const pick = pairs[Math.floor(Math.random() * pairs.length)]!
            this.nextCustomPair = { word: pick[0], imposterWord: pick[1] }
            this.state.hasCustomNextRound = true
            this.broadcast()
          }
        }
        break
      case 'CLEAR_NEXT_WORDS':
        if (this.userForConn(sender) === this.state.hostId && this.state.phase === 'lobby') {
          this.nextCustomPair = null
          this.state.hasCustomNextRound = false
          this.broadcast()
        }
        break
      case 'SET_GAME_SETTINGS': {
        const settings = msg as {
          writeSeconds?: number
          maxClueRounds?: number
          voteSeconds?: number
          newWordPairEachClueCycle?: boolean
        }
        if (this.userForConn(sender) === this.state.hostId && this.state.phase === 'lobby') {
          if (typeof settings.writeSeconds === 'number' && Number.isFinite(settings.writeSeconds)) {
            const w = Math.round(settings.writeSeconds)
            this.state.gameSettings.writeSeconds = Math.min(
              MAX_WRITE_SECONDS,
              Math.max(MIN_WRITE_SECONDS, w)
            )
          }
          if (typeof settings.maxClueRounds === 'number' && Number.isFinite(settings.maxClueRounds)) {
            const m = Math.round(settings.maxClueRounds)
            this.state.gameSettings.maxClueRounds = Math.min(
              MAX_CLUE_ROUNDS,
              Math.max(MIN_CLUE_ROUNDS, m)
            )
          }
          if (typeof settings.voteSeconds === 'number' && Number.isFinite(settings.voteSeconds)) {
            const v = Math.round(settings.voteSeconds)
            this.state.gameSettings.voteSeconds = Math.min(
              MAX_VOTE_SECONDS,
              Math.max(MIN_VOTE_SECONDS, v)
            )
          }
          if (typeof settings.newWordPairEachClueCycle === 'boolean') {
            this.state.gameSettings.newWordPairEachClueCycle = settings.newWordPairEachClueCycle
          }
          this.broadcast()
        }
        break
      }
      case 'SUBMIT_CLUE': {
        const uid = this.userForConn(sender)
        if (!uid || typeof msg.text !== 'string') break
        if (this.state.phase !== 'clue_write') break
        const player = this.state.players[uid]
        if (!player || player.isSpectator) break
        const validated = validateClueText(msg.text, this.room.env)
        if ('err' in validated) {
          sender.send(JSON.stringify({ type: 'ERROR', code: validated.err }))
          break
        }
        const clue = validated.ok
        if (profanityFilterEnabled(this.room.env) && textFailsProfanityFilter(clue)) {
          sender.send(JSON.stringify({ type: 'ERROR', code: 'CLUE_PROFANITY' }))
          break
        }
        this.privateClues[uid] = clue
        this.tryEarlyClueReveal()
        this.broadcast()
        break
      }
      case 'BUMP_SUSPICION': {
        const uid = this.userForConn(sender)
        if (!uid || typeof msg.targetId !== 'string') break
        if (this.state.phase !== 'clue_reveal') break
        const me = this.state.players[uid]
        if (!me || me.isSpectator) break
        if (msg.targetId === uid) break
        if (!this.state.players[msg.targetId] || this.state.players[msg.targetId]!.isSpectator)
          break
        this.state.suspicion[msg.targetId] = (this.state.suspicion[msg.targetId] ?? 0) + 1
        this.broadcast()
        break
      }
      case 'REDUCE_SUSPICION': {
        const uid = this.userForConn(sender)
        if (!uid || typeof msg.targetId !== 'string') break
        if (this.state.phase !== 'clue_reveal') break
        const me = this.state.players[uid]
        if (!me || me.isSpectator) break
        if (msg.targetId === uid) break
        if (!this.state.players[msg.targetId] || this.state.players[msg.targetId]!.isSpectator)
          break
        const cur = this.state.suspicion[msg.targetId] ?? 0
        if (cur <= 0) break
        this.state.suspicion[msg.targetId] = cur - 1
        if (this.state.suspicion[msg.targetId] === 0) delete this.state.suspicion[msg.targetId]
        this.broadcast()
        break
      }
      case 'CONTINUE_CLUE_REVEAL':
        if (this.userForConn(sender) === this.state.hostId && this.state.phase === 'clue_reveal') {
          if (this.state.clueCycle >= this.state.gameSettings.maxClueRounds) {
            this.startVotingPhase()
          } else {
            this.state.clueCycle += 1
            this.privateClues = {}
            this.state.revealedClues = {}
            this.state.suspicion = {}
            if (this.state.gameSettings.newWordPairEachClueCycle) {
              this.rollNewPairAndImposterForClueCycle()
            }
            this.state.phase = 'clue_write'
            this.state.clueEndsAt = Date.now() + this.state.gameSettings.writeSeconds * 1000
            this.scheduleClueEnd()
          }
          this.broadcast()
        }
        break
      case 'CALL_VOTE': {
        const uid = this.userForConn(sender)
        if (!uid) break
        const pl = this.state.players[uid]
        if (!pl || pl.isSpectator) break
        if (this.state.phase !== 'clue_write' && this.state.phase !== 'clue_reveal') break
        this.startVotingPhase()
        break
      }
    }
  }

  private cancelGraceForUser(userId: string) {
    const t = this.disconnectGrace.get(userId)
    if (t) {
      clearTimeout(t)
      this.disconnectGrace.delete(userId)
    }
  }

  private clearAllDisconnectGrace() {
    for (const t of this.disconnectGrace.values()) {
      clearTimeout(t)
    }
    this.disconnectGrace.clear()
  }

  private userHasOpenConnection(userId: string): boolean {
    for (const u of this.connToUser.values()) {
      if (u === userId) return true
    }
    return false
  }

  private finalizePlayerDisconnect(userId: string) {
    if (this.userHasOpenConnection(userId)) return
    if (!this.state.players[userId]) return

    if (this.state.phase === 'voting') {
      this.cleanupVotesForDepartedUser(userId)
    }
    delete this.privateClues[userId]
    delete this.state.players[userId]
    if (this.state.hostId === userId) {
      const remaining = Object.keys(this.state.players)
      const preferred = remaining.find((id) => !this.state.players[id]!.isSpectator)
      this.state.hostId = preferred ?? remaining[0] ?? ''
    }
    if (this.state.phase === 'voting') {
      this.tryCompleteVotingIfReady()
      return
    }
    if (this.state.phase === 'clue_write') {
      this.tryEarlyClueReveal()
    }
    this.broadcast()
  }

  private scheduleDisconnectGrace(userId: string) {
    this.cancelGraceForUser(userId)
    this.disconnectGrace.set(
      userId,
      setTimeout(() => {
        this.disconnectGrace.delete(userId)
        this.finalizePlayerDisconnect(userId)
      }, DISCONNECT_GRACE_MS)
    )
  }

  private async handleJoin(
    msg: {
      userId: string
      name: string
      avatar: string
      accessToken?: string
      partyJwt?: string
    },
    sender: Party.Connection
  ) {
    const userId = msg.userId.trim().slice(0, 64)
    const name = msg.name.trim().slice(0, 40)
    const avatar = msg.avatar.trim().slice(0, 64)
    if (!userId || !name) return

    if (!this.allowJoinAttempt(sender, userId)) {
      sender.send(JSON.stringify({ type: 'ERROR', code: 'JOIN_RATE_LIMITED' }))
      return
    }

    if (joinJwtRequired(this.room.env)) {
      const secret = joinJwtSecret(this.room.env)
      if (!secret) {
        sender.send(JSON.stringify({ type: 'ERROR', code: 'JOIN_PARTY_JWT_MISCONFIG' }))
        return
      }
      const pj = msg.partyJwt
      if (!pj || typeof pj !== 'string') {
        sender.send(JSON.stringify({ type: 'ERROR', code: 'JOIN_PARTY_JWT_REQUIRED' }))
        return
      }
      const jwtOk = await verifyPartyJoinJwt(pj, secret, userId)
      if (!jwtOk) {
        sender.send(JSON.stringify({ type: 'ERROR', code: 'JOIN_PARTY_JWT_INVALID' }))
        return
      }
    } else if (joinVerifyEnabled(this.room.env)) {
      const token = msg.accessToken
      if (!token) {
        sender.send(JSON.stringify({ type: 'ERROR', code: 'JOIN_NEED_TOKEN' }))
        return
      }
      const ok = await verifyDiscordUserId(token, userId)
      if (!ok) {
        sender.send(JSON.stringify({ type: 'ERROR', code: 'JOIN_VERIFY_FAILED' }))
        return
      }
    }

    const existing = this.state.players[userId]
    const phase = this.state.phase

    if (phase === 'lobby') {
      this.cancelGraceForUser(userId)
      this.connToUser.set(sender.id, userId)
      if (!existing) {
        this.state.players[userId] = {
          id: userId,
          name,
          avatar,
          isImposter: false,
          hasVoted: false,
          votedFor: null,
          eliminated: false,
          isSpectator: false,
        }
        if (Object.keys(this.state.players).length === 1) {
          this.state.hostId = userId
        }
      } else {
        existing.name = name
        existing.avatar = avatar
        existing.isSpectator = false
      }
      this.broadcast()
      return
    }

    if (existing) {
      this.cancelGraceForUser(userId)
      this.connToUser.set(sender.id, userId)
      existing.name = name
      existing.avatar = avatar
      this.broadcast()
      return
    }

    this.connToUser.set(sender.id, userId)
    this.state.players[userId] = {
      id: userId,
      name,
      avatar,
      isImposter: false,
      hasVoted: false,
      votedFor: null,
      eliminated: false,
      isSpectator: true,
    }
    this.broadcast()
  }

  /**
   * Next clue cycle after host continues from reveal: optional new pack pair + new imposter.
   * Skip-vote return to clues does not call this (same words / imposter).
   */
  private rollNewPairAndImposterForClueCycle() {
    const ids = Object.keys(this.state.players).filter(
      (id) => !this.state.players[id]!.isSpectator
    )
    if (ids.length === 0) return

    const pack = getWordPack(this.state.wordPackId)
    const pairs = pack.pairs
    if (pairs.length === 0) return

    const pick = pairs[Math.floor(Math.random() * pairs.length)]!
    const [word, imposterWord] = pick
    const imposterId = ids[Math.floor(Math.random() * ids.length)]!

    for (const id of Object.keys(this.state.players)) {
      const p = this.state.players[id]
      if (!p || p.isSpectator) continue
      p.isImposter = id === imposterId
    }
    this.state.word = word
    this.state.imposterWord = imposterWord
  }

  startGame() {
    for (const p of Object.values(this.state.players)) {
      p.isSpectator = false
    }
    const ids = Object.keys(this.state.players)
    if (ids.length === 0) return

    this.clearVoteScheduling()
    this.state.voteEndsAt = null
    this.clearClueScheduling()

    const imposterId = ids[Math.floor(Math.random() * ids.length)]!
    let word: string
    let imposterWord: string
    if (this.nextCustomPair) {
      word = this.nextCustomPair.word
      imposterWord = this.nextCustomPair.imposterWord
      this.nextCustomPair = null
      this.state.hasCustomNextRound = false
    } else {
      const pack = getWordPack(this.state.wordPackId)
      const pairs = pack.pairs
      if (pairs.length === 0) return
      const pair = pairs[Math.floor(Math.random() * pairs.length)]!
      ;[word, imposterWord] = pair
    }

    for (const id of ids) {
      const p = this.state.players[id]
      if (!p) continue
      p.isImposter = id === imposterId
      p.hasVoted = false
      p.votedFor = null
    }

    this.state.word = word
    this.state.imposterWord = imposterWord
    this.state.votes = {}
    this.state.winner = null
    this.state.revealReason = null
    this.privateClues = {}
    this.state.revealedClues = {}
    this.state.suspicion = {}
    this.state.clueCycle = 1
    this.state.phase = 'clue_write'
    this.state.clueEndsAt = Date.now() + this.state.gameSettings.writeSeconds * 1000

    this.broadcast()
    this.scheduleClueEnd()
  }

  handleVote(voterId: string, targetId: string) {
    if (this.state.phase !== 'voting') return
    const voter = this.state.players[voterId]
    if (!voter || voter.hasVoted || voter.isSpectator) return
    if (targetId !== VOTE_SKIP) {
      const target = this.state.players[targetId]
      if (!target || target.isSpectator || targetId === voterId) return
    }

    this.state.votes[voterId] = targetId
    voter.hasVoted = true
    voter.votedFor = targetId

    this.tryCompleteVotingIfReady()
  }

  private tryCompleteVotingIfReady() {
    const players = Object.values(this.state.players)
    const voters = players.filter((p) => !p.isSpectator)
    if (voters.length === 0) {
      this.broadcast()
      return
    }
    const allVoted = voters.every((p) => p.hasVoted)
    if (allVoted) this.resolveVotes()
    else this.broadcast()
  }

  resolveVotes() {
    this.clearVoteScheduling()
    this.state.voteEndsAt = null
    const voters = Object.values(this.state.players).filter((p) => !p.isSpectator)
    const n = voters.length
    if (n === 0) {
      this.broadcast()
      return
    }

    const skipCount = voters.filter((p) => this.state.votes[p.id] === VOTE_SKIP).length
    const strictMajoritySkip = skipCount * 2 > n

    if (strictMajoritySkip) {
      this.enterClueWriteAfterSkip()
      this.broadcast()
      return
    }

    const tally: Record<string, number> = {}
    for (const v of voters) {
      const t = this.state.votes[v.id]
      if (t && t !== VOTE_SKIP) {
        tally[t] = (tally[t] || 0) + 1
      }
    }

    const entries = Object.entries(tally).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) {
      this.state.phase = 'reveal'
      this.state.winner = null
      this.state.revealReason = null
      this.broadcast()
      return
    }

    const topCount = entries[0]![1]
    const tiedForLead = entries.filter(([, c]) => c === topCount).map(([id]) => id)
    const mostVotedId =
      tiedForLead[Math.floor(Math.random() * tiedForLead.length)]!
    const wasImposter = this.state.players[mostVotedId]?.isImposter === true

    this.state.winner = wasImposter ? 'crew' : 'imposter'
    this.state.revealReason = wasImposter ? 'caught_imposter' : 'wrong_accusation'
    this.state.phase = 'reveal'

    if (this.state.winner === 'crew') this.state.stats.crewWins += 1
    else if (this.state.winner === 'imposter') this.state.stats.imposterWins += 1
    this.state.stats.roundsCompleted += 1

    void this.persistMeta()
    this.broadcast()
  }

  async nextRound() {
    this.state.round += 1
    await this.persistMeta()
    this.startGame()
  }

  backToLobby() {
    this.clearVoteScheduling()
    this.state.voteEndsAt = null
    this.clearClueScheduling()
    this.privateClues = {}
    for (const p of Object.values(this.state.players)) {
      p.isImposter = false
      p.hasVoted = false
      p.votedFor = null
      p.isSpectator = false
    }
    this.state.word = ''
    this.state.imposterWord = ''
    this.state.votes = {}
    this.state.winner = null
    this.state.clueEndsAt = null
    this.state.revealedClues = {}
    this.state.suspicion = {}
    this.state.clueCycle = 1
    this.state.revealReason = null
    this.state.voteSession = 0
    this.state.phase = 'lobby'
    this.broadcast()
  }

  endGame() {
    this.clearVoteScheduling()
    this.clearClueScheduling()
    this.clearAllDisconnectGrace()
    this.nextCustomPair = null
    this.privateClues = {}
    const { stats } = this.state
    this.state = this.defaultState()
    this.state.stats = stats
    void this.persistMeta()
    this.broadcast()
  }

  private cleanupVotesForDepartedUser(userId: string) {
    delete this.state.votes[userId]
    for (const voterId of Object.keys({ ...this.state.votes })) {
      if (this.state.votes[voterId] === userId) {
        delete this.state.votes[voterId]
        const p = this.state.players[voterId]
        if (p) {
          p.hasVoted = false
          p.votedFor = null
        }
      }
    }
  }

  onClose(connection: Party.Connection) {
    const userId = this.connToUser.get(connection.id)
    this.connToUser.delete(connection.id)
    this.joinRateByConn.delete(connection.id)

    if (userId) {
      let stillConnected = false
      for (const u of this.connToUser.values()) {
        if (u === userId) {
          stillConnected = true
          break
        }
      }
      if (!stillConnected && this.state.players[userId]) {
        this.scheduleDisconnectGrace(userId)
      }
    }

    this.broadcast()
  }

  broadcast() {
    for (const conn of this.room.getConnections()) {
      const uid = this.connToUser.get(conn.id)
      conn.send(JSON.stringify(this.serializeForViewer(uid)))
    }
  }
}

ImposterRoom satisfies Party.Worker
