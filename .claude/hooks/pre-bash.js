#!/usr/bin/env node
// PreToolUse / Bash hook for the F1 Virtual Engineer repo.
// Reads {tool_name, tool_input:{command}} on stdin, writes the same JSON to stdout
// to let the tool proceed, and uses stderr + exit code to signal Claude.
//
// Exit 2 = block. Exit 0 with stderr text = warn (non-blocking).
//
// Checks (Minimal profile):
//   1. Block `git commit` on `main` / `develop`.
//   2. Block any git command containing `--no-verify`.
//   3. Warn before `git push --force` / `-f` / `--force-with-lease`.

const { execSync } = require('child_process');

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let payload = {};
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    // If we can't parse, don't block.
    process.stdout.write(raw);
    return;
  }

  const cmd = (payload.tool_input && payload.tool_input.command) || '';
  if (!cmd) {
    process.stdout.write(raw);
    return;
  }

  const isGit = /(^|\s|;|&&|\|\|)\s*git\s/.test(' ' + cmd);

  // 1. --no-verify is forbidden for git commands.
  if (isGit && /--no-verify\b/.test(cmd)) {
    process.stderr.write(
      '[f1-hook] BLOCKED: --no-verify bypasses pre-commit checks.\n' +
        '          The repo CLAUDE.md and global system prompt both forbid skipping hooks.\n' +
        '          Fix the underlying check, or ask the user before retrying.\n',
    );
    process.exit(2);
  }

  // 2. Protected-branch commit guard.
  if (/(^|\s|;|&&)\s*git\s+commit\b/.test(' ' + cmd)) {
    let branch = '';
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
    } catch {
      // Not in a git repo or git unavailable — let it through.
    }
    if (branch === 'main' || branch === 'develop') {
      process.stderr.write(
        `[f1-hook] BLOCKED: refusing to commit on protected branch "${branch}".\n` +
          '          Git Flow: branch from develop into feature/<name>, bugfix/<name>, or hotfix/<name>.\n' +
          '            git checkout develop && git pull\n' +
          '            git checkout -b feature/<short-name>\n',
      );
      process.exit(2);
    }
  }

  // 3. Force-push warning (non-blocking).
  if (
    /(^|\s|;|&&)\s*git\s+push\b/.test(' ' + cmd) &&
    /(--force\b|--force-with-lease\b|\s-f\b)/.test(cmd)
  ) {
    process.stderr.write(
      '[f1-hook] WARNING: force-push detected. Confirm the user authorized this — never force-push main or develop.\n',
    );
  }

  process.stdout.write(raw);
});
