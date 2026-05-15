# Advisor Plan Gate - issue-24

## Review

The blueprint is scoped correctly. The main risk is making the receipt check only a prompt phrase. The implementation should put the durable receipt writing in script code, update routing prompts to call the script, and add corpus checks so future edits cannot silently remove the guard.

## Required revisions

- Include online issue sync before candidate selection.
- Include a deterministic queue policy.
- Keep `bootstrap` available.
- Copy the root claim script to the packaged Codex script after implementation.
- Add tests for missing issue in local roadmap being created during startup.

## Result

Plan approved with no further architecture revision needed.
