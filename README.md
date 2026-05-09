# Claude Workflow

A 6-phase, Claude-native development workflow with per-phase file artifacts, multi-model orchestration, and full resumability across sessions and context resets.

## Dependency — Everything Claude Code (ECC)

> **This plugin requires ECC to be installed.**
>
> The workflow delegates work to ECC-provided agents at each phase:
>
> | Agent | Phase | Model |
> |-------|-------|-------|
> | `planner` | 2 — Ideation | Opus |
> | `code-architect` | 3 — Plan | Sonnet |
> | `tdd-guide` | 4 — Execute (per task) | Sonnet |
> | `code-reviewer` | 5 — Review | Sonnet |
> | `security-reviewer` | 5 — Review (conditional) | Sonnet |
> | `doc-updater` | 6 — Finalize | Haiku |
>
> Install ECC first: https://github.com/affaan-m/everything-claude-code
>
> The `advisor()` Opus gate (Phases 2, 3, and conditional Phase 5) requires `"advisorModel": "opus"` in `~/.claude/settings.json`.

## Installation

```bash
git clone https://github.com/yourhandle/Claude-Workflow.git
cd Claude-Workflow
./install.sh
```

To uninstall:

```bash
./uninstall.sh
```

## Usage

In any Claude Code session, run:

```
/claude-workflow
```

The command scans the project root for existing `claude-workflow/` projects and offers to resume or start a new one.

## Phases

| # | Phase | What happens | Output file |
|---|-------|-------------|-------------|
| 1 | Research | Codebase exploration, requirement parsing, completeness gate | `phase1-research.md` |
| 2 | Ideation | Planner (Opus) generates 2–3 approaches → advisor() gate → user selects | `phase2-ideation.md` |
| 3 | Plan | code-architect produces implementation blueprint → advisor() gate | `phase3-plan.md` |
| 4 | Execute | Per-task TDD loop: tdd-guide writes tests → implement → validate → checkpoint | `phase4-progress.md` |
| 5 | Review | code-reviewer always; security-reviewer conditional; advisor if CRITICAL | `phase5-review.md` |
| 6 | Finalize | Full validation, doc update, commit, optional GitHub issue close | `phase6-summary.md` |

All files are written to `{project-root}/claude-workflow/{project-name}/` — never inside `~/.claude`.

## Resuming

Any interrupted session resumes from the last completed phase file. Phase 4 tracks `pending / in_progress / complete` per task in `phase4-progress.md`, so even a mid-task crash is recoverable.

## Updating

```bash
cd Claude-Workflow
git pull
./install.sh
```
