# Doc Updater: cross-machine-followups

## Result
CHANGELOG.md updated — new "Fixed (cross-machine-hardening)" section added under [Unreleased], before the existing "Added (codex-parity)" section.

## Updated Files
- `CHANGELOG.md` — 8 hardening items documented: regex g-flag, git push safety, signal handlers (SIGINT+SIGTERM gracefulShutdown), PID liveness checks in 12 shims, return value fix in acquirePidFile, Number.isFinite guard, stderr logging for adoption push failures, dead condition removal

## No-Impact Files
- README.md — no public API/CLI/arch changes; ticker behavior unchanged from user perspective
- API docs — N/A; no separate API docs; no new endpoints
- .env.example — no new env vars
- Inline comments — small focused fixes; no public signatures changed
- Architecture docs — no file structure or module boundary changes
