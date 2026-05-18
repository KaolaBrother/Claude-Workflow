# Phase 6 Step 3 — Documentation Updates for Issue #77

**Date:** 2026-05-18  
**Task:** Update documentation to reflect typed-acknowledgement delegation gate additions

## Summary of Changes

Issue #77 added a delegation authorization contract to all Codex workflow phases. This required documentation updates to describe the new `delegation_policy:` field, the four-token compliance vocabulary, and the explicit authorization requirement.

## Changes Made

### 1. CHANGELOG.md — Added Issue #77 Entry

**Status:** UPDATED

Added new section under `[Unreleased]` documenting:
- Delegation Contract in workflow-next skills (both GitHub and GitLab editions)
- Removal of ungated fallback language from 6 phase skills
- Four-token compliance vocabulary: `subagent-invoked`, `local-fallback-explicit`, `local-fallback-tool-unavailable`, `N/A`
- Validator assertion updates

**Location:** `/CHANGELOG.md` lines 3-17 (new section before existing fixed sections)

### 2. docs/workflow-state-contract.md — Documented delegation_policy Field

**Status:** UPDATED

Added documentation in two places:

1. Updated the "Durable Sources" section to mention `delegation_policy` as a field in `workflow-state.md` and added reference to a new "Workflow State Fields" section.

2. Added new "Workflow State Fields" section explaining:
   - Structure of key blocks in workflow-state.md
   - Definition of the three `delegation_policy:` values and what each records in compliance ledgers
   - Connection between authorization policy and compliance audit trail tokens

**Location:** `/docs/workflow-state-contract.md` lines 7-44

### 3. README.md — Clarified Delegation Contract for Codex

**Status:** UPDATED

Replaced the ungated "when subagents are available... otherwise perform locally" language with explicit delegation contract language:

**Old text:** "When Codex subagents are available, phases use those roles for detached research... otherwise the current Codex session follows the same role contracts locally."

**New text:** "At startup, Codex workflows ask the user to authorize a delegation policy (`delegate`, `local-authorized`, or `tool-unavailable`). When policy permits and subagents are available, phases invoke those roles for detached research... Otherwise, the current Codex session performs the work locally under explicit user authorization."

**Location:** `/README.md` lines 230-237

## Changes NOT Made (With Reasons)

### 1. README.md — Autonomy Section
No update needed. The "Autonomy And Goal Contract" section already correctly states that users should be prompted only for "true external authorization or materially user-owned choices." The delegation policy authorization is exactly this type of choice. The existing prose is compatible with issue #77.

### 2. README.md — Codex Profiles Table
No update needed. The reasoning-effort table correctly lists the role configurations. The delegation contract enforcement is a workflow-level gate, not a role profile property, so this table remains accurate and doesn't need modification.

### 3. README.md — Installation or Scripts Sections
No update needed. These sections document feature/capability, not compliance vocabulary or delegation state. The typing vocabulary is internal to phase artifacts and workflow state, not exposed in user-facing commands or configuration.

### 4. docs/api.md or docs/architecture.md
No update needed. These files don't document compliance vocabulary or delegation contracts. They document API surfaces and architectural patterns, neither of which changed in issue #77.

## Validation

All updates follow the durable-state contract:
- ✓ `CHANGELOG.md` added entry for issue #77 describing user-facing changes
- ✓ `workflow-state-contract.md` updated to document the new `delegation_policy:` field
- ✓ `README.md` updated Codex section to explain explicit authorization requirement
- ✓ No new documentation files created
- ✓ No obsolete references introduced

## Test Coverage

The changes are validated by existing test suite:
- `scripts/validate-kaola-workflow-contracts.js` — asserts absence of ungated fallback language and presence of four-token vocabulary in all Codex phase skills
- `scripts/validate-kaola-workflow-contracts.js` — mirrors exist for GitLab edition in `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js`
