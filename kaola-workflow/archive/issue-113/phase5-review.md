# Phase 5 - Review: issue-113

## Code Review Findings

### CRITICAL
none

### HIGH
- **H1**: `watchMergeRequests` had OFFLINE guard at function entry (not just in `cmdWatchPr`), preventing forge-stub testing of pr_url parsing. **Fixed** — guard moved to `cmdWatchPr` only; test updated with proper `withForge` stub.
- **H2**: Two classify tests ("classify blocked", "classify red/overlap") relied on `KAOLA_WORKFLOW_OFFLINE=1` being set externally instead of using `withForge` stubs, making them fragile in clean CI. **Fixed** — tests now use `withForge({ viewIssue })` closures matching the GitLab reference pattern.

### MEDIUM/LOW
- **M1**: `findPullRequestForBranch` in sink-pr.js passes `state: 'opened'` option to `forge.listPullRequests` which doesn't forward it to the `tea` CLI. Pre-existing issue from the GitLab template (not introduced by this port); in-process filter `routePullRequestState(pr) === 'open'` provides effective filtering. Deferred as follow-up.

## Security Review

**ran: no**

File-risk scan: All 9 modified/created files are pure workflow state management (file I/O, git commands, `tea` CLI invocations). No auth, payments, user data handling, external API calls with sensitive payloads, or secrets processing introduced. The Gitea forge adapter (`kaola-gitea-forge.js`, not modified in this port) was already reviewed for security in its own issue. Security review N/A for this port.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md (inline session) | |
| security-reviewer | N/A | file-risk scan: no auth/payments/user-data/secrets | pure file-I/O and git/tea CLI port |
| review-fix executors | invoked | tdd-guide via inline agent (2 fixes) | |
| advisor critical gate | N/A | no CRITICAL findings | |

## Fixes Applied
1. `kaola-gitea-workflow-claim.js`: Moved OFFLINE guard from `watchMergeRequests` entry to `cmdWatchPr` only.
2. `test-gitea-workflow-scripts.js`: Replaced roadmap-file-based classify tests with `withForge` stub tests; added `delete process.env.KAOLA_WORKFLOW_OFFLINE` before module requires so stubs are reachable.

## Validation Evidence
- `KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-workflow-scripts.js` → EXIT 0, "Gitea workflow script tests passed" (post-fix)
- `KAOLA_WORKFLOW_OFFLINE=1 node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` → EXIT 0, "Gitea sink tests passed"
- `node scripts/simulate-workflow-walkthrough.js` → EXIT 0, "Workflow walkthrough simulation passed"

## Follow-Up Items
- M1: `findPullRequestForBranch` `state: 'opened'` option not forwarded to tea CLI — pre-existing, deferred.

## Review Status
PASSED
