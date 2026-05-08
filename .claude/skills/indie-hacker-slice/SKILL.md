---
name: indie-hacker-slice
description: Turn broad feature requests, specs, backlog items, or GitHub issues into thin, demoable MVP slices for a solo indie hacker building this F1-data product. Use this skill whenever a request is too large, vague, risky, architecture-heavy, or likely to sprawl across backend, frontend, and data assumptions without a clear smallest shippable slice — even if the user phrases it as "let's just add X".
---

# Indie Hacker Slice

This repo is a solo indie-hacker MVP. Every feature should be the smallest thing that improves a real user-visible workflow and can be demoed.

## Slice selection rubric

Score candidate slices on:

- **user impact** — does it visibly change what the user can do?
- **demo value** — can it be shown in a 30-second screen recording?
- **effort** — hours, not days, for the first version.
- **risk reduction** — does shipping it teach us something we don't yet know?
- **dependency weight** — does it require new infra, models, or data sources?

Prefer the highest user-impact slice with the lowest dependency weight.

## Required output

For each chosen slice, write down:

1. **User outcome** — one sentence, in user words.
2. **Why now** — what makes this the right next step?
3. **Non-goals** — what we are explicitly not doing in this slice.
4. **Backend change** — one capability, named.
5. **Frontend / API surface** — one visible effect, named.
6. **Smallest verification proof** — one test or one manual demo step.
7. **What gets postponed** — features adjacent but out of scope.

## Constraints

- One backend contract change + one visible frontend/API effect + one focused test/manual proof. No more.
- Avoid infrastructure expansion unless the slice truly requires it.
- Strategy features must stay explainable — no black-box claims for the MVP.
- If the slice still feels too big, halve it again.

## Deeper detail

`.codex/skills/indie-hacker-slice/SKILL.md` has the codex version.
