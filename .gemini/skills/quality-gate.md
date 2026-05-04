# Skill: Quality Gate (Verification)

The final checkpoint before any PR or Merge.

## Mandatory Checks
1.  **Backend Integrity**:
    - Run `pytest` or `unittest`.
    - Check API response times (< 500ms for cached data).
2.  **Frontend Integrity**:
    - `npm run lint`.
    - `npm run build` (Full production build + Type checking).
3.  **Harness Check**:
    - Verify that no hardcoded secrets or sensitive data are left in the diff.
    - Confirm all new logic has a corresponding entry in `docs/issues`.

## Failure Protocol
- If any check fails, **STOP**.
- Propose a fix, implement it, and rerun the **entire** Quality Gate.
