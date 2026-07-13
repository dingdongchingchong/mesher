#!/usr/bin/env bash
# GiveMeMoney — Termux / Android setup
# Uses @mmmbuto/better-sqlite3-termux and skips broken native prebuilds.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

is_termux=0
if [[ -n "${TERMUX_VERSION:-}" ]] || [[ "${PREFIX:-}" == *com.termux* ]]; then
  is_termux=1
fi

echo "==> GiveMeMoney Termux setup"
echo "    project: $ROOT"

if [[ "$is_termux" -eq 1 ]]; then
  echo "    detected Termux ${TERMUX_VERSION:-}"
  echo
  echo "Make sure system packages are installed (run once):"
  echo "  pkg update && pkg upgrade -y"
  echo "  pkg install -y nodejs-lts clang make python build-essential libsqlite git"
  echo
else
  echo "    (not running inside Termux — continuing with Termux-oriented install)"
fi

echo "==> Cleaning previous install artifacts"
rm -rf node_modules server/node_modules client/node_modules
rm -f package-lock.json server/package-lock.json client/package-lock.json

echo "==> Installing root tooling"
npm install

echo "==> Installing Termux-friendly better-sqlite3 fork"
npm install --prefix server @mmmbuto/better-sqlite3-termux@12.8.0-termux.1 --save

echo "==> Installing remaining server deps (skip broken native prebuilds)"
npm install --prefix server --ignore-scripts

echo "==> Rebuilding Termux sqlite binding (if needed)"
if ! npm rebuild --prefix server @mmmbuto/better-sqlite3-termux; then
  echo "rebuild failed — trying build-from-source fallback"
  npm install --prefix server better-sqlite3 --build-from-source
fi

echo "==> Installing client"
npm install --prefix client

if [[ ! -f server/.env ]]; then
  echo "==> Creating server/.env from example"
  cp server/.env.example server/.env
else
  echo "==> server/.env already exists (leaving it)"
fi

echo
echo "Setup complete. Start the app with:"
echo "  npm run dev"
echo
echo "App: http://localhost:5174"
echo "API: http://localhost:3001"
echo
echo "If sqlite still fails to load:"
echo "  cd server && npm install better-sqlite3 --build-from-source"
