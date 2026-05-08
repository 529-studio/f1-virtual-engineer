---
description: Branch-check → self-QA → conventional commit → PR to develop. The full ship sequence.
---

Run the ship sequence for the F1 Virtual Engineer monorepo. Do not skip steps.

### 1. Branch check

```bash
git rev-parse --abbrev-ref HEAD
```

If the current branch is `main` or `develop`, **stop**. Tell the user a `feature/*`, `bugfix/*`, or `hotfix/*` branch is required and ask them what to name it. Do not auto-branch — the user picks the name.

### 2. Self-QA

Invoke `/qa` (the `f1-self-qa` skill). If anything is ❌, stop and report what needs fixing. Never bypass with `--no-verify`.

### 3. Stage and commit

Stage the intended files (prefer `git add <path>` over `git add -A` to avoid sweeping in `.env` or build artifacts). Draft a Conventional Commit message with a monorepo scope:

- `feat(backend): ...`
- `feat(frontend): ...`
- `fix(backend): ...`
- `docs(repo): ...`

Keep the subject under ~70 chars. Use a HEREDOC body if there's more than one paragraph of detail. End with the Co-Authored-By trailer.

### 4. Push and open PR

Push with `-u` if the branch is new. Open the PR against `develop` (not `main`) using `gh pr create` and a HEREDOC body with these sections:

- **Summary** — 1-3 bullets.
- **Why** — the user-visible reason.
- **What changed** — files / surfaces touched.
- **Verification** — paste the verification log from `/qa`.
- **Risks / follow-ups** — what to watch for, what's deferred.

Return the PR URL when done.
