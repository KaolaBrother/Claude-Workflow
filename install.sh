#!/usr/bin/env bash
# Kaola-Workflow installer.
#
# Supports curl | bash and local execution.
#
# Usage (one-liner):
#   curl -fsSL https://raw.githubusercontent.com/KaolaBrother/Kaola-Workflow/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/KaolaBrother/Kaola-Workflow/main/install.sh | bash -s -- --forge=gitlab
#
# Usage (local clone):
#   git clone https://github.com/KaolaBrother/Kaola-Workflow.git && cd Kaola-Workflow && ./install.sh [--yes] [--forge=github|gitlab]

set -euo pipefail

# Detect curl|bash: BASH_SOURCE[0] is empty or not a real file when piped from curl.
# When detected, clone the repo to a temp dir and re-exec the local copy.
_SELF="${BASH_SOURCE[0]:-}"
if [[ -z "$_SELF" || "$_SELF" == "-" || ! -f "$_SELF" ]]; then
  if ! command -v git >/dev/null 2>&1; then
    echo "error: git is required but not found — install git and retry" >&2
    exit 1
  fi
  _TMPDIR="$(mktemp -d)"
  echo "Kaola-Workflow — cloning repository..."
  git clone --depth=1 https://github.com/KaolaBrother/Kaola-Workflow.git "$_TMPDIR/kaola-workflow" >/dev/null 2>&1
  bash "$_TMPDIR/kaola-workflow/install.sh" "$@"
  _EXIT=$?
  rm -rf "$_TMPDIR"
  exit $_EXIT
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMMANDS_DIR="$HOME/.claude/commands"
AGENTS_DIR="$HOME/.claude/agents"
SOURCE_AGENTS_DIR="$SCRIPT_DIR/agents"
AGENT_MANIFEST_FILE="$AGENTS_DIR/.kaola-workflow-agent-manifest"
MANAGED_AGENT_MARKER="kaola-workflow-managed-agent: true"
REQUIRED_AGENTS=("code-explorer" "docs-lookup" "planner" "code-architect" "tdd-guide" "build-error-resolver" "code-reviewer" "security-reviewer" "doc-updater")
YES=0
FORGE=github

usage() {
  echo "Usage: ./install.sh [--yes] [--forge=github|gitlab]"
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -y|--yes)
      YES=1
      shift
      ;;
    --forge=*)
      FORGE="${1#--forge=}"
      shift
      ;;
    --forge)
      if [[ -z "${2:-}" ]]; then
        echo "--forge requires github or gitlab" >&2
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
  github)
    SUPPORT_DIR="$HOME/.claude/kaola-workflow"
    SOURCE_COMMANDS_DIR="$SCRIPT_DIR/commands"
    SOURCE_SCRIPTS_DIR="$SCRIPT_DIR/scripts"
    SOURCE_HOOKS_DIR="$SCRIPT_DIR/hooks"
    SUPPORT_SCRIPT_NAMES=(
      kaola-workflow-repair-state.js
      kaola-workflow-claim.js
      kaola-workflow-active-folders.js
      kaola-workflow-compact-context.js
      kaola-workflow-sink-merge.js
      kaola-workflow-sink-pr.js
      kaola-workflow-roadmap.js
      kaola-workflow-classifier.js
    )
    SUPPORT_HOOK_NAMES=(
      kaola-workflow-pre-commit.sh
      kaola-workflow-phantom-advisor.sh
    )
    ;;
  gitlab)
    SUPPORT_DIR="$HOME/.claude/kaola-workflow-gitlab"
    SOURCE_COMMANDS_DIR="$SCRIPT_DIR/plugins/kaola-workflow-gitlab/commands"
    SOURCE_SCRIPTS_DIR="$SCRIPT_DIR/plugins/kaola-workflow-gitlab/scripts"
    SOURCE_HOOKS_DIR="$SCRIPT_DIR/plugins/kaola-workflow-gitlab/hooks"
    SUPPORT_SCRIPT_NAMES=(
      kaola-gitlab-forge.js
      kaola-gitlab-workflow-active-folders.js
      kaola-gitlab-workflow-claim.js
      kaola-gitlab-workflow-classifier.js
      kaola-gitlab-workflow-compact-context.js
      kaola-gitlab-workflow-repair-state.js
      kaola-gitlab-workflow-roadmap.js
      kaola-gitlab-workflow-sink-merge.js
      kaola-gitlab-workflow-sink-mr.js
    )
    SUPPORT_HOOK_NAMES=(
      kaola-workflow-pre-commit.sh
      kaola-workflow-phantom-advisor.sh
    )
    ;;
  *)
    echo "Unknown forge: $FORGE" >&2
    usage >&2
    exit 2
    ;;
esac

SUPPORT_SCRIPTS_DIR="$SUPPORT_DIR/scripts"
SUPPORT_HOOKS_DIR="$SUPPORT_DIR/hooks"

echo "Kaola-Workflow — installer"
echo "Forge: $FORGE"
echo ""

# Refuse to install if kaola-workflow is already registered via the Claude Code
# plugin runtime. Running both produces a parallel install: plugin-managed hooks
# fire from ~/.claude/plugins/data/... while these manual commands shadow plugin
# commands. The user must uninstall the plugin first.
if command -v claude >/dev/null 2>&1; then
  PLUGIN_LIST="$(claude plugin list 2>/dev/null || true)"
  if printf '%s\n' "$PLUGIN_LIST" | grep -qE 'kaola-workflow(-gitlab)?@'; then
    echo "error: kaola-workflow is currently installed via the Claude Code plugin runtime." >&2
    echo "" >&2
    echo "Running install.sh on top of a plugin install creates a parallel installation:" >&2
    echo "manual commands shadow plugin commands, and plugin hooks still fire from" >&2
    echo "~/.claude/plugins/data/. Remove the plugin install first, then retry:" >&2
    echo "" >&2
    echo "  claude plugin uninstall kaola-workflow@kaolabrother-kaola-workflow" >&2
    echo "  claude plugin uninstall kaola-workflow-gitlab@kaolabrother-kaola-workflow  # if installed" >&2
    echo "  claude plugin marketplace remove kaolabrother-kaola-workflow" >&2
    echo "" >&2
    echo "Then re-run install.sh." >&2
    exit 1
  fi
fi


# Remove stale kaola-workflow command files before installing fresh ones.
# Outdated user-level commands in ~/.claude/commands/ take precedence over
# everything else and will shadow updated installs if not cleaned up.
if [[ -d "$COMMANDS_DIR" ]]; then
  for pattern in "kaola-workflow-*.md" "workflow-init.md" "workflow-next.md" "workflow-goal.md" "workflow-next-pr.md"; do
    for stale_file in "$COMMANDS_DIR"/$pattern; do
      [[ -f "$stale_file" ]] || continue
      rm -f "$stale_file"
      echo "Removed stale command: $stale_file"
    done
  done
fi

# Remove stale support scripts that no longer exist in source.
if [[ -d "$SUPPORT_SCRIPTS_DIR" ]]; then
  for stale_file in "$SUPPORT_SCRIPTS_DIR"/*.js; do
    [[ -f "$stale_file" ]] || continue
    stale_name="$(basename "$stale_file")"
    is_current=0
    for name in "${SUPPORT_SCRIPT_NAMES[@]}"; do
      [[ "$name" == "$stale_name" ]] && is_current=1 && break
    done
    if [[ "$is_current" -eq 0 ]]; then
      rm -f "$stale_file"
      echo "Removed stale script: $stale_file"
    fi
  done
fi

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

manifest_lookup() {
  local file_name="$1"
  [[ -f "$AGENT_MANIFEST_FILE" ]] || return 0
  awk -F '\t' -v name="$file_name" '$1 == name { value = $2 } END { if (value) print value }' "$AGENT_MANIFEST_FILE"
}

install_agent_files() {
  if [[ ! -d "$SOURCE_AGENTS_DIR" ]]; then
    echo "Agents directory not found: $SOURCE_AGENTS_DIR" >&2
    exit 1
  fi

  mkdir -p "$AGENTS_DIR"

  local manifest_tmp
  manifest_tmp="$(mktemp)"
  local installed=0
  local skipped=0

  for agent in "${REQUIRED_AGENTS[@]}"; do
    local file_name="$agent.md"
    local source_file="$SOURCE_AGENTS_DIR/$file_name"
    local dest="$AGENTS_DIR/$file_name"

    if [[ ! -f "$source_file" ]]; then
      echo "Required agent source not found: $source_file" >&2
      rm -f "$manifest_tmp"
      exit 1
    fi

    if [[ -f "$dest" ]]; then
      if cmp -s "$source_file" "$dest"; then
        echo "Agent already installed: $dest"
      else
        local recorded_hash
        local current_hash
        recorded_hash="$(manifest_lookup "$file_name")"
        current_hash="$(sha256_file "$dest")"

        if [[ -n "$recorded_hash" ]] &&
           [[ "$current_hash" == "$recorded_hash" ]] &&
           grep -Fq "$MANAGED_AGENT_MARKER" "$dest"; then
          cp "$source_file" "$dest"
          echo "Updated managed agent: $dest"
        else
          echo "Skipped agent with existing user-owned or modified file: $dest"
          skipped=$((skipped + 1))
          continue
        fi
      fi
    else
      cp "$source_file" "$dest"
      echo "Installed agent: $dest"
    fi

    if ! grep -Fq "$MANAGED_AGENT_MARKER" "$dest"; then
      echo "Install verification failed: missing managed marker in agent: $dest" >&2
      rm -f "$manifest_tmp"
      exit 1
    fi

    printf '%s\t%s\n' "$file_name" "$(sha256_file "$dest")" >> "$manifest_tmp"
    installed=$((installed + 1))
  done

  if [[ -s "$manifest_tmp" ]]; then
    mv "$manifest_tmp" "$AGENT_MANIFEST_FILE"
  else
    rm -f "$manifest_tmp"
  fi

  if [[ "$skipped" -gt 0 ]]; then
    echo "Skipped $skipped agent file(s). Existing files were left untouched."
  fi
  if [[ "$installed" -gt 0 ]]; then
    echo "Verified managed Kaola-Workflow agents."
  fi
}

install_agent_files

# Install commands
if [[ ! -d "$SOURCE_COMMANDS_DIR" ]]; then
  echo "Commands directory not found: $SOURCE_COMMANDS_DIR" >&2
  exit 1
fi

mkdir -p "$COMMANDS_DIR"

installed=0
for command_file in "$SOURCE_COMMANDS_DIR"/*.md; do
  if [[ ! -f "$command_file" ]]; then
    continue
  fi

  dest="$COMMANDS_DIR/$(basename "$command_file")"
  cp "$command_file" "$dest"
  echo "Installed: $dest"
  installed=$((installed + 1))
done

if [[ "$installed" -eq 0 ]]; then
  if [[ "$FORGE" = "gitlab" ]]; then
    echo "GitLab edition skeleton: no command files found yet in $SOURCE_COMMANDS_DIR."
  else
    echo "No command files found in: $SOURCE_COMMANDS_DIR" >&2
    exit 1
  fi
fi

mkdir -p "$SUPPORT_SCRIPTS_DIR"
for script_name in "${SUPPORT_SCRIPT_NAMES[@]}"; do
  script_file="$SOURCE_SCRIPTS_DIR/$script_name"
  if [[ -f "$script_file" ]]; then
    cp "$script_file" "$SUPPORT_SCRIPTS_DIR/$script_name"
    chmod +x "$SUPPORT_SCRIPTS_DIR/$script_name"
    echo "Installed support script: $SUPPORT_SCRIPTS_DIR/$script_name"
  fi
done

mkdir -p "$SUPPORT_HOOKS_DIR"
for hook_name in "${SUPPORT_HOOK_NAMES[@]}"; do
  hook_file="$SOURCE_HOOKS_DIR/$hook_name"
  if [[ -f "$hook_file" ]]; then
    cp "$hook_file" "$SUPPORT_HOOKS_DIR/$hook_name"
    chmod +x "$SUPPORT_HOOKS_DIR/$hook_name"
    echo "Installed support hook: $SUPPORT_HOOKS_DIR/$hook_name"
  fi
done

# Install hooks.json with $CLAUDE_PLUGIN_ROOT rewritten to absolute install path.
# Manual install does not set CLAUDE_PLUGIN_ROOT, so the placeholder is replaced
# with $SUPPORT_DIR (e.g. ~/.claude/kaola-workflow) at install time.
if [[ -f "$SOURCE_HOOKS_DIR/hooks.json" ]]; then
  python3 - "$SOURCE_HOOKS_DIR/hooks.json" "$SUPPORT_HOOKS_DIR/hooks.json" "$SUPPORT_DIR" <<'PY' 2>/dev/null || \
    sed -e "s|\${CLAUDE_PLUGIN_ROOT}|$SUPPORT_DIR|g" \
        -e "s|\$CLAUDE_PLUGIN_ROOT|$SUPPORT_DIR|g" \
        "$SOURCE_HOOKS_DIR/hooks.json" > "$SUPPORT_HOOKS_DIR/hooks.json"
import json, sys
src, dst, root = sys.argv[1], sys.argv[2], sys.argv[3]
with open(src) as f:
    data = json.load(f)
def rewrite(obj):
    if isinstance(obj, dict):
        return {k: rewrite(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [rewrite(x) for x in obj]
    if isinstance(obj, str):
        return obj.replace("${CLAUDE_PLUGIN_ROOT}", root).replace("$CLAUDE_PLUGIN_ROOT", root)
    return obj
with open(dst, "w") as f:
    json.dump(rewrite(data), f, indent=2)
PY
  echo "Installed hooks config: $SUPPORT_HOOKS_DIR/hooks.json"
fi

verify_installed_file() {
  local path="$1"
  local label="$2"
  if [[ ! -f "$path" ]]; then
    echo "Install verification failed: missing $label: $path" >&2
    return 1
  fi
}

verify_executable_file() {
  local path="$1"
  local label="$2"
  verify_installed_file "$path" "$label" || return 1
  if [[ ! -x "$path" ]]; then
    echo "Install verification failed: not executable $label: $path" >&2
    return 1
  fi
}

verification_failed=0
for command_file in "$SOURCE_COMMANDS_DIR"/*.md; do
  [[ -f "$command_file" ]] || continue
  verify_installed_file "$COMMANDS_DIR/$(basename "$command_file")" "command" || verification_failed=1
done

for agent in "${REQUIRED_AGENTS[@]}"; do
  verify_installed_file "$AGENTS_DIR/$agent.md" "agent" || verification_failed=1
done

for script_name in "${SUPPORT_SCRIPT_NAMES[@]}"; do
  if [[ "$FORGE" = "gitlab" && ! -f "$SOURCE_SCRIPTS_DIR/$script_name" ]]; then
    continue
  fi
  verify_executable_file "$SUPPORT_SCRIPTS_DIR/$script_name" "support script" || verification_failed=1
done

for hook_name in "${SUPPORT_HOOK_NAMES[@]}"; do
  if [[ "$FORGE" = "gitlab" && ! -f "$SOURCE_HOOKS_DIR/$hook_name" ]]; then
    continue
  fi
  verify_executable_file "$SUPPORT_HOOKS_DIR/$hook_name" "support hook" || verification_failed=1
done

if [[ "$verification_failed" -ne 0 ]]; then
  exit 1
fi

echo "Verified Kaola-Workflow install files."
if [[ "$FORGE" = "gitlab" && "$installed" -eq 0 ]]; then
  echo "GitLab edition skeleton installed; runtime commands arrive in follow-up issues #56 and #57."
fi

echo ""
echo "Open any Claude Code session and run:  /workflow-init"
echo "Then run implementation cycles with:  /workflow-next"
echo ""
if [[ -f "$SUPPORT_HOOKS_DIR/hooks.json" ]]; then
  echo "Hooks installed to: $SUPPORT_HOOKS_DIR/hooks.json"
  echo "To enable Kaola-Workflow hooks (compaction resume, pre-commit, phantom-advisor),"
  echo "merge the hooks block into your ~/.claude/settings.json. Quick view:"
  echo "  cat $SUPPORT_HOOKS_DIR/hooks.json"
  echo ""
fi
echo "For advisor gates, ensure your ~/.claude/settings.json includes:"
echo '  "advisorModel": "opus"'
