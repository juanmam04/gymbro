#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "Falta .env.local"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source <(grep -E '^(OPENAI_API_KEY|SUPABASE_ACCESS_TOKEN|EXPO_PUBLIC_SUPABASE_URL)=' .env.local | sed 's/\r$//')
set +a

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "Agregá OPENAI_API_KEY=sk-... a .env.local y reintentá"
  exit 1
fi

PROJECT_REF="rhshfpubyevumepcmbzv"

if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  npx supabase login --token "$SUPABASE_ACCESS_TOKEN"
else
  echo "Si no estás logueado: npx supabase login"
fi

npx supabase link --project-ref "$PROJECT_REF" --yes
npx supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY" --project-ref "$PROJECT_REF"
npx supabase functions deploy analyze-food --project-ref "$PROJECT_REF"
npx supabase functions deploy delete-account --project-ref "$PROJECT_REF" || true

echo "OK: analyze-food desplegada"
