#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PHASES = {
  1: { name: 'Research', skill: 'kaola-workflow-research' },
  2: { name: 'Ideation', skill: 'kaola-workflow-ideation' },
  3: { name: 'Plan', skill: 'kaola-workflow-plan' },
  4: { name: 'Execute', skill: 'kaola-workflow-execute' },
  5: { name: 'Review', skill: 'kaola-workflow-review' },
  6: { name: 'Finalize', skill: 'kaola-workflow-finalize' }
};
const WORKFLOW_DIR = 'kaola-workflow';
const LEGACY_WORKFLOW_DIRS = ['codex-workflow'];

function exists(file) {
  return fs.existsSync(file);
}

function readFile(file) {
  return fs.readFileSync(file, 'utf8');
}

function workflowHasPhaseArtifacts(workflowDir) {
  if (!exists(workflowDir)) return false;
  return fs.readdirSync(workflowDir, { withFileTypes: true })
    .some(entry => {
      if (!entry.isDirectory() || entry.name === 'archive' || entry.name === '_phase1-pending') return false;
      const projectDir = path.join(workflowDir, entry.name);
      return projectHasPhaseArtifacts(projectDir);
    });
}

function findWorkflowLocation(startDir) {
  let current = path.resolve(startDir || process.cwd());
  while (true) {
    const locations = [];
    for (const name of [WORKFLOW_DIR, ...LEGACY_WORKFLOW_DIRS]) {
      const workflowDir = path.join(current, name);
      if (exists(workflowDir)) locations.push({ root: current, workflowDir, workflowDirName: name });
    }
    if (locations.length > 0) {
      return locations.find(location => workflowHasPhaseArtifacts(location.workflowDir)) || locations[0];
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function field(content, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`^${escaped}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : '';
}

function isSafeName(name) {
  return Boolean(name) && !name.includes('/') && !name.includes('\\') && name !== '.' && name !== '..';
}

function projectHasPhaseArtifacts(projectDir) {
  return fs.readdirSync(projectDir).some(file => /^phase\d.+\.md$/.test(file));
}

function projectHasActiveState(projectDir) {
  const stateFile = path.join(projectDir, 'workflow-state.md');
  if (!exists(stateFile)) return false;
  const content = readFile(stateFile);
  return /^status:\s*active\s*$/m.test(content) &&
    /^phase:\s*[1-6]\s*$/m.test(content) &&
    /^next_skill:\s*kaola-workflow-(research|ideation|plan|execute|review|finalize)\b/m.test(content);
}

function activeProjects(workflowDir) {
  if (!exists(workflowDir)) return [];
  return fs.readdirSync(workflowDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .filter(entry => entry.name !== 'archive' && entry.name !== '_phase1-pending')
    .filter(entry => {
      const projectDir = path.join(workflowDir, entry.name);
      return projectHasPhaseArtifacts(projectDir) || projectHasActiveState(projectDir);
    })
    .map(entry => entry.name)
    .sort();
}

function selectProject(workflowDir, argument) {
  const requested = String(argument || '').trim().split(/\s+/)[0];
  if (isSafeName(requested) && exists(path.join(workflowDir, requested))) {
    return { project: requested };
  }

  const projects = activeProjects(workflowDir);
  if (projects.length === 1) return { project: projects[0] };
  if (projects.length > 1) return { reason: `ambiguous active projects: ${projects.join(', ')}` };
  return { reason: 'no active workflow projects with phase artifacts or active state' };
}

function complianceRows(content) {
  const start = content.search(/^## Required Agent Compliance\s*$/m);
  if (start === -1) return [];

  const rest = content.slice(start).split(/\r?\n/).slice(1);
  const section = [];
  for (const line of rest) {
    if (/^##\s+/.test(line)) break;
    section.push(line);
  }

  return section
    .filter(line => /^\|.+\|$/.test(line.trim()))
    .map(line => line.trim().split('|').slice(1, -1).map(cell => cell.trim()))
    .filter(columns => columns.length >= 2)
    .filter(columns => !/^[-\s]+$/.test(columns[0]))
    .filter(columns => !/^requirement$/i.test(columns[0]))
    .map(columns => ({
      requirement: columns[0],
      status: columns[1] || '',
      evidence: columns[2] || '',
      skipReason: columns[3] || ''
    }));
}

function unresolvedCompliance(content) {
  const rows = complianceRows(content);
  if (rows.length === 0) {
    return [{ requirement: 'Required Agent Compliance table', status: 'missing', evidence: '', skipReason: '' }];
  }

  return rows.filter(row => {
    const status = row.status.toLowerCase();
    if (!status || ['pending', 'missing', 'todo', 'unknown'].includes(status)) return true;
    if (status === 'invoked' && !row.evidence) return true;
    if (['n/a', 'na', 'skipped'].includes(status) && !row.evidence && !row.skipReason) return true;
    return false;
  });
}

function taskRows(content) {
  const start = content.search(/^## Tasks\s*$/m);
  if (start === -1) return [];

  const rest = content.slice(start).split(/\r?\n/).slice(1);
  const section = [];
  for (const line of rest) {
    if (/^##\s+/.test(line)) break;
    section.push(line);
  }

  return section
    .filter(line => /^\|.+\|$/.test(line.trim()))
    .map(line => line.trim().split('|').slice(1, -1).map(cell => cell.trim()))
    .filter(columns => columns.length >= 3)
    .filter(columns => !/^[-\s]+$/.test(columns[0]))
    .filter(columns => !/^#$/i.test(columns[0]))
    .map(columns => ({ id: columns[0], status: columns[2].toLowerCase() }));
}

function allPhase4TasksComplete(content) {
  const tasks = taskRows(content);
  return tasks.length > 0 && tasks.every(task => task.status === 'complete');
}

function firstOpenPhase4Task(content) {
  const task = taskRows(content).find(row => row.status !== 'complete');
  return task ? task.id : 'N/A';
}

function artifact(projectDir, file) {
  const fullPath = path.join(projectDir, file);
  return exists(fullPath) ? fullPath : null;
}

function nextSkill(phase, project) {
  return `${PHASES[phase].skill} ${project}`;
}

function route(root, workflowDir, project, phase, phaseFileName, crossesBoundary, task = 'N/A') {
  const projectDir = path.join(workflowDir, project);
  const phaseFile = path.join(projectDir, phaseFileName);
  const content = readFile(phaseFile);
  const unresolved = unresolvedCompliance(content);

  if (crossesBoundary && unresolved.length > 0) {
    return {
      reason: `unresolved compliance gates in ${phaseFileName}: ${unresolved.map(row => row.requirement).join(', ')}`
    };
  }

  return {
    root,
    project,
    phase,
    phaseName: PHASES[phase].name,
    step: 'router-reconstructed',
    task,
    nextSkill: nextSkill(phase, project),
    phaseFile,
    pendingGates: unresolved
  };
}

function reconstruct(root, workflowDir, project) {
  const projectDir = path.join(workflowDir, project);
  const phase4 = artifact(projectDir, 'phase4-progress.md');

  if (artifact(projectDir, 'phase6-summary.md')) {
    return { complete: true, reason: 'phase6-summary.md exists; workflow is complete' };
  }

  if (artifact(projectDir, 'phase5-review.md')) {
    if (phase4 && !allPhase4TasksComplete(readFile(phase4))) {
      return { reason: 'phase5-review.md exists but phase4-progress.md still has open tasks' };
    }
    return route(root, workflowDir, project, 6, 'phase5-review.md', true);
  }

  if (phase4) {
    const content = readFile(phase4);
    if (allPhase4TasksComplete(content)) return route(root, workflowDir, project, 5, 'phase4-progress.md', true);
    return route(root, workflowDir, project, 4, 'phase4-progress.md', false, firstOpenPhase4Task(content));
  }

  if (artifact(projectDir, 'phase3-plan.md')) return route(root, workflowDir, project, 4, 'phase3-plan.md', true);
  if (artifact(projectDir, 'phase2-ideation.md')) return route(root, workflowDir, project, 3, 'phase2-ideation.md', true);
  if (artifact(projectDir, 'phase1-research.md')) return route(root, workflowDir, project, 2, 'phase1-research.md', true);

  return { reason: 'no phase artifacts available for repair' };
}

function stateLooksValid(root, project, content) {
  const phase = Number(field(content, 'phase'));
  const next = field(content, 'next_skill');
  const phaseFile = field(content, 'phase_file');

  if (!PHASES[phase]) return false;
  if (next !== nextSkill(phase, project)) return false;
  if (phaseFile && phaseFile !== 'N/A' && !exists(path.join(root, phaseFile))) return false;
  return /^status:\s*active\s*$/m.test(content);
}

function pendingGateLines(rows) {
  if (!rows || rows.length === 0) return ['- none'];
  return rows.map(row => `- ${row.requirement}: ${row.status || 'missing'}`);
}

function stateContent(routeResult) {
  const relativePhaseFile = path.relative(routeResult.root, routeResult.phaseFile);
  return [
    '# Kaola-Workflow State',
    '',
    '## Project',
    `name: ${routeResult.project}`,
    'status: active',
    '',
    '## Current Position',
    `phase: ${routeResult.phase}`,
    `phase_name: ${routeResult.phaseName}`,
    `step: ${routeResult.step}`,
    `task: ${routeResult.task}`,
    `next_skill: ${routeResult.nextSkill}`,
    '',
    '## Pending Gates',
    ...pendingGateLines(routeResult.pendingGates),
    '',
    '## Ownership Rules',
    'main_session_role: orchestrator',
    routeResult.phase === 4 ? 'implementation_owner: tdd-guide when available; current-codex-session fallback' : 'implementation_owner: N/A',
    routeResult.phase >= 4 ? 'fix_owner: tdd-guide or build-error-resolver when available; current-codex-session fallback' : 'fix_owner: N/A',
    'agent_profiles: .codex/agents/kaola-workflow via kaola-workflow-init',
    '',
    '## Last Evidence',
    `phase_file: ${relativePhaseFile}`,
    'cache_file: N/A',
    `last_command: node plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js ${routeResult.project}`,
    'last_result: state_repaired_from_artifacts',
    '',
    '## Last Updated',
    new Date().toISOString(),
    ''
  ].join('\n');
}

function printRoute(prefix, routeResult) {
  const pending = routeResult.pendingGates && routeResult.pendingGates.length > 0
    ? routeResult.pendingGates.map(row => row.requirement).join(', ')
    : 'none';

  process.stdout.write([
    prefix,
    `Workflow project: ${routeResult.project}`,
    `Current phase: ${routeResult.phase}`,
    `Current step: ${routeResult.step}`,
    `Pending gates: ${pending}`,
    `Next skill: ${routeResult.nextSkill}`,
    ''
  ].join('\n'));
}

function main() {
  const location = findWorkflowLocation(process.cwd());
  if (!location) {
    process.stdout.write('Kaola-Workflow state repair: skipped - no kaola-workflow directory found\n');
    return;
  }

  const { root, workflowDir } = location;
  const selection = selectProject(workflowDir, process.argv.slice(2).join(' '));
  if (!selection.project) {
    process.stdout.write(`Kaola-Workflow state repair: skipped - ${selection.reason}\n`);
    return;
  }

  const stateFile = path.join(workflowDir, selection.project, 'workflow-state.md');
  if (exists(stateFile)) {
    const content = readFile(stateFile);
    if (stateLooksValid(root, selection.project, content)) {
      const reconstructed = reconstruct(root, workflowDir, selection.project);
      if (reconstructed.complete) {
        process.stdout.write(`Kaola-Workflow state repair: skipped - ${reconstructed.reason}\n`);
        return;
      }

      if (reconstructed.nextSkill && reconstructed.nextSkill !== field(content, 'next_skill')) {
        fs.writeFileSync(stateFile, stateContent(reconstructed));
        printRoute(`Kaola-Workflow state repair: repaired stale ${path.relative(root, stateFile)}`, reconstructed);
        return;
      }

      printRoute('Kaola-Workflow state repair: existing state valid', {
        project: selection.project,
        phase: field(content, 'phase'),
        step: field(content, 'step') || 'unknown',
        nextSkill: field(content, 'next_skill'),
        pendingGates: []
      });
      return;
    }
  }

  const routeResult = reconstruct(root, workflowDir, selection.project);
  if (!routeResult.nextSkill) {
    process.stdout.write(`Kaola-Workflow state repair: skipped - ${routeResult.reason}\n`);
    return;
  }

  fs.writeFileSync(stateFile, stateContent(routeResult));
  printRoute(`Kaola-Workflow state repair: wrote ${path.relative(root, stateFile)}`, routeResult);
}

try {
  main();
} catch (error) {
  process.stderr.write(`Kaola-Workflow state repair failed: ${error.message}\n`);
  process.exit(1);
}
