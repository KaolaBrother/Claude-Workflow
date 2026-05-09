#!/usr/bin/env bash
set -euo pipefail

removed=0

shopt -s nullglob
COMMANDS=(
  "$HOME/.claude/commands/claude-workflow"*.md
  "$HOME/.claude/commands/workflow-init.md"
)

for dest in "${COMMANDS[@]}"; do
  if [[ -f "$dest" ]]; then
    rm "$dest"
    echo "Removed: $dest"
    removed=$((removed + 1))
  fi
done

if [[ "$removed" -eq 0 ]]; then
  echo "Not installed — nothing to remove."
fi
