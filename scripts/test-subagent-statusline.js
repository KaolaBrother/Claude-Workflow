#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const statusline = require('./kaola-workflow-subagent-statusline.js');

function writeAgent(home, name, model) {
  const agentsDir = path.join(home, '.claude', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(agentsDir, `${name}.md`),
    [
      '---',
      `name: ${name}`,
      `model: ${model}`,
      '---',
      '',
      'Test agent.'
    ].join('\n')
  );
}

function withTempHome(fn) {
  const previousHome = process.env.HOME;
  const previousOverride = process.env.CLAUDE_CODE_SUBAGENT_MODEL;
  const previousSonnet = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-subagent-statusline-'));
  try {
    process.env.HOME = dir;
    delete process.env.CLAUDE_CODE_SUBAGENT_MODEL;
    delete process.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
    fn(dir);
  } finally {
    process.env.HOME = previousHome;
    if (previousOverride === undefined) delete process.env.CLAUDE_CODE_SUBAGENT_MODEL;
    else process.env.CLAUDE_CODE_SUBAGENT_MODEL = previousOverride;
    if (previousSonnet === undefined) delete process.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
    else process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = previousSonnet;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

withTempHome(home => {
  writeAgent(home, 'tdd-guide', 'sonnet');
  const rows = statusline.renderRows({
    columns: 120,
    tasks: [
      {
        id: 'task-1',
        name: 'tdd-guide',
        status: 'running',
        description: 'Implement issue #141',
        tokenCount: 12345
      }
    ]
  });

  assert.deepStrictEqual(rows.map(row => row.id), ['task-1']);
  assert.match(rows[0].content, /tdd-guide/);
  assert.match(rows[0].content, /running/);
  assert.match(rows[0].content, /model: Sonnet/);
  assert.match(rows[0].content, /12\.3k tok/);
});

withTempHome(home => {
  writeAgent(home, 'tdd-guide', 'sonnet');
  const rows = statusline.renderRows({
    columns: 120,
    tasks: [{ id: 'task-alias', name: 'TDD', status: 'running', tokenCount: 10 }]
  });

  assert.match(rows[0].content, /tdd-guide/);
  assert.match(rows[0].content, /model: Sonnet/);
});

withTempHome(home => {
  writeAgent(home, 'tdd-guide', 'sonnet');
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = 'claude-sonnet-4-6';
  const rows = statusline.renderRows({
    columns: 120,
    tasks: [{ id: 'task-2', name: 'tdd-guide', status: 'queued', tokenCount: 0 }]
  });

  assert.match(rows[0].content, /model: Sonnet 4\.6/);
});

withTempHome(home => {
  writeAgent(home, 'planner', 'opus');
  process.env.CLAUDE_CODE_SUBAGENT_MODEL = 'claude-sonnet-4-6';
  const rows = statusline.renderRows({
    columns: 120,
    tasks: [{ id: 'task-3', name: 'planner', status: 'running', tokenCount: 50 }]
  });

  assert.match(rows[0].content, /model: Sonnet 4\.6 override/);
});

console.log('Subagent status line tests passed');
