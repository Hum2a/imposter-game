import { LegalLayout } from './LegalLayout'

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p className="text-muted-foreground">Last updated: April 6, 2026</p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">1. Who we are</h2>
        <p className="text-muted-foreground">
          This policy describes how the operator of <strong className="text-foreground">Imposter</strong>{' '}
          (the “Game”) handles information when you play in Discord, on the web, or in related
          clients.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">2. Information we process</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            <strong className="text-foreground">Discord.</strong> When you use the Game as a Discord
            Activity, Discord processes data according to Discord’s policies. We may receive a
            limited identifier, display name, and avatar for gameplay and optional token exchange
            through our backend.
          </li>
          <li>
            <strong className="text-foreground">Gameplay & sessions.</strong> To run rounds in real
            time, your client connects to a game server (e.g. Partykit). That may include your
            player id, display name, clues, votes, and related game state for the duration of the
            session.
          </li>
          <li>
            <strong className="text-foreground">Optional online profile.</strong> If you enable
            cloud features, we may use Supabase (or similar) to store an account identifier, display
            name, optional email (if you sign up with email), round history you choose to save, and
            related gameplay metadata you submit.
          </li>
          <li>
            <strong className="text-foreground">Analytics.</strong> If enabled, we may use
            privacy-oriented analytics (e.g. Plausible) with aggregated event names. We avoid
            sending personal identifiers in those events where possible.
          </li>
          <li>
            <strong className="text-foreground">Technical data.</strong> Hosts and CDNs (e.g.
            Cloudflare) may process IP addresses, TLS metadata, and logs for security and delivery.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">3. Purposes & legal bases</h2>
        <p className="text-muted-foreground">
          We process data to provide the Game, maintain security, fix bugs, and understand aggregate
          usage. Where GDPR applies, we rely on contract (providing the service), legitimate
          interests (security and improvement), and consent where required (for example optional
          analytics or marketing cookies if ever added).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">4. Sharing</h2>
        <p className="text-muted-foreground">
          We use service providers (such as Discord, Partykit, Supabase, Cloudflare, and optional
          analytics vendors) to run the Game. They process data on our behalf under their terms. We
          do not sell your personal information as traditionally defined in US “sale” laws for the
          core operation of this template; adjust this sentence if your practices change.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">5. Retention</h2>
        <p className="text-muted-foreground">
          Session data on the game server is transient. Account-related data is kept while your
          account exists or as needed for backups and legal obligations. You may delete cloud data
          by using in-app options where available or by contacting the operator.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">6. Children</h2>
        <p className="text-muted-foreground">
          The Game is not directed at children under 13 (or the minimum age required in your
          region). Do not provide personal information if you are under that age.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">7. Your rights</h2>
        <p className="text-muted-foreground">
          Depending on where you live, you may have rights to access, correct, delete, or export
          certain data, or to object to some processing. Contact the operator to exercise these
          rights. You may also lodge a complaint with a data protection authority.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">8. International transfers</h2>
        <p className="text-muted-foreground">
          Providers may process data in the United States, the EU, and other regions. We use
          providers that offer appropriate safeguards where required.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">9. Changes</h2>
        <p className="text-muted-foreground">
          We may update this policy. The “Last updated” date will change when we do.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">10. Template notice</h2>
        <p className="text-muted-foreground">
          This policy is a starter template. It is not legal advice. Adapt it with a professional
          for your jurisdiction, analytics stack, and data flows.
        </p>
      </section>

      <p className="border-t border-border/60 pt-6 text-muted-foreground">
        See also our{' '}
        <a href="/terms" className="text-primary underline-offset-4 hover:underline">
          Terms of Service
        </a>
        .
      </p>
    </LegalLayout>
  )
}
