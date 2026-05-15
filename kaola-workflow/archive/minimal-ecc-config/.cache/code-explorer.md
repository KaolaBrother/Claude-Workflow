# Code Explorer: minimal-ecc-config

## 1. Current README.md ECC-related content

**"Dependency — Everything Claude Code (ECC)" section (lines 23–60):**

Blockquote callout stating the plugin requires ECC, listing which agent is used at which phase and model tier, giving install commands:

```text
/plugin marketplace add https://github.com/affaan-m/everything-claude-code
/plugin install everything-claude-code@everything-claude-code
```

Notes: ECC's npm package name is `ecc-universal`; Opus advisor requires `"advisorModel": "opus"` in `~/.claude/settings.json`; agents may appear with `everything-claude-code:` prefix if installed only as a plugin.

**"ECC Hook Policy" section (lines 351–369):**

Explains hooks are background hygiene, not workflow validation. Gives the minimal profile invocation:

```bash
ECC_HOOK_PROFILE=minimal claude
```

**Missing from README:** guidance on which ECC subagents to install vs. skip, ECC common rules, or ECC language rules.

---

## 2. CLAUDE.md content

`CLAUDE.md` (25 lines): lists key scripts, how to run tests, and a Documentation Update Checklist. Does not reference ECC agents, rules, or configurations at all.

---

## 3. ECC subagents Kaola-Workflow actually uses

From scanning all phase command files and SKILL.md files — also confirmed in `install.sh` `REQUIRED_AGENTS` array:

| Agent | Phase(s) | Role |
|---|---|---|
| `code-explorer` | 1 (Research) | Codebase exploration |
| `docs-lookup` | 1 (Research, conditional) | External/library docs lookup |
| `planner` | 2 (Ideation) | Strategy analysis |
| `code-architect` | 3 (Plan) | Blueprint creation |
| `tdd-guide` | 4 (Execute) | Per-task TDD executor |
| `build-error-resolver` | 4–6 (repair/validation) | Build/type/lint/tooling fix routing |
| `code-reviewer` | 5 (Review) | Quality review |
| `security-reviewer` | 5 (Review, conditional) | Security review |
| `doc-updater` | 6 (Finalize) | Documentation update |

Total: 9 agents. `tdd-workflow` is the TDD playbook, not a spawnable agent.

install.sh confirms:
```bash
REQUIRED_AGENTS=("code-explorer" "docs-lookup" "planner" "code-architect" "tdd-guide" "build-error-resolver" "code-reviewer" "security-reviewer" "doc-updater")
```

---

## 4. Existing ECC configuration files

None. No `.ecc/`, `ecc.json`, or `ecc-config.*` in the repository. ECC hook configuration is via env var only (`ECC_HOOK_PROFILE=minimal`). The repo's own hooks are in `hooks/hooks.json` (Claude Code plugin hooks — not ECC config).

---

## 5. Existing installation and setup instructions

**`install.sh`:** Checks for all 9 required agents in `~/.claude/agents/`; warns if any missing; does NOT configure ECC hooks or profiles.

**README.md "Installation" section (lines 62–98):** Covers plugin install (preferred) and manual install via `install.sh`. No SETUP.md or INSTALL.md file.

---

## 6. Test files and framework

| File | Purpose |
|---|---|
| `scripts/simulate-workflow-walkthrough.js` | End-to-end integration test |
| `scripts/validate-workflow-contracts.js` | Contract/structural assertions on README, commands, hooks |
| `scripts/validate-kaola-workflow-contracts.js` | Codex plugin-specific contract validation |

**Framework:** Hand-rolled Node.js assertions (`assert(condition, message)`). Run via `npm test`.

**CRITICAL CONTRACT:** `validate-workflow-contracts.js` asserts:
- `README.md` must include `'## ECC Hook Policy'`
- `README.md` must include `'ECC_HOOK_PROFILE=minimal'`
- Removing or renaming these will break the contract test

**CRITICAL CONTRACT:** `validate-kaola-workflow-contracts.js` asserts:
- Codex plugin must NOT depend on ECC (`!JSON.stringify(pluginJson).includes('ECC')`)

---

## Key Constraints Summary

1. README must retain `## ECC Hook Policy` section and `ECC_HOOK_PROFILE=minimal` string (contract test enforced)
2. The 9 required agents are already enumerated in `install.sh`; any README guidance must match
3. Codex plugin path does NOT depend on ECC (enforced separately)
4. No ECC config file format exists in the repo; the only configuration surface is the env var and agent presence in `~/.claude/agents/`
