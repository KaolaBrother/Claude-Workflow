#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PHASES = {
  1: 'Research',
  2: 'Ideation',
  3: 'Plan',
  4: 'Execute',
  5: 'Review',
  6: 'Finalize'
};
const SKILLS = {
  1: 'kaola-workflow-research',
  2: 'kaola-workflow-ideation',
  3: 'kaola-workflow-plan',
  4: 'kaola-workflow-execute',
  5: 'kaola-workflow-review',
  6: 'kaola-workflow-finalize'
};

function exists(file) {
  return fs.existsSync(file);
}

function readFile(file) {
  return fs.readFileSync(file, 'utf8');
}

function field(content, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp('^' + escaped + ':\\s*(.+)$', 'm'));
  return match ? match[1].trim() : '';
}

function isSafeName(name) {
  return Boolean(name) && !name.includes('/') && !name.includes('\\') && name !== '.' && name !== '..';
}

function projectHasPhaseArtifacts(projectDir) {
  if (!exists(projectDir)) return false;
  return fs.readdirSync(projectDir).some(file => /^phase\d.+\.md$/.test(file));
}

function findWorkflowLocation(startDir) {
  let current = path.resolve(startDir || process.cwd());
  while (true) {
    const workflowDir = path.join(current, 'kaola-workflow');
    if (exists(workflowDir)) return { root: current, workflowDir };
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function activeProjects(workflowDir) {
  if (!exists(workflowDir)) return [];
  return fs.readdirSync(workflowDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .filter(entry => entry.name !== 'archive' && !entry.name.startsWith('.'))
    .filter(entry => {
      const projectDir = path.join(workflowDir, entry.name);
      const stateFile = path.join(projectDir, 'workflow-state.md');
      if (projectHasPhaseArtifacts(projectDir)) return true;
      if (!exists(stateFile)) return false;
      const content = readFile(stateFile);
      return /^status:\s*active\s*$/m.test(content);
    })
    .map(entry => entry.name)
    .sort();
}

function selectProject(workflowDir, argument) {
  const requested = String(argument || '').trim().split(/\s+/)[0];
  if (isSafeName(requested) && exists(path.join(workflowDir, requested))) return { project: requested };
  const projects = activeProjects(workflowDir);
  if (projects.length === 1) return { project: projects[0] };
  if (projects.length > 1) return { reason: 'ambiguous active projects: ' + projects.join(', ') };
  return { reason: 'no active workflow projects' };
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

function route(root, project, phase, phaseFile, task) {
  return {
    root,
    project,
    phase,
    phaseName: PHASES[phase],
    step: 'router-reconstructed',
    task: task || 'N/A',
    nextCommand: '/kaola-workflow-phase' + phase + ' ' + project,
    nextSkill: SKILLS[phase] + ' ' + project,
    phaseFile
  };
}

function reconstruct(root, workflowDir, project) {
  const projectDir = path.join(workflowDir, project);
  const phase4 = artifact(projectDir, 'phase4-progress.md');
  if (artifact(projectDir, 'phase6-summary.md')) return { complete: true, reason: 'phase6-summary.md exists; workflow is complete' };
  if (artifact(projectDir, 'phase5-review.md')) return route(root, project, 6, artifact(projectDir, 'phase5-review.md'));
  if (phase4) {
    const content = readFile(phase4);
    return allPhase4TasksComplete(content) ? route(root, project, 5, phase4) : route(root, project, 4, phase4, firstOpenPhase4Task(content));
  }
  if (artifact(projectDir, 'phase3-plan.md')) return route(root, project, 4, artifact(projectDir, 'phase3-plan.md'));
  if (artifact(projectDir, 'phase2-ideation.md')) return route(root, project, 3, artifact(projectDir, 'phase2-ideation.md'));
  if (artifact(projectDir, 'phase1-research.md')) return route(root, project, 2, artifact(projectDir, 'phase1-research.md'));
  return { reason: 'no phase artifacts available for repair' };
}

function extractSection(content, heading) {
  if (!content) return '';
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp('(?:^|\\n)(## ' + escaped + '[\\s\\S]*?)(?=\\n## |\\s*$)'));
  return match ? match[1].trim() : '';
}

function stateContent(routeResult, existingContent) {
  const relativePhaseFile = path.relative(routeResult.root, routeResult.phaseFile);
  const preserved = ['GitLab', 'Sink']
    .map(section => extractSection(existingContent || '', section))
    .filter(Boolean);
  const lines = [
    '# Kaola-Workflow State',
    '',
    '## Project',
    'name: ' + routeResult.project,
    'status: active',
    '',
    '## Current Position',
    'phase: ' + routeResult.phase,
    'phase_name: ' + routeResult.phaseName,
    'step: ' + routeResult.step,
    'task: ' + routeResult.task,
    'next_command: ' + routeResult.nextCommand,
    'next_skill: ' + routeResult.nextSkill,
    '',
    '## Pending Gates',
    '- none',
    '',
    '## Last Evidence',
    'phase_file: ' + relativePhaseFile,
    'cache_file: N/A',
    'last_command: repair-state',
    'last_result: reconstructed',
    '',
    '## Last Updated',
    new Date().toISOString()
  ];
  return lines.concat('', preserved).join('\n') + '\n';
}

function repair(projectArg, startDir) {
  const location = findWorkflowLocation(startDir || process.cwd());
  if (!location) return { repaired: false, reason: 'workflow directory not found' };
  const selected = selectProject(location.workflowDir, projectArg);
  if (!selected.project) return { repaired: false, reason: selected.reason };
  const result = reconstruct(location.root, location.workflowDir, selected.project);
  if (!result.project) return Object.assign({ repaired: false, project: selected.project }, result);
  const stateFile = path.join(location.workflowDir, selected.project, 'workflow-state.md');
  let existing = '';
  try { existing = readFile(stateFile); } catch (_) {}
  fs.writeFileSync(stateFile, stateContent(result, existing), 'utf8');
  return { repaired: true, project: selected.project, phase: result.phase, next_skill: result.nextSkill };
}

function main() {
  const result = repair(process.argv[2], process.cwd());
  process.stdout.write(JSON.stringify(result) + '\n');
  if (!result.repaired && !result.complete) process.exitCode = 1;
}

if (require.main === module) {
  try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }
}

module.exports = {
  repair,
  reconstruct,
  stateContent
};

