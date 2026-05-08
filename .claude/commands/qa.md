---
description: Run self-QA on staged changes — pytest, lint, and the strategy/explainability checklist.
---

Invoke the `f1-self-qa` skill.

Run the mechanical check first:

```bash
./.codex/scripts/self-qa.sh --staged
```

Then walk the five qualitative dimensions from the skill (Data integrity, Decision plausibility, Explainability, Contract safety, Verification log) against the actual staged diff.

Report in this format:

- **Mechanical:** PASS / FAIL — paste the relevant tail of output if FAIL.
- **Data integrity:** ✅ / ⚠️ / ❌ — one-line note.
- **Decision plausibility:** ✅ / ⚠️ / ❌ — one-line note.
- **Explainability:** ✅ / ⚠️ / ❌ — one-line note.
- **Contract safety:** ✅ / ⚠️ / ❌ — one-line note.
- **Verification log:** the 3-5 line entry to paste into the PR body's Verification section.

If anything is ❌ or ⚠️, do not proceed to commit — name the fix needed and stop.
