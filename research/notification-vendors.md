# Which notification vendors fit Cadence?

Research for [#2](https://github.com/andi/aihero-cohort-005-project/issues/2) (map: [#1](https://github.com/andi/aihero-cohort-005-project/issues/1)). Sources checked 2026-11-12 against vendor docs and pricing pages. Pricing and plan gating change often, so re-check them before committing.

Constraints from the map: a free or startup tier is required. EU data residency is preferred but not required. Push means **browser web push** only. If email goes through the vendor, Postmark stays the email provider underneath. The app is a React Router (React 19) app.

## Comparison

| Dimension | Knock | Novu Cloud | Courier | MagicBell | SuprSend |
| --- | --- | --- | --- | --- | --- |
| **In-app feed** | Hosted feeds. `@knocklabs/react` has prebuilt `NotificationFeedPopover` / `NotificationIconButton` plus headless hooks. States: read/unread/seen/archived. WebSocket real-time. [1] | `@novu/react` has a prebuilt `<Inbox />` plus headless hooks (`useNotifications`). States: read/unread/archive/snooze. WebSocket real-time. Preferences UI is built in. Needs React >= 18 (19 supported). [8] | Courier Inbox, React v8 SDK. `<CourierInbox />` comes as a full panel or a popup menu with an unread badge. Has `useCourier`. Archive/unarchive. Real-time through `listenForUpdates()`. [15][16] | Hosted inbox. React `FloatingInbox`, `Inbox`, `ContextProvider`. States: read/unread/seen/archived. Real-time. [22] | Inbox with drop-in `@suprsend/react` or headless `@suprsend/react-core`. States: read/unread/seen/archive. Real-time. [29][30] |
| **Web push** | No first-party web push channel. Browser push goes through FCM (web SDK token stored as FCM channel data) or OneSignal. [2] | No native VAPID provider. Web push goes through FCM, OneSignal, Pusher Beams or Pushpad. "Push Webhook" passes the payload through to your own endpoint. [9] | Through FCM (web) or OneSignal. No native VAPID. [17] | **Native VAPID web push**, no FCM needed. Ships a `WebPushButton` and a service-worker script. [23] | **Native VAPID web push**. SuprSend generates the keys, and `registerPush()` handles the service worker. [31] |
| **Email via Postmark** | Yes. Server API key, `outbound` stream by default, overrides allowed (e.g. `MessageStream`). [3] | Yes. Postmark Server API token plus a verified From address. [10] | Yes. Server API token plus From address. Overrides for `MessageStream`, attachments and Postmark templates. [18] | **Unclear.** The docs channel list shows SES, Mailgun, Ping Email, SMTP and SendGrid, with no Postmark [24]. Only the marketing page claims Postmark [25]. SMTP would be the fallback. | Yes. Postmark Server Token. Add SuprSend's webhook in Postmark to get delivery/open tracking. [32] |
| **Client feed auth** | Public key plus a **RS256 JWT user token** signed by your backend (`signUserToken`). Only enforced once "enhanced security mode" is on. Off by default. [4] | Public app ID plus **HMAC-SHA256(secretKey, subscriberId)** passed as `subscriberHash`. [11] | **JWT** minted by your backend with the Courier API key, passed to `signIn({ userId, jwt })`. Client keys no longer authenticate in v8. [15] | **User JWT** generated on your server. [22][23] | **ES256 JWT** user token signed with a signing key. Legacy HMAC is kept only for mobile SDKs. [33] |
| **User identification** | Both work. Upsert ahead of time with identify, or inline in the workflow trigger, which Knock identifies before running the workflow. [5] | Both work. Inline `to` object on trigger creates **and updates** the subscriber. Upfront create API also available. [12] | Mostly upfront. Profiles are a stored record. **"A send looks up an existing profile, it doesn't persist one from the to object"**, so inline data only applies to that one message. [19] | Both work. Inline `recipients` (email / external_id) upserts. Upfront API also available. [26] | Both work. Inline on the `recipients` object of a workflow trigger, with upsert. Upfront user API also available. [34] |
| **Preferences** | Per-workflow, per-category and per-channel-type `PreferenceSet`. Hosted preference page or a custom one via API/hooks. **On Free.** [6][7] | Per-workflow and per-channel. Built into `<Inbox />`. **On Free.** [8][13] | User Preferences with a hosted preferences page and editor. Listed on the Developer (free) plan. [14][20] | Per-channel and per-category (topic) preferences. [26] | **Business plan only ($250/mo). Not on Free or Essentials.** [28] |
| **Batching / digest** | Batch step with fixed, dynamic or sliding window and a batch key, e.g. per lesson. **On Free.** [6][36] | Digest step: regular or scheduled (cron-like), with an optional grouping key. Both plans list all workflow steps. [13][37] | Digests are built from two automations (collect + release), with schedules set in the Preferences Editor. Docs show no plan restriction. Heavier to set up than a batch step. [21] | No first-party batching/digest step found in the docs. Only blog-level design content. | **Business plan only.** [28] |
| **Local dev & testing** | **Strongest.** Unlimited environments on Free. `settings.sandbox_mode` on trigger renders messages without delivering. Skip-delays option. Workflow test runner. CLI for workflows-as-code. Built-in test email channel. [6][38][39] | 2 environments (Dev and Prod) on Free. `npx novu dev` local studio tunnels to code-first workflows (Novu Framework). [13][40] | Test and Production environments by default (up to 20). Each API key is tied to one environment. No documented sandbox/no-deliver flag found. [41] | Free plan is limited to **1 project**, so no separate dev and prod. Browser test toolkit only. [27] | Sandbox, Staging and Production workspaces. **Test Mode** in Staging delivers only to designated internal testers. [42] |
| **Free tier** | **10,000 messages/mo**, counted per user per channel. No hard cap. Knock branding on feed. 30-day log retention. No credit card. Next tier: Starter **$250/mo** (50k). [6] | **10,000 workflow runs/mo**, all channels. 24h activity-feed retention. Novu branding (can't remove on Free). Up to 3 team members. Next tier: Pro **from $30/mo** (30k runs). [13] | **10,000 sends/mo**, where one template to one recipient across all channels counts as one send. Next tier: Business **$0.005/send** (50k = $250). [20] | **1,000 deliveries/mo**, 1 project. Next tier: Startup **$249/mo** (50k). [27] | **10,000 notifications/mo**. Inbox carries SuprSend branding. No batching/digest/preferences. Next tiers: Essentials **$100/mo**, Business **$250/mo**. [28] |
| **EU data residency** | **Not yet.** Data is processed and stored in the US under SCCs/DPF. Knock says: "We expect to support EU data residency by the end of 2026." [7][43] | **Yes, on all plans including Free.** Frankfurt, picked when the account is created (`eu.api.novu.co`, `eu.dashboard.novu.co`). [14] | Yes (Ireland), but **paid plans only** (Business/Enterprise). [44] | Not documented on the security page. [45] | Docs say "We support EU-data residency options". Plan availability isn't stated. Marketing pages list US/EU/APAC. [35] |

### Other candidates considered

- **Engagespot**: has a free plan, an in-app feed UI kit and its own default web push provider [46][47]. Its pricing page returned 404 during this research, so free-tier limits and EU residency could not be verified. It is not shortlisted. Worth a look only if both shortlisted vendors fail.
- **OneSignal**: a push/messaging product with no hosted notification-feed inbox. It fits best as a *push provider underneath* Knock, Novu or Courier, not as the vendor itself. Not evaluated further.

## Shortlist

### 1. Novu Cloud (recommended to lead the evaluation)

- **Only vendor that meets every constraint on the free tier**, including EU residency: Frankfurt is available on all plans [14].
- Free tier includes the inbox, preferences and digest [13]. The prebuilt `<Inbox />` supports React 19 and bundles the preferences UI, which fits the "shallow preferences" scope [8].
- Inline subscriber upsert on trigger [12] keeps the sync step trivial. HMAC `subscriberHash` is simple to compute in a React Router loader [11]. Postmark is supported [10].
- **Costs to accept:**
  - Web push needs a relay such as FCM, OneSignal or Pushpad, because there is no native VAPID [9].
  - Novu branding stays on Free.
  - Activity-feed retention is only 24 hours, which makes debugging harder.
  - Only 2 environments.
  - The local story is a tunnel to Novu Cloud, not an offline stub, so Cadence still needs its own `.outbox/`-style fake for tests.

### 2. Knock (strongest developer experience; pick it if EU residency is waived or Knock ships EU in time)

- Best testing story: unlimited environments on Free, `sandbox_mode` per trigger, skip-delays, a test runner and a CLI [6][38][39]. This fits the map's "Dev & test transport" question well.
- Batching with a batch key, and per-workflow/category/channel preferences, are both on Free [6][36][7]. The `NotificationFeedPopover` and the headless hooks are mature [1]. Inline identify works on trigger [5]. Postmark is supported [3].
- **Costs to accept:**
  - Data is in the US today, with EU only "expected by end of 2026" [7][43].
  - Web push goes through FCM [2].
  - The next tier jumps to $250/mo.
  - Messages are counted per channel, so feed + push + email for one event uses 3 of the 10k.

### Not shortlisted

- **Courier**:
  - EU residency only on paid plans [44].
  - Sends don't persist inline profiles, so Cadence would have to sync users upfront [19].
  - Digests need a two-automation setup [21].
  - Its strengths are generous send counting and Postmark overrides, but neither tips the balance.
- **MagicBell**:
  - The free tier is only 1,000 deliveries and 1 project [27].
  - Postmark is missing from the documented provider list [24].
  - No first-party batching/digest found.
  - No EU residency documented [45].
  - Native VAPID web push [23] is its main selling point.
- **SuprSend**:
  - Batching/digest and preferences are gated behind the $250/mo Business plan [28], which rules it out on the free-tier constraint even though it has native VAPID web push and a good Test Mode [31][42].

## Sources

1. Knock React SDK overview: https://docs.knock.app/in-app-ui/react/overview
2. Knock web push via FCM: https://docs.knock.app/tutorials/sending-web-push-notifications-with-fcm, push overview: https://docs.knock.app/integrations/push/overview
3. Knock Postmark integration: https://docs.knock.app/integrations/email/postmark
4. Knock security & authentication: https://docs.knock.app/in-app-ui/security-and-authentication
5. Knock identifying recipients: https://docs.knock.app/managing-recipients/identifying-recipients
6. Knock pricing: https://knock.app/pricing
7. Knock plans and usage (EU residency statement): https://docs.knock.app/manage-your-account/knock-plans, preferences overview: https://docs.knock.app/preferences/overview
8. Novu Inbox: https://docs.novu.co/platform/inbox
9. Novu push integrations: https://docs.novu.co/platform/integrations/push
10. Novu Postmark integration: https://docs.novu.co/platform/integrations/email/postmark
11. Novu Inbox prepare for production (HMAC, branding): https://docs.novu.co/platform/inbox/prepare-for-production
12. Novu subscribers: https://docs.novu.co/platform/concepts/subscribers
13. Novu pricing: https://novu.co/pricing
14. Novu security and compliance (regions): https://docs.novu.co/platform/additional-resources/security
15. Courier React v8 migration guide (JWT): https://www.courier.com/docs/sdk-libraries/courier-react-v8-migration-guide
16. Courier add an inbox: https://www.courier.com/docs/in-app/add-an-inbox
17. Courier push providers: https://www.courier.com/docs/integrations/push/overview
18. Courier Postmark integration: https://www.courier.com/docs/integrations/email/postmark
19. Courier users and profiles: https://www.courier.com/docs/recipients/overview
20. Courier pricing: https://www.courier.com/pricing
21. Courier automation digests: https://www.courier.com/docs/platform/automations/digest
22. MagicBell in-app channel: https://www.magicbell.com/docs/channels/in_app
23. MagicBell web push channel: https://www.magicbell.com/docs/channels/web_push
24. MagicBell channels (provider list): https://www.magicbell.com/docs/channels
25. MagicBell email marketing page: https://www.magicbell.com/email
26. MagicBell user primitive: https://www.magicbell.com/docs/primitive/user
27. MagicBell pricing: https://www.magicbell.com/pricing, test toolkit: https://www.magicbell.com/test
28. SuprSend pricing: https://www.suprsend.com/pricing
29. SuprSend inbox overview: https://docs.suprsend.com/docs/inbox-overview
30. SuprSend React inbox: https://docs.suprsend.com/docs/react-inbox-integration
31. SuprSend web push: https://docs.suprsend.com/docs/js-webpush
32. SuprSend Postmark: https://docs.suprsend.com/docs/postmark
33. SuprSend HMAC / JWT authentication: https://docs.suprsend.com/docs/hmac-authentication
34. SuprSend users / invoke workflow: https://docs.suprsend.com/docs/users, https://docs.suprsend.com/docs/invoke-workflow
35. SuprSend security: https://docs.suprsend.com/docs/security, enterprise page: https://www.suprsend.com/enterprise
36. Knock batch function: https://docs.knock.app/designing-workflows/batch-function
37. Novu digest: https://docs.novu.co/platform/workflow/digest
38. Knock testing workflows: https://docs.knock.app/send-notifications/testing-workflows
39. Knock environments: https://docs.knock.app/version-control/environments, Knock CLI: https://docs.knock.app/developer-tools/knock-cli, test email channel: https://docs.knock.app/integrations/email/knock-test
40. Novu local studio: https://docs.novu.co/framework/studio
41. Courier workspaces and environments: https://www.courier.com/docs/workspaces/overview
42. SuprSend test mode: https://docs.suprsend.com/docs/developer/test-mode
43. Knock privacy policy (US storage, SCCs): https://knock.app/legal/privacy-policy
44. Courier datacenters: https://www.courier.com/docs/workspaces/datacenters
45. MagicBell security: https://www.magicbell.com/security
46. Engagespot notification UI kit: https://engagespot.co/notification-uikit
47. Engagespot default web push provider: https://docs.engagespot.co/docs/features/channels/web-push/default-web-push-provider/

Unverified or weakly sourced: MagicBell Postmark support (the marketing page and the docs disagree), SuprSend EU residency plan gating, and Engagespot pricing (404).
