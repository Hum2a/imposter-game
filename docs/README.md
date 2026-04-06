# Documentation index

Start here when you need depth beyond the root [README](../README.md).

| Doc | Purpose |
|-----|---------|
| [LAUNCH_PLAN.md](./LAUNCH_PLAN.md) | **Primary runbook** — phases from repo sanity → production Discord Activity, env order, verification. |
| [POST_LAUNCH.md](./POST_LAUNCH.md) | Short post-deploy checklist and follow-ups. |
| [STAGING.md](./STAGING.md) | Staging deploys with `.env.deploy.staging`. |
| [DISCORD_ACTIVITY_URLS.md](./DISCORD_ACTIVITY_URLS.md) | Portal URL mappings, ToS/Privacy, Interactions / Linked Roles checklist. |
| [SECURITY.md](./SECURITY.md) | Threat model notes: `JOIN` verification, JWT mode, rate limits, Supabase URLs. |
| [GAMEPLAY_V2_CHECKLIST.md](./GAMEPLAY_V2_CHECKLIST.md) | Gameplay iteration checklist. |
| [FRIENDS_ROADMAP.md](./FRIENDS_ROADMAP.md) | Friends / social roadmap notes. |
| [USER_FEEDBACK_BACKLOG.md](./USER_FEEDBACK_BACKLOG.md) | User feedback backlog. |

**Supabase:** apply SQL under [`../supabase/migrations/`](../supabase/migrations/) in numeric order (see README “Website auth” section).

**Cursor / AI:** architecture and conventions in [`.cursor/rules/`](../.cursor/rules/).
