# Vendored Claude Code Agents

Kaola-Workflow vendors the Claude Code agent prompts it needs so users do not
have to install Everything Claude Code (ECC) separately.

## Upstream

- Repository: <https://github.com/affaan-m/everything-claude-code>
- Pinned commit: `922d2d8f8b64f4e50936e24465cb3bcac81ac0e1`
- License: MIT License
- Copyright: Copyright (c) 2026 Affaan Mustafa

## Vendored Files

| Local file | Upstream path | Upstream blob SHA |
|------------|---------------|-------------------|
| `agents/build-error-resolver.md` | `agents/build-error-resolver.md` | `2ab19ac35497ae2e1b7a33f238a6953867fc5572` |
| `agents/code-architect.md` | `agents/code-architect.md` | `e99b3c718087e3be05c1763182cf904b8b25edb4` |
| `agents/code-explorer.md` | `agents/code-explorer.md` | `a391679941f71b8ff0e12cc6d9bb025a899eabb7` |
| `agents/code-reviewer.md` | `agents/code-reviewer.md` | `af791188ac87321f749a96f140a85c739303f453` |
| `agents/doc-updater.md` | `agents/doc-updater.md` | `0da663329128a5a03ff811c39c0c01004cab5ac1` |
| `agents/docs-lookup.md` | `agents/docs-lookup.md` | `348d67c22219b3a51fde972ceffc1cc2f2e896e5` |
| `agents/planner.md` | `agents/planner.md` | `c311f492bd1d3bae077c86716163966789eefae2` |
| `agents/security-reviewer.md` | `agents/security-reviewer.md` | `c444a61988937bb50812451ccb192cfac7368ad0` |
| `agents/tdd-guide.md` | `agents/tdd-guide.md` | `1d0849840f0f5ed76541a48b2b4b0912b8926024` |

## Refresh Procedure

1. Choose the upstream commit to vendor and update the pinned commit above.
2. Fetch the same 9 upstream files from `affaan-m/everything-claude-code`.
3. Preserve each file's YAML front matter as the first bytes of the file.
4. Insert the Kaola attribution comment immediately after the closing front
   matter delimiter. Do not place attribution before the first `---`.
5. Update the upstream blob SHA table in this document.
6. Run:

   ```bash
   node scripts/validate-vendored-agents.js
   npm test
   ```
