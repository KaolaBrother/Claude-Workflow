#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const KAOLA_AGENTS = [
  'code-explorer',
  'docs-lookup',
  'planner',
  'code-architect',
  'tdd-guide',
  'build-error-resolver',
  'code-reviewer',
  'security-reviewer',
  'doc-updater'
];

const AGENT_ALIASES = {
  architect: 'code-architect',
  audit: 'security-reviewer',
  blueprint: 'code-architect',
  buildfix: 'build-error-resolver',
  builder: 'tdd-guide',
  critic: 'code-reviewer',
  designer: 'code-architect',
  executor: 'tdd-guide',
  explorer: 'code-explorer',
  inspector: 'code-reviewer',
  lookup: 'docs-lookup',
  mapper: 'code-explorer',
  options: 'planner',
  planner: 'planner',
  reference: 'docs-lookup',
  repair: 'build-error-resolver',
  resolver: 'build-error-resolver',
  reviewer: 'code-reviewer',
  scout: 'code-explorer',
  security: 'security-reviewer',
  strategist: 'planner',
  tdd: 'tdd-guide',
  threat: 'security-reviewer',
  writer: 'doc-updater'
};

function homeDir() {
  return process.env.HOME || os.homedir();
}

function agentFilePath(agentName) {
  return path.join(homeDir(), '.claude', 'agents', `${agentName}.md`);
}

function extractFrontmatterModel(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return '';
  const modelLine = match[1].split(/\r?\n/).find(line => /^\s*model\s*:/.test(line));
  if (!modelLine) return '';
  return modelLine.replace(/^\s*model\s*:\s*/, '').trim().replace(/^['"]|['"]$/g, '');
}

function readAgentModel(agentName) {
  if (!agentName) return '';
  try {
    return extractFrontmatterModel(fs.readFileSync(agentFilePath(agentName), 'utf8'));
  } catch {
    return '';
  }
}

function detectAgentName(task) {
  const fields = [task.name, task.type, task.label, task.description]
    .filter(value => typeof value === 'string' && value.trim() !== '');
  for (const field of fields) {
    const exact = KAOLA_AGENTS.find(agent => field.trim() === agent);
    if (exact) return exact;
    const alias = AGENT_ALIASES[field.trim().toLowerCase()];
    if (alias) return alias;
  }
  const haystack = fields.join(' ').toLowerCase();
  return KAOLA_AGENTS.find(agent => haystack.includes(agent)) || '';
}

function modelIdToDisplay(model) {
  if (!model) return 'default';
  const normalized = String(model).trim();
  if (!normalized) return 'default';
  const lower = normalized.toLowerCase();
  if (lower === 'sonnet') return 'Sonnet';
  if (lower === 'opus') return 'Opus';
  if (lower === 'haiku') return 'Haiku';

  const claudeMatch = lower.match(/^claude-(sonnet|opus|haiku)-([0-9]+)(?:-([0-9]+))?/);
  if (claudeMatch) {
    const family = claudeMatch[1][0].toUpperCase() + claudeMatch[1].slice(1);
    const version = claudeMatch[3] ? `${claudeMatch[2]}.${claudeMatch[3]}` : claudeMatch[2];
    return `${family} ${version}`;
  }
  return normalized;
}

function aliasOverride(alias) {
  const upper = String(alias || '').trim().toUpperCase();
  if (!upper) return '';
  return process.env[`ANTHROPIC_DEFAULT_${upper}_MODEL`] ||
    process.env[`ANTHROPIC_DEFAULT_${upper}_MODEL_NAME`] ||
    '';
}

function displayModel(agentModel) {
  const subagentOverride = process.env.CLAUDE_CODE_SUBAGENT_MODEL;
  if (subagentOverride) {
    return `${modelIdToDisplay(subagentOverride)} override`;
  }
  if (!agentModel) return 'default';
  const resolvedAlias = aliasOverride(agentModel);
  return modelIdToDisplay(resolvedAlias || agentModel);
}

function formatTokens(tokenCount) {
  const count = Number(tokenCount) || 0;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}m tok`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k tok`;
  return `${count} tok`;
}

function sanitizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, columns) {
  const width = Number(columns) || 0;
  if (!width || value.length <= width) return value;
  if (width <= 3) return value.slice(0, width);
  return `${value.slice(0, width - 3)}...`;
}

function renderTask(task, columns) {
  const agentName = detectAgentName(task);
  const displayName = agentName || sanitizeText(task.name || task.label || task.type || 'subagent');
  const status = sanitizeText(task.status || 'active');
  const model = displayModel(readAgentModel(agentName));
  const tokens = formatTokens(task.tokenCount);
  const description = sanitizeText(task.description);
  const details = description ? ` | ${description}` : '';
  return truncate(`${displayName} | ${status} | model: ${model} | ${tokens}${details}`, columns);
}

function renderRows(input) {
  const tasks = Array.isArray(input && input.tasks) ? input.tasks : [];
  return tasks
    .filter(task => task && task.id)
    .map(task => ({
      id: String(task.id),
      content: renderTask(task, input.columns)
    }));
}

function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', () => {
    let input;
    try {
      input = JSON.parse(raw || '{}');
    } catch {
      process.exitCode = 0;
      return;
    }
    for (const row of renderRows(input)) {
      process.stdout.write(`${JSON.stringify(row)}\n`);
    }
  });
}

if (require.main === module) main();

module.exports = {
  detectAgentName,
  displayModel,
  extractFrontmatterModel,
  modelIdToDisplay,
  renderRows
};
