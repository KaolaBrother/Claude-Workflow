#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function isSafeName(name) {
  return typeof name === 'string' && name.length > 0 &&
    !name.includes('/') && !name.includes('\\') &&
    !name.includes('\0') && name !== '.' && name !== '..';
}

function field(content, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp('^' + escaped + ':\\s*(.+)$', 'm'));
  return match ? match[1].trim() : '';
}

function sleepMs(ms) { const end = Date.now() + ms; while (Date.now() < end) {} }

function ghExec(args) {
  if (OFFLINE) return '';
  return execFileSync('gh', args, { encoding: 'utf8' }).trim();
}

function getRoot() {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch (_) {
    return process.cwd();
  }
}

function getMachineId() {
  const p = path.join(os.homedir(), '.config', 'kaola-workflow', 'machine-id');
  try { return fs.readFileSync(p, 'utf8').trim(); } catch (_) {}
  const id = crypto.randomUUID();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, id + '\n');
  return id;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') { args.json = true; continue; }
    if (argv[i] === '--session' && argv[i + 1]) { args.session = argv[++i]; continue; }
    if (argv[i] === '--project' && argv[i + 1]) { args.project = argv[++i]; continue; }
    if (argv[i] === '--issue' && argv[i + 1]) { args.issue = parseInt(argv[++i], 10); continue; }
    if (argv[i] === '--branch' && argv[i + 1]) { args.branch = argv[++i]; continue; }
  }
  return args;
}

function locksDir(root) { return path.join(root, 'kaola-workflow', '.locks'); }
function sessionsDir(root) { return path.join(root, 'kaola-workflow', '.sessions'); }
function lockPath(root, project) { return path.join(locksDir(root), project + '.lock'); }
function sessionPath(root, sessionId) { return path.join(sessionsDir(root), sessionId + '.json'); }

function readLockFiles(root) {
  const dir = locksDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.lock'))
    .map(f => {
      try {
        const raw = fs.readFileSync(path.join(dir, f), 'utf8');
        return JSON.parse(raw);
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);
}

function readSessionFile(root, sessionId) {
  try {
    const raw = fs.readFileSync(sessionPath(root, sessionId), 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function shouldSweep(lock) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return new Date(lock.expires).getTime() < cutoff &&
    new Date(lock.last_heartbeat).getTime() < cutoff;
}

function updateSinkLease(stateFile, lockData) {
  if (!fs.existsSync(stateFile)) return;
  const content = fs.readFileSync(stateFile, 'utf8');

  const branchName = lockData.issue_number != null
    ? 'workflow/issue-' + lockData.issue_number + '-' + lockData.project
    : 'workflow/' + lockData.project;

  const sinkBlock = [
    '\n## Sink',
    'branch: ' + branchName,
    'issue_number: ' + (lockData.issue_number != null ? lockData.issue_number : 'unset'),
    'claimed_at: ' + lockData.claimed_at
  ].join('\n');

  const leaseBlock = [
    '\n## Lease',
    'session_id: ' + lockData.session_id,
    'expires: ' + lockData.expires,
    'last_heartbeat: ' + lockData.last_heartbeat,
    'claim_comment_id: ' + (lockData.claim_comment_id || 'N/A')
  ].join('\n');

  if (!/^## Sink\s*$/m.test(content)) {
    fs.writeFileSync(stateFile, content + sinkBlock + leaseBlock + '\n');
    return;
  }

  // Update in-place
  let updated = content.replace(/^branch:.*$/m, () => 'branch: ' + branchName);
  updated = updated.replace(/(?:^|\n)(## Lease[\s\S]*?)(?=\n##|[\s]*$)/, '\n' + leaseBlock.slice(1));
  fs.writeFileSync(stateFile, updated);
}

function updateLeaseInPlace(stateFile, lockData) {
  if (!fs.existsSync(stateFile)) return;
  const content = fs.readFileSync(stateFile, 'utf8');
  if (!/^## Lease\s*$/m.test(content)) return;

  const updated = content
    .replace(/^expires:.*$/m, 'expires: ' + lockData.expires)
    .replace(/^last_heartbeat:.*$/m, 'last_heartbeat: ' + lockData.last_heartbeat);

  fs.writeFileSync(stateFile, updated);
}

function writeLockFile(lp, lockData) {
  const fd = fs.openSync(lp, 'wx');
  try {
    fs.writeSync(fd, JSON.stringify(lockData, null, 2) + '\n');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function writeSessionFile(root, sessionId, machineId) {
  fs.mkdirSync(sessionsDir(root), { recursive: true });
  const sess = {
    session_id: sessionId,
    machine_id: machineId,
    hostname: os.hostname(),
    pid: process.pid,
    started: new Date().toISOString()
  };
  fs.writeFileSync(sessionPath(root, sessionId), JSON.stringify(sess, null, 2) + '\n');
}

function postGitHubClaim(issueNum, sessionId) {
  if (!issueNum) return null;
  ghExec(['issue', 'edit', String(issueNum), '--add-label', 'workflow:in-progress', '--add-assignee', '@me']);
  const out = ghExec(['issue', 'comment', String(issueNum), '--body', '🔒 Session claimed by ' + sessionId]);
  const m = out.match(/comments\/(\d+)/);
  return m ? m[1] : null;
}

function cmdClaim() {
  const args = parseArgs(process.argv.slice(3));
  assert(args.session, '--session <id> required for claim');
  assert(args.project, '--project <name> required for claim');
  assert(isSafeName(args.project), '--project must be a simple folder name with no path separators');
  assert(isSafeName(args.session), '--session must be a simple UUID with no path separators');
  if (args.issue != null) {
    assert(Number.isFinite(args.issue) && args.issue > 0, '--issue must be a positive integer');
  }

  const root = getRoot();
  const machineId = getMachineId();
  const now = new Date();

  fs.mkdirSync(locksDir(root), { recursive: true });

  const lp = lockPath(root, args.project);
  const lockData = {
    project: args.project,
    session_id: args.session,
    machine_id: machineId,
    claimed_at: now.toISOString(),
    expires: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    last_heartbeat: now.toISOString(),
    issue_number: args.issue != null ? args.issue : null,
    claim_comment_id: null
  };

  for (let i = 0; i < 3; i++) {
    try { writeLockFile(lp, lockData); break; }
    catch (e) { if (e.code !== 'EEXIST' || i === 2) { process.exitCode = 2; return; } sleepMs(50); }
  }

  writeSessionFile(root, args.session, machineId);

  let commentId = null;
  if (!OFFLINE && args.issue != null) {
    try { commentId = postGitHubClaim(args.issue, args.session); } catch (_) {}
  }

  const finalLock = commentId !== null
    ? Object.assign({}, lockData, { claim_comment_id: commentId })
    : lockData;

  if (commentId !== null) {
    fs.writeFileSync(lp, JSON.stringify(finalLock, null, 2) + '\n');
  }

  const stateFile = path.join(root, 'kaola-workflow', args.project, 'workflow-state.md');
  updateSinkLease(stateFile, finalLock);
}

function cmdRelease() {
  const args = parseArgs(process.argv.slice(3));
  assert(args.session, '--session <id> required for release');

  const root = getRoot();
  const locks = readLockFiles(root);
  const match = locks.find(l => l.session_id === args.session);

  if (!match) {
    process.stderr.write('release: no lock found for session ' + args.session + '\n');
    return;
  }

  assert(isSafeName(match.project), 'lock file has invalid project field');
  assert(isSafeName(match.session_id), 'lock file has invalid session_id field');

  if (!OFFLINE && match.issue_number != null) {
    try {
      ghExec(['issue', 'edit', String(match.issue_number), '--remove-label', 'workflow:in-progress']);
    } catch (_) {}
  }

  const lp = lockPath(root, match.project);
  fs.unlinkSync(lp);

  try { fs.unlinkSync(sessionPath(root, args.session)); } catch (_) {}
}

function cmdHeartbeat() {
  const args = parseArgs(process.argv.slice(3));
  assert(args.session, '--session <id> required for heartbeat');

  const root = getRoot();
  const locks = readLockFiles(root);
  const match = locks.find(l => l.session_id === args.session);

  if (!match) {
    process.exitCode = 1;
    return;
  }

  assert(isSafeName(match.project), 'lock file has invalid project field');
  assert(isSafeName(match.session_id), 'lock file has invalid session_id field');

  const now = new Date();
  const updated = Object.assign({}, match, {
    last_heartbeat: now.toISOString(),
    expires: new Date(now.getTime() + 30 * 60 * 1000).toISOString()
  });

  const lp = lockPath(root, match.project);
  fs.writeFileSync(lp, JSON.stringify(updated, null, 2) + '\n');

  const stateFile = path.join(root, 'kaola-workflow', match.project, 'workflow-state.md');
  updateLeaseInPlace(stateFile, updated);
}

function cmdSweep() {
  const root = getRoot();
  const dir = locksDir(root);
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.lock'));
  for (const f of files) {
    const fp = path.join(dir, f);
    let lock;
    try {
      lock = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (_) { continue; }

    if (!shouldSweep(lock)) continue;

    if (!OFFLINE && lock.issue_number != null) {
      try {
        ghExec(['issue', 'edit', String(lock.issue_number), '--remove-label', 'workflow:in-progress']);
      } catch (_) {}
    }
    try { fs.unlinkSync(fp); } catch (_) {}
  }
}

function cmdStatus() {
  const args = parseArgs(process.argv.slice(3));
  const root = getRoot();
  const locks = readLockFiles(root);

  const filtered = args.session
    ? locks.filter(l => l.session_id === args.session)
    : locks;

  const results = filtered.map(lock => {
    const session = readSessionFile(root, lock.session_id);

    let remote = { assignee: null, has_label: null, sentinel_comment_id: null };
    if (!OFFLINE && lock.issue_number != null) {
      try {
        const raw = ghExec(['issue', 'view', String(lock.issue_number), '--json', 'assignees,labels']);
        const data = JSON.parse(raw);
        const assignees = (data.assignees || []).map(a => a.login);
        const labels = (data.labels || []).map(l => l.name);
        remote = {
          assignee: assignees.join(',') || null,
          has_label: labels.includes('workflow:in-progress'),
          sentinel_comment_id: lock.claim_comment_id || null
        };
      } catch (_) {}
    }

    const consistent = session != null && session.session_id === lock.session_id;
    const drift = [];
    if (!consistent && session == null) drift.push('session file missing');
    if (session != null && session.session_id !== lock.session_id) {
      drift.push('session_id mismatch: session=' + session.session_id + ' lock=' + lock.session_id);
    }

    return { session, lock, remote, consistent, drift };
  });

  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
}

function cmdPatchBranch() {
  const args = parseArgs(process.argv.slice(3));
  assert(args.project, '--project required for patch-branch');
  assert(args.session, '--session required for patch-branch');
  assert(args.branch, '--branch required for patch-branch');
  assert(isSafeName(args.project), '--project must be a simple folder name');
  assert(isSafeName(args.session), '--session must be a simple UUID');
  assert(typeof args.branch === 'string' && args.branch.length > 0
    && !args.branch.includes('\0') && args.branch !== '.' && args.branch !== '..', '--branch is invalid');

  const root = getRoot();
  const lp = lockPath(root, args.project);
  assert(fs.existsSync(lp), 'no lock file for project: ' + args.project);
  const lock = JSON.parse(fs.readFileSync(lp, 'utf8'));
  assert(lock.session_id === args.session, 'session mismatch: lock belongs to ' + lock.session_id);

  const updatedLock = Object.assign({}, lock, { branch: args.branch });
  fs.writeFileSync(lp, JSON.stringify(updatedLock, null, 2) + '\n');

  const stateFile = path.join(root, 'kaola-workflow', args.project, 'workflow-state.md');
  if (fs.existsSync(stateFile)) {
    const content = fs.readFileSync(stateFile, 'utf8');
    const patched = content.replace(/^branch:.*$/m, () => 'branch: ' + args.branch);
    fs.writeFileSync(stateFile, patched);
  }

  const safeCommentId = /^\d+$/.test(lock.claim_comment_id) ? lock.claim_comment_id : null;
  if (!OFFLINE && safeCommentId) {
    try {
      ghExec(['issue', 'comment', '--edit', safeCommentId,
        '--body', 'Branch: ' + args.branch]);
    } catch (_) {}
  }
}

function main() {
  const sub = process.argv[2];
  assert(sub, 'usage: kaola-workflow-claim.js <claim|release|heartbeat|sweep|status|patch-branch>');
  if (sub === 'claim') return cmdClaim();
  if (sub === 'release') return cmdRelease();
  if (sub === 'heartbeat') return cmdHeartbeat();
  if (sub === 'sweep') return cmdSweep();
  if (sub === 'status') return cmdStatus();
  if (sub === 'patch-branch') return cmdPatchBranch();
  throw new Error('unknown subcommand: ' + sub);
}

try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }
