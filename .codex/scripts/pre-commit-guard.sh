#!/bin/sh
set -eu

branch="$(git rev-parse --abbrev-ref HEAD)"

case "$branch" in
  main|develop)
    echo "Refusing commit on protected branch: $branch"
    echo "Create feature/*, bugfix/*, or hotfix/* from develop first."
    exit 1
    ;;
  feature/*|bugfix/*|hotfix/*)
    ;;
  *)
    echo "Warning: branch '$branch' does not follow git-flow naming (feature/*, bugfix/*, hotfix/*)."
    ;;
esac

staged="$(git diff --cached --name-only --diff-filter=ACM || true)"
if [ -z "$staged" ]; then
  echo "No staged files."
  exit 0
fi

./.codex/scripts/self-qa.sh --staged

echo "Pre-commit guard passed."
