#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const forge = require('./kaola-gitlab-forge');

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function isSafeName(name) {
  return typeof name === 'string' && name.length > 0 &&
    !name.includes('/') && !name.includes('\\') &&
    !name.includes('\0') && name !== '.' && name !== '..';
}

function getRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch (_) {
    return process.cwd();
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--branch' && argv[i + 1]) { args.branch = argv[++i]; continue; }
    if (argv[i] === '--issue' && argv[i + 1]) { args.issue = parseInt(argv[++i], 10); continue; }
    if (argv[i] === '--project' && argv[i + 1]) { args.project = argv[++i]; continue; }
  }
  return args;
}

function field(content, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp('^' + escaped + ':\\s*(.+)$', 'm'));
  return match ? match[1].trim() : '';
}

function resolveProjectFile(root, project, basename) {
  const live = path.join(root, 'kaola-workflow', project, basename);
  if (fs.existsSync(live)) return live;
  const archived = path.join(root, 'kaola-workflow', 'archive', project, basename);
  if (fs.existsSync(archived)) return archived;
  return live; // let caller's try/catch handle missing
}

function readProjectInfo(root, project) {
  const stateFile = resolveProjectFile(root, project, 'workflow-state.md');
  let content = '';
  try { content = fs.readFileSync(stateFile, 'utf8'); } catch (_) {}
  return {
    project_id: Number(field(content, 'project_id')) || null,
    path_with_namespace: field(content, 'path_with_namespace'),
    web_url: field(content, 'project_web_url')
  };
}

function finalValidationPassed(root, project) {
  const summaryFile = resolveProjectFile(root, project, 'phase6-summary.md');
  let summary = '';
  try { summary = fs.readFileSync(summaryFile, 'utf8'); } catch (_) { return false; }
  return /Final Validation/i.test(summary) && /pass/i.test(summary) && !/blocked|failed/i.test(summary);
}

function assertCleanWorktree(gitExec) {
  const status = gitExec('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  assert(!status, 'Worktree must be clean before direct merge sink runs');
}

function fastForwardMain(args, opts) {
  const options = opts || {};
  const gitExec = options.gitExec || execFileSync;
  if (options.skipGit) return;
  gitExec('git', ['fetch', 'origin'], { encoding: 'utf8' });
  assertCleanWorktree(gitExec);
  gitExec('git', ['checkout', args.branch], { encoding: 'utf8' });
  gitExec('git', ['rebase', 'origin/main'], { encoding: 'utf8' });
  gitExec('git', ['checkout', 'main'], { encoding: 'utf8' });
  gitExec('git', ['pull', '--ff-only'], { encoding: 'utf8' });
  gitExec('git', ['merge', '--ff-only', '--', args.branch], { encoding: 'utf8' });
  gitExec('git', ['push', 'origin', 'main'], { encoding: 'utf8' });
}

function closeLinkedIssue(root, project, issueIid, opts) {
  const options = opts || {};
  if (issueIid == null) return null;
  assert(finalValidationPassed(root, project), 'Final validation evidence is required before closing the linked GitLab issue');
  const projectInfo = options.projectInfo || readProjectInfo(root, project);
  const note = forge.createIssueNote(projectInfo, issueIid, 'Merged via GitLab direct merge sink after final validation passed.');
  const closed = forge.closeIssue(issueIid);
  return { note_id: note && note.id, issue: closed };
}

function runDirectMerge(args, opts) {
  const options = opts || {};
  assert(args.branch && args.branch !== 'TBD', '--branch is invalid or TBD');
  assert(args.project && isSafeName(args.project), '--project must be a safe folder name');
  if (args.issue != null) assert(Number.isFinite(args.issue) && args.issue > 0, '--issue must be a positive integer');
  const root = options.root || getRoot();
  assert(finalValidationPassed(root, args.project), 'Final validation evidence is required before direct merge sink runs');
  fastForwardMain(args, options);
  const closeResult = closeLinkedIssue(root, args.project, args.issue, options);
  return { merged: true, close: closeResult };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  runDirectMerge(args);
}

if (require.main === module) {
  try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }
}

module.exports = {
  closeLinkedIssue,
  fastForwardMain,
  finalValidationPassed,
  runDirectMerge
};

