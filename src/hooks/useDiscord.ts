import { DiscordSDK } from '@discord/embedded-app-sdk'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isDiscordActivity } from '../lib/discord-context'
import {
  buildDiscordPartyRoomId,
  readDiscordLobbySuffix,
  writeDiscordLobbySuffix,
} from '../lib/party-room'
import {
  createNewWebPartyRoom,
  disableWebCloudProfile,
  enableWebCloudProfile,
  initWebSession,
  makeWebAuthSession,
  readWebDisplayName,
  signInWebWithDiscord,
  setWebPartyRoomFromCode,
  upsertWebProfileRow,
  writeWebDisplayName,
  type WebIdentityMode,
} from '../lib/web-session'
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
  const webModeRef = useRef(false)
  webModeRef.current = webMode

  const refreshWebSession = useCallback(async () => {
    const session = await initWebSession()
    setAuth(session.auth)
    setPartyRoomId(session.partyRoomId)
    setWebIdentityMode(session.webIdentityMode)
  }, [])

  const setWebDisplayName = useCallback((name: string) => {
    if (!webModeRef.current) return
    writeWebDisplayName(name)
    const display = readWebDisplayName()
    setAuth((prev) => {
      if (!prev) return prev
      void upsertWebProfileRow(prev.user.id, display)
      return makeWebAuthSession(prev.user.id, display, prev.access_token)
    })
  }, [])

  const enableWebCloud = useCallback(async () => {
    setWebAuthBusy(true)
    setWebProfileError(null)
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
    try {
      await signInWebWithDiscord()
    } catch (e) {
      setWebAuthBusy(false)
      setWebProfileError(e instanceof Error ? e.message : 'Discord sign-in failed')
    }
  }, [])

  const clearWebProfileError = useCallback(() => setWebProfileError(null), [])

  useEffect(() => {
    if (!embeddedDiscord || !discordBaseRoom) return
    setPartyRoomId(
      buildDiscordPartyRoomId(discordBaseRoom, discordLobbySuffix.trim() || null)
    )
  }, [embeddedDiscord, discordBaseRoom, discordLobbySuffix])

  const joinWebPartyRoom = useCallback((raw: string) => {
    if (!webModeRef.current) return
    const id = setWebPartyRoomFromCode(raw)
    if (!id) {
      setJoinLobbyError('Use a room code with 4–16 letters or digits (A–Z, 2–9).')
      return
    }
    setJoinLobbyError(null)
    setPartyRoomId(id)
  }, [])

  const createNewWebLobby = useCallback(() => {
    if (!webModeRef.current) return
    setJoinLobbyError(null)
    setPartyRoomId(createNewWebPartyRoom())
  }, [])

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
      setError('Missing VITE_DISCORD_CLIENT_ID inside Discord Activity.')
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
    clearWebProfileError,
    setWebDisplayName,
    enableWebCloud,
    disableWebCloud,
    signInDiscordOnWeb,
    refreshWebSession,
    joinWebPartyRoom,
    createNewWebLobby,
    joinLobbyError,
    clearJoinLobbyError,
    discordLobbySuffix,
    setDiscordLobbySuffix,
  }
}
