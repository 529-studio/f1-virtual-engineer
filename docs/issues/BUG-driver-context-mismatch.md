# Bug: Driver Context Mismatch due to Regex and Memory Fallback

## Description
When a user asks about a driver using their full name (e.g., "Verstappen"), the system fails to detect the driver because the `DRIVER_PATTERN` regex only looks for 3-letter abbreviations with strict word boundaries. Consequently, the `resolve_followup_node` falls back to the `last_driver` stored in memory, leading to incorrect analysis results (e.g., returning HAM data for a VER query).

## Root Causes
1. **Inflexible Regex**: `DRIVER_PATTERN` in `backend/agents/race_engineer.py` is too restrictive: `r"\b(HAM|VER|...)\b"`.
2. **Aggressive Memory Fallback**: `resolve_followup_node` assumes any missing driver should be filled by the previous one without checking if the query is actually a follow-up.
3. **Performance**: `duration_limit_exceeded` indicates the strategy analysis is hitting the 5s timeout.

## Proposed Fixes
1. Map full driver names to codes (VER -> Verstappen, etc.).
2. Update `DRIVER_PATTERN` to be more robust.
3. Refine memory fallback logic to require explicit follow-up cues.
4. Increase timeout or optimize data fetching.
