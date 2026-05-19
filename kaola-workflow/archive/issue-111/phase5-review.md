# Phase 5 - Review: issue-111

## Code Review Findings

### CRITICAL
none

### HIGH
none

### MEDIUM
1. **discoverProject fallback escapes DI** (`kaola-gitea-forge.js:104`): Fallback git call uses `require('child_process').execFileSync` directly instead of `opts.execFileSync || execFileSync`. Untestable via runner factory; redundant import. Deferred to follow-up.
2. **`options.sha` semantic mismatch** (`kaola-gitea-forge.js:248`): In GitLab, `sha` is a HEAD verification guard; in Gitea it sets `merge_message_field` (commit message body). No protection against racing commits. A comment clarifying the Gitea behavior is sufficient. Deferred to follow-up.
3. **`autoMerge` flag silent drop** (`kaola-gitea-forge.js:242-255`): `opts.autoMerge` runs the version check but never adds `merge_when_checks_succeed: true` to the request body. Actual merge is immediate, not auto. Blueprint specified only the version gate; `merge_when_checks_succeed` field was unconfirmed at design time. Deferred to follow-up (possibly #116 integration).

### MEDIUM/LOW
4. **`major < 0` unreachable** (`kaola-gitea-forge.js:26`): Dead code — regex yields non-negative integers. Deferred to follow-up.
5. **Version silent pass on no regex match** (`kaola-gitea-forge.js:29`): `_versionChecked` set even if version string not parseable. Deferred to follow-up.

## Security Review

Ran: yes — touched files make external API calls via `tea` CLI (exec boundary).

### Findings
- **LOW**: `discoverProject` fallback at line 109 uses git-remote-derived `owner`/`repo` in tea API path without validation against `^[A-Za-z0-9_.\-]+$`. Exploitability is low (git remote is developer-controlled). Deferred to follow-up.
- All other checks passed: no shell injection, no hardcoded credentials, no eval/exec(string), JSON.stringify produces safe array arg, version parsing is regex-only.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | External API calls via exec boundary |
| review-fix executors | N/A | — | No CRITICAL or HIGH findings |
| advisor critical gate | N/A | — | No CRITICAL findings |

## Fixes Applied
None — no CRITICAL or HIGH findings.

## Validation Evidence
- Phase 4 validation (cited): `node plugins/kaola-workflow-gitea/scripts/test-gitea-forge-helpers.js` → "Gitea forge helper tests passed" (`.cache/tdd-task-2.md`)
- No new validation needed — no blocking findings, no review fixes applied.

## Follow-Up Items
1. (MEDIUM) Thread `opts.execFileSync` into `discoverProject` fallback git call; add test fixture for fallback path.
2. (MEDIUM) Add JSDoc/comment to `mergePullRequest` clarifying `opts.sha` sets merge commit message body (not HEAD verification) in Gitea.
3. (MEDIUM) Add `merge_when_checks_succeed: true` to `mergePullRequest` body when `opts.autoMerge`; add test assertion (possibly in #116 integration).
4. (LOW) Remove dead `major < 0 ||` from version check condition.
5. (LOW) Add inline comment at version-skip line: "No parseable version — assume compliant and proceed".
6. (LOW) Validate `owner`/`repo` in `discoverProject` fallback against `^[A-Za-z0-9_.\-]+$`.

## Review Status
PASSED WITH FOLLOW-UPS
