Task 1 - Claim And Bootstrap Runtime Fixes

RED coverage added:
- Epic Case 6G: bootstrap skips remotely claimed issue and selects the next free issue.
- Epic Case 8H: brand-new claim creates workflow-state.md with Sink and Lease.
- Epic Case 9A1: tiebreaker loser does not remove remote label/assignee.
- Epic Case 9E: ticker heartbeat PATCH preserves kw:claim and adds kw:hb.

GREEN implementation:
- scripts/kaola-workflow-claim.js creates initial state when Sink/Lease metadata is missing.
- Heartbeat PATCH uses a body containing both kw:claim and kw:hb.
- Tiebreaker-yield and ticker-late-yield use local cleanup without remote label/assignee removal.
- Release/yield clears the session's own kw:claim marker so old comments do not keep future work blocked.
- scripts/kaola-workflow-classifier.js blocks issues with workflow:in-progress or remote kw:claim comments.

Validation:
- node scripts/simulate-workflow-walkthrough.js: passed
- npm test: passed
