# Docs Lookup Notes - issue-22

## Claude Code

- Source: https://code.claude.com/docs/en/sessions
- Current local version: `2.1.139 (Claude Code)`.
- Relevant facts:
  - Claude Code sessions are saved conversations tied to a project directory.
  - `claude --continue`, `claude --resume`, `claude --resume <name>`, and `/resume` resume saved sessions.
  - `/clear` starts fresh with empty context while the previous conversation remains saved and resumable.
  - Session transcripts are stored with a session id in the transcript file path.

- Source: https://code.claude.com/docs/en/hooks
- Relevant facts:
  - `SessionStart` runs on startup, resume, clear, and compact.
  - The `SessionStart` input includes `session_id`, `transcript_path`, `cwd`, `source`, and `model`.
  - `source` is `startup`, `resume`, `clear`, or `compact`.
  - `CLAUDE_ENV_FILE` is available to SessionStart hooks, and hooks can append `export` statements there for later Bash commands in the same Claude session.

## Codex

- Source: https://developers.openai.com/codex/cli/features#resuming-conversations
- Current local version: `codex-cli 0.130.0`.
- Relevant facts:
  - `codex resume`, `codex resume --all`, `codex resume --last`, and `codex resume <SESSION_ID>` reopen saved interactive sessions.
  - Resumed runs keep the original transcript, plan history, and approvals.

- Source: https://developers.openai.com/codex/app-server#start-or-resume-a-thread
- Relevant facts:
  - `thread/start` starts a fresh Codex thread.
  - `thread/resume` continues a stored session by `thread.id`.
  - `thread/fork` branches from a stored session and creates a new thread id.

- Source: https://developers.openai.com/codex/cli/slash-commands#built-in-slash-commands
- Relevant facts:
  - `/clear` clears the terminal and starts a fresh chat.
  - `/compact` summarizes the visible conversation to free tokens.
  - `/resume` resumes a saved conversation.
  - `/new` starts a new conversation inside the same CLI session.
  - `/fork` forks the current conversation into a new thread.

## Implementation Interpretation

- Claude Code: prefer hook input `session_id` and persist it as `KAOLA_SESSION_ID` for the session via `CLAUDE_ENV_FILE`.
- Codex: prefer `CODEX_THREAD_ID` when `KAOLA_SESSION_ID` is unset.
- Fallback: generate a UUID only when neither host platform id is available.
- Recovery/handoff must be explicit because normal startup cannot know whether a different platform session id should own an unfinished project.
