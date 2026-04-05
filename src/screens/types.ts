import type { GameState } from '../types/game'

export type AuthShape = {
  user: {
    id: string
    username: string
    global_name?: string | null
    avatar?: string | null
  }
}

export type AuthUserProps = {
  auth: AuthShape
  gameState: GameState
}
