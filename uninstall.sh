#!/usr/bin/env bash
set -euo pipefail

DEST="$HOME/.claude/commands/claude-workflow.md"

if [[ -f "$DEST" ]]; then
  rm "$DEST"
  echo "Removed: $DEST"
else
  echo "Not installed — nothing to remove."
fi
