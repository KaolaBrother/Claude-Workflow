# Phase 1 - Research / Discovery: issue-77

## Deliverable
Update all Codex kaola-workflow phase skills (GitHub + GitLab editions) to enforce subagent delegation:
- Replace ungated "otherwise perform in current session" fallback language with typed delegation status (`subagent-invoked` / `local-fallback-explicit` / `local-fallback-tool-unavailable` / `N/A`)
- Add a delegation contract section to `kaola-workflow-next` startup that records delegation policy in `workflow-state.md` or blocks to request explicit user authorization
- Add validator assertions to `validate-kaola-workflow-contracts.js` that fail when ungated fallback language remains in any required-role skill
- Mirror all changes to the GitLab edition skills

## Why
The workflow's quality model depends on role separation. Silent local fallback produces misleading compliance evidence (`invoked` when no subagent was used) and loses the independent-review and parallel-execution properties that make Kaola-Workflow valuable.

## Affected Area

### Primary — must change
| File | Affected Lines | Issue |
|------|---------------|-------|
| `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` | 37–38 | ungated `code-explorer` + `docs-lookup` fallback |
| `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` | 32, 35 | ungated `planner` + advisor-gate fallback |
| `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` | 37 | ungated `code-architect` + advisor-gate fallback |
| `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` | 8 | ungated `tdd-guide` fallback |
| `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` | 33, 35 | ungated `code-reviewer` + `security-reviewer` fallback |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | 37 | ungated `doc-updater` fallback |
| `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` | — | missing delegation contract / startup policy |
| `plugins/kaola-workflow-gitlab/skills/*/SKILL.md` | same lines | byte-identical GitLab mirrors |
| `scripts/validate-kaola-workflow-contracts.js` | — | new `assertNotIncludes` for ungated fallback phrases |

### Secondary — compliance ledger templates
Each phase skill embeds a `## Required Agent Compliance` table template. Status vocabulary must expand from binary `invoked/N/A` to typed `subagent-invoked / local-fallback-explicit / local-fallback-tool-unavailable / N/A`.

### Out of scope
- `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` line 25 — deliberate inline-only policy, not a conditional fallback
- `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` — its "when available" references data sources (GitHub issues), not subagent delegation
- Claude Code command files (`commands/kaola-workflow-phase*.md`) — already have hard-gate language; no change needed

## Key Patterns Found
1. Ungated fallback template — `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md:37`: `when subagents are available; otherwise perform the same read-only research in the current session.`
2. Hard-gate reference — `commands/kaola-workflow-phase4.md:11-14`: "Phase 4 is subagent-executed. The main session is the orchestrator: it does not own implementation or test code." — model for Codex skills to follow
3. Compliance ledger template — every phase SKILL.md: `## Required Agent Compliance` table with `Requirement | Status | Evidence | Skip Reason`; current status vocab is binary (`invoked`, `invoked/N/A`); needs `subagent-invoked / local-fallback-explicit / local-fallback-tool-unavailable / N/A`
4. Empirical bug artifact — `kaola-workflow/archive/roadmap-open-issues/phase4-progress.md:19-23`: free-text Skip Reason "local fallback because no explicit subagent delegation was requested" accepted as `invoked` — proves the bug

## Test Patterns
- Framework: hand-rolled assert (`assert`, `assertIncludes`, `assertNotIncludes`, `assertConcept`)
- Location: `scripts/simulate-workflow-walkthrough.js` (Claude), `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` (Codex — 68 lines, minimal)
- Validators: `scripts/validate-kaola-workflow-contracts.js` (Codex skill assertions), `scripts/validate-workflow-contracts.js` (Claude command assertions — must stay byte-identical with `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`)
- New assertions go in `validate-kaola-workflow-contracts.js`; NOT in the byte-synced `validate-workflow-contracts.js`
- `validate-script-sync.js` enforces sync between `scripts/` and `plugins/kaola-workflow/scripts/` for an allowlist; `validate-kaola-workflow-contracts.js` is excluded from that list

## Config & Env
- `KAOLA_WORKFLOW_OFFLINE=1` — skips network calls in tests; must be set in any new test subprocess calls
- No existing env var controls subagent availability or delegation policy — the delegation policy section added to `kaola-workflow-next` will be prose-only (for now), not machine-gated

## External Docs
None — all patterns are internal to this repository.

## GitHub Issue
KaolaBrother/Kaola-Workflow#77

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | — | all patterns internal; no external library/API behavior needed |

## Notes / Future Considerations
- The `kaola-workflow-next` startup delegation contract is prose-only in this issue. A follow-up could add a machine-readable `delegation_policy:` field to `workflow-state.md` and a validator that reads it.
- `simulate-kaola-workflow-walkthrough.js` is currently only 68 lines with minimal coverage. A separate issue could expand its test surface.
- GitLab mirrors are standalone copies (not shared includes); every change must be applied to both editions independently.
