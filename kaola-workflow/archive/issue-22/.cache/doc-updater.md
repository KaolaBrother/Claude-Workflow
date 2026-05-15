# Doc Updater Notes - issue-22

## Updated

- `README.md`: documented platform-backed `KAOLA_SESSION_ID`, Claude/Codex refresh and resume behavior, and explicit recovery/handoff.
- `commands/workflow-next.md`: documented current-session resolution, owned bootstrap routing, no-unclaimed-work behavior, and explicit handoff.
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`: documented Codex `CODEX_THREAD_ID`, owned routing, no-free issue behavior, and handoff.
- Phase heartbeat snippets in Claude commands and Codex skills now show validation instead of adoption.

## Result

Docs are updated for user-facing behavior and agent-facing startup behavior.
