#!/usr/bin/env bash
set -euo pipefail

FORGE=github
AGENTS_DIR="$HOME/.claude/agents"
AGENT_MANIFEST_FILE="$AGENTS_DIR/.kaola-workflow-agent-manifest"
MANAGED_AGENT_MARKER="kaola-workflow-managed-agent: true"
REQUIRED_AGENTS=("code-explorer" "docs-lookup" "planner" "code-architect" "tdd-guide" "build-error-resolver" "code-reviewer" "security-reviewer" "doc-updater")

usage() {
  echo "Usage: ./uninstall.sh [--forge=github|gitlab|all]"
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --forge=*)
      FORGE="${1#--forge=}"
      shift
      ;;
    --forge)
      if [[ -z "${2:-}" ]]; then
        echo "--forge requires github, gitlab, or all" >&2
        usage >&2
        exit 2
      fi
      FORGE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$FORGE" in
  github|gitlab|all) ;;
  *)
    echo "Unknown forge: $FORGE" >&2
    usage >&2
    exit 2
    ;;
esac

removed=0

shopt -s nullglob

for agent in "${REQUIRED_AGENTS[@]}"; do
  dest="$AGENTS_DIR/$agent.md"
  if [[ -f "$dest" ]] && grep -Fq "$MANAGED_AGENT_MARKER" "$dest"; then
    rm "$dest"
    echo "Removed managed agent: $dest"
    removed=$((removed + 1))
  fi
done

if [[ -f "$AGENT_MANIFEST_FILE" ]]; then
  managed_remaining=0
  for agent in "${REQUIRED_AGENTS[@]}"; do
    dest="$AGENTS_DIR/$agent.md"
    if [[ -f "$dest" ]] && grep -Fq "$MANAGED_AGENT_MARKER" "$dest"; then
      managed_remaining=1
      break
    fi
  done
  if [[ "$managed_remaining" -eq 0 ]]; then
    rm "$AGENT_MANIFEST_FILE"
    echo "Removed managed agent manifest: $AGENT_MANIFEST_FILE"
    removed=$((removed + 1))
  fi
fi

COMMANDS=(
  "$HOME/.claude/commands/workflow-next.md"
  "$HOME/.claude/commands/kaola-workflow.md"
  "$HOME/.claude/commands/kaola-workflow"*.md
  "$HOME/.claude/commands/claude-workflow.md"
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

remove_dir() {
  local dir="$1"
  if [[ -d "$dir" ]]; then
    rm -rf "$dir"
    echo "Removed: $dir"
    removed=$((removed + 1))
  fi
}

if [[ "$FORGE" = "github" || "$FORGE" = "all" ]]; then
  remove_dir "$HOME/.claude/kaola-workflow"
  remove_dir "$HOME/.claude/claude-workflow"
fi

if [[ "$FORGE" = "gitlab" || "$FORGE" = "all" ]]; then
  remove_dir "$HOME/.claude/kaola-workflow-gitlab"
fi

if [[ "$removed" -eq 0 ]]; then
  echo "Not installed — nothing to remove."
fi
