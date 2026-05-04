---
name: indie-hacker-slice
description: Turn broad feature requests, specs, backlog items, or GitHub issues into thin, demoable MVP slices for a solo indie hacker building an F1-data product. Use when a request is too large, vague, risky, architecture-heavy, or likely to sprawl across backend, frontend, and data assumptions without a clear smallest shippable slice.
---

# Indie Hacker Slice

## Goal

Choose the smallest valuable slice that can be shipped and learned from quickly.

## Slice selection rubric

Score candidate slices on:

- user impact,
- demo value,
- effort,
- risk reduction,
- dependency weight.

Prefer the highest-value slice with the lowest coordination cost.

## Required output

For each chosen slice, define:

1. user outcome,
2. why now,
3. non-goals,
4. backend change,
5. frontend/API surface,
6. smallest verification proof,
7. what gets postponed.

## Constraints for this repo

- Prefer one backend contract + one visible frontend/API effect + one focused test/manual proof.
- Avoid infrastructure expansion unless the current slice truly requires it.
- Keep race-strategy features explainable; avoid black-box claims for MVP.
- Optimize for a solo founder demo, not enterprise completeness.

## Guardrails

- Do not turn a slice into a multi-week refactor.
- Do not mix unrelated backlog items.
- Do not choose architecture cleanup over user-visible progress unless the current code blocks delivery.
