# Screen interaction checks

This harness renders the actual Home, Profile and Progress source using React Native Web and real React Query. Auth, subscriptions, realtime and data services are simulated. It does not start Expo Router or exercise the real backend, device camera, notifications, payment SDK, meal publication or login.

Install dependencies in this directory with `npm install` (adjust versions if unavailable). Start `node server.mjs`, then execute `node rounds.cjs` in a second terminal. The runner checks 100 rounds of water updates, the meal action sheet destination, profile destination and period selection. Each round checks horizontal overflow. Results include round number and duration; browser errors fail the run. Generated screenshots and results are ignored by git.

These are interface regression rounds, not 100 complete real-device uses. Keep the release in draft until device and connected-backend acceptance checks pass.
