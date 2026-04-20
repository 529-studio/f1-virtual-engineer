#!/bin/sh
set -eu

input="$(cat)"

# Lightweight heuristic check for common secret patterns.
if printf "%s" "$input" | python3 -c '
import re
import sys

data = sys.stdin.read()
pattern = re.compile(r"sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z\-_]{20,}")
sys.exit(0 if pattern.search(data) else 1)
'; then
  printf '%s\n' '{
  "permission": "deny",
  "user_message": "Potential secret detected in prompt. Remove API keys/tokens before sending.",
  "agent_message": "Hook blocked prompt submission due to secret-like pattern."
}'
  exit 0
fi

printf '%s\n' '{ "permission": "allow" }'
