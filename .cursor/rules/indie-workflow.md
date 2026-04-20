---
description: "Indie-hacker execution loop for this monorepo"
alwaysApply: true
---

# Indie Workflow Rule

## Product-first priorities

1. Prefer thin vertical slices over large refactors.
2. Every feature must map to one user-visible outcome.
3. Ship in small increments: backend endpoint + frontend UI + basic test in one pass.

## Context and token discipline

- Read only the minimum files needed before coding.
- Summarize assumptions explicitly before major edits.
- For large tasks, split into phases and re-check direction after each phase.

## Verification loop (required)

For each meaningful change:

1. Run the smallest relevant test/lint command first.
2. Fix errors before adding more scope.
3. Validate API contract and UI behavior match.
4. Record what was verified and what remains unverified.

## Parallelization policy

- Use parallel work only for independent subtasks (for example docs + styling).
- Do not parallelize coupled backend/frontend logic without a shared contract.

## Definition of done (MVP stage)

A change is done only when:

- the code compiles/runs,
- one happy-path test or manual check is documented,
- no new hardcoded secrets are introduced,
- the result can be demoed quickly by a solo founder.
