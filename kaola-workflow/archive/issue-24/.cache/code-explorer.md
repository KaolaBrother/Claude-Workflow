# Code Explorer Notes - issue-24

## Scope

Issue #24 requires hardening workflow startup so an agent cannot safely proceed after skipping bootstrap, while also syncing GitHub issues into the roadmap mirror before selection.

## Facts

- `commands/workflow-next.md` currently instructs Startup Step 0 to run a shell snippet that calls `kaola-workflow-claim.js bootstrap`, then Step 1 performs git freshness.
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` mirrors that behavior for Codex.
- `scripts/kaola-workflow-claim.js` has `bootstrap`, which runs sweep, watch-pr, owned-session detection, classifier, and claim.
- `bootstrap` currently lists open GitHub issues via `gh issue list --state open --json number` and does not synchronize `.roadmap` or `ROADMAP.md` first.
- `scripts/kaola-workflow-roadmap.js` can generate, validate, migrate, and init a single issue file, but it cannot sync open GitHub issues.
- `scripts/kaola-workflow-classifier.js` blocks `depends-on:#N` while dependency issue N is open and treats offline dependency metadata conservatively.
- Root and packaged Codex simulations already cover bootstrap race retry and parallel selection, so new coverage should extend those cases instead of adding a new test framework.
- Current validators assert the presence of `runBootstrapClaimFirstAvailable`; they should be updated to require the new startup command/receipt contract.

## Relevant Files

- `scripts/kaola-workflow-claim.js`
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- `scripts/kaola-workflow-roadmap.js`
- `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js`
- `commands/workflow-next.md`
- `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md`
- `commands/kaola-workflow-phase*.md`
- `plugins/kaola-workflow/skills/kaola-workflow-{research,ideation,plan,execute,review,finalize}/SKILL.md`
- `scripts/simulate-workflow-walkthrough.js`
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`

## Risks

- Prompt-only changes do not solve the gap.
- Startup sync must remain offline-safe and must not require GitHub when `KAOLA_WORKFLOW_OFFLINE=1`.
- Queue ordering must be deterministic because `gh issue list` default order can vary by update time.
- Receipt checks should not break existing lock/session validation tests.
