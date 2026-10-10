# Racha subscription release

## Implemented

- Compact home with logged nutrition, water, next step and companion.
- Profile rows; separate nutrition/weight forms; fixed avatar line height.
- Camera controls are siblings of CameraView, camera deactivates when unfocused, capture errors handled.
- Text meal descriptions use the real server analysis, then the same correction/confirmation flow as photos.
- Daily guidance uses only today's logged meals. It does not infer a complete diet from missing records.
- Preferences on device: vegetarian, dairy-free, lower-cost options. Ideas use a small curated catalog; this is not a clinical plan or a generative chat.
- Weekly report compares seven completed local days with the preceding seven; free consistency view, Plus comparison and next action.
- Month charts fetch 30 days instead of seven; local day grouping.
- Logging streaks require one meal; weekly challenges preserve completed days after a break. Shared logging challenge counts both users on the same day. Late-week goals adapt to remaining days.
- Support push requires an accepted connection, enabled social notifications, a registered push token, and at most one attempt per sender per 24h.
- Opt-in local reminders at 19:30 daily and Sunday 20:00, phone timezone. Sign-out removes them. Notification taps navigate to the relevant screen.
- Store purchase and restore via RevenueCat, with SDK identity bound to Supabase user UUID. Expo Go cannot purchase and never grants fake entitlement.
- Server reconciles current RevenueCat subscriber state on authenticated sync and webhook, including transfer senders/recipients. Cancellation does not revoke access before expiry.
- Three lifetime trial analyses; Plus/Duo 90 analyses per person per UTC calendar month. Atomic server quota, including text; accepted attempts consume quota even if provider fails. Manual entry and historical data remain available.
- Dúo grants the currently accepted companion their own quota. Expiry/disconnection removes shared entitlement dynamically.
- Meal + items create/edit is one PostgreSQL transaction. Failed item inserts roll back the whole operation.

## Required activation (not completed by committing code)

1. Configure monthly products in App Store Connect and Google Play Console for this app's existing identifiers (`com.juanmamartinez.gymbro`, `com.gymbro.app`). Proposed launch prices: Plus USD 4.99/month, Duo USD 7.99/month; store pricing/localization controls the actual displayed price.
2. RevenueCat: connect store credentials; create entitlements `racha_plus` and `racha_duo`; attach corresponding products to the default offering. Set app user transfer policy intentionally; use Supabase UUID identities.
3. Add public SDK keys `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` to build environment. Never use a secret RevenueCat key in the mobile bundle.
4. Deploy BOTH migrations in order before deploying the app: `20261010000000_subscriptions.sql`, `20261010000001_atomic_meals.sql`. Existing earlier migrations must already be installed.
5. Set Edge Function secrets: `REVENUECAT_SECRET_KEY` (secret v1-compatible key), `REVENUECAT_WEBHOOK_AUTH` (exact Authorization header value), `OPENAI_API_KEY`; Supabase injects its own service role. Optional `EXPO_ACCESS_TOKEN` when Expo push access security is enabled.
6. Deploy `analyze-food`, `sync-subscription`, `revenuecat-webhook`, and `send-support`. Configure RevenueCat webhook URL `/functions/v1/revenuecat-webhook` with matching Authorization header. JWT verification is disabled only for the authenticated-by-secret webhook.
7. On a separate sandbox project set `ALLOW_SANDBOX_BILLING=true`; keep false for production. Use sandbox purchases and test renewal, cancellation, expiry, restore, transfer, account switching, duo disconnect and quota boundary. No real card charge is required to validate sandbox.
8. Build a development client/TestFlight build. RevenueCat introduces native code: reload in Expo Go is insufficient for purchases. Existing Expo EAS project remains unchanged.
9. Publish full privacy policy/terms from existing legal docs at stable public URLs and include those URLs in store metadata. The in-app legal summary is not a replacement for full hosted terms. Confirm store review/privacy declarations include text/photo provider processing and RevenueCat.

## Validation and limits

- `npm run validate`: TypeScript, lint, Vitest. Tests include PostgreSQL migrations executed with PGlite; atomic quotas, privileged RPC access, expiry, duo connections and transactional meal rollback are covered.
- Expo iOS and Android JS exports compile; this does not validate a native binary or camera hardware.
- Deno source checking can use an offline import map to the installed Supabase SDK when esm.sh is unreachable; this does not verify deployment against the pinned remote dependency.
- No live migration/function deployment, store product setup or real/sandbox purchase validation was performed: no deployment/store credentials were supplied in this workspace.
- Visual browser QA could not be completed because the browser download was unavailable. Physical device UI, camera, image upload, notification permissions/delivery and billing QA remain release gates.
- The server quota is the paid-cost boundary. Report/idea UI gating is a convenience; deterministic report logic is shipped in the client and is not a tamper-proof server-only premium service.
- Logs and monthly quota use UTC on server; reporting uses local phone days. Quota attempts include failures; change this policy before launch if successful-only charging is desired.

## Compatibility

Deploy migrations first, functions second, native build third. Deploying the app before the RPC migration makes meal saves and plan queries fail explicitly. Never switch existing production users to this build until the migrations and billing verification pass in staging.
