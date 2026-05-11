#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(file, needle) {
  const content = read(file);
  assert(content.includes(needle), `${file} must include: ${needle}`);
}

function parseJson(file) {
  return JSON.parse(read(file));
}

const pluginRoot = 'plugins/codex-workflow';
const pluginJsonPath = `${pluginRoot}/.codex-plugin/plugin.json`;
const marketplacePath = '.agents/plugins/marketplace.json';

assert(exists(pluginJsonPath), `${pluginJsonPath} is missing`);
assert(exists(marketplacePath), `${marketplacePath} is missing`);

const pluginJson = parseJson(pluginJsonPath);
assert(pluginJson.name === 'codex-workflow', 'Codex plugin name must be codex-workflow');
assert(pluginJson.skills === './skills/', 'Codex plugin must expose ./skills/');
assert(!Object.prototype.hasOwnProperty.call(pluginJson, 'commands'), 'Codex plugin must not declare Claude commands');
assert(!JSON.stringify(pluginJson).includes('ECC'), 'Codex plugin must not depend on ECC');
assert(!JSON.stringify(pluginJson).includes('Claude Code'), 'Codex plugin metadata must stay Codex-only');
assert(JSON.stringify(pluginJson).includes('Claude-Workflow for Codex'), 'Codex plugin metadata must be discoverable as Claude-Workflow for Codex');
assert(JSON.stringify(pluginJson).includes('workflow-init'), 'Codex plugin metadata must include workflow-init for app search');

const marketplaceJson = parseJson(marketplacePath);
assert(marketplaceJson.name === 'kaolabrother-private', 'private marketplace name must stay stable');
assert(marketplaceJson.interface && marketplaceJson.interface.displayName === 'KaolaBrother Claude-Workflow', 'marketplace display name must identify Claude-Workflow');
assert(Array.isArray(marketplaceJson.plugins), 'marketplace must define plugins');
const entry = marketplaceJson.plugins.find(plugin => plugin.name === 'codex-workflow');
assert(entry, 'marketplace must list codex-workflow');
assert(entry.source && entry.source.source === 'local', 'codex-workflow marketplace source must be local');
assert(entry.source.path === './plugins/codex-workflow', 'codex-workflow marketplace path must be repo-local');
assert(entry.policy && entry.policy.installation === 'AVAILABLE', 'codex-workflow must be locally installable');

const skills = [
  'codex-workflow-init',
  'codex-workflow-next',
  'codex-workflow-research',
  'codex-workflow-ideation',
  'codex-workflow-plan',
  'codex-workflow-execute',
  'codex-workflow-review',
  'codex-workflow-finalize',
];

for (const skill of skills) {
  const file = `${pluginRoot}/skills/${skill}/SKILL.md`;
  assert(exists(file), `${file} is missing`);
  assertIncludes(file, `name: ${skill}`);
  assertIncludes(file, 'description: Use when');
  assertIncludes(file, 'codex-workflow/');
  assertIncludes(file, 'workflow-state.md');
}

assertIncludes(`${pluginRoot}/skills/codex-workflow-init/SKILL.md`, 'AGENTS.md');
assertIncludes(`${pluginRoot}/skills/codex-workflow-init/SKILL.md`, 'Do not create or edit CLAUDE.md');
assertIncludes(`${pluginRoot}/skills/codex-workflow-next/SKILL.md`, 'next_skill');
assertIncludes(`${pluginRoot}/skills/codex-workflow-next/SKILL.md`, 'codex-workflow-repair-state.js');
assertIncludes(`${pluginRoot}/skills/codex-workflow-execute/SKILL.md`, 'Required Agent Compliance');
assertIncludes(`${pluginRoot}/skills/codex-workflow-execute/SKILL.md`, 'RED');
assertIncludes(`${pluginRoot}/skills/codex-workflow-execute/SKILL.md`, 'GREEN');
assertIncludes(`${pluginRoot}/skills/codex-workflow-review/SKILL.md`, 'codex review');
assertIncludes(`${pluginRoot}/skills/codex-workflow-finalize/SKILL.md`, 'Documentation Docking');
assertIncludes(`${pluginRoot}/skills/codex-workflow-finalize/SKILL.md`, 'Commit And Push');

const repairScript = `${pluginRoot}/scripts/codex-workflow-repair-state.js`;
const simulateScript = `${pluginRoot}/scripts/simulate-codex-workflow-walkthrough.js`;
const installAgentsScript = `${pluginRoot}/scripts/install-codex-agent-profiles.js`;
assert(exists(repairScript), `${repairScript} is missing`);
assert(exists(simulateScript), `${simulateScript} is missing`);
assert(exists(installAgentsScript), `${installAgentsScript} is missing`);
assertIncludes(repairScript, 'codex-workflow');
assertIncludes(repairScript, 'next_skill');
assertIncludes(simulateScript, 'Codex workflow walkthrough simulation passed');
assertIncludes(installAgentsScript, 'BEGIN codex-workflow agents');

const codexAgentRoles = [
  'code-explorer',
  'docs-lookup',
  'planner',
  'code-architect',
  'tdd-guide',
  'build-error-resolver',
  'code-reviewer',
  'security-reviewer',
  'doc-updater',
];

const agentConfigTemplate = `${pluginRoot}/config/agents.toml`;
assert(exists(agentConfigTemplate), `${agentConfigTemplate} is missing`);
assertIncludes(agentConfigTemplate, '[features]');
assertIncludes(agentConfigTemplate, 'multi_agent = true');

for (const role of codexAgentRoles) {
  const file = `${pluginRoot}/agents/${role}.toml`;
  assert(exists(file), `${file} is missing`);
  assertIncludes(file, 'developer_instructions');
  assertIncludes(file, 'Claude-Workflow for Codex');
  assertIncludes(agentConfigTemplate, `[agents.${role}]`);
  assertIncludes(agentConfigTemplate, `config_file = "./agents/codex-workflow/${role}.toml"`);
}

assertIncludes(`${pluginRoot}/skills/codex-workflow-init/SKILL.md`, 'install-codex-agent-profiles.js');
assertIncludes(`${pluginRoot}/skills/codex-workflow-research/SKILL.md`, 'code-explorer');
assertIncludes(`${pluginRoot}/skills/codex-workflow-research/SKILL.md`, 'docs-lookup');
assertIncludes(`${pluginRoot}/skills/codex-workflow-ideation/SKILL.md`, 'planner');
assertIncludes(`${pluginRoot}/skills/codex-workflow-plan/SKILL.md`, 'code-architect');
assertIncludes(`${pluginRoot}/skills/codex-workflow-execute/SKILL.md`, 'tdd-guide');
assertIncludes(`${pluginRoot}/skills/codex-workflow-execute/SKILL.md`, 'build-error-resolver');
assertIncludes(`${pluginRoot}/skills/codex-workflow-review/SKILL.md`, 'security-reviewer');
assertIncludes(`${pluginRoot}/skills/codex-workflow-finalize/SKILL.md`, 'doc-updater');

assertIncludes('package.json', 'validate:codex-workflow');

console.log('Codex workflow contract validation passed');
