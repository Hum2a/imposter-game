import type * as Party from 'partykit/server'

type Phase = 'lobby' | 'discussion' | 'voting' | 'reveal'

interface Player {
  id: string
  name: string
  avatar: string
  isImposter: boolean
  hasVoted: boolean
  votedFor: string | null
  eliminated: boolean
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
}

const WORD_PAIRS: [string, string][] = [
  ['Pizza', 'Burger'],
  ['Cat', 'Dog'],
  ['Beach', 'Pool'],
  ['Coffee', 'Tea'],
  ['Football', 'Rugby'],
  ['Guitar', 'Piano'],
  ['Shark', 'Dolphin'],
  ['Skiing', 'Snowboarding'],
  ['Lemon', 'Lime'],
  ['Castle', 'Mansion'],
  ['Sword', 'Axe'],
  ['Mars', 'Moon'],
]

const DISCUSSION_SECONDS = 60

export default class ImposterRoom implements Party.Server {
  state: GameState
  /** PartyKit socket id → Discord / app user id */
  private readonly connToUser = new Map<string, string>()

  constructor(readonly room: Party.Room) {
    this.state = this.defaultState()
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
    }
  }

  onConnect(conn: Party.Connection) {
    conn.send(JSON.stringify(this.state))
  }

  onMessage(message: string, sender: Party.Connection) {
    const parsed: unknown = JSON.parse(message)
    const msg = parsed as {
      type: string
      userId?: string
      name?: string
      avatar?: string
      targetId?: string
    }

    switch (msg.type) {
      case 'JOIN':
        if (
          typeof msg.userId === 'string' &&
          msg.userId.length > 0 &&
          typeof msg.name === 'string'
        ) {
          this.handleJoin(
            { userId: msg.userId, name: msg.name, avatar: msg.avatar ?? '' },
            sender
          )
        }
        break
      case 'START_GAME':
        if (this.userForConn(sender) === this.state.hostId) this.startGame()
        break
      case 'CAST_VOTE': {
        const voterId = this.userForConn(sender)
        if (voterId && msg.targetId) this.handleVote(voterId, msg.targetId)
        break
      }
      case 'NEXT_ROUND':
        if (this.userForConn(sender) === this.state.hostId) this.nextRound()
        break
      case 'BACK_TO_LOBBY':
        if (this.userForConn(sender) === this.state.hostId) this.backToLobby()
        break
      case 'END_GAME':
        if (this.userForConn(sender) === this.state.hostId) this.endGame()
        break
    }
  }

  handleJoin(
    msg: { userId: string; name: string; avatar: string },
    sender: Party.Connection
  ) {
    this.connToUser.set(sender.id, msg.userId)

    const isFirst = Object.keys(this.state.players).length === 0
    this.state.players[msg.userId] = {
      id: msg.userId,
      name: msg.name,
      avatar: msg.avatar,
      isImposter: false,
      hasVoted: false,
      votedFor: null,
      eliminated: false,
    }
    if (isFirst) this.state.hostId = msg.userId
    this.broadcast()
  }

  startGame() {
    const ids = Object.keys(this.state.players)
    if (ids.length === 0) return

    const imposterId = ids[Math.floor(Math.random() * ids.length)]!
    const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)]!
    const [word, imposterWord] = pair

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

    setTimeout(() => {
      if (this.state.phase === 'discussion') {
        this.state.phase = 'voting'
        this.broadcast()
      }
    }, DISCUSSION_SECONDS * 1000)
  }

  handleVote(voterId: string, targetId: string) {
    if (this.state.phase !== 'voting') return
    const voter = this.state.players[voterId]
    if (!voter || voter.hasVoted) return

    this.state.votes[voterId] = targetId
    voter.hasVoted = true
    voter.votedFor = targetId

    const allVoted = Object.values(this.state.players).every((p) => p.hasVoted)
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

    const [mostVotedId] = entries[0]!
    const wasImposter = this.state.players[mostVotedId]?.isImposter === true

    this.state.winner = wasImposter ? 'crew' : 'imposter'
    this.state.phase = 'reveal'
    this.broadcast()
  }

  nextRound() {
    this.state.round += 1
    this.startGame()
  }

  backToLobby() {
    for (const p of Object.values(this.state.players)) {
      p.isImposter = false
      p.hasVoted = false
      p.votedFor = null
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
    this.state = this.defaultState()
    this.broadcast()
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
      if (!stillConnected) {
        delete this.state.players[userId]
        if (this.state.hostId === userId) {
          const remaining = Object.keys(this.state.players)
          this.state.hostId = remaining[0] ?? ''
        }
      }
    }

    this.broadcast()
  }

  broadcast() {
    this.room.broadcast(JSON.stringify(this.state))
  }
}

ImposterRoom satisfies Party.Worker
