---
description: "Git conventions, Conventional Commits, and Git Flow workflow"
alwaysApply: true
---

# Git Convention and Workflow Rule

## Conventional Commits

All commits must follow the Conventional Commits specification:
Format: <type>(<scope>): <description>

Types:
- feat: A new feature
- fix: A bug fix
- chore: Maintenance, configuration, or tool updates (no production code change)
- docs: Documentation changes only
- style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- refactor: A code change that neither fixes a bug nor adds a feature
- perf: A code change that improves performance
- test: Adding missing tests or correcting existing tests

Guidelines:
- Use lowercase for type.
- The description should be concise and in the imperative mood (e.g., "add telemetry tool" instead of "added telemetry tool").
- Scope is optional but encouraged for monorepos (e.g., "backend", "frontend", "infra").

## Git Flow Workflow

1. Branching Strategy:
   - main: Production-ready code.
   - develop: Integration branch for features.
   - feature/<name>: New features or enhancements.
   - bugfix/<name>: Non-critical bug fixes.
   - hotfix/<name>: Critical fixes for production.
   - release/<version>: Preparation for a new production release.

2. Feature Workflow:
   - Always branch out from "develop".
   - Name the branch: feature/short-description (e.g., feature/add-auth).
   - Commit often using Conventional Commits.
   - Push to remote and create a Pull Request (PR) to "develop".
   - Delete the feature branch after it is merged.

3. Pull Request Requirements:
   - Title must follow Conventional Commits (e.g., "feat(backend): add telemetry endpoint").
   - Provide a brief description of changes and what was verified.
   - PRs must target the "develop" branch for features.

## AI Instructions for Committing
- When asked to commit, always check the current branch first.
- Propose a commit message that follows the convention above.
- Ensure all changes are staged correctly before committing.
- After a successful commit, suggest creating a PR if the task is complete.
