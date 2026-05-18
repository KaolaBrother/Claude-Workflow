# TDD Task 4 — Update plugins/kaola-workflow-gitlab/commands/workflow-init.md (GitLab Claude command)

## RED evidence
- `KW-CLAUDE-TEMPLATE-START` absent (0 matches)
- `Goal-driven execution` in template absent (0 matches)
- `## Step 3 — Create AGENTS.md` absent (0 matches)

## GREEN evidence
- `node plugins/kaola-workflow-gitlab/scripts/validate-kaola-workflow-gitlab-contracts.js` → exit 0 "Kaola-Workflow GitLab contract validation passed"
- Same structural changes as Task 3 confirmed
- Zero GitHub-specific tokens in redirect block, idempotency prose, NNR

## Modified files
- `plugins/kaola-workflow-gitlab/commands/workflow-init.md`

## Deviations
None.
