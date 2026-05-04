# Gemini Bootstrap: Auto-Load Protocol

This folder contains the operating system for Gemini within the Apex-Intelligence project.

## Initialization Sequence
Every time a new session starts, the Agent MUST:
1.  **Read Mandates**: Load `.gemini/MANDATES.md` to understand core constraints.
2.  **Load Skills**: Recursively read all files in `.gemini/skills/`.
3.  **Execute Flows**: Check `.gemini/flows/` for any scheduled automation (e.g., daily status checks).

## Skills Directory Guide
- `f1-data-expert.md`: Deep knowledge of FastF1 and race telemetry.
- `ui-ux-automotive.md`: Design system rules (Apple x Automotive).
- `indie-hacker-workflow.md`: Standardized `Indie Launch Loop` implementation.

## Automation Flows
- `pre-commit.sh`: Automated QA before any commit.
- `pr-generator.md`: Template for generating high-quality PR descriptions.
