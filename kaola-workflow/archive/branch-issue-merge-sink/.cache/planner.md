# Planner — branch-issue-merge-sink

## Framing Corrections

Sub-decision A conflated branch *name* writing and branch *creation* (two different operations). Sub-decision C as originally posed was a false binary — the correct semantics are to skip network-dependent ops only, not all git ops.

---

## Sub-decision A-naming: Where does the branch name string get written into the Sink block?

### A-naming-1: cmdClaim writes the deterministic name (RECOMMENDED)
- cmdClaim computes `branch = 'workflow/issue-' + args.issue + '-' + args.project` and replaces `branch: TBD` via updated `updateSinkLease` (replace-then-write, not in-place)
- Pros: Atomic with lock; deterministic from existing args; matches updateSinkLease pattern
- Cons: Couples branch-name convention to claim.js (minor)
- Risk: Low; Complexity: ~5 lines

### A-naming-2: sink-merge.js or Phase 1 backfills the name
- Pros: Keeps claim.js focused on locking
- Cons: Re-introduces staleness bug; two writers to same state field
- Risk: Medium

**Recommendation: A-naming-1**

---

## Sub-decision A-creation: Where does `git checkout -b` run?

### A-creation-1: Phase 1 command file (RECOMMENDED)
- Phase 1 command reads branch name from Sink block and runs `git checkout -b {branch}` with idempotent existence check
- Pros: Command files own git operations; branch exists by time Phase 4 starts; no git side effects in claim.js
- Risk: Low

### A-creation-2: cmdClaim
- Cons: Loads claim.js with destructive worktree ops; hard to test offline; mismatches claim semantics
- Risk: Medium

### A-creation-3: sink-merge.js `prepare` subcommand
- Cons: YAGNI; mismatched responsibilities
- Fit: Weak

**Recommendation: A-creation-1**

---

## Sub-decision B: How does sink-merge.js receive branch and issue number?

### B1: Read from workflow-state.md Sink block
- Cons: Couples script to markdown parsing; harder to test; breaks clean separation
- Fit: Weak

### B2: CLI flags `--branch --issue --project` (RECOMMENDED)
- Mirrors claim.js argv pattern exactly; decouples from state format; Phase 6 command file reads Sink to construct flags
- Risk: Low; Fit: Strong

### B3: Read lock file directly
- Cons: Lock file doesn't carry branch; duplicates state
- Fit: Weak

**Recommendation: B2**

---

## Sub-decision C-refined: OFFLINE semantics

### C-refined-A: OFFLINE skips network ops only (RECOMMENDED)
- Skip: git fetch, git pull, git push, ghExec, gh issue close
- Run: git merge-base, git rebase, git checkout, git merge --ff-only, branch delete (local only in OFFLINE)
- Pros: Cases 3 and 4 can drive real rebase + ff-merge against local bare repo without network
- Risk: Low; Fit: Strong (matches claim.js OFFLINE principle)

(C1, C2, C3 rejected — see framing section)

**Recommendation: C-refined-A**

---

## Sub-decision D: Cases 3 and 4 scaffolding

### D1: git init + local bare repo as fake remote (RECOMMENDED)
- `git init --bare remote.git`, `git init work`, `git remote add origin ../remote.git`
- Validates real rebase, merge-base, conflict, FF-merge semantics — what acceptance criteria 2-5 require
- Risk: Low; ~80-120 lines setup per case; ~1-2s per case

### D2: Shell-wrapper to intercept git
- Cons: Fragile, maintenance burden, defeats integration testing purpose
- Fit: Weak

### D3: Test non-git parts only
- Cons: Cannot validate AC2 or AC3 (the core of the issue)
- Fit: Weak

**Recommendation: D1**

---

## Integrated Recommendation

| Sub-decision | Choice |
|---|---|
| A-naming (branch string in Sink block) | cmdClaim computes and writes via updated updateSinkLease |
| A-creation (git checkout -b) | Phase 1 command file, idempotent existence check |
| B (args to sink-merge.js) | CLI flags --branch --issue --project |
| C-refined (OFFLINE semantics) | Skip network ops only (fetch/pull/push/gh); keep local git |
| D (Cases 3 and 4 scaffolding) | Real git init + local bare repo, no mocks |

---

## Implicit Constraints

1. Slug source: args.project (already isSafeName-validated) — reuse directly, no slugify routine
2. phase6-merge-conflict.md location: kaola-workflow/{project}/ (mirrors phase artifacts)
3. MAX_AUTOMERGE_RETRIES = 3: in-process constant, not a state field, not persisted
4. TBD precondition: if Sink block shows branch: TBD, fail loud with remediation message
5. git pull --ff-only (step 5): skip in OFFLINE mode (no upstream movement to consume)
6. Sink block update: replace-then-write (read content → build new block → fs.writeFileSync whole file)

---

## Contract Test Additions

- assertIncludes('install.sh', 'kaola-workflow-sink-merge.js')
- assertIncludes('scripts/kaola-workflow-claim.js', "workflow/issue-") to verify TBD replaced
- assertIncludes('commands/kaola-workflow-phase6.md', 'kaola-workflow-sink-merge.js')
- assertIncludes('commands/workflow-next.md', 'Branch:')

---

## Items NOT to Build

- Codex twin
- Git/gh abstraction layer
- --dry-run flag (KAOLA_WORKFLOW_OFFLINE already governs this)
- Reusable retry helper module (inline 3-iteration loop)
- Branch-naming module (one-line template)
- automerge_attempt state field
- prepare/init subcommand on sink-merge.js
- Markdown-parsing helpers in sink-merge.js (Phase 6 command file reads Sink and passes flags)
- Shell-wrapper/mock layer for git
- Persistent retry state or cross-session merge serialization
