import type { DiscordAuthSession } from '../types/discord-auth'
import { getSupabase } from './supabase-client'

const SESSION_ROOM = 'imposter-dev-party-room'
const LOCAL_USER_ID = 'imposter-web-user-id'
const LOCAL_DISPLAY_NAME = 'imposter-web-display-name'

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeWebDisplayName(name: string) {
  const trimmed = name.trim().slice(0, 40)
  try {
    localStorage.setItem(LOCAL_DISPLAY_NAME, trimmed || 'Guest')
  } catch {
    /* */
  }
}

export function readWebDisplayName(): string {
  return readLocal(LOCAL_DISPLAY_NAME)?.trim().slice(0, 40) || 'Guest'
}

export function makeWebAuthSession(
  userId: string,
  displayName: string,
  accessToken: string
): DiscordAuthSession {
  const safeName = displayName.trim().slice(0, 40) || 'Guest'
  const username = safeName.replace(/\s+/g, '_').slice(0, 32) || 'guest'
  return {
    access_token: accessToken,
    user: {
      id: userId,
      username,
      discriminator: '0000',
      public_flags: 0,
      global_name: safeName,
      avatar: null,
    },
    scopes: ['identify', 'guilds.members.read'],
    expires: new Date(Date.now() + 86400000).toISOString(),
    application: {
      id: 'web',
      description: '',
      name: 'Imposter (web)',
    },
  }
}

export async function upsertWebProfileRow(userId: string, displayName: string) {
  const supabase = getSupabase()
  if (!supabase) return
  const name = displayName.trim().slice(0, 40) || 'Guest'
  const { error } = await supabase.from('web_profiles').upsert(
    {
      id: userId,
      display_name: name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) console.warn('[imposter] web_profiles upsert', error.message)
}

export type WebSessionInit = {
  auth: DiscordAuthSession
  partyRoomId: string
}

/**
 * Website / PWA identity: optional Supabase anonymous user, else stable localStorage id.
 */
export async function initWebSession(): Promise<WebSessionInit> {
  let roomId = readSession(SESSION_ROOM)
  if (!roomId) {
    roomId = `browser-${crypto.randomUUID().slice(0, 8)}`
    writeSession(SESSION_ROOM, roomId)
  }

  const displayName = readWebDisplayName()
  const supabase = getSupabase()

  if (supabase) {
    let {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.warn('[imposter] Supabase anonymous sign-in failed, falling back to local id', error)
      } else {
        const again = await supabase.auth.getSession()
        session = again.data.session
      }
    }
    if (session?.user?.id) {
      const token = session.access_token ?? 'web-supabase'
      const auth = makeWebAuthSession(session.user.id, displayName, token)
      await upsertWebProfileRow(session.user.id, displayName)
      return { auth, partyRoomId: roomId }
    }
  }

  let userId = readLocal(LOCAL_USER_ID)
  if (!userId) {
    userId = `local-${crypto.randomUUID()}`
    try {
      localStorage.setItem(LOCAL_USER_ID, userId)
    } catch {
      /* */
    }
  }

  return {
    auth: makeWebAuthSession(userId, displayName, 'browser-dev'),
    partyRoomId: roomId,
  }
}
