# Phase 2 - Ideation: branch-issue-merge-sink

## Approaches Evaluated

### Option A-naming-1: cmdClaim writes branch name at claim time (SELECTED)
- Summary: cmdClaim computes `branch = 'workflow/issue-' + args.issue + '-' + args.project` and writes it into the Sink block via updated `updateSinkLease` (replace-then-write pattern)
- Pros: Atomic with lock; deterministic from existing args; matches updateSinkLease replace-then-write pattern
- Cons: Couples branch-name convention to claim.js (minor)
- Risk: Low
- Complexity: ~5 lines

### Option A-naming-2: sink-merge.js or Phase 1 backfills the name
- Summary: A downstream script writes the real branch name after claim
- Pros: Keeps claim.js focused on locking
- Cons: Re-introduces staleness bug; two writers to same state field
- Risk: Medium
- Rejected: Yes

### Option A-creation-1: Phase 1 command file runs git checkout -b (SELECTED)
- Summary: Phase 1 command reads branch name from Sink block and runs `git checkout -b {branch}` with idempotent existence check
- Pros: Command files own git operations; branch exists by time Phase 4 starts; no git side effects in claim.js
- Risk: Low
- Complexity: Small

### Option A-creation-2: cmdClaim runs git checkout -b
- Summary: Branch creation colocated with locking
- Cons: Loads claim.js with destructive worktree ops; hard to test offline; mismatches claim semantics
- Risk: Medium
- Rejected: Yes

### Option B2: CLI flags --branch --issue --project (SELECTED)
- Summary: sink-merge.js receives all inputs as CLI flags; Phase 6 command file reads Sink block and constructs flags
- Pros: Mirrors claim.js argv pattern; decouples from state format; easy to test
- Risk: Low

### Option C-refined-A: OFFLINE skips network ops only (SELECTED)
- Summary: OFFLINE=1 skips git fetch/pull/push and all gh CLI calls but runs all local git ops (rebase, merge --ff-only, branch delete local)
- Pros: Cases 3 and 4 can drive real rebase + ff-merge against local bare repo without network
- Risk: Low

### Option D1: Real git init + local bare repo as fake remote (SELECTED)
- Summary: `git init --bare remote.git`, `git init work`, `git remote add origin ../remote.git` — validates real rebase, merge-base, conflict, FF-merge semantics
- Pros: Validates AC2-AC5 without mocking; ~80-120 lines setup per case; ~1-2s per case
- Risk: Low

---

## Advisor Findings

Advisor approved all five integrated choices. Four gaps must be wired into Phase 3:

**Gap 1 — No-issue branch name fallback** (resolved internally):
When `--issue` is absent, fall back to `workflow/{project}` (not `issue-none-foo`). Allows free-form task workflows without breaking.

**Gap 2 — Stage 1 migration explicit split** (resolved internally):
New `claim.js patch-branch` subcommand handles: (i) patch lock JSON to add branch field, (ii) rewrite Sink block with real branch name, (iii) edit GitHub claim comment. Phase 1 command calls `git checkout -b {branch}` THEN `claim.js patch-branch --project {p} --session {s} --branch {b}`. Maintains claim.js as single owner of lock/Sink/GitHub state.

**Gap 3 — Worktree-clean precondition** (resolved internally):
Phase 1 command must check `git status --porcelain` before `git checkout -b`. Fail-loud with remediation if dirty. Do NOT auto-stash.

**Gap 4 — git fetch failure in sink-merge.js** (resolved internally):
Fetch failure is fatal stop (not silent proceed). Skip-check would otherwise compare against stale origin/main, falsely deciding "no rebase needed".

Non-blocking watch items from advisor:
- simulate.js projected size ~650-700 lines (under 800-line cap)
- Re-validation runs twice in contested case (Phase 6 Step 1 pre-rebase + sink-merge.js Step 4 post-rebase) — by design
- Pre-commit hook unaffected by ff-merge (no merge commit = no pre-commit trigger)

---

## Selected Approach

| Sub-decision | Choice |
|---|---|
| A-naming (branch string in Sink block) | cmdClaim computes and writes via updated updateSinkLease (replace-then-write) |
| A-creation (git checkout -b) | Phase 1 command file, idempotent existence check |
| B (args to sink-merge.js) | CLI flags --branch --issue --project |
| C-refined (OFFLINE semantics) | Skip network ops only (fetch/pull/push/gh); keep local git |
| D (Cases 3 and 4 scaffolding) | Real git init + local bare repo, no mocks |
| Gap 1 (no-issue fallback) | workflow/{project} |
| Gap 2 (Stage 1 migration) | claim.js patch-branch subcommand |
| Gap 3 (worktree-clean check) | git status --porcelain before checkout; fail-loud, no auto-stash |
| Gap 4 (fetch failure) | Fatal stop in sink-merge.js step 1 |

Rationale: cmdClaim is already the single writer of the Sink block — extending it to write the real branch name at claim time eliminates the TBD staleness problem at the lowest cost. Phase 1 command files are the established home for worktree operations (claim.js convention). CLI flags mirror the existing argv pattern and keep sink-merge.js testable in isolation. OFFLINE semantics that preserve local git operations make Cases 3 and 4 testable with a real bare repo without network. Real git scaffolding validates the exact acceptance criteria (merge-base, rebase, conflict, FF race) that the issue requires.

---

## Out of Scope (explicit)

- Codex twin of sink-merge.js
- Git/gh abstraction layer
- --dry-run flag (KAOLA_WORKFLOW_OFFLINE already governs this)
- Reusable retry helper module (inline 3-iteration loop)
- Branch-naming module (one-line template)
- automerge_attempt state field
- prepare/init subcommand on sink-merge.js
- Markdown-parsing helpers in sink-merge.js
- Shell-wrapper/mock layer for git
- Persistent retry state or cross-session merge serialization
- PR-based sink (out-of-scope per issue)

---

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
