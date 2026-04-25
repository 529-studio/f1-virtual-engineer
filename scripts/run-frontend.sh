#!/bin/sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/frontend"

if [ ! -d node_modules ]; then
  npm install
fi

exec npm run dev
