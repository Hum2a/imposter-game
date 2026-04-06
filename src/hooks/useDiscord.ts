import { DiscordSDK } from '@discord/embedded-app-sdk'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isDiscordActivity } from '../lib/discord-context'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase-client'
import {
  buildDiscordPartyRoomId,
  readDiscordLobbySuffix,
  writeDiscordLobbySuffix,
} from '../lib/party-room'
import {
  cancelWebPasswordRecovery,
  changeWebAccountPassword,
  completeWebPasswordRecovery,
  createNewWebPartyRoom,
  tryCreateWebPartyRoomWithCode,
  disableWebCloudProfile,
  enableWebCloudProfile,
  discordCompactAvatarFromSupabaseUser,
  initWebSession,
  makeWebAuthSession,
  readWebDisplayName,
  requestWebEmailAddressChange,
  sendWebPasswordResetEmail,
  signInWebWithEmail,
  signInWebWithDiscord,
  signUpWebWithEmail,
  setWebPartyRoomFromCode,
  upsertWebProfileRow,
  userHasEmailPasswordProvider,
  writeWebDisplayName,
  type WebIdentityMode,
} from '../lib/web-session'
import { writeWebAvatarPresetId, writeWebAvatarSource } from '../lib/web-avatar'
import { webAvatarTokenFromPresetId } from '@/data/avatar-presets'
import type { DiscordAuthSession } from '../types/discord-auth'

type Participant = Awaited<
  ReturnType<DiscordSDK['commands']['getInstanceConnectedParticipants']>
>['participants'][number]

function makeMockAuth(): DiscordAuthSession {
  return {
    access_token: 'mock',
    user: {
      id: 'mock-user',
      username: 'dev',
      discriminator: '0000',
      public_flags: 0,
      global_name: 'Local dev',
    },
    scopes: ['identify', 'guilds.members.read'],
    expires: new Date(Date.now() + 86400000).toISOString(),
    application: {
      id: 'mock',
      description: '',
      name: 'Imposter (dev)',
    },
  }
}

/**
 * Discord Activities run behind a proxy with CSP: use mapped `/api/token` in the iframe.
 * `VITE_DISCORD_TOKEN_URL` is for the normal browser / PWA build (full Worker URL).
 */
function tokenExchangeUrl(): string {
  if (isDiscordActivity()) {
    return '/api/token'
  }
  const configured = import.meta.env.VITE_DISCORD_TOKEN_URL?.trim()
  if (configured) return configured
  return '/api/token'
}

export function useDiscord() {
  const { t } = useTranslation()
  const [auth, setAuth] = useState<DiscordAuthSession | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [discordSdk, setDiscordSdk] = useState<DiscordSDK | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [partyRoomId, setPartyRoomId] = useState<string | null>(null)
  const [discordBaseRoom, setDiscordBaseRoom] = useState<string | null>(null)
  const [discordLobbySuffix, setDiscordLobbySuffixState] = useState(() =>
    typeof window !== 'undefined' ? readDiscordLobbySuffix() : ''
  )
  const [joinLobbyError, setJoinLobbyError] = useState<string | null>(null)
  const [embeddedDiscord] = useState(() => isDiscordActivity())
  const [webMode, setWebMode] = useState(false)
  const [webIdentityMode, setWebIdentityMode] = useState<WebIdentityMode>('guest')
  const [webAuthBusy, setWebAuthBusy] = useState(false)
  const [webProfileError, setWebProfileError] = useState<string | null>(null)
  const [webProfileInfoKey, setWebProfileInfoKey] = useState<string | null>(null)
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false)
  const [webSupabaseEmail, setWebSupabaseEmail] = useState<string | null>(null)
  const [webHasEmailPasswordProvider, setWebHasEmailPasswordProvider] =
    useState(false)
  const webModeRef = useRef(false)
  webModeRef.current = webMode

  const mapAuthErr = useCallback(
    (e: unknown) => {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'WRONG_CURRENT_PASSWORD') return t('profile.wrongCurrentPassword')
      if (msg === 'NO_ACCOUNT_EMAIL') return t('profile.noAccountEmailError')
      if (msg === 'INVALID_EMAIL') return t('profile.emailInvalid')
      return msg || t('profile.genericAuthError')
    },
    [t]
  )

  const syncWebSupabaseAccountMeta = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setWebSupabaseEmail(null)
      setWebHasEmailPasswordProvider(false)
      return
    }
    const supabase = getSupabase()
    if (!supabase) {
      setWebSupabaseEmail(null)
      setWebHasEmailPasswordProvider(false)
      return
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setWebSupabaseEmail(user?.email?.trim() ?? null)
    setWebHasEmailPasswordProvider(userHasEmailPasswordProvider(user))
  }, [])

  const refreshWebSession = useCallback(async () => {
    const session = await initWebSession()
    setAuth(session.auth)
    setPartyRoomId(session.partyRoomId)
    setWebIdentityMode(session.webIdentityMode)
    await syncWebSupabaseAccountMeta()
  }, [syncWebSupabaseAccountMeta])

  const setWebDisplayName = useCallback((name: string) => {
    if (!webModeRef.current) return
    writeWebDisplayName(name)
    const display = readWebDisplayName()
    setAuth((prev) => {
      if (!prev) return prev
      void upsertWebProfileRow(prev.user.id, display)
      return makeWebAuthSession(prev.user.id, display, prev.access_token, prev.user.avatar)
    })
  }, [])

  const setWebAvatarPreset = useCallback((presetId: string) => {
    if (!webModeRef.current) return
    writeWebAvatarSource('preset')
    writeWebAvatarPresetId(presetId)
    const token = webAvatarTokenFromPresetId(presetId)
    setAuth((prev) => {
      if (!prev) return prev
      return makeWebAuthSession(prev.user.id, readWebDisplayName(), prev.access_token, token)
    })
  }, [])

  const setWebDiscordProfileAvatar = useCallback(async () => {
    if (!webModeRef.current) return
    setWebProfileError(null)
    const supabase = getSupabase()
    if (!supabase) {
      setWebProfileError(t('profile.discordAvatarUnavailable'))
      return
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const token = user ? discordCompactAvatarFromSupabaseUser(user) : null
    if (!token) {
      setWebProfileError(t('profile.discordAvatarUnavailable'))
      return
    }
    writeWebAvatarSource('provider')
    setAuth((prev) => {
      if (!prev) return prev
      return makeWebAuthSession(prev.user.id, readWebDisplayName(), prev.access_token, token)
    })
  }, [t])

  const enableWebCloud = useCallback(async () => {
    setWebAuthBusy(true)
    setWebProfileError(null)
    setWebProfileInfoKey(null)
    try {
      await enableWebCloudProfile()
      await refreshWebSession()
    } catch (e) {
      setWebProfileError(e instanceof Error ? e.message : 'Could not enable online profile')
    } finally {
      setWebAuthBusy(false)
    }
  }, [refreshWebSession])

  const disableWebCloud = useCallback(async () => {
    setWebAuthBusy(true)
    setWebProfileError(null)
    setWebProfileInfoKey(null)
    try {
      await disableWebCloudProfile()
      await refreshWebSession()
    } catch (e) {
      setWebProfileError(e instanceof Error ? e.message : 'Could not switch to guest')
    } finally {
      setWebAuthBusy(false)
    }
  }, [refreshWebSession])

  const signInDiscordOnWeb = useCallback(async () => {
    setWebAuthBusy(true)
    setWebProfileError(null)
    setWebProfileInfoKey(null)
    try {
      await signInWebWithDiscord()
    } catch (e) {
      setWebAuthBusy(false)
      setWebProfileError(e instanceof Error ? e.message : 'Discord sign-in failed')
    }
  }, [])

  const clearWebProfileError = useCallback(() => setWebProfileError(null), [])
  const clearWebProfileInfo = useCallback(() => setWebProfileInfoKey(null), [])

  const signUpEmailOnWeb = useCallback(
    async (email: string, password: string) => {
      setWebAuthBusy(true)
      setWebProfileError(null)
      setWebProfileInfoKey(null)
      try {
        const r = await signUpWebWithEmail(email, password)
        if (r.needsEmailConfirmation) {
          setWebProfileInfoKey('profile.emailConfirmSent')
          return
        }
        await refreshWebSession()
      } catch (e) {
        setWebProfileError(
          e instanceof Error ? e.message : 'Could not create account'
        )
      } finally {
        setWebAuthBusy(false)
      }
    },
    [refreshWebSession]
  )

  const signInEmailOnWeb = useCallback(
    async (email: string, password: string) => {
      setWebAuthBusy(true)
      setWebProfileError(null)
      setWebProfileInfoKey(null)
      try {
        await signInWebWithEmail(email, password)
        await refreshWebSession()
      } catch (e) {
        setWebProfileError(
          e instanceof Error ? e.message : 'Could not sign in'
        )
      } finally {
        setWebAuthBusy(false)
      }
    },
    [refreshWebSession]
  )

  const resetEmailPasswordOnWeb = useCallback(async (email: string) => {
    setWebAuthBusy(true)
    setWebProfileError(null)
    setWebProfileInfoKey(null)
    try {
      await sendWebPasswordResetEmail(email)
      setWebProfileInfoKey('profile.passwordResetSent')
    } catch (e) {
      setWebProfileError(
        e instanceof Error ? e.message : 'Could not send reset email'
      )
    } finally {
      setWebAuthBusy(false)
    }
  }, [])

  const completePasswordRecoveryOnWeb = useCallback(
    async (newPassword: string) => {
      setWebAuthBusy(true)
      setWebProfileError(null)
      setWebProfileInfoKey(null)
      try {
        await completeWebPasswordRecovery(newPassword)
        setPasswordRecoveryOpen(false)
        await refreshWebSession()
        setWebProfileInfoKey('profile.passwordChangedOk')
      } catch (e) {
        setWebProfileError(mapAuthErr(e))
      } finally {
        setWebAuthBusy(false)
      }
    },
    [mapAuthErr, refreshWebSession]
  )

  const cancelPasswordRecoveryOnWeb = useCallback(async () => {
    setWebProfileError(null)
    try {
      await cancelWebPasswordRecovery()
      setPasswordRecoveryOpen(false)
      await refreshWebSession()
    } catch (e) {
      setWebProfileError(mapAuthErr(e))
    }
  }, [mapAuthErr, refreshWebSession])

  const changePasswordOnWeb = useCallback(
    async (currentPassword: string, newPassword: string) => {
      setWebAuthBusy(true)
      setWebProfileError(null)
      setWebProfileInfoKey(null)
      try {
        await changeWebAccountPassword(currentPassword, newPassword)
        await refreshWebSession()
        setWebProfileInfoKey('profile.passwordChangedOk')
      } catch (e) {
        setWebProfileError(mapAuthErr(e))
      } finally {
        setWebAuthBusy(false)
      }
    },
    [mapAuthErr, refreshWebSession]
  )

  const requestEmailChangeOnWeb = useCallback(
    async (newEmail: string) => {
      setWebAuthBusy(true)
      setWebProfileError(null)
      setWebProfileInfoKey(null)
      try {
        await requestWebEmailAddressChange(newEmail)
        setWebProfileInfoKey('profile.emailChangePending')
        await syncWebSupabaseAccountMeta()
      } catch (e) {
        setWebProfileError(mapAuthErr(e))
      } finally {
        setWebAuthBusy(false)
      }
    },
    [mapAuthErr, syncWebSupabaseAccountMeta]
  )

  useEffect(() => {
    if (embeddedDiscord || !isSupabaseConfigured()) return
    const supabase = getSupabase()
    if (!supabase) return
    if (
      typeof window !== 'undefined' &&
      /type=recovery/.test(window.location.hash)
    ) {
      setPasswordRecoveryOpen(true)
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryOpen(true)
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [embeddedDiscord, syncWebSupabaseAccountMeta])

  useEffect(() => {
    if (!embeddedDiscord || !discordBaseRoom) return
    setPartyRoomId(
      buildDiscordPartyRoomId(discordBaseRoom, discordLobbySuffix.trim() || null)
    )
  }, [embeddedDiscord, discordBaseRoom, discordLobbySuffix])

  const joinWebPartyRoom = useCallback(
    (raw: string) => {
      if (!webModeRef.current) return
      const id = setWebPartyRoomFromCode(raw)
      if (!id) {
        setJoinLobbyError(t('lobby.joinCodeInvalid'))
        return
      }
      setJoinLobbyError(null)
      setPartyRoomId(id)
    },
    [t]
  )

  const createNewWebLobby = useCallback(
    (customCode?: string) => {
      if (!webModeRef.current) return
      setJoinLobbyError(null)
      if (customCode?.trim()) {
        const id = tryCreateWebPartyRoomWithCode(customCode)
        if (!id) {
          setJoinLobbyError(t('lobby.invalidCustomRoomCode'))
          return
        }
        setPartyRoomId(id)
        return
      }
      setPartyRoomId(createNewWebPartyRoom())
    },
    [t]
  )

  const setDiscordLobbySuffix = useCallback((raw: string) => {
    const trimmed = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    writeDiscordLobbySuffix(trimmed)
    setDiscordLobbySuffixState(trimmed)
  }, [])

  const clearJoinLobbyError = useCallback(() => setJoinLobbyError(null), [])

  useEffect(() => {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID
    const forceMock = import.meta.env.VITE_DISCORD_MOCK === '1'

    if (forceMock) {
      setWebMode(false)
      setAuth(makeMockAuth())
      setPartyRoomId('mock-room')
      setParticipants([])
      return
    }

    if (!embeddedDiscord) {
      let cancelled = false
      setWebMode(false)
      void initWebSession()
        .then((session) => {
          if (cancelled) return
          setAuth(session.auth)
          setPartyRoomId(session.partyRoomId)
          setWebIdentityMode(session.webIdentityMode)
          setParticipants([])
          setWebMode(true)
          void syncWebSupabaseAccountMeta()
        })
        .catch((e) => {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : 'Web session failed')
          }
        })
      return () => {
        cancelled = true
      }
    }

    setWebMode(false)

    if (!clientId) {
      setError(
        'Discord app ID missing from this build. VITE_DISCORD_CLIENT_ID must be set when you run the production build (Cloudflare Pages env vars, or .env.deploy for wrangler deploy).'
      )
      return
    }

    const sdk = new DiscordSDK(clientId)
    setDiscordSdk(sdk)

    let cancelled = false
    const onParticipants = (data: { participants: Participant[] }) => {
      if (!cancelled) setParticipants(data.participants)
    }

    async function setup() {
      try {
        await sdk.ready()

        const roomId =
          sdk.instanceId ||
          (sdk.channelId ? `ch-${sdk.channelId}` : null) ||
          'main'
        if (!cancelled) setDiscordBaseRoom(roomId)

        const { code } = await sdk.commands.authorize({
          client_id: clientId,
          response_type: 'code',
          scope: ['identify', 'guilds.members.read'],
        })

        const tokenUrl = tokenExchangeUrl()
        const res = await fetch(tokenUrl, {
          method: 'POST',
          body: JSON.stringify({ code }),
          headers: { 'Content-Type': 'application/json' },
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(
            (errBody as { error?: string }).error ??
              `Token exchange failed (${res.status}). Set VITE_DISCORD_TOKEN_URL to your Worker URL if not using /api/token.`
          )
        }

        const { access_token } = (await res.json()) as { access_token: string }
        const authResult = await sdk.commands.authenticate({ access_token })
        if (cancelled) return
        setAuth(authResult)

        const { participants: initial } =
          await sdk.commands.getInstanceConnectedParticipants()
        if (!cancelled) setParticipants(initial)

        await sdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', onParticipants)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Discord setup failed')
        }
      }
    }

    void setup()

    return () => {
      cancelled = true
      try {
        void sdk.unsubscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', onParticipants)
      } catch {
        /* not subscribed yet */
      }
    }
  }, [embeddedDiscord])

  /** Set only when the active session uses a preset token (`p:id`); otherwise null (e.g. Discord CDN hash). */
  const webAvatarPresetId =
    auth?.user?.avatar?.startsWith('p:') === true
      ? auth.user.avatar.slice(2)
      : null

  const usesDiscordProfileAvatar = auth?.user?.avatar?.startsWith('d:') === true

  return {
    auth,
    participants,
    discordSdk,
    error,
    partyRoomId,
    isDiscordActivity: embeddedDiscord,
    webMode,
    webIdentityMode,
    webAuthBusy,
    webProfileError,
    webProfileInfoKey,
    clearWebProfileError,
    clearWebProfileInfo,
    setWebDisplayName,
    setWebAvatarPreset,
    setWebDiscordProfileAvatar,
    webAvatarPresetId,
    usesDiscordProfileAvatar,
    enableWebCloud,
    disableWebCloud,
    signInDiscordOnWeb,
    signUpEmailOnWeb,
    signInEmailOnWeb,
    resetEmailPasswordOnWeb,
    passwordRecoveryOpen,
    completePasswordRecoveryOnWeb,
    cancelPasswordRecoveryOnWeb,
    webSupabaseEmail,
    webHasEmailPasswordProvider,
    changePasswordOnWeb,
    requestEmailChangeOnWeb,
    refreshWebSession,
    joinWebPartyRoom,
    createNewWebLobby,
    joinLobbyError,
    clearJoinLobbyError,
    discordLobbySuffix,
    setDiscordLobbySuffix,
  }
}
