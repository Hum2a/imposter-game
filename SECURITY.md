# Security

## Reporting a vulnerability

If you believe you’ve found a **security vulnerability** in this project (auth bypass, secret exposure, unsafe server behavior, etc.):

1. **Do not** open a public GitHub issue with exploit details.
2. Contact the **repository maintainers privately** (GitHub Security Advisories for this repo, or email if the maintainer has published one).
3. Include enough detail to reproduce: affected component (Worker, PartyKit room, client), version/commit, and impact.

We’ll aim to acknowledge within a few business days; severity and fix timeline depend on context.

## Hardening reference

Operational mitigations (`JOIN_VERIFY`, party JWT, rate limits, Supabase URL configuration) are documented in **[`docs/SECURITY.md`](./docs/SECURITY.md)**. Read that file before changing auth or realtime join flows.

## Out of scope

- Social engineering of players in Discord voice channels.
- Issues in Discord / Cloudflare / PartyKit / Supabase platforms themselves (report to those vendors).
