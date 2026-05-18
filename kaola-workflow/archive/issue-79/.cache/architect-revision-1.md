# Architect Revision 1 — Issue #79 Blueprint Delta

Addresses two gaps identified by advisor-plan.md. This is a delta against architect.md.

---

## Gap 1 Fix: Redirect-block extraction anchor

**Problem**: `extractRedirectBlock` matched the first ` ```markdown ` fence containing `# AGENTS.md`. The worked migration example also opens with `# AGENTS.md` as a placeholder.

**Resolution (option a)**: Require the fenced block to contain BOTH `# AGENTS.md` AND the sentinel `> **MANDATORY — READ CLAUDE.md`.

**Updated `extractRedirectBlock` function (replaces the one in Task 8)**:
```javascript
function extractRedirectBlock(file) {
  const text = read(file);
  const fenceOpen = '```markdown';
  const fenceClose = '\n```';
  let idx = 0;
  while (idx < text.length) {
    const fence = text.indexOf(fenceOpen, idx);
    if (fence === -1) break;
    const blockStart = fence + fenceOpen.length;
    const blockEnd = text.indexOf(fenceClose, blockStart);
    if (blockEnd === -1) break;
    const block = text.slice(blockStart, blockEnd + 1).trim();
    if (block.includes('# AGENTS.md') && block.includes('> **MANDATORY — READ CLAUDE.md')) {
      return block;
    }
    idx = blockEnd + fenceClose.length;
  }
  throw new Error(file + ': no AGENTS.md redirect block found (must contain # AGENTS.md and MANDATORY sentinel)');
}
```

**Implication for all four init files**: The canonical redirect block is in ` ```markdown ` fences. The worked migration example must use ` ```text ` fences (or unlabeled ` ``` ` or ` ```markdown ` but with `<canonical redirect block, ...>` placeholder text — which won't contain the MANDATORY sentinel). The sentinel requirement is the primary guard.

Practical instruction for init file authors: the worked migration example should use ` ```text ` fence or show the placeholder literally (not the real redirect block). This is natural since the example is illustrative, not a verbatim block.

---

## Gap 2 Fix: CLAUDE.md template byte-equality within forge pair

**Problem**: Byte-equality was added for AGENTS.md redirect only. The CLAUDE.md template within each forge pair (GitHub command ↔ GitHub SKILL, GitLab command ↔ GitLab SKILL) also needs byte-equality enforcement.

**Resolution**: Add HTML comment markers to all four init files wrapping the CLAUDE.md template content. Extract between markers for comparison.

### Marker convention (MUST be present in all four init files)
```
<!-- KW-CLAUDE-TEMPLATE-START -->
[full CLAUDE.md template prose here]
<!-- KW-CLAUDE-TEMPLATE-END -->
```

These markers wrap only the template itself — not the surrounding explanation prose ("Create or update CLAUDE.md with the following content:"). They are placed immediately before and after the embedded template.

### Updated extractClaudeTemplate function (new, add to Task 8)
```javascript
function extractClaudeTemplate(file) {
  const text = read(file);
  const START = '<!-- KW-CLAUDE-TEMPLATE-START -->';
  const END = '<!-- KW-CLAUDE-TEMPLATE-END -->';
  const startIdx = text.indexOf(START);
  const endIdx = text.indexOf(END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error(file + ': missing KW-CLAUDE-TEMPLATE-START/END markers');
  }
  return text.slice(startIdx + START.length, endIdx).trim();
}
```

### New byte-equality assertions for Task 8 (add after the redirect block check)
```javascript
// CLAUDE.md template byte-equality within each forge pair
const githubClaudeTemplate = extractClaudeTemplate('commands/workflow-init.md');
const githubSkillTemplate = extractClaudeTemplate(`${pluginRoot}/skills/kaola-workflow-init/SKILL.md`);
assert(githubClaudeTemplate === githubSkillTemplate,
  'CLAUDE.md template must be byte-identical within GitHub forge pair (commands/workflow-init.md vs GitHub SKILL.md)');
```

### New byte-equality assertions for Task 9 (add to GitLab validator)
```javascript
const gitlabCmdTemplate = extractClaudeTemplate('plugins/kaola-workflow-gitlab/commands/workflow-init.md');
const gitlabSkillTemplate = extractClaudeTemplate(`${gitlabSkillsBase}/kaola-workflow-init/SKILL.md`);
assert(gitlabCmdTemplate === gitlabSkillTemplate,
  'CLAUDE.md template must be byte-identical within GitLab forge pair');
```

Note: the `extractClaudeTemplate` function in Task 9 (GitLab validator) must use a path relative to the GitLab validator's `__dirname` or an absolute path. The validator at `plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` already uses `path.resolve(__dirname, '../../..')` or similar for root-relative paths — follow the existing convention.

### Updated task ownership
- **Task 8** additionally: add `extractClaudeTemplate` helper + GitHub forge pair assertion
- **Task 9** additionally: add `extractClaudeTemplate` helper (or import from Task 8's file — but since these are separate files, duplicate the helper) + GitLab forge pair assertion
- **Tasks 3, 4, 5, 6** additionally: wrap the embedded CLAUDE.md template with `<!-- KW-CLAUDE-TEMPLATE-START -->` and `<!-- KW-CLAUDE-TEMPLATE-END -->` markers

---

## `gitlabSkillsBase` variable verification

Task 9 references `${gitlabSkillsBase}/kaola-workflow-init/SKILL.md`. The variable must be confirmed in `validate-kaola-workflow-gitlab-contracts.js`. If the file uses a different variable (e.g., `skillsRoot`, `gitlabPluginRoot + '/skills'`), use the actual variable. If absent, define:
```javascript
const gitlabSkillsBase = path.resolve(__dirname, '../skills');
```
(Standard pattern — `__dirname` is the scripts dir, `../skills` is the skills dir within the plugin.)

---

## Summary of changes to existing tasks

| Task | Delta |
|------|-------|
| Task 3 | Add `<!-- KW-CLAUDE-TEMPLATE-START -->` / `<!-- KW-CLAUDE-TEMPLATE-END -->` markers around CLAUDE.md template in `commands/workflow-init.md`. Use ` ```text ` for the worked migration example fence. |
| Task 4 | Same markers in `plugins/kaola-workflow-gitlab/commands/workflow-init.md`. |
| Task 5 | Same markers around CLAUDE.md template in GitHub SKILL.md. |
| Task 6 | Same markers in GitLab SKILL.md. |
| Task 8 | Update `extractRedirectBlock` to require MANDATORY sentinel. Add `extractClaudeTemplate` helper. Add GitHub forge pair byte-equality check. |
| Task 9 | Verify `gitlabSkillsBase` variable. Add `extractClaudeTemplate` helper. Add GitLab forge pair byte-equality check. |
