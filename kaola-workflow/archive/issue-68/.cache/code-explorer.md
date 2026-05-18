# Code Explorer Notes: issue-68

## Findings

- Existing review sink records review artifact identity into workflow state and phase summary.
- Existing direct merge sink fast-forwards main, pushes main, then closes the linked issue.
- #67 GitLab claim normalizes fallback to `sink: mr`.
- #72 GitLab forge normalizes `mr_iid`, `mr_url`, `web_url`, and MR state.
- GitLab sinks must use MR fields and avoid user-visible PR wording.

