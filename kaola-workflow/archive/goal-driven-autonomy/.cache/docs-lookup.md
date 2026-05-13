# Docs Lookup Notes

Current external behavior matters because issue #1 explicitly references Claude Code goal/Stop-hook behavior, Claude skills/subagents/model configuration, and Codex task behavior.

## Claude Code Docs

- `https://code.claude.com/docs/en/hooks` documents lifecycle events including `Stop`; Stop hooks can return `ok: false` with a reason to continue working. It also documents prompt-based hooks and shows a multi-criteria Stop hook example.
- `https://code.claude.com/docs/en/slash-commands` says custom commands have been merged into skills, existing `.claude/commands/` files still work, and skills are recommended because they support additional files.
- `https://code.claude.com/docs/en/sub-agents` says Claude can delegate automatically based on request, agent description, and current context; users can also invoke subagents explicitly.
- `https://code.claude.com/docs/en/model-config` says the `best` alias maps to the most capable available model and is currently equivalent to `opus`; `opus` is the latest Opus model for complex reasoning.

## OpenAI Codex Docs

- `https://developers.openai.com/codex/quickstart` says Codex can work locally in the app, IDE extension, CLI, or cloud, and in Agent mode can read files, run commands, and write changes in the project directory.
- `https://developers.openai.com/api/docs/guides/code-generation#use-codex` says Codex is OpenAI's coding agent for software development and recommends the latest GPT-5 family general-purpose model, such as `gpt-5.5`, for most code generation tasks.

## Implementation Implications

- Claude guidance can explicitly recommend `/goal` or an equivalent prompt-based Stop hook for phase objectives.
- Codex guidance should express the same stop condition as a skill-level goal contract: continue until the phase objective and completion audit pass; do not stop merely because a substep finished.
- Advisor/expert gates can be internal: consult configured Opus/advisor for Claude and strongest available expert/profile for Codex, then record and apply the chosen answer without a user round trip unless true authorization or ownership is involved.
