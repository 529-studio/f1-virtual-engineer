#!/usr/bin/env node
// PreToolUse / Write|Edit hook for the F1 Virtual Engineer repo.
// When the file path is under frontend/, surface the Next.js version warning
// from frontend/AGENTS.md so Claude knows its training-data assumptions may not apply.
//
// Always non-blocking — print to stderr, return original payload.

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let payload = {};
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.stdout.write(raw);
    return;
  }

  const fp = (payload.tool_input && payload.tool_input.file_path) || '';
  if (!fp) {
    process.stdout.write(raw);
    return;
  }

  // Match frontend/ anywhere in an absolute or relative path,
  // but skip node_modules and build artifacts.
  if (
    /(^|\/)frontend\//.test(fp) &&
    !/\/node_modules\//.test(fp) &&
    !/\/\.next\//.test(fp)
  ) {
    process.stderr.write(
      '[f1-hook] frontend/ edit — Next.js in this repo has breaking changes vs your training data.\n' +
        '          Read frontend/AGENTS.md and the relevant guide in node_modules/next/dist/docs/ before assuming APIs.\n',
    );
  }

  process.stdout.write(raw);
});
