import { LegalLayout } from './LegalLayout'

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p className="text-muted-foreground">Last updated: April 6, 2026</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">1. Agreement</h2>
        <p className="text-muted-foreground">
          By accessing or playing <strong className="text-foreground">Imposter</strong> (the “Game”)
          — including as a Discord Activity, in a web browser, or a similar client — you agree to
          these Terms. If you do not agree, do not use the Game.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">2. Description of the service</h2>
        <p className="text-muted-foreground">
          The Game is a social word-party experience. It may connect to third-party services,
          including <strong className="text-foreground">Discord</strong> (for Activities and
          optional sign-in), <strong className="text-foreground">Partykit</strong> or compatible
          hosts for real-time play, <strong className="text-foreground">Cloudflare</strong> for
          hosting and edge functions, and optionally <strong className="text-foreground">Supabase</strong>{' '}
          for online profiles, saved data, and authentication. Your use of those services is also
          subject to their respective terms and policies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">3. Eligibility & conduct</h2>
        <p className="text-muted-foreground">
          You must comply with Discord’s Community Guidelines and Terms of Service when using the
          Game inside Discord. Do not use the Game to harass others, share illegal content, or
          attempt to disrupt or reverse-engineer the service beyond what is permitted by applicable
          law. The operator may restrict access if these rules are violated.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">4. Accounts & identity</h2>
        <p className="text-muted-foreground">
          Optional features may let you create or link an account (for example via email or Discord).
          You are responsible for activity under your account. Display names and in-game behaviour
          should not impersonate others or mislead players.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">5. Intellectual property</h2>
        <p className="text-muted-foreground">
          The Game, its branding, and its code are owned by the operator unless otherwise noted.
          You receive a limited, revocable licence to use the Game for personal, non-commercial
          entertainment unless the operator agrees otherwise in writing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">6. Disclaimer of warranties</h2>
        <p className="text-muted-foreground">
          The Game is provided <strong className="text-foreground">“as is”</strong>. The operator
          does not guarantee uninterrupted or error-free operation. To the maximum extent permitted
          by law, the operator disclaims implied warranties such as merchantability or fitness for a
          particular purpose.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">7. Limitation of liability</h2>
        <p className="text-muted-foreground">
          To the maximum extent permitted by law, the operator is not liable for indirect,
          incidental, special, consequential, or punitive damages, or for loss of data or profits,
          arising from your use of the Game. Total liability for any claim related to the Game is
          limited to the greater of (a) amounts you paid the operator specifically for the Game in
          the twelve months before the claim, or (b) zero if the Game is offered free of charge.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">8. Changes</h2>
        <p className="text-muted-foreground">
          These Terms may be updated. The “Last updated” date at the top will change when they are
          revised. Continued use after changes constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">9. Template notice</h2>
        <p className="text-muted-foreground">
          This document is a practical template for indie projects. It is not legal advice. You
          should have a qualified professional review it for your country, audience, and business
          structure.
        </p>
      </section>

      <p className="border-t border-border/60 pt-6 text-muted-foreground">
        See also our{' '}
        <a href="/privacy" className="text-primary underline-offset-4 hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </LegalLayout>
  )
}
