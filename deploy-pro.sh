#!/usr/bin/env bash
set -euo pipefail

# =====================================================
# deploy-pro.sh — Deploy OrchOS with private pro submodule
#
# Prerequisites:
#   - GitHub Deploy Key or PAT with access to orchos-pro
#   - VITE_ENABLE_PRO=true (set in CI/CD env)
#   - wrangler configured (WRANGLER_API_TOKEN or cloudflare login)
# =====================================================

echo "→ Updating submodules..."
git submodule update --init --recursive

echo "→ Installing dependencies..."
bun install

echo "→ Generating types..."
bun run cf-typegen 2>/dev/null || true

echo "→ Running database migrations (if any)..."
bun run --filter=web db:migrate:local 2>/dev/null || true

echo "→ Building..."
VITE_ENABLE_PRO=true bun run build

echo "→ Deploying to Cloudflare..."
bun run deploy:cf

echo "✓ Done!"
