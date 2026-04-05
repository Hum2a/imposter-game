import type { User } from '@supabase/supabase-js'
import type { DiscordAuthSession } from '../types/discord-auth'
import { getSupabase } from './supabase-client'

const SESSION_ROOM = 'imposter-dev-party-room'
const LOCAL_USER_ID = 'imposter-web-user-id'
const LOCAL_DISPLAY_NAME = 'imposter-web-display-name'
/** `'1'` = use Supabase (anonymous or OAuth). `'0'` = guest only. Unset = see init logic (legacy migration). */
const CLOUD_OPT_IN = 'imposter-web-cloud-opt-in'

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

function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* */
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

/** User chose (or migrated to) cloud profile; `'0'` = guest-only mode. */
export function readCloudOptIn(): 'unset' | '0' | '1' {
  const v = readLocal(CLOUD_OPT_IN)
  if (v === null || v === '') return 'unset'
  return v === '0' ? '0' : '1'
}

export function setCloudOptIn(enabled: boolean) {
  writeLocal(CLOUD_OPT_IN, enabled ? '1' : '0')
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

export type WebIdentityMode =
  | 'guest'
  | 'cloud_anonymous'
  | 'cloud_discord'
  | 'cloud_other'

export function classifySupabaseUser(user: User | null | undefined): WebIdentityMode {
  if (!user) return 'guest'
  if (user.is_anonymous === true) return 'cloud_anonymous'
  const providers = user.identities?.map((i) => i.provider) ?? []
  if (providers.includes('discord')) return 'cloud_discord'
  if (providers.length > 0) return 'cloud_other'
  return 'cloud_other'
}

function discordIdentitySub(user: User): string | null {
  const row = user.identities?.find((i) => i.provider === 'discord')
  const data = row?.identity_data
  if (!data || typeof data !== 'object') return null
  const sub = (data as { sub?: unknown }).sub
  return typeof sub === 'string' ? sub : null
}

export async function upsertWebProfileRow(
  userId: string,
  displayName: string,
  options?: { linkedDiscordUserId?: string | null }
) {
  const supabase = getSupabase()
  if (!supabase) return
  const name = displayName.trim().slice(0, 40) || 'Guest'
  const row: Record<string, unknown> = {
    id: userId,
    display_name: name,
    updated_at: new Date().toISOString(),
  }
  if (options?.linkedDiscordUserId) {
    row.linked_discord_user_id = options.linkedDiscordUserId
  }
  const { error } = await supabase.from('web_profiles').upsert(row, { onConflict: 'id' })
  if (error) console.warn('[imposter] web_profiles upsert', error.message)
}

export type WebSessionInit = {
  auth: DiscordAuthSession
  partyRoomId: string
  webIdentityMode: WebIdentityMode
}

async function buildGuestSession(roomId: string): Promise<WebSessionInit> {
  const displayName = readWebDisplayName()
  let userId = readLocal(LOCAL_USER_ID)
  if (!userId) {
    userId = `local-${crypto.randomUUID()}`
    writeLocal(LOCAL_USER_ID, userId)
  }
  return {
    auth: makeWebAuthSession(userId, displayName, 'browser-dev'),
    partyRoomId: roomId,
    webIdentityMode: 'guest',
  }
}

/**
 * Website / PWA: **guest-first** (local id + name). Optional Supabase cloud profile when opted in
 * (anonymous backup or Discord / other OAuth for a stable account).
 */
export async function initWebSession(): Promise<WebSessionInit> {
  let roomId = readSession(SESSION_ROOM)
  if (!roomId) {
    roomId = `browser-${crypto.randomUUID().slice(0, 8)}`
    writeSession(SESSION_ROOM, roomId)
  }

  const displayName = readWebDisplayName()
  const supabase = getSupabase()

  if (!supabase) {
    return buildGuestSession(roomId)
  }

  const {
    data: { session: existingSession },
  } = await supabase.auth.getSession()

  let optIn = readCloudOptIn()

  if (optIn === 'unset' && existingSession?.user) {
    writeLocal(CLOUD_OPT_IN, '1')
    optIn = '1'
  }

  if (optIn === '0') {
    if (existingSession) {
      await supabase.auth.signOut()
    }
    return buildGuestSession(roomId)
  }

  if (optIn === 'unset') {
    return buildGuestSession(roomId)
  }

  let session = existingSession
  if (!session) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      console.warn('[imposter] Supabase anonymous sign-in failed, using guest', error.message)
      return buildGuestSession(roomId)
    }
    const again = await supabase.auth.getSession()
    session = again.data.session
  }

  if (!session?.user?.id) {
    return buildGuestSession(roomId)
  }

  const mode = classifySupabaseUser(session.user)
  const token = session.access_token ?? 'web-supabase'
  const auth = makeWebAuthSession(session.user.id, displayName, token)
  const linkedDiscord = discordIdentitySub(session.user)
  await upsertWebProfileRow(session.user.id, displayName, {
    linkedDiscordUserId: linkedDiscord,
  })
  return { auth, partyRoomId: roomId, webIdentityMode: mode }
}

/** Turn on cloud profile (anonymous). Caller should re-run `initWebSession` and replace auth state. */
export async function enableWebCloudProfile(): Promise<void> {
  setCloudOptIn(true)
  const supabase = getSupabase()
  if (!supabase) return
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw error
  }
}

/** Guest-only: sign out of Supabase and clear opt-in. Caller should re-run `initWebSession`. */
export async function disableWebCloudProfile(): Promise<void> {
  setCloudOptIn(false)
  const supabase = getSupabase()
  if (supabase) {
    await supabase.auth.signOut()
  }
}

/**
 * Persistent account via Supabase Auth (enable **Discord** provider in dashboard; redirect URL must include your site + Supabase callback).
 * After redirect back, `initWebSession` picks up the session (`detectSessionInUrl` on the client).
 */
export async function signInWebWithDiscord(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured')
  setCloudOptIn(true)
  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo },
  })
  if (error) throw error
}
