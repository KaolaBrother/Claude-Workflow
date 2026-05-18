# code-explorer output — issue-77

## 1. Current Fallback Language (exact lines with file:line)

### plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md
- Line 37: `Use the \`code-explorer\` Codex agent role when subagents are available; otherwise perform the same read-only research in the current session.`
- Line 38: `Use the \`docs-lookup\` Codex agent role only when current external behavior matters; otherwise record why docs lookup is N/A.`

### plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md
- Line 32: `Use the \`planner\` Codex agent role when subagents are available; otherwise perform the same strategy analysis in the current session.`
- Line 35: `Consult the strongest available expert model/profile for the session or perform the same advisor gate locally: check for missing approaches, hidden risks, and overbuilt scope.`

### plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md
- Line 37: `Use the \`code-architect\` Codex agent role when subagents are available; otherwise produce the same blueprint in the current session. Consult the strongest available expert model/profile for the session or perform the same plan self-review locally, then save it to \`.cache/advisor-plan.md\`.`

### plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md
- Line 8: `Prefer the \`tdd-guide\` Codex agent role for assigned implementation tasks when subagents are available. Use the current Codex session as the fallback executor when session policy, availability, or user direction prevents delegation.`

### plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md
- Line 33: `Use the \`code-reviewer\` Codex agent role or \`codex review\` when useful for a detached review pass; otherwise perform a review stance locally.`
- Line 35: `If auth, payments, user data, filesystem access, external APIs, or secrets changed, use the \`security-reviewer\` Codex agent role or perform the same security review locally.`

### plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md
- Line 37: `use the \`doc-updater\` Codex agent role when documentation changes are needed and subagents are available; otherwise update docs in the current session.`

### plugins/kaola-workflow-gitlab/skills/ (all mirrors)
All GitLab mirrors contain byte-for-byte identical role-delegation fallback language as the GitHub counterparts above.

---

## 2. Naming and File Organization Conventions

**Skill file structure:**
- YAML front matter: `---\nname: <skill-name>\ndescription: ...\n---`
- Single H1 header
- `## Goal Contract` section (required in all phase skills)
- `## Steps` or inline numbered steps
- Phase file templates as fenced Markdown blocks
- `## Required Agent Compliance` table with columns: `Requirement | Status | Evidence | Skip Reason`
- Current status values: `invoked`, `invoked/N/A`, `pending` — no `subagent-invoked` or `local-fallback-*` tokens exist anywhere

**GitLab mirror relationship:**
Standalone copies (not shared includes). Differences limited to: GitHub→GitLab in data-source references, `gh`→`glab` CLI, `watch-pr`→`watch-mr`, `sink: pr`→`sink: mr`, and claim script path. All role-delegation language is word-for-word identical.

---

## 3. Existing Delegation and Compliance Patterns

**Compliance ledger in skill files:** Binary vocabulary — `invoked` or `invoked/N/A`. No `subagent-invoked` or `local-fallback-*` tokens exist anywhere in SKILL.md files.

**Archived empirical bug evidence:**
`kaola-workflow/archive/roadmap-open-issues/phase4-progress.md` lines 19–23:
```
| tdd-guide executor task 1 | invoked | .cache/tdd-task-1.md | local fallback because no explicit subagent delegation was requested |
```
Free-text Skip Reason — ungated fallback was accepted as `invoked`.

**Hard-gate framing in Claude command files (reference for parity):**
`commands/kaola-workflow-phase4.md`:
- Lines 11–14: "Phase 4 is subagent-executed. The main session is the orchestrator: it does not own implementation or test code."
- Lines 83–88: `workflow-state.md` fields: `main_session_role: orchestrator`, `implementation_owner: tdd-guide`, `fix_owner: tdd-guide or build-error-resolver`, `inline_emergency_fallback_authorized: no`
- Explicit refusal list + emergency fallback requires `inline_emergency_fallback_authorized: yes` in state

`commands/kaola-workflow-phase5.md` line 51: "Review fixes are subagent-executed. Do not apply review fixes inline unless the Trivial Inline Edit Exception applies or explicit emergency fallback authorization is recorded."

**Codex execute/review/plan/ideation/research/finalize SKILL.md files have none of this hard-gate state machinery.**

---

## 4. Test Locations, Framework, and Structure

**Claude integration test:**
`scripts/simulate-workflow-walkthrough.js` — hand-rolled assert framework, exercises claim.js, classifier, roadmap, hooks. No skill delegation tests.

**Codex integration test:**
`plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` — 68 lines, exercises startup/status, checks for legacy token absence, checks validator script existence. No skill delegation tests.

**`validate-kaola-workflow-contracts.js`** (Codex skill validator):
- Verifies all 9 SKILL.md files exist
- `assertIncludes` for `name:`, `workflow-state.md`, `kaola-workflow/`
- `assertNotIncludes` for retired tokens
- Does NOT check delegation or fallback language
- Does NOT check `subagent-invoked` or `local-fallback` status vocabulary

**`validate-workflow-contracts.js`** (Claude command validator):
- Verifies command files exist, checks named strings in specific files
- Does NOT check delegation language or status vocabulary

**No existing test or validator checks delegation status vocabulary in either skills or commands.**

---

## 5. Validator Script Patterns

Both validators follow an identical pattern:
- `read(relativePath)` — `fs.readFileSync` from `path.resolve(__dirname, '..')` as repo root
- `exists(relativePath)` — `fs.existsSync`
- `assert(condition, message)` — throws Error on failure
- `assertIncludes(file, needle)` — checks `read(file).includes(needle)`
- `assertNotIncludes(file, needle)` — checks `!read(file).includes(needle)`
- `assertConcept(file, concept, termsArray)` — all terms must appear in lowercased content
- No external dependencies (pure Node.js stdlib)
- On failure: uncaught Error → non-zero exit
- On success: single `console.log(...)` → exits 0

**`validate-script-sync.js`**: enforces byte-identical copies between `scripts/` and `plugins/kaola-workflow/scripts/` for an allowlist. `validate-kaola-workflow-contracts.js` is excluded. `validate-workflow-contracts.js` IS on the allowlist and must stay byte-identical.

---

## 6. Config / Env Vars

No env var, config flag, or machine-readable signal currently controls subagent availability or delegation policy in any SKILL.md file.

| Env Var | Where Used | Effect |
|---------|-----------|--------|
| `KAOLA_WORKFLOW_OFFLINE` | test suites, claim.js | Skips network calls during local tests |
| `KAOLA_WORKTREE_NATIVE` | phase4, phase6 commands | Controls worktree provisioning |
| `KAOLA_TARGET_ISSUE` | workflow-next skill+command | Passes explicit issue number |
| `KAOLA_SINK` | workflow-next skill+command | Sets PR/merge sink |
| `KAOLA_PROJECT` | phase commands | Names active workflow project folder |
| `KAOLA_WORKTREE_PATH` | workflow-next skill | Path to linked worktree |

The condition "subagents are available" has no corresponding env variable, config key, or `workflow-state.md` field. It is entirely unresolvable by machine; no validator or script can currently detect whether delegation occurred or was skipped.

---

## Key Files

| File | Role | Importance |
|------|------|------------|
| `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` | Phase 1, lines 37–38 | High |
| `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` | Phase 2, lines 32, 35 | High |
| `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` | Phase 3, line 37 | High |
| `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` | Phase 4, line 8 | High |
| `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` | Phase 5, lines 33, 35 | High |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | Phase 6, line 37 | High |
| `plugins/kaola-workflow/skills/kaola-workflow-fast/SKILL.md` | Fast-path, line 25 deliberate inline policy | Medium |
| `plugins/kaola-workflow-gitlab/skills/*/SKILL.md` | GitLab mirrors (identical language) | High |
| `scripts/validate-kaola-workflow-contracts.js` | Codex contract validator — new assertions go here | High |
| `scripts/validate-workflow-contracts.js` | Claude contract validator (must stay byte-identical with plugins/ copy) | High |
| `scripts/validate-script-sync.js` | Drift guard for shared scripts | Medium |
| `scripts/simulate-workflow-walkthrough.js` | Claude integration tests | High |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Codex integration tests (68 lines, minimal) | High |
| `commands/kaola-workflow-phase4.md` | Claude Phase 4 — reference hard-gate pattern | Reference |
| `kaola-workflow/archive/roadmap-open-issues/phase4-progress.md` | Empirical bug artifact | Reference |
