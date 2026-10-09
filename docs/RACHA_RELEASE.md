# RACHA — release readiness
RACHA is an evolution of GymBro. This branch does not constitute a production-ready build.

## Current product
- React Native Expo SDK 54, Supabase, onboarding, partner invitations, feed, meal logging, reactions and progress.
- Real nutrition scanner provider and Supabase Edge Function exist in source, but require deployment and a valid server-side OpenAI API key.
- Streaks measure consistency in logging, never restrictive eating, calories or weight loss.

## Compatibility
Do not change the existing bundle identifiers, EAS project ID, backend tables or gymbro:// invite scheme without verifying app upgrade/deep-link compatibility. Display brand has changed to RACHA.

## Before launch
1. Validate RACHA trademark, domain and App Store/Play Store availability.
2. Add original RACHA icons/splash and confirm the complete new visual language.
3. Deploy Supabase migrations and analyze-food Edge Function with server-side OPENAI_API_KEY.
4. Implement enforced server-side scan quotas, usage tracking and billing limits.
5. Configure push notifications, Expo push credentials and database webhook.
6. Verify account deletion, RLS access control, user consent and health-data disclosures.
7. Run npm run validate, physical iOS and Android tests, and internal EAS builds.
8. Configure in-app purchases and app store listings, if Premium launches.
9. Specify and persist paused-day policy before promising a freeze feature.

This branch deliberately does not claim those steps are completed.
