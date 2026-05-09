#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMMANDS_DIR="$HOME/.claude/commands"
COMMAND_FILE="$SCRIPT_DIR/commands/claude-workflow.md"
DEST="$COMMANDS_DIR/claude-workflow.md"
YES=0

for arg in "$@"; do
  case "$arg" in
    -y|--yes)
      YES=1
      ;;
    -h|--help)
      echo "Usage: ./install.sh [--yes]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: ./install.sh [--yes]" >&2
      exit 2
      ;;
  esac
done

echo "Claude Workflow — installer"
echo ""

# Check ECC is installed
ECC_AGENTS_DIR="$HOME/.claude/agents"
REQUIRED_AGENTS=("planner" "code-architect" "tdd-guide" "code-reviewer" "security-reviewer" "doc-updater")
MISSING=()
FILE_MISSING=()
AGENTS_LIST=""

for agent in "${REQUIRED_AGENTS[@]}"; do
  if [[ -f "$ECC_AGENTS_DIR/$agent.md" ]]; then
    continue
  fi

  FILE_MISSING+=("$agent")
done

if [[ ${#FILE_MISSING[@]} -gt 0 ]]; then
  if command -v claude >/dev/null 2>&1; then
    AGENTS_LIST="$(claude agents 2>/dev/null || true)"
  fi

  for agent in "${FILE_MISSING[@]}"; do
    if [[ "$AGENTS_LIST" == *" $agent "* || "$AGENTS_LIST" == *" $agent ·"* || "$AGENTS_LIST" == *"everything-claude-code:$agent"* ]]; then
      continue
    fi

    if [[ "$AGENTS_LIST" == *"$agent ·"* ]]; then
      continue
    fi

    if [[ "$AGENTS_LIST" != *"$agent"* ]]; then
      MISSING+=("$agent")
    fi
  done
fi

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "WARNING: The following ECC agents were not found in $ECC_AGENTS_DIR:"
  for m in "${MISSING[@]}"; do
    echo "  - $m"
  done
  echo ""
  echo "This workflow requires Everything Claude Code (ECC) agents."
  echo "Recommended install inside Claude Code:"
  echo "  /plugin marketplace add https://github.com/affaan-m/everything-claude-code"
  echo "  /plugin install everything-claude-code@everything-claude-code"
  echo ""
  if [[ "$YES" -ne 1 ]]; then
    read -r -p "Continue installation anyway? [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
  fi
  echo ""
fi

# Install the command
if [[ ! -f "$COMMAND_FILE" ]]; then
  echo "Command file not found: $COMMAND_FILE" >&2
  exit 1
fi

mkdir -p "$COMMANDS_DIR"
cp "$COMMAND_FILE" "$DEST"

echo "Installed: $DEST"
echo ""
echo "Open any Claude Code session and run:  /claude-workflow"
echo ""
echo "For advisor gates, ensure your ~/.claude/settings.json includes:"
echo '  "advisorModel": "opus"'
