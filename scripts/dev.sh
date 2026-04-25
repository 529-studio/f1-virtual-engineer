#!/bin/sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo "\nStopping dev processes..."
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}

trap cleanup INT TERM EXIT

echo "Starting backend on http://localhost:8000 ..."
./scripts/run-backend.sh &
BACKEND_PID=$!

echo "Starting frontend (Next.js dev server) ..."
./scripts/run-frontend.sh &
FRONTEND_PID=$!

echo "\nDev environment is starting:"
echo "- Backend:  http://localhost:8000"
echo "- Docs:     http://localhost:8000/docs"
echo "- Frontend: http://localhost:3000"
echo "\nPress Ctrl+C to stop both."

wait "$BACKEND_PID" "$FRONTEND_PID"
