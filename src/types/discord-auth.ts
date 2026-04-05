import type { DiscordSDK } from '@discord/embedded-app-sdk'

/** Shape returned by Discord Embedded App SDK `authenticate` (and our web guest adapter). */
export type DiscordAuthSession = Awaited<
  ReturnType<DiscordSDK['commands']['authenticate']>
>
