# Advisor Output — multi-session-substrate Phase 2 Ideation Gate

## Critical Correction: Pre-commit hook wiring mechanism

Issue #3 spec verbatim:
> `hooks/kaola-workflow-pre-commit.sh` wired via `hooks.json` PreToolUse on `Bash` matching `git commit`. Block rules per epic #2.

The planner's Approach A incorrectly routes the hook through `.git/hooks/pre-commit` installed by `/workflow-init`. The spec requires a **Claude Code PreToolUse hook** that intercepts Bash tool calls containing `git commit`.

Changes from planner's Approach A:
- Add a `PreToolUse` entry in `hooks/hooks.json` with matcher `Bash`, invoking `hooks/kaola-workflow-pre-commit.sh`
- The shell script reads staged files (via `git diff --cached --name-only`) and checks lock ownership
- `/workflow-init` does NOT need to write to `.git/hooks/`
- `install.sh` stays single-purpose (unchanged — planner was right for wrong reason)
- The script still exits non-zero to block; only wiring differs

Implication: This hook only blocks AI/Bash-tool-initiated `git commit` — exactly the "session" commit case targeted by the spec.

## Sweep Scope

Planner adds `released:stale` comment during sweep. Acceptance #6 says only:
> "sweep releases the local lock and removes the remote label"

No comment posting required. Keep sweep minimal: `--remove-label workflow:in-progress` + unlink lock. Avoid scope creep.

## Codex Validator Scope

Acceptance #7 in issue #3 says "`validate-kaola-workflow-contracts.js` asserts Lease + Sink schema" — this filename is the Codex-side validator. This is likely a spec typo; the Claude-side validator is `validate-workflow-contracts.js`. Extending the Codex validator (`validate-kaola-workflow-contracts.js`) would creep into issue #8's scope. Decision: extend only `validate-workflow-contracts.js` (Claude-side) in issue #3. Record this interpretation in phase2-ideation.md.

## Flat Naming Decision

`scripts/kaola-workflow-claim.js` (flat) vs. spec's `scripts/kaola-workflow/claim.js` (nested). Flat is correct — follows existing convention. Document explicitly in phase file.

## Overall Verdict

Approach A is sound with the hook re-wired as `hooks.json` PreToolUse. All other decisions (monolithic script, env-var test isolation, crypto.randomUUID, fsync, EEXIST retry, session-id shape, status --json shape) are correct. No blocker beyond the hook mechanism.
