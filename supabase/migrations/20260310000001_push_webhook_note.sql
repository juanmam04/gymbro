-- Optional: invoke notify-partner edge function after meal insert via pg_net
-- Requires: create extension if not exists pg_net;
-- And configure app settings for project URL + service role (prefer Database Webhooks in dashboard).
--
-- Recommended for MVP: use Supabase Dashboard → Database → Webhooks
-- Table: meals | Event: INSERT | Hook: Edge Function notify-partner
--
-- This migration only documents the preferred approach and adds a helper comment table marker.

comment on table public.meals is
  'After INSERT, configure a Database Webhook to call Edge Function notify-partner for partner push notifications.';
