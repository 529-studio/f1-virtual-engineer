---
description: Intake an issue or task — restate scope, non-goals, DoD before any code is written.
---

You are starting a new task in the F1 Virtual Engineer monorepo. Do not edit any files yet.

The user's task is: $ARGUMENTS

Invoke the `f1-issue-to-pr` skill (Phase 1 — Intake) and produce, in this exact structure:

1. **User outcome** — one sentence, in user words.
2. **Why it matters now** — one or two sentences.
3. **Scope** — bulleted list of what's in.
4. **Non-goals** — bulleted list of what's deliberately out.
5. **Definition of done** — concrete, verifiable signals.
6. **Risky assumptions** — anything you'd want to verify before coding (especially F1-domain or telemetry assumptions).
7. **Suggested branch** — `feature/<name>`, `bugfix/<name>`, or `hotfix/<name>` from `develop`.

If the task spans more than one backend capability + one frontend surface, recommend invoking `/slice` next. If the task touches FastF1, telemetry, or strategy logic, recommend invoking `f1-data-research` before implementation.

Do not start branching, editing, or committing in this turn. The output is a contract — wait for the user to confirm or refine.
