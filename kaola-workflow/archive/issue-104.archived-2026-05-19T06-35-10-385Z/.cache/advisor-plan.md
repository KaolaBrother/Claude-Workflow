# advisor-plan raw output — issue-104

## Verdict
Plan is implementable. Blueprint answers all four gate questions:
- Build sequence dependency-safe.
- 6 files + integration points identified.
- A developer can implement from the plan alone (anchors, substitution rules, validator commands all concrete).
- Edge cases covered (OFFLINE degrade; orchestrator owns escalation; trivial inline edit retained).

## Must-resolve before Phase 4 (record in phase3-plan.md)

1. **tdd-guide on doc-only tasks**. Each task's "Test File" row must say: "Doc-only task: validator pass is the GREEN signal; tdd-guide returns the diff + validator stdout as evidence; no test file written." Without this, tdd-guide may stall asking for test files.
2. **Verify GitLab validator file exists**. Code-explorer cited `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` but no `ls` confirmed it. Run `ls plugins/kaola-workflow-gitlab/scripts/` and fix the validator command path in phase3-plan.md if file is named differently.
3. **Verify glab CLI flag syntax**. Architect used `glab issue view "$KAOLA_TARGET_ISSUE" --output json`. The actual flag may be `--output=json` or `--format json` depending on glab version. Run `glab issue view --help | grep -iE "output|format|json"` and use the correct flag in the GitLab Step 0a-1.

## Process flag
Phase 4 will spawn 6 tdd-guide subagents on doc-only files. User has asked for "simpler" multiple times. Surface the ceremony cost aloud before invoking Phase 4; accept their answer and proceed.

## What's good (do not churn)
- Section-name refs replacing `fast.md:38` line refs.
- Mid-flight escalation preserved verbatim.
- `step: execute` → `step: plan` correction in Step 1.
- Explicit `mkdir -p .cache/` in Step 1.
- Full workflow-state.md field set per step.
- Compliance table + prose sections both in fast-summary (matches phase-file pattern).
