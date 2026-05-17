# Security Review: Issue #37 — Worktree-Native Subcommands

Files reviewed: `scripts/kaola-workflow-claim.js` lines 2133–2402 (`cmdPickNext`, `cmdResume`, `cmdWorktreeStatus`, `cmdWorktreeFinalize`).

## CRITICAL
None.

## HIGH

### H1 — Missing `isSafeName` on `--project` in `cmdWorktreeFinalize` (path traversal + stray writes)
`args.project` fed directly into `worktreePathFor(root, args.project)` → `path.join(...)`, `fs.mkdirSync(dstDir)`, `fs.cpSync(srcDir, dstDir, {recursive:true})`, `git -C worktreePath commit`. With `--project '../../etc'`, writes escape `kaola-workflow/` subtree.

**Fix applied:** `assert(isSafeName(args.project), ...)` added after `assert(args.project, ...)`.

### H2 — Missing `isSafeName` on explicit `--project` in `cmdResume` (filesystem existence probe)
`path.join(mainWorktree, 'kaola-workflow', args.project)` + 6× `fs.existsSync` probes. With traversal input, caller learns whether arbitrary paths exist outside workflow scope.

**Fix applied:** `assert(isSafeName(project), ...)` added before `projectDir` construction.

## MEDIUM

### M1 — `cmdResume` `next_command` embeds unsanitized project name
`/kaola-workflow-phase5 <project>` string returned in JSON. If an orchestrator passes this to a shell unquoted, metacharacters in project name could inject. Mitigated by isSafeName fix (H2) since isSafeName rejects metacharacters. No separate fix needed.

## LOW

### L1 — No timeout on `gh`/`git ls-remote` blocking calls in `cmdPickNext` and `cmdWorktreeStatus`
Pre-existing gap in the codebase; not a regression. Hardening suggestion.

### L2 — git status output echoed in assertion message from `cmdWorktreeFinalize`
Low sensitivity (relative filenames only). Non-exploitable.

### L3 — TOCTOU between `existsSync` and `git -C` in `cmdWorktreeFinalize`
Non-exploitable race condition. Mentioned and dismissed.

## Command Injection: None
All four functions use `execFileSync` with argument arrays, not shell strings. Integers from JSON parsing (`issue.number`) are safe.

## Hardcoded Secrets: None

## Overall Verdict
NEEDS WORK (2 HIGH) → after fixes applied: PASS WITH FOLLOW-UPS (MEDIUM/LOW remain as logged)
