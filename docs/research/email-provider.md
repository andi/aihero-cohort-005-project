# Which email provider should Knock send Cadence's emails through?

Research for [#35](https://github.com/andi/aihero-cohort-005-project/issues/35), child of the map [#25](https://github.com/andi/aihero-cohort-005-project/issues/25). Sources are official Knock and provider docs and pricing pages, read on 2026-11-12. Prices change, so re-check them before signing up.

## Recommendation: Postmark in production, Knock's built-in test provider in development

- **Production: Postmark.** Cadence already sends transactional email through Postmark. `app/lib/mailer.server.ts` posts to `api.postmarkapp.com` with `POSTMARK_SERVER_TOKEN`, from `Cadence <hello@cadence.dev>`, on the `outbound` stream. Knock supports Postmark natively [K3]. Pointing Knock at the same Postmark server needs **no new sign-up**, and the sender domain and account approval Cadence already has carry over. Postmark is built for transactional email and keeps it on its own message stream, apart from broadcasts [K3][P3].
- **Development: the "Knock (testing only)" provider.** It is enabled by default in every environment of every new Knock account and needs no configuration [K2]. Development therefore needs **no email-provider sign-up and no verified domain**. Its limits:
  - 100 emails a month;
  - it delivers only to the email addresses of members of the Knock account.
- **Development alternative: sandbox mode.** Knock can render emails without sending them [K4], which suits seed users with fake `@example.com` addresses.

**Runner-up: Resend.** It has the most generous free tier (3,000 a month), and its `onboarding@resend.dev` sender works without a domain. It would still be a new account, and its test domain only delivers to the account owner's own address [R2]. Choose it only if the Postmark account were not available.

## Comparison

| | Postmark | Resend | SendGrid | Amazon SES | Knock test provider |
|---|---|---|---|---|---|
| Native in Knock | Yes, with delivery/bounce webhooks [K3] | Yes, with delivery/bounce webhooks [K5] | Yes [K1] | Yes [K1] | Built in, testing only [K2] |
| Free tier | Developer plan: 100 emails/mo, never expires [P1] | 3,000/mo, 100/day, 3 domains [R1] | 60-day trial, 100/day, then paid [S1] | Only via AWS credits for new customers (up to $200, 6 months) [A2] | 100 emails/mo [K2] |
| First paid tier | Basic $15/mo for 10K [P1] | Pro $20/mo for 50K [R1] | Essentials $19.95/mo [S1] | $0.10 per 1K [A2] | n/a, not for production [K2] |
| Sending without a verified domain | Until approval, only to addresses on domains you own and have verified. A manual review takes under 24h on weekdays [P2] | `onboarding@resend.dev`, but it delivers only to your own account address [R2] | Requires sender verification (not checked in detail) | Sandbox: only to verified addresses, 200/day, 1/sec. Production access review takes up to 96h [A1] | Yes. Fixed, read-only from address. Delivers only to Knock account members [K2] |
| Test sink | `test@blackhole.postmarkapp.com` [P2] | `delivered@` / `bounced@` / `complained@resend.dev`, which count against quota [R3] | n/a | Mailbox simulator [A1] | n/a |
| New sign-up for Cadence | **None. Cadence already has an account** | New account | New account | New AWS setup | None, comes with Knock |

## Notes

### Knock

- Knock supports 13 email providers natively: Knock (testing only), Amazon SES, Cloudflare Email, MailerSend, Mailgun, Mailjet, Mailtrap, Mandrill, Postmark, Resend, SendGrid, SMTP and SparkPost [K1].
- **Per-environment configuration.** Channel settings are configured per Knock environment, so Development can use the Knock test provider (or sandbox mode) while Production uses Postmark [K6]. Note: the Knock test provider docs say that to move to production you "configure a different provider and update workflow steps accordingly" [K2]. The email *channel* used by the workflow steps differs, so expect a one-time switch of the steps' channel when going live. An alternative is a single Postmark channel whose Development environment config has sandbox mode on.
- **Knock test provider:** "This provider is for testing only: it sends up to 100 emails per month, and only to the members of your Knock account." Sending to anyone else fails with `knock_recipient_not_allowed`. Once the monthly limit is reached, emails are marked `undelivered` until the next month [K2].
- **Sandbox mode** "will never send the request to your downstream provider, blocking all delivery". It can be set per channel environment, and it bypasses channel conditions [K4][K6].

### Postmark

- Knock needs a Postmark server API token, a from address (Liquid allowed) and, optionally, the incoming webhook for delivery status. Knock sends to the `outbound` transactional stream by default [K3]. That is the same stream `mailer.server.ts` uses today.
- New accounts can only send to domains they own until a manual approval; link tracking also waits for approval [P2]. If the existing Cadence account is approved, neither limitation applies.
- The free Developer plan (100 a month) is too small for production but never expires [P1].

### Resend

- The free plan has a 100 emails/day cap, which a cohort-wide Notification (for example, a new Discussion Question to all enrollees) could hit [R1].
- "You can only send testing emails to your own email address" from `resend.dev` [R2].

### SendGrid and Amazon SES

- SendGrid has no lasting free tier. After the 60-day trial a paid plan is required [S1].
- SES starts in a per-region sandbox: verified recipients only, 200 messages/24h, 1/sec. Leaving it needs a production-access request that AWS answers within 96 hours. Even in production, every From identity must be verified [A1].

## Facts later tickets depend on

- **Dev needs no new sign-up beyond Knock itself.** Use the Knock test provider (it reaches only Knock account members) or sandbox mode.
- **Production sender:** Knock's Postmark channel should send from the domain already verified in Postmark, i.e. `hello@cadence.dev`, unless a different address is added and verified there.
- **The Postmark server token is reused.** It is the existing `POSTMARK_SERVER_TOKEN` value, entered into Knock's Postmark channel config for the Production environment. Turn on the incoming webhook so Knock records bounces.

## Sources

- [K1] Knock, Email overview: https://docs.knock.app/integrations/email/overview
- [K2] Knock, Knock test email provider: https://docs.knock.app/integrations/email/knock-test
- [K3] Knock, Postmark: https://docs.knock.app/integrations/email/postmark
- [K4] Knock, integrations overview (sandbox mode): https://docs.knock.app/integrations/overview
- [K5] Knock, Resend: https://docs.knock.app/integrations/email/resend
- [K6] Knock, integrations overview (per-environment config, channel conditions): https://docs.knock.app/integrations/overview
- [P1] Postmark, pricing: https://postmarkapp.com/pricing
- [P2] Postmark, How does the account approval process work: https://postmarkapp.com/support/article/1084-how-does-the-account-approval-process-work
- [P3] Postmark message streams, via Knock's Postmark page [K3]
- [R1] Resend, pricing: https://resend.com/pricing
- [R2] Resend, 403 error with the resend.dev domain: https://resend.com/docs/knowledge-base/403-error-resend-dev-domain
- [R3] Resend, Send test emails: https://resend.com/docs/dashboard/emails/send-test-emails
- [S1] Twilio SendGrid, Email API pricing and 60-day trial: https://www.twilio.com/en-us/products/email-api/pricing, https://support.sendgrid.com/hc/en-us/articles/35270136965403-Overview-of-60-Day-Free-Trial-Plans-for-New-SendGrid-Accounts
- [A1] AWS, Request production access (SES sandbox): https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
- [A2] AWS, SES pricing: https://aws.amazon.com/ses/pricing/
