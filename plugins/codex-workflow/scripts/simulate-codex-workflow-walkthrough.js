#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const pluginRoot = path.resolve(__dirname, '..');
const repairScript = path.join(pluginRoot, 'scripts', 'codex-workflow-repair-state.js');
const installAgentsScript = path.join(pluginRoot, 'scripts', 'install-codex-agent-profiles.js');
const project = 'simulated-feature';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function runRepair(workdir, projectArg = project) {
  return execFileSync(process.execPath, [repairScript, projectArg], {
    cwd: workdir,
    encoding: 'utf8'
  });
}

function runInstallAgents(workdir) {
  return execFileSync(process.execPath, [installAgentsScript, workdir], {
    cwd: workdir,
    encoding: 'utf8'
  });
}

function nextSkill(stateFile) {
  const match = read(stateFile).match(/^next_skill:\s*(.+)$/m);
  return match ? match[1].trim() : '';
}

function assertNext(stateFile, expected) {
  const actual = nextSkill(stateFile);
  assert(actual === expected, `expected next_skill ${expected}, got ${actual}`);
}

function phaseFile(title, rows) {
  return [
    `# ${title}: ${project}`,
    '',
    '## Required Agent Compliance',
    '| Requirement | Status | Evidence | Skip Reason |',
    '|-------------|--------|----------|-------------|',
    ...rows,
    ''
  ].join('\n');
}

function assertRepair(workdir, expectedSkill, expectedPhase) {
  const output = runRepair(workdir);
  assert(output.includes('Codex workflow state repair: wrote') || output.includes('Codex workflow state repair: repaired stale'), 'repair output must report a write or stale repair');
  assert(output.includes(`Current phase: ${expectedPhase}`), `repair output missing phase ${expectedPhase}`);
  assert(output.includes(`Next skill: ${expectedSkill}`), `repair output missing ${expectedSkill}`);
  const stateFile = path.join(workdir, 'codex-workflow', project, 'workflow-state.md');
  assertNext(stateFile, expectedSkill);
  assert(read(stateFile).includes('last_result: state_repaired_from_artifacts'), 'state must record repair provenance');
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-workflow-walkthrough-'));
  try {
    const installRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-workflow-agents-'));
    try {
      const firstInstall = runInstallAgents(installRoot);
      const secondInstall = runInstallAgents(installRoot);
      const configFile = path.join(installRoot, '.codex', 'config.toml');
      const config = read(configFile);
      assert(firstInstall.includes('copied 9 profiles'), 'agent installer must copy all profiles');
      assert(secondInstall.includes('copied 9 profiles'), 'agent installer must be repeatable');
      assert(config.includes('[agents.code-explorer]'), 'agent config missing code-explorer role');
      assert(config.includes('config_file = "./agents/codex-workflow/tdd-guide.toml"'), 'agent config missing tdd-guide file');
      assert((config.match(/BEGIN codex-workflow agents/g) || []).length === 1, 'agent installer must not duplicate managed block');
      assert(fs.existsSync(path.join(installRoot, '.codex', 'agents', 'codex-workflow', 'security-reviewer.toml')), 'agent installer missing copied security profile');
    } finally {
      fs.rmSync(installRoot, { recursive: true, force: true });
    }

    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-workflow-empty-'));
    try {
      fs.mkdirSync(path.join(emptyRoot, 'codex-workflow', project), { recursive: true });
      const output = runRepair(emptyRoot, project);
      assert(output.includes('Codex workflow state repair: skipped - no phase artifacts available for repair'), 'repair must not create state for brand-new work');
      assert(!fs.existsSync(path.join(emptyRoot, 'codex-workflow', project, 'workflow-state.md')), 'repair created state without phase artifacts');
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }

    const workflowRoot = path.join(tmp, 'codex-workflow');
    const projectRoot = path.join(workflowRoot, project);
    const cache = path.join(projectRoot, '.cache');
    const stateFile = path.join(projectRoot, 'workflow-state.md');
    fs.mkdirSync(cache, { recursive: true });
    write(path.join(workflowRoot, 'ROADMAP.md'), '# Codex Workflow Roadmap\n');

    write(path.join(cache, 'code-explorer.md'), 'raw research output\n');
    write(path.join(cache, 'docs-lookup.md'), 'N/A - internal patterns sufficient\n');
    write(path.join(projectRoot, 'phase1-research.md'), phaseFile('Phase 1 - Research', [
      '| code-explorer | invoked | .cache/code-explorer.md | |',
      '| docs-lookup | N/A | .cache/docs-lookup.md | internal patterns sufficient |'
    ]));
    assertRepair(tmp, `codex-workflow-ideation ${project}`, 2);

    write(path.join(cache, 'planner.md'), 'approach analysis\n');
    write(path.join(cache, 'advisor-ideation.md'), 'advisor gate\n');
    write(path.join(projectRoot, 'phase2-ideation.md'), phaseFile('Phase 2 - Ideation', [
      '| planner | invoked | .cache/planner.md | |',
      '| advisor ideation gate | invoked | .cache/advisor-ideation.md | |'
    ]));
    fs.rmSync(stateFile, { force: true });
    assertRepair(tmp, `codex-workflow-plan ${project}`, 3);

    write(path.join(cache, 'architect.md'), 'blueprint\n');
    write(path.join(cache, 'advisor-plan.md'), 'plan review\n');
    write(path.join(projectRoot, 'phase3-plan.md'), [
      '# Phase 3 - Plan: simulated-feature',
      '',
      '## Task List',
      '### Task 1: Add greeting',
      '- File: src/greeting.js',
      '- Test File: test/greeting.test.js',
      '- Write Set: src/greeting.js, test/greeting.test.js',
      '- Validate: npm test -- greeting',
      '',
      '## Required Agent Compliance',
      '| Requirement | Status | Evidence | Skip Reason |',
      '|-------------|--------|----------|-------------|',
      '| code-architect | invoked | .cache/architect.md | |',
      '| advisor plan gate | invoked | .cache/advisor-plan.md | |',
      '| blueprint revisions | N/A | .cache/advisor-plan.md | advisor found no gaps |',
      ''
    ].join('\n'));
    fs.rmSync(stateFile, { force: true });
    assertRepair(tmp, `codex-workflow-execute ${project}`, 4);

    write(path.join(projectRoot, 'phase4-progress.md'), [
      '# Phase 4 - Progress: simulated-feature',
      '',
      '## Tasks',
      '| # | Name | Status | Files Modified | Notes |',
      '|---|------|--------|----------------|-------|',
      '| 1 | Add greeting | in_progress | | validation failed |',
      '',
      '## Failure Routing Ledger',
      '| Task | Failing Command | Classification | Routed To | Evidence | Status |',
      '|------|-----------------|----------------|-----------|----------|--------|',
      '| 1 | npm test -- greeting | behavior/test failure | tdd-guide | .cache/tdd-task-1-fix-1.md | routed |',
      '',
      '## Required Agent Compliance',
      '| Requirement | Status | Evidence | Skip Reason |',
      '|-------------|--------|----------|-------------|',
      '| tdd-guide executor task 1 | invoked | .cache/tdd-task-1.md | |',
      ''
    ].join('\n'));
    fs.rmSync(stateFile, { force: true });
    assertRepair(tmp, `codex-workflow-execute ${project}`, 4);

    write(path.join(projectRoot, 'phase4-progress.md'), read(path.join(projectRoot, 'phase4-progress.md')).replace(
      '| 1 | Add greeting | in_progress | | validation failed |',
      '| 1 | Add greeting | complete | src/greeting.js, test/greeting.test.js | validation passed |'
    ));
    fs.rmSync(stateFile, { force: true });
    assertRepair(tmp, `codex-workflow-review ${project}`, 5);

    write(path.join(cache, 'code-reviewer.md'), 'review passed\n');
    write(path.join(projectRoot, 'phase5-review.md'), phaseFile('Phase 5 - Review', [
      '| quality review | invoked | .cache/code-reviewer.md | |',
      '| security review | N/A | file-risk scan | no sensitive files touched |',
      '| review-fix executors | N/A | .cache/code-reviewer.md | no blocking findings |'
    ]));
    fs.rmSync(stateFile, { force: true });
    assertRepair(tmp, `codex-workflow-finalize ${project}`, 6);

    write(path.join(cache, 'final-validation.md'), 'validation passed\n');
    write(path.join(cache, 'doc-docking.md'), 'DOCKED\n');
    write(path.join(projectRoot, 'phase6-summary.md'), phaseFile('Phase 6 - Summary', [
      '| final validation | invoked | .cache/final-validation.md | |',
      '| documentation docking | invoked | .cache/doc-docking.md | |',
      '| roadmap refresh | invoked | codex-workflow/ROADMAP.md | |',
      '| archive completed folder | invoked | codex-workflow/archive/simulated-feature | |',
      '| final commit and push | invoked | git status --short --branch | clean and synced |'
    ]));
    const finalOutput = runRepair(tmp, project);
    assert(finalOutput.includes('workflow is complete'), 'complete workflow should not be repaired again');

    console.log('Codex workflow walkthrough simulation passed');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
