#!/bin/sh
set -eu

repo_root="$(git rev-parse --show-toplevel)"

install_hook() {
  hook_name="$1"
  src="$repo_root/.codex/git-hooks/$hook_name"
  dest="$repo_root/.git/hooks/$hook_name"

  if [ ! -f "$src" ]; then
    echo "Missing source hook: $src"
    exit 1
  fi

  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    backup="$dest.bak"
    cp "$dest" "$backup"
    echo "Backed up existing $hook_name hook to $backup"
  fi

  chmod +x "$src"
  ln -sf "$src" "$dest"
  echo "Installed $hook_name -> $src"
}

install_hook pre-commit
install_hook commit-msg

echo "Codex git hooks installed."
