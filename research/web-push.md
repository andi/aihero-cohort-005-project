# Can Cadence send web push without a native app?

Research for [#3](https://github.com/andi/aihero-cohort-005-project/issues/3) (map: [#1](https://github.com/andi/aihero-cohort-005-project/issues/1)). Researched 2026-11-12.

## Answer

**Yes, Cadence can send browser web push without a native app, using only open standards.** It is not reliable enough to be the only channel for anything that matters. Every current browser supports push, but a user is only reachable after they have:

1. used a browser that supports push in that context (on iPhone/iPad, only a Home Screen web app counts),
2. clicked a Cadence control that asks for permission, and accepted,
3. kept that subscription alive (it expires, gets revoked, or is tied to one device).

Most users will not meet all three. Treat push as an opt-in extra for time-sensitive nudges. The in-app Notification Feed is the system of record. **Email must be the fallback** for anything a user must not miss.

---

## 1. Browser support today

| Platform | Web push? | Since | Conditions |
| --- | --- | --- | --- |
| Chrome (desktop + Android) | Yes | long-standing | `userVisibleOnly: true` required |
| Edge (Chromium) | Yes | long-standing | same as Chrome |
| Firefox (desktop + Android) | Yes | long-standing | Permission prompt needs a user gesture (Fx 72+). Quota on *silent* pushes. |
| Safari, macOS | Yes | Safari 16 / macOS Ventura (2022) | Explicit user gesture required |
| Safari, iOS/iPadOS | **Only in Home Screen web apps** | iOS/iPadOS 16.4 (2023) | User must Add to Home Screen first. Plain Safari tabs get no push. |

- MDN rates the Push API **Baseline "Widely available"**: "It's been available across browsers since March 2023." ([MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API))
- Push needs three standards working together: the Push API, the Notifications API and Service Workers. On macOS, delivery runs through a system daemon (`webpushd`), so notifications arrive even when Safari is closed. ([WebKit: Meet Web Push](https://webkit.org/blog/12945/meet-web-push/))
- iOS/iPadOS 16.4 added web push **for Home Screen web apps**. It is delivered over APNs, push endpoints are on `*.push.apple.com`, and Focus modes apply. The same release added the Badging API (`setAppBadge`/`clearAppBadge`). ([WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/))
- **iOS 26 / iPadOS 26 lowered the install bar.** "By default, every website added to the Home Screen opens as a web app … There are now zero requirements for 'installability' in Safari." Before iOS 26, a site needed a manifest with `display: standalone`/`fullscreen`. The user still has to add the site to the Home Screen themselves, and Safari offers no install prompt that Cadence could trigger. ([WebKit: Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/))
- **Declarative Web Push** (iOS/iPadOS 18.4, macOS Safari 18.5) lets the browser show a notification from a standard JSON payload without running service-worker code. The format is backward compatible: "If it arrives to an older browser, it's handled imperatively by JavaScript as it always had been." This makes delivery on Apple platforms more robust, but it does not remove the Home Screen requirement on iOS. ([WebKit: Meet Declarative Web Push](https://webkit.org/blog/16535/meet-declarative-web-push/))
- **EU note:** in early 2024, Apple planned to remove Home Screen web apps (and so web push) in the EU with iOS 17.4 under the DMA. It reversed that decision before release. ([MacRumors report, 2024-03-01](https://www.macrumors.com/2024/03/01/apple-walks-back-decision-to-disable-eu-web-apps/). Apple's original developer Q&A has since been removed from [developer.apple.com](https://developer.apple.com/support/dma-and-apps-in-the-eu/), so this is a secondary source.) Takeaway: iOS web push depends on Apple policy, so don't build anything critical on it.
- Firefox applies a quota to pushes that *don't* show a notification. "Push messages that generate notifications are exempt from this limit." Chrome has "no limits". ([MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API))
- Safari revokes the subscription if a push doesn't show a notification: "Violations of the `userVisibleOnly` promise will result in a push subscription being revoked." ([WebKit: Meet Web Push](https://webkit.org/blog/12945/meet-web-push/))

## 2. What Cadence would need

Cadence is React Router v8 in framework mode with SSR (`react-router.config.ts`), built by Vite. Nothing in the stack prevents push. These are the parts it would need:

| Piece | What it is | Where it goes in Cadence |
| --- | --- | --- |
| **HTTPS** | Service workers and push only run in secure contexts. `localhost` counts as secure, so local dev works. | Already the case in production. |
| **Service worker** | Required: "For an app to receive push messages, it has to have an active service worker." ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)) It handles `push` (calls `showNotification`) and `notificationclick` (opens or focuses the right Cadence URL). | `public/sw.js`. Vite serves `public/` "at root path `/` during dev, and copied to the root of the dist directory as-is" with no hashing ([Vite: public directory](https://vite.dev/guide/assets#the-public-directory)), so the file is stable at `/sw.js` and its scope covers the whole site. Register it client-side only (a `useEffect` in `app/root.tsx`), never during SSR. The vendor may ship its own SW file instead. |
| **Web app manifest** | Strictly needed only on iOS < 26. Recommended everywhere for the name, icons and `display: standalone`. | `public/manifest.webmanifest`, plus a `{ rel: "manifest" }` entry in the `links` export of `app/root.tsx`. Icons go in `public/`. |
| **VAPID keys** | An ECDSA P-256 key pair. The public key is passed as `applicationServerKey` to `PushManager.subscribe()` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)). The private key signs a JWT on every send ([RFC 8292](https://www.rfc-editor.org/rfc/rfc8292)). | Env vars. Expose the public key to the client (e.g. through a root loader). The private key stays server-side or in the vendor dashboard. |
| **Subscribe flow** | `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`. Chrome and Edge "will reject the Promise if `userVisibleOnly` is not set to `true`" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe)). The resulting `PushSubscription` (endpoint + keys) is posted to the server. | A route action, called from a button click (see §3). Protect it against CSRF. MDN warns about this explicitly. |
| **Subscription store** | One user can have many subscriptions (one per browser or device). | Hand them to the vendor's user/channel record, or store them in a table if Cadence sends directly. |
| **Sending** | Payloads are encrypted ([RFC 8291](https://www.rfc-editor.org/rfc/rfc8291)) and POSTed to the endpoint ([RFC 8030](https://www.rfc-editor.org/rfc/rfc8030)). A **404** means the subscription has expired and must be deleted ([RFC 8030 §6.2](https://www.rfc-editor.org/rfc/rfc8030#section-6.2)). In practice, 410 is also treated as gone. | Usually done by the notification vendor (the map requires one). Without a vendor, the `web-push` npm package covers RFC 8291/8292. |

**Vendor fit:** hosted notification vendors normally accept your VAPID keys (or generate them), take browser subscriptions per user, and do the encryption, sending and cleanup of expired subscriptions. The vendor research ticket should check that the shortlisted vendors support the **standard Web Push protocol (VAPID)** and not only FCM, because Safari endpoints are APNs-backed.

## 3. Permission-prompt UX rules

Hard rules enforced by browsers:

- **Safari (macOS and iOS):** "Requesting a push subscription requires an explicit user gesture." ([WebKit](https://webkit.org/blog/12945/meet-web-push/)) On iOS it must be "in response to direct user interaction — such as tapping on a 'subscribe' button provided by the web app." ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/))
- **Firefox 72+:** a prompt without user interaction is suppressed to "a small icon in the url bar". ([Mozilla Future Releases blog](https://blog.mozilla.org/futurereleases/2019/11/04/restricting-notification-permission-prompts-in-firefox/))
- **Chrome 80+:** a "quieter" UI is used automatically for users who usually block prompts and for **sites with very low accept rates**. Sites leave the quiet UI once their accept rate improves. ([Chromium blog](https://blog.chromium.org/2020/01/introducing-quieter-permission-ui-for.html)) Since Chrome 98, non-essential permission requests appear as a small chip by the padlock that collapses after 12 s, and Google expects "lower grant rates … especially for those that auto-request permissions without priming." ([Chrome for Developers](https://developer.chrome.com/blog/permissions-chip))
- **Denial is effectively permanent.** "If the user blocks the permission request, your web app can't ask for permission again". Only the user can undo it in browser settings. ([web.dev](https://web.dev/articles/push-notifications-permissions-ux))

Best practice ([web.dev](https://web.dev/articles/push-notifications-permissions-ux)):

- Never prompt on page load: "The worst thing you can do is to show the permission dialog to users as soon as they land on your site."
- **Double permission:** show Cadence's own in-page explanation first, and call `Notification.requestPermission()` / `subscribe()` only after the user clicks "Turn on". If the user declines Cadence's own explainer, the browser never records a block, so Cadence can ask again later.
- Ask in context, when the value is obvious. For example: a Student just asked a question on a lesson ("Get notified when the Instructor replies?"), or an Instructor just published a course.
- Always provide an off switch (in `settings`). Without one, users block the site permanently.

Chrome's CrUX reports accept, block, dismiss and ignore rates for notification prompts per origin. Cadence can use it to monitor its own prompt quality. ([Chrome for Developers: notification permission data in CrUX](https://developer.chrome.com/blog/notification-permission-data-in-crux))

## 4. How many users can push reach, and where email must take over

No primary source gives a universal opt-in rate. Rates "vary significantly" by site category and between desktop and mobile. ([Chrome for Developers](https://developer.chrome.com/blog/notification-permission-data-in-crux)) Google's own example of a high-trust, well-primed site (Google News) shows an 82% accept rate. Sites that prompt on page load land at the other end and get moved into Chrome's quiet UI. ([Chromium blog](https://blog.chromium.org/2020/01/introducing-quieter-permission-ui-for.html)) From the platform rules, the funnel for Cadence looks like this:

| Segment | Reachable by push? |
| --- | --- |
| Desktop Chrome/Edge/Firefox/Safari, opted in | Yes, while the browser profile and subscription live (on most desktop OSes the browser has to be running; on macOS Safari it doesn't) |
| Android Chrome/Firefox, opted in | Yes |
| iPhone/iPad user in a Safari tab, or Chrome/Firefox on iOS without Home Screen install | **No** |
| iPhone/iPad user who added Cadence to the Home Screen and opted in | Yes (iOS 16.4+) |
| Anyone who declined, ignored, or never saw a prompt | No |
| Anyone whose subscription expired or was revoked (cleared data, new device, 404/410) | No, until they re-subscribe |
| Notification delivered but suppressed by OS Focus/Do Not Disturb | Delivered but not seen |

Expect only a **minority of active users** to be push-reachable at any time. Cadence's users will mostly not bother to install on iOS, and push is per device, so a user can be reachable on their laptop and not on their phone. There is also no delivery receipt from the push service to the user's eyes.

**Where email must be the fallback (or the primary channel):**

- Anything with money, access or deadlines: refund outcomes (already sent via Postmark), enrollment and purchase confirmations, team licence or seat changes for Team Admins, and anything a Platform Admin must act on.
- Any notification for a user with no live push subscription.
- Digests and summaries, which suit email better anyway.

**Where push fits:** opt-in, low-stakes, time-sensitive nudges that also appear in the in-app Notification Feed. Examples: "your question got a reply", "new lesson published in a course you're enrolled in". If the push never arrives, the feed still has the item.

## Bottom line

- Web push is **technically feasible with no native app** on every major browser. On iOS/iPadOS it works only after the user adds Cadence to the Home Screen.
- Cadence needs a `public/sw.js` service worker, a manifest, a VAPID key pair, a click-triggered subscribe flow, and a vendor that speaks standard Web Push (VAPID).
- Push **is not reliable enough to be a primary channel**: it is opt-in, per device, user-gesture-gated, throttled by browsers when misused, and absent for most iOS users. Model it as an optional extra layered on the Notification Feed, with **email as the guaranteed fallback** for anything critical.
