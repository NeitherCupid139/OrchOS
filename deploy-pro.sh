#!/usr/bin/env bash
set -euo pipefail

# =====================================================
# deploy-pro.sh — Deploy OrchOS with private pro submodule
#
# Authentication (choose one):
#
# 1. Fine-Grained PAT (recommended)
#    export GH_PRO_PAT="github_pat_xxx"
#    → Created at https://github.com/settings/tokens?type=beta
#    → Scope: orchos-pro repo, Contents: Read-only
#
# 2. SSH Deploy Key (legacy)
#    export GIT_SSH_COMMAND="ssh -i ~/.ssh/deploy_key"
#
# 3. GitHub App (advanced)
#    Use tibdex/github-app-token in CI; not shown here.
# =====================================================

echo "→ Configuring submodule auth..."

# If GH_PRO_PAT is set, rewrite the submodule URL to use token auth
if [ -n "${GH_PRO_PAT:-}" ]; then
  git config --global url."https://x-access-token:${GH_PRO_PAT}@github.com/NeitherCupid139/orchos-pro".insteadOf \
    "https://github.com/NeitherCupid139/orchos-pro"
  git config --global url."https://x-access-token:${GH_PRO_PAT}@github.com/NeitherCupid139/orchos-pro".insteadOf \
    "git@github.com:NeitherCupid139/orchos-pro.git"
fi

echo "→ Updating submodules..."
git submodule update --init --recursive

echo "→ Installing dependencies..."
bun install

echo "→ Building with pro features..."
VITE_ENABLE_PRO=true bun run build

echo "→ Deploying to Cloudflare..."
bun run deploy:cf

echo "✓ Done!"
