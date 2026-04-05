import type * as Party from 'partykit/server'
import { verifyPartyJoinJwt } from './join-jwt'
import { DEFAULT_WORD_PACK_ID, getWordPack, isValidPackId } from './word-packs'
import { pairFailsProfanityFilter } from './word-profanity'

type Phase = 'lobby' | 'discussion' | 'voting' | 'reveal'

interface RoomStats {
  roundsCompleted: number
  crewWins: number
  imposterWins: number
}

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
  discussionEndsAt: number | null
  stats: RoomStats
  hasCustomNextRound: boolean
  /** Which curated pack is used for random draws (no custom pair). */
  wordPackId: string
}

const STORAGE_STATS = 'imposter:stats:v1'
const STORAGE_ROUND = 'imposter:round:v1'

const DISCUSSION_SECONDS = 60
/** Re-broadcast state during discussion so clients resync `discussionEndsAt` after tab sleep / skew. */
const DISCUSSION_RESYNC_MS = 25_000
/** Keep player row after last socket closes so refresh/reconnect can `JOIN` without losing the round. */
const DISCONNECT_GRACE_MS = 45_000
const WORD_MAX_LEN = 40
const WORD_MIN_LEN = 1

function defaultStats(): RoomStats {
  return { roundsCompleted: 0, crewWins: 0, imposterWins: 0 }
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

function profanityFilterEnabled(env: Record<string, unknown>): boolean {
  const v = env.WORD_PROFANITY_FILTER
  return v === 'true' || v === true || v === '1'
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

export default class ImposterRoom implements Party.Server {
  state: GameState
  /** PartyKit socket id → Discord / app user id */
  private readonly connToUser = new Map<string, string>()
  private discussionTimer: ReturnType<typeof setTimeout> | null = null
  private discussionResync: ReturnType<typeof setInterval> | null = null
  /** Not broadcast — avoids spoiling both words to everyone in the lobby. */
  private nextCustomPair: NextRoundWords | null = null
  /** userId → timer to remove them after grace if they don’t reconnect */
  private readonly disconnectGrace = new Map<string, ReturnType<typeof setTimeout>>()

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
      discussionEndsAt: null,
      stats: defaultStats(),
      hasCustomNextRound: false,
      wordPackId: DEFAULT_WORD_PACK_ID,
    }
  }

  private clearDiscussionScheduling() {
    if (this.discussionTimer) {
      clearTimeout(this.discussionTimer)
      this.discussionTimer = null
    }
    if (this.discussionResync) {
      clearInterval(this.discussionResync)
      this.discussionResync = null
    }
  }

  private scheduleDiscussionEnd() {
    this.clearDiscussionScheduling()
    const ends = this.state.discussionEndsAt
    if (!ends || this.state.phase !== 'discussion') return
    const ms = ends - Date.now()
    if (ms <= 0) {
      this.state.phase = 'voting'
      void this.persistMeta()
      this.broadcast()
      return
    }
    this.discussionTimer = setTimeout(() => {
      this.discussionTimer = null
      if (this.discussionResync) {
        clearInterval(this.discussionResync)
        this.discussionResync = null
      }
      if (this.state.phase === 'discussion') {
        this.state.phase = 'voting'
        void this.persistMeta()
        this.broadcast()
      }
    }, ms)

    this.discussionResync = setInterval(() => {
      if (this.state.phase !== 'discussion') {
        if (this.discussionResync) {
          clearInterval(this.discussionResync)
          this.discussionResync = null
        }
        return
      }
      this.broadcast()
    }, DISCUSSION_RESYNC_MS)
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
    conn.send(JSON.stringify(this.state))
  }

  async onMessage(message: string, sender: Party.Connection) {
    const parsed: unknown = JSON.parse(message)
    const msg = parsed as {
      type: string
      userId?: string
      name?: string
      avatar?: string
      targetId?: string
      accessToken?: string
      word?: string
      imposterWord?: string
      packId?: string
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
        if (voterId && msg.targetId) this.handleVote(voterId, msg.targetId)
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

  /** After grace: remove player, fix host, voting cleanup. */
  private finalizePlayerDisconnect(userId: string) {
    if (this.userHasOpenConnection(userId)) return
    if (!this.state.players[userId]) return

    if (this.state.phase === 'voting') {
      this.cleanupVotesForDepartedUser(userId)
    }
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
    },
    sender: Party.Connection
  ) {
    if (joinVerifyEnabled(this.room.env)) {
      const token = msg.accessToken
      if (!token) {
        sender.send(JSON.stringify({ type: 'ERROR', code: 'JOIN_NEED_TOKEN' }))
        return
      }
      const ok = await verifyDiscordUserId(token, msg.userId)
      if (!ok) {
        sender.send(JSON.stringify({ type: 'ERROR', code: 'JOIN_VERIFY_FAILED' }))
        return
      }
    }

    const existing = this.state.players[msg.userId]
    const phase = this.state.phase

    if (phase === 'lobby') {
      this.cancelGraceForUser(msg.userId)
      this.connToUser.set(sender.id, msg.userId)
      if (!existing) {
        this.state.players[msg.userId] = {
          id: msg.userId,
          name: msg.name,
          avatar: msg.avatar,
          isImposter: false,
          hasVoted: false,
          votedFor: null,
          eliminated: false,
          isSpectator: false,
        }
        if (Object.keys(this.state.players).length === 1) {
          this.state.hostId = msg.userId
        }
      } else {
        existing.name = msg.name
        existing.avatar = msg.avatar
        existing.isSpectator = false
      }
      this.broadcast()
      return
    }

    if (existing) {
      this.cancelGraceForUser(msg.userId)
      this.connToUser.set(sender.id, msg.userId)
      existing.name = msg.name
      existing.avatar = msg.avatar
      this.broadcast()
      return
    }

    this.connToUser.set(sender.id, msg.userId)
    this.state.players[msg.userId] = {
      id: msg.userId,
      name: msg.name,
      avatar: msg.avatar,
      isImposter: false,
      hasVoted: false,
      votedFor: null,
      eliminated: false,
      isSpectator: true,
    }
    this.broadcast()
  }

  startGame() {
    for (const p of Object.values(this.state.players)) {
      p.isSpectator = false
    }
    const ids = Object.keys(this.state.players)
    if (ids.length === 0) return

    this.clearDiscussionScheduling()

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
    this.state.phase = 'discussion'
    this.state.discussionEndsAt = Date.now() + DISCUSSION_SECONDS * 1000

    this.broadcast()
    this.scheduleDiscussionEnd()
  }

  handleVote(voterId: string, targetId: string) {
    if (this.state.phase !== 'voting') return
    const voter = this.state.players[voterId]
    if (!voter || voter.hasVoted || voter.isSpectator) return

    this.state.votes[voterId] = targetId
    voter.hasVoted = true
    voter.votedFor = targetId

    this.tryCompleteVotingIfReady()
  }

  /** All *current* players have cast a vote */
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
    const tally: Record<string, number> = {}
    for (const targetId of Object.values(this.state.votes)) {
      tally[targetId] = (tally[targetId] || 0) + 1
    }

    const entries = Object.entries(tally).sort((a, b) => b[1] - a[1])
    if (entries.length === 0) {
      this.state.phase = 'reveal'
      this.state.winner = null
      this.broadcast()
      return
    }

    const topCount = entries[0]![1]
    const tiedForLead = entries.filter(([, c]) => c === topCount).map(([id]) => id)
    const mostVotedId =
      tiedForLead[Math.floor(Math.random() * tiedForLead.length)]!
    const wasImposter = this.state.players[mostVotedId]?.isImposter === true

    this.state.winner = wasImposter ? 'crew' : 'imposter'
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
    this.clearDiscussionScheduling()
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
    this.state.discussionEndsAt = null
    this.state.phase = 'lobby'
    this.broadcast()
  }

  endGame() {
    this.clearDiscussionScheduling()
    this.clearAllDisconnectGrace()
    this.nextCustomPair = null
    const { stats } = this.state
    this.state = this.defaultState()
    this.state.stats = stats
    void this.persistMeta()
    this.broadcast()
  }

  /**
   * When someone leaves during voting, remove their vote and invalidate votes *for* them.
   */
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
    this.room.broadcast(JSON.stringify(this.state))
  }
}

ImposterRoom satisfies Party.Worker
