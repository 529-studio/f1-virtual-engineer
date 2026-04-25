#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <commit-message-file>"
  exit 1
fi

msg_file="$1"
msg="$(sed -n '1p' "$msg_file")"

case "$msg" in
  Merge\ *|Revert\ *)
    exit 0
    ;;
esac

if printf "%s" "$msg" | grep -Eq '^(feat|fix|chore|docs|style|refactor|perf|test)(\([a-z0-9-]+\))?: .+'; then
  exit 0
fi

echo "Invalid commit message: $msg"
echo "Expected Conventional Commits, for example:"
echo "  feat(backend): add strategy fallback metadata"
echo "  fix(frontend): handle telemetry empty state"
exit 1
