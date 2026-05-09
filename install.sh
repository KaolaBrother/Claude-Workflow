#!/usr/bin/env bash
set -euo pipefail

COMMANDS_DIR="$HOME/.claude/commands"
COMMAND_FILE="commands/claude-workflow.md"
DEST="$COMMANDS_DIR/claude-workflow.md"

echo "Claude Workflow — installer"
echo ""

# Check ECC is installed
ECC_AGENTS_DIR="$HOME/.claude/agents"
REQUIRED_AGENTS=("planner" "code-architect" "tdd-guide" "code-reviewer" "security-reviewer" "doc-updater")
MISSING=()

for agent in "${REQUIRED_AGENTS[@]}"; do
  if [[ ! -f "$ECC_AGENTS_DIR/$agent.md" ]]; then
    MISSING+=("$agent")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "WARNING: The following ECC agents were not found in $ECC_AGENTS_DIR:"
  for m in "${MISSING[@]}"; do
    echo "  - $m"
  done
  echo ""
  echo "This workflow requires Everything Claude Code (ECC) >= 2.0.0."
  echo "Install it from: https://github.com/affaan-m/everything-claude-code"
  echo ""
  read -r -p "Continue installation anyway? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
  echo ""
fi

# Install the command
mkdir -p "$COMMANDS_DIR"
cp "$COMMAND_FILE" "$DEST"

echo "Installed: $DEST"
echo ""
echo "Open any Claude Code session and run:  /claude-workflow"
echo ""
echo "Also ensure your ~/.claude/settings.json includes:"
echo '  "advisorModel": "opus"'
