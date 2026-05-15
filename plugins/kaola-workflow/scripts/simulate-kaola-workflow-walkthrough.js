#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const pluginRoot = path.resolve(__dirname, '..');
const repairScript = path.join(pluginRoot, 'scripts', 'kaola-workflow-repair-state.js');
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
  assert(output.includes('Kaola-Workflow state repair: wrote') || output.includes('Kaola-Workflow state repair: repaired stale'), 'repair output must report a write or stale repair');
  assert(output.includes(`Current phase: ${expectedPhase}`), `repair output missing phase ${expectedPhase}`);
  assert(output.includes(`Next skill: ${expectedSkill}`), `repair output missing ${expectedSkill}`);
  const stateFile = path.join(workdir, 'kaola-workflow', project, 'workflow-state.md');
  assertNext(stateFile, expectedSkill);
  assert(read(stateFile).includes('last_result: state_repaired_from_artifacts'), 'state must record repair provenance');
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-walkthrough-'));
  try {
    const installRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-agents-'));
    try {
      const firstInstall = runInstallAgents(installRoot);
      const secondInstall = runInstallAgents(installRoot);
      const configFile = path.join(installRoot, '.codex', 'config.toml');
      const config = read(configFile);
      assert(firstInstall.includes('copied 9 profiles'), 'agent installer must copy all profiles');
      assert(secondInstall.includes('copied 9 profiles'), 'agent installer must be repeatable');
      assert(config.includes('[agents.code-explorer]'), 'agent config missing code-explorer role');
      assert(config.includes('config_file = "./agents/kaola-workflow/tdd-guide.toml"'), 'agent config missing tdd-guide file');
      assert((config.match(/BEGIN kaola-workflow agents/g) || []).length === 1, 'agent installer must not duplicate managed block');
      assert(fs.existsSync(path.join(installRoot, '.codex', 'agents', 'kaola-workflow', 'security-reviewer.toml')), 'agent installer missing copied security profile');
    } finally {
      fs.rmSync(installRoot, { recursive: true, force: true });
    }

    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-empty-'));
    try {
      fs.mkdirSync(path.join(emptyRoot, 'kaola-workflow', project), { recursive: true });
      const output = runRepair(emptyRoot, project);
      assert(output.includes('Kaola-Workflow state repair: skipped - no phase artifacts available for repair'), 'repair must not create state for brand-new work');
      assert(!fs.existsSync(path.join(emptyRoot, 'kaola-workflow', project, 'workflow-state.md')), 'repair created state without phase artifacts');
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true });
    }

    const workflowRoot = path.join(tmp, 'kaola-workflow');
    const projectRoot = path.join(workflowRoot, project);
    const cache = path.join(projectRoot, '.cache');
    const stateFile = path.join(projectRoot, 'workflow-state.md');
    fs.mkdirSync(cache, { recursive: true });
    write(path.join(workflowRoot, 'ROADMAP.md'), '# Kaola-Workflow Roadmap\n');

    write(path.join(cache, 'code-explorer.md'), 'raw research output\n');
    write(path.join(cache, 'docs-lookup.md'), 'N/A - internal patterns sufficient\n');
    write(path.join(projectRoot, 'phase1-research.md'), phaseFile('Phase 1 - Research', [
      '| code-explorer | invoked | .cache/code-explorer.md | |',
      '| docs-lookup | N/A | .cache/docs-lookup.md | internal patterns sufficient |'
    ]));
    assertRepair(tmp, `kaola-workflow-ideation ${project}`, 2);

    write(path.join(cache, 'planner.md'), 'approach analysis\n');
    write(path.join(cache, 'advisor-ideation.md'), 'advisor gate\n');
    write(path.join(projectRoot, 'phase2-ideation.md'), phaseFile('Phase 2 - Ideation', [
      '| planner | invoked | .cache/planner.md | |',
      '| advisor ideation gate | invoked | .cache/advisor-ideation.md | |'
    ]));
    fs.rmSync(stateFile, { force: true });
    assertRepair(tmp, `kaola-workflow-plan ${project}`, 3);

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
    assertRepair(tmp, `kaola-workflow-execute ${project}`, 4);

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
    assertRepair(tmp, `kaola-workflow-execute ${project}`, 4);

    write(path.join(projectRoot, 'phase4-progress.md'), read(path.join(projectRoot, 'phase4-progress.md')).replace(
      '| 1 | Add greeting | in_progress | | validation failed |',
      '| 1 | Add greeting | complete | src/greeting.js, test/greeting.test.js | validation passed |'
    ));
    fs.rmSync(stateFile, { force: true });
    assertRepair(tmp, `kaola-workflow-review ${project}`, 5);

    write(path.join(cache, 'code-reviewer.md'), 'review passed\n');
    write(path.join(projectRoot, 'phase5-review.md'), phaseFile('Phase 5 - Review', [
      '| quality review | invoked | .cache/code-reviewer.md | |',
      '| security review | N/A | file-risk scan | no sensitive files touched |',
      '| review-fix executors | N/A | .cache/code-reviewer.md | no blocking findings |'
    ]));
    fs.rmSync(stateFile, { force: true });
    assertRepair(tmp, `kaola-workflow-finalize ${project}`, 6);

    write(path.join(cache, 'final-validation.md'), 'validation passed\n');
    write(path.join(cache, 'doc-docking.md'), 'DOCKED\n');
    write(path.join(projectRoot, 'phase6-summary.md'), phaseFile('Phase 6 - Summary', [
      '| final validation | invoked | .cache/final-validation.md | |',
      '| documentation docking | invoked | .cache/doc-docking.md | |',
      '| roadmap refresh | invoked | kaola-workflow/ROADMAP.md | |',
      '| archive completed folder | invoked | kaola-workflow/archive/simulated-feature | |',
      '| final commit and push | invoked | git status --short --branch | clean and synced |'
    ]));
    const finalOutput = runRepair(tmp, project);
    assert(finalOutput.includes('workflow is complete'), 'complete workflow should not be repaired again');

    // Case 5: cross-runtime co-work, two distinct projects
    const claimScript = path.resolve(__dirname, '../../../scripts/kaola-workflow-claim.js');
    const case5Dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-case5-'));
    try {
      execFileSync('git', ['init', case5Dir], { encoding: 'utf8' });
      execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: case5Dir, encoding: 'utf8' });
      execFileSync('git', ['config', 'user.name', 'Test'], { cwd: case5Dir, encoding: 'utf8' });
      fs.mkdirSync(path.join(case5Dir, 'kaola-workflow', '.locks'), { recursive: true });
      fs.mkdirSync(path.join(case5Dir, 'kaola-workflow', '.sessions'), { recursive: true });

      // Case 5a: claim project-alpha with runtime:claude
      const sidAlpha = 'aaaaaaaa-0000-0000-0000-000000000001';
      execFileSync(process.execPath, [
        claimScript, 'claim',
        '--session', sidAlpha,
        '--project', 'project-alpha',
        '--runtime', 'claude'
      ], { cwd: case5Dir, encoding: 'utf8', env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' } });

      const lockAlpha = JSON.parse(fs.readFileSync(
        path.join(case5Dir, 'kaola-workflow', '.locks', 'project-alpha.lock'), 'utf8'
      ));
      assert(lockAlpha.runtime === 'claude', 'Case 5a: project-alpha lock must have runtime=claude, got: ' + lockAlpha.runtime);
      assert(lockAlpha.project === 'project-alpha', 'Case 5a: project field must match');

      // Case 5b: claim project-beta with runtime:codex (different project, should succeed)
      const sidBeta = 'bbbbbbbb-0000-0000-0000-000000000002';
      execFileSync(process.execPath, [
        claimScript, 'claim',
        '--session', sidBeta,
        '--project', 'project-beta',
        '--runtime', 'codex'
      ], { cwd: case5Dir, encoding: 'utf8', env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' } });

      const lockBeta = JSON.parse(fs.readFileSync(
        path.join(case5Dir, 'kaola-workflow', '.locks', 'project-beta.lock'), 'utf8'
      ));
      assert(lockBeta.runtime === 'codex', 'Case 5b: project-beta lock must have runtime=codex, got: ' + lockBeta.runtime);
      assert(lockBeta.project === 'project-beta', 'Case 5b: project field must match');

      // Case 5c: double-claim on project-alpha must exit 2
      const sidAlpha2 = 'cccccccc-0000-0000-0000-000000000003';
      let doubleClaimExitCode = 0;
      try {
        execFileSync(process.execPath, [
          claimScript, 'claim',
          '--session', sidAlpha2,
          '--project', 'project-alpha',
          '--runtime', 'claude'
        ], { cwd: case5Dir, encoding: 'utf8', env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' } });
      } catch (e) {
        doubleClaimExitCode = e.status;
      }
      assert(doubleClaimExitCode === 2, 'Case 5c: double-claim on project-alpha must exit 2, got: ' + doubleClaimExitCode);

      // Case 5d: bootstrap with no open issues exits 1 (OFFLINE mode)
      const sidBootstrap = 'dddddddd-0000-0000-0000-000000000004';
      let bootstrapExitCode = 0;
      try {
        execFileSync(process.execPath, [
          claimScript, 'bootstrap',
          '--session', sidBootstrap,
          '--runtime', 'codex'
        ], { cwd: case5Dir, encoding: 'utf8', env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' } });
      } catch (e) {
        bootstrapExitCode = e.status;
      }
      assert(bootstrapExitCode === 1, 'Case 5d: bootstrap with no open issues must exit 1, got: ' + bootstrapExitCode);

      // Case 5e: locks are isolated by project — both must still exist independently
      assert(fs.existsSync(path.join(case5Dir, 'kaola-workflow', '.locks', 'project-alpha.lock')),
        'Case 5e: project-alpha lock must still exist');
      assert(fs.existsSync(path.join(case5Dir, 'kaola-workflow', '.locks', 'project-beta.lock')),
        'Case 5e: project-beta lock must still exist');

      const finalAlpha = JSON.parse(fs.readFileSync(
        path.join(case5Dir, 'kaola-workflow', '.locks', 'project-alpha.lock'), 'utf8'
      ));
      const finalBeta = JSON.parse(fs.readFileSync(
        path.join(case5Dir, 'kaola-workflow', '.locks', 'project-beta.lock'), 'utf8'
      ));
      assert(finalAlpha.runtime !== finalBeta.runtime, 'Case 5e: locks must have different runtime fields');
    } finally {
      fs.rmSync(case5Dir, { recursive: true, force: true });
    }

    console.log('Kaola-Workflow walkthrough simulation passed');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
