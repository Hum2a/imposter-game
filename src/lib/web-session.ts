import type { User } from '@supabase/supabase-js'
import type { DiscordAuthSession } from '../types/discord-auth'
import {
  generateLobbyCode,
  normalizeLobbyCode,
  PARTY_ROOM_QUERY,
  partyRoomIdFromNormalizedCode,
  syncWebUrlToLobbyCode,
} from './party-room'
import { webAvatarTokenFromPresetId } from '@/data/avatar-presets'
import {
  readWebAvatarPresetId,
  readWebAvatarSource,
  webAvatarTokenForStoredPreset,
} from './web-avatar'
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

function resolveWebSessionAvatar(override?: string | null): string {
  const t = override?.trim()
  if (t) return t
  return webAvatarTokenForStoredPreset()
}

export function makeWebAuthSession(
  userId: string,
  displayName: string,
  accessToken: string,
  avatarOverride?: string | null
): DiscordAuthSession {
  const safeName = displayName.trim().slice(0, 40) || 'Guest'
  const username = safeName.replace(/\s+/g, '_').slice(0, 32) || 'guest'
  const av = resolveWebSessionAvatar(avatarOverride)
  return {
    access_token: accessToken,
    user: {
      id: userId,
      username,
      discriminator: '0000',
      public_flags: 0,
      global_name: safeName,
      avatar: av,
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
  | 'cloud_email'
  | 'cloud_other'

/**
 * Build `d:snowflake:hash` from Supabase Discord identity (fits server avatar field).
 * Returns null if the user has no custom avatar URL (e.g. default Discord avatar).
 */
export function discordCompactAvatarFromSupabaseUser(user: User): string | null {
  const row = user.identities?.find((i) => i.provider === 'discord')
  if (!row?.identity_data || typeof row.identity_data !== 'object') return null
  const data = row.identity_data as Record<string, unknown>
  const sub = typeof data.sub === 'string' ? data.sub : null
  const avatarUrl =
    typeof data.avatar_url === 'string'
      ? data.avatar_url
      : typeof data.picture === 'string'
        ? data.picture
        : null
  if (!sub || !avatarUrl) return null
  const m = avatarUrl.match(/\/avatars\/(\d+)\/([^/.?]+)\.(?:png|jpg|jpeg|webp|gif)/i)
  if (!m || m[1] !== sub) return null
  const token = `d:${sub}:${m[2]}`
  return token.length <= 64 ? token : null
}

/** Avatar string for `makeWebAuthSession` when using a Supabase-backed web session. */
export function resolveWebAvatarOverrideForSupabaseUser(user: User): string {
  if (readWebAvatarSource() === 'provider') {
    const linked = discordCompactAvatarFromSupabaseUser(user)
    if (linked) return linked
  }
  return webAvatarTokenFromPresetId(readWebAvatarPresetId())
}

export function classifySupabaseUser(user: User | null | undefined): WebIdentityMode {
  if (!user) return 'guest'
  if (user.is_anonymous === true) return 'cloud_anonymous'
  const providers = user.identities?.map((i) => i.provider) ?? []
  if (providers.includes('discord')) return 'cloud_discord'
  if (providers.includes('email')) return 'cloud_email'
  if (providers.length > 0) return 'cloud_other'
  return 'cloud_other'
}

/** True if the user can sign in with an email + password (vs Discord-only OAuth). */
export function userHasEmailPasswordProvider(user: User | null | undefined): boolean {
  return Boolean(user?.identities?.some((i) => i.provider === 'email'))
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

/**
 * Web/PWA: resolve PartyKit room from `?room=CODE`, session, or a new `lobby-*` id.
 * Migrates legacy `browser-*` session ids to a shareable `lobby-*` code once.
 */
export function resolveWebPartyRoomId(): string {
  if (typeof window === 'undefined') {
    return partyRoomIdFromNormalizedCode(generateLobbyCode(6))
  }

  const params = new URLSearchParams(window.location.search)
  const q = params.get(PARTY_ROOM_QUERY)?.trim()
  if (q) {
    const n = normalizeLobbyCode(q)
    if (n) {
      const id = partyRoomIdFromNormalizedCode(n)
      writeSession(SESSION_ROOM, id)
      syncWebUrlToLobbyCode(n)
      return id
    }
  }

  const existing = readSession(SESSION_ROOM)
  if (existing?.startsWith('lobby-')) {
    const n = normalizeLobbyCode(existing.slice(6))
    if (n) {
      const id = partyRoomIdFromNormalizedCode(n)
      writeSession(SESSION_ROOM, id)
      syncWebUrlToLobbyCode(n)
      return id
    }
  }

  if (existing?.startsWith('browser-')) {
    const n = generateLobbyCode(6)
    const id = partyRoomIdFromNormalizedCode(n)
    writeSession(SESSION_ROOM, id)
    syncWebUrlToLobbyCode(n)
    return id
  }

  if (existing) {
    return existing
  }

  const n = generateLobbyCode(6)
  const id = partyRoomIdFromNormalizedCode(n)
  writeSession(SESSION_ROOM, id)
  syncWebUrlToLobbyCode(n)
  return id
}

/** Join a web lobby by pasted code; persists session and updates URL. Returns null if invalid. */
export function setWebPartyRoomFromCode(raw: string): string | null {
  const n = normalizeLobbyCode(raw)
  if (!n) return null
  const id = partyRoomIdFromNormalizedCode(n)
  writeSession(SESSION_ROOM, id)
  syncWebUrlToLobbyCode(n)
  return id
}

/** New random web lobby; persists and updates URL. */
export function createNewWebPartyRoom(): string {
  const n = generateLobbyCode(6)
  const id = partyRoomIdFromNormalizedCode(n)
  writeSession(SESSION_ROOM, id)
  syncWebUrlToLobbyCode(n)
  return id
}

/**
 * Create / switch to a web lobby with a player-chosen code (4–16 chars).
 * Returns null if the code is invalid.
 */
export function tryCreateWebPartyRoomWithCode(raw: string): string | null {
  const n = normalizeLobbyCode(raw)
  if (!n) return null
  const id = partyRoomIdFromNormalizedCode(n)
  writeSession(SESSION_ROOM, id)
  syncWebUrlToLobbyCode(n)
  return id
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
  const roomId = resolveWebPartyRoomId()

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
    // Guest-only: drop anonymous Supabase sessions. Keep non-anonymous sessions (e.g. password
    // recovery or magic link) so the user is not signed out before finishing reset / confirm flows.
    if (existingSession?.user && !existingSession.user.is_anonymous) {
      setCloudOptIn(true)
      optIn = '1'
    } else {
      if (existingSession) {
        await supabase.auth.signOut()
      }
      return buildGuestSession(roomId)
    }
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
  const auth = makeWebAuthSession(
    session.user.id,
    displayName,
    token,
    resolveWebAvatarOverrideForSupabaseUser(session.user)
  )
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

const EMAIL_REDIRECT_PATH = () =>
  `${window.location.origin}${window.location.pathname}`

/**
 * Email/password sign-up. If the project requires email confirmation, there may be no session yet —
 * in that case cloud opt-in is left unchanged so `initWebSession` does not create a competing anonymous user.
 */
export async function signUpWebWithEmail(
  email: string,
  password: string
): Promise<{ needsEmailConfirmation: boolean }> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured')
  const trimmed = email.trim()
  if (!trimmed) throw new Error('Enter your email address')
  const { data, error } = await supabase.auth.signUp({
    email: trimmed,
    password,
    options: { emailRedirectTo: EMAIL_REDIRECT_PATH() },
  })
  if (error) throw error
  if (data.session) {
    setCloudOptIn(true)
    return { needsEmailConfirmation: false }
  }
  return { needsEmailConfirmation: true }
}

export async function signInWebWithEmail(email: string, password: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured')
  const trimmed = email.trim()
  if (!trimmed) throw new Error('Enter your email address')
  setCloudOptIn(true)
  const { error } = await supabase.auth.signInWithPassword({
    email: trimmed,
    password,
  })
  if (error) throw error
}

export async function sendWebPasswordResetEmail(email: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured')
  const trimmed = email.trim()
  if (!trimmed) throw new Error('Enter your email address')
  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: EMAIL_REDIRECT_PATH(),
  })
  if (error) throw error
}

export function stripAuthHashFromBrowserUrl(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.hash) return
  url.hash = ''
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

/**
 * After following the reset link, the client has a recovery session. Set the new password here.
 */
export async function completeWebPasswordRecovery(newPassword: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  setCloudOptIn(true)
  stripAuthHashFromBrowserUrl()
}

export async function cancelWebPasswordRecovery(): Promise<void> {
  const supabase = getSupabase()
  stripAuthHashFromBrowserUrl()
  if (supabase) {
    await supabase.auth.signOut()
  }
}

/**
 * Verifies the current password via a fresh `signInWithPassword`, then sets the new password.
 * Matches dashboards that require the current password for updates.
 */
export async function changeWebAccountPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured')
  const { data: sessionData } = await supabase.auth.getSession()
  const email = sessionData.session?.user?.email?.trim()
  if (!email) throw new Error('NO_ACCOUNT_EMAIL')

  const { error: signErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (signErr) throw new Error('WRONG_CURRENT_PASSWORD')

  const { error: updErr } = await supabase.auth.updateUser({ password: newPassword })
  if (updErr) throw updErr
}

/**
 * Starts an email change; Supabase sends confirmation per your project settings (secure change, etc.).
 */
export async function requestWebEmailAddressChange(newEmail: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured')
  const trimmed = newEmail.trim()
  if (!trimmed || !trimmed.includes('@')) {
    throw new Error('INVALID_EMAIL')
  }
  const { error } = await supabase.auth.updateUser(
    { email: trimmed },
    { emailRedirectTo: EMAIL_REDIRECT_PATH() }
  )
  if (error) throw error
}
