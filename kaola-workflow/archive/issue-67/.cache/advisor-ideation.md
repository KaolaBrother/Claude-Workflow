# Advisor Ideation Gate: issue-67

## Hidden Risks Checked

- Accidentally porting legacy session/lock/ticker behavior: avoid by writing fresh GitLab-local scripts instead of blind copying.
- Treating `workflow:in-progress` as durable ownership: reject for GitLab; stale advisory labels must not block when no local active folder exists.
- Cross-import fallback into root or GitHub plugin scripts: reject; only local GitLab scripts and `kaola-gitlab-forge.js` may be required.
- Overbuilding MR merge sinks: keep out of scope for #67 and only set `sink: mr` on fallback.

## Recommendation

Use a self-contained port with small GitLab-specific scripts and focused tests for active-folder behavior, startup selection, closed-issue residue, stale advisory labels, roadmap refresh, and sink fallback.

