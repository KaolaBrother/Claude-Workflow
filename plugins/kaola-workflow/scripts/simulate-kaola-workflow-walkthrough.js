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

    const stateOnlyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-stateonly-'));
    try {
      const activeProject = 'phase-one-active';
      const activeDir = path.join(stateOnlyRoot, 'kaola-workflow', activeProject);
      fs.mkdirSync(activeDir, { recursive: true });
      write(path.join(activeDir, 'workflow-state.md'), [
        '# Kaola-Workflow State',
        '',
        '## Project',
        'name: ' + activeProject,
        'status: active',
        '',
        '## Current Position',
        'phase: 1',
        'phase_name: Research',
        'step: requirement-parsing',
        'next_skill: kaola-workflow-research ' + activeProject,
        '',
      ].join('\n'));
      const output = execFileSync(process.execPath, [repairScript], {
        cwd: stateOnlyRoot,
        encoding: 'utf8'
      });
      assert(output.includes('Kaola-Workflow state repair: existing state valid'), 'repair must recognize active workflow-state before phase files exist');
      assert(output.includes('Workflow project: ' + activeProject), 'repair must route the state-only active project');
    } finally {
      fs.rmSync(stateOnlyRoot, { recursive: true, force: true });
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
    const claimScript = path.join(pluginRoot, 'scripts', 'kaola-workflow-claim.js');
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

      // Case 5e: bootstrap without a preexisting session id claims one issue;
      // a second fresh bootstrap skips the locked issue and claims the next.
      {
        const binDir = path.join(case5Dir, 'bin');
        fs.mkdirSync(binDir, { recursive: true });
        const ghPath = path.join(binDir, 'gh');
        fs.writeFileSync(ghPath, `#!/bin/sh
if [ "$1" = "issue" ] && [ "$2" = "list" ]; then
  printf '[{"number":11},{"number":12}]'
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "view" ]; then
  num="$3"
  printf '{"number":%s,"title":"Issue %s","body":"plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md","labels":[],"state":"OPEN"}' "$num" "$num"
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "edit" ]; then
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "comment" ]; then
  case "$3" in
    11) echo "https://github.com/test/repo/issues/11#issuecomment-1100" ;;
    12) echo "https://github.com/test/repo/issues/12#issuecomment-1200" ;;
  esac
  exit 0
fi
if [ "$1" = "repo" ] && [ "$2" = "view" ]; then
  printf '{"owner":{"login":"test"},"name":"repo"}'
  exit 0
fi
if [ "$1" = "api" ]; then
  case "$*" in
    *issues/11/comments*) printf '[]' ; exit 0 ;;
    *issues/12/comments*) printf '[]' ; exit 0 ;;
  esac
fi
exit 0
`);
        fs.chmodSync(ghPath, 0o755);
        const env5e = {
          ...process.env,
          PATH: binDir + path.delimiter + (process.env.PATH || ''),
          HOME: case5Dir,
          KAOLA_WORKFLOW_OFFLINE: ''
        };

        const out5e1 = JSON.parse(execFileSync(process.execPath, [
          claimScript, 'bootstrap', '--runtime', 'codex'
        ], { cwd: case5Dir, encoding: 'utf8', env: env5e }).trim());
        assert(out5e1.issue === 11, 'Case 5e-a: first bootstrap must pick issue 11, got: ' + out5e1.issue);
        assert(out5e1.session, 'Case 5e-a: bootstrap output must include generated session');

        const out5e2 = JSON.parse(execFileSync(process.execPath, [
          claimScript, 'bootstrap', '--runtime', 'codex'
        ], { cwd: case5Dir, encoding: 'utf8', env: env5e }).trim());
        assert(out5e2.issue === 12, 'Case 5e-b: second bootstrap must skip locked issue 11 and pick 12, got: ' + out5e2.issue);
        assert(out5e2.session && out5e2.session !== out5e1.session, 'Case 5e-b: second bootstrap must generate an independent session');
      }

      // Case 5f: remote claim creates/applies workflow:in-progress label and
      // still posts the sentinel comment when assignment fails.
      {
        const binDir = path.join(case5Dir, 'bin-label');
        fs.mkdirSync(binDir, { recursive: true });
        const callLog = path.join(case5Dir, 'gh-label-calls.log');
        const ghPath = path.join(binDir, 'gh');
        fs.writeFileSync(ghPath, `#!/bin/sh
echo "$@" >> "${callLog}"
if [ "$1" = "label" ] && [ "$2" = "create" ]; then
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "edit" ]; then
  case "$*" in
    *"--add-assignee @me"*) exit 1 ;;
    *) exit 0 ;;
  esac
fi
if [ "$1" = "issue" ] && [ "$2" = "comment" ]; then
  echo "https://github.com/test/repo/issues/19#issuecomment-1900"
  exit 0
fi
if [ "$1" = "repo" ] && [ "$2" = "view" ]; then
  printf '{"owner":{"login":"test"},"name":"repo"}'
  exit 0
fi
if [ "$1" = "api" ]; then
  printf '[{"id":1900,"body":"Session claimed by sess-label <!-- kw:claim sess=sess-label -->"}]'
  exit 0
fi
exit 0
`);
        fs.chmodSync(ghPath, 0o755);
        execFileSync(process.execPath, [
          claimScript, 'claim',
          '--session', 'sess-label',
          '--project', 'project-label',
          '--issue', '19',
          '--runtime', 'codex'
        ], {
          cwd: case5Dir,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: binDir + path.delimiter + (process.env.PATH || ''),
            HOME: case5Dir,
            KAOLA_WORKFLOW_OFFLINE: ''
          }
        });
        const log = fs.readFileSync(callLog, 'utf8');
        assert(log.includes('label create workflow:in-progress'), 'Case 5f: claim must create workflow:in-progress label, got: ' + log);
        assert(log.includes('issue edit 19 --add-label workflow:in-progress'), 'Case 5f: claim must add workflow:in-progress label, got: ' + log);
        assert(log.includes('issue edit 19 --add-assignee @me'), 'Case 5f: claim must try to assign @me, got: ' + log);
        assert(log.includes('issue comment 19'), 'Case 5f: claim must still post sentinel comment, got: ' + log);
        assert(!log.includes('--title'), 'Case 5f: claim must not mutate issue title, got: ' + log);
      }

      // Case 5g: session lookup rehydrates from the lock, then workflow-state lease.
      {
        const case5gDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-case5g-'));
        try {
          execFileSync(process.execPath, [
            claimScript, 'claim',
            '--session', 'sess-plugin-5g',
            '--project', 'plugin-session',
            '--issue', '21',
            '--runtime', 'codex'
          ], { cwd: case5gDir, encoding: 'utf8', env: { ...process.env, HOME: case5gDir, KAOLA_WORKFLOW_OFFLINE: '1' } });

          const fromLock = execFileSync(process.execPath, [
            claimScript, 'session', '--project', 'plugin-session'
          ], { cwd: case5gDir, encoding: 'utf8', env: { ...process.env, HOME: case5gDir, KAOLA_WORKFLOW_OFFLINE: '1' } }).trim();
          assert(fromLock === 'sess-plugin-5g', 'Case 5g-a: session lookup from lock must return sess-plugin-5g, got: ' + fromLock);

          fs.unlinkSync(path.join(case5gDir, 'kaola-workflow', '.locks', 'plugin-session.lock'));
          const fromState = execFileSync(process.execPath, [
            claimScript, 'session', '--project', 'plugin-session'
          ], { cwd: case5gDir, encoding: 'utf8', env: { ...process.env, HOME: case5gDir, KAOLA_WORKFLOW_OFFLINE: '1' } }).trim();
          assert(fromState === 'sess-plugin-5g', 'Case 5g-b: session lookup from workflow-state must return sess-plugin-5g, got: ' + fromState);
        } finally {
          fs.rmSync(case5gDir, { recursive: true, force: true });
        }
      }

      // Case 5h: locks are isolated by project — all claimed projects must still exist independently
      assert(fs.existsSync(path.join(case5Dir, 'kaola-workflow', '.locks', 'project-alpha.lock')),
        'Case 5h: project-alpha lock must still exist');
      assert(fs.existsSync(path.join(case5Dir, 'kaola-workflow', '.locks', 'project-beta.lock')),
        'Case 5h: project-beta lock must still exist');
      assert(fs.existsSync(path.join(case5Dir, 'kaola-workflow', '.locks', 'issue-11.lock')),
        'Case 5h: issue-11 lock must still exist');
      assert(fs.existsSync(path.join(case5Dir, 'kaola-workflow', '.locks', 'issue-12.lock')),
        'Case 5h: issue-12 lock must still exist');
      assert(fs.existsSync(path.join(case5Dir, 'kaola-workflow', '.locks', 'project-label.lock')),
        'Case 5h: project-label lock must still exist');

      const finalAlpha = JSON.parse(fs.readFileSync(
        path.join(case5Dir, 'kaola-workflow', '.locks', 'project-alpha.lock'), 'utf8'
      ));
      const finalBeta = JSON.parse(fs.readFileSync(
        path.join(case5Dir, 'kaola-workflow', '.locks', 'project-beta.lock'), 'utf8'
      ));
      assert(finalAlpha.runtime !== finalBeta.runtime, 'Case 5h: locks must have different runtime fields');
    } finally {
      fs.rmSync(case5Dir, { recursive: true, force: true });
    }

    console.log('Kaola-Workflow walkthrough simulation passed');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
