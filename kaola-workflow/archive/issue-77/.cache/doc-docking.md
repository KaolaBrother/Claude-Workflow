# Documentation Docking — issue-77

## Verdict: DOCKED

## Files Changed vs Documentation Checked

| Changed File | Doc Coverage | Status |
|---|---|---|
| `plugins/kaola-workflow/skills/*/SKILL.md` (7 files) | README.md Codex subagents paragraph updated | DOCKED |
| `plugins/kaola-workflow-gitlab/skills/*/SKILL.md` (7 files) | Same README coverage applies to GitLab edition | DOCKED |
| `scripts/validate-kaola-workflow-contracts.js` | Not user-facing; no doc needed | DOCKED |
| `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` | Not user-facing; no doc needed | DOCKED |

## Documentation Updates Made

- **CHANGELOG.md** — "Added — Typed-Acknowledgement Delegation Gate (issue #77)" section added under [Unreleased]
- **docs/workflow-state-contract.md** — `delegation_policy:` field and four-token vocab documented in new "Workflow State Fields" section
- **README.md** — Codex subagents paragraph updated to reflect explicit delegation authorization (replaces implicit fallback language)

## Documentation Confirmed Unchanged (correct)

- `.env.example` — no new env vars
- `docs/architecture.md` — structural architecture unchanged
- `docs/api.md` — no new API surface
- `docs/conventions.md` — conventions unchanged; compliance ledger vocab is captured in workflow-state-contract.md
