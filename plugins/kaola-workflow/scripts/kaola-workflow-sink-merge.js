#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';
const FORCE_FF_FAIL = parseInt(process.env.KAOLA_WORKFLOW_FORCE_FF_FAIL || '0', 10);

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function isSafeName(name) {
  return typeof name === 'string' && name.length > 0 &&
    !name.includes('/') && !name.includes('\\') &&
    !name.includes('\0') && name !== '.' && name !== '..';
}

function ghExec(args) {
  if (OFFLINE) return '';
  return execFileSync('gh', args, { encoding: 'utf8' }).trim();
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

const MAX_AUTOMERGE_RETRIES = 3;

function assertCleanWorktree() {
  const status = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
  assert(!status, 'Worktree must be clean before sink-merge checks out the requested branch');
}

// Steps 3–4: rebase onto origin/main and run post-rebase tests.
function doRebase(args, alreadyUpToDate) {
  // Step 3 — Rebase (inline error message; no external file needed)
  if (!alreadyUpToDate) {
    try {
      execFileSync('git', ['rebase', 'origin/main'], { encoding: 'utf8' });
    } catch (e) {
      throw new Error(
        'Rebase failed: ' + e.message + '\n' +
        'Remediation:\n' +
        '  1. Run: git rebase --abort\n' +
        '  2. Resolve conflicts manually on the feature branch\n' +
        '  3. Re-run: git rebase origin/main\n' +
        '  4. Re-invoke sink-merge after conflicts are resolved\n' +
        'For further guidance, see the conflict remediation section in ' +
        'https://github.com/kaolabrother/Kaola-Workflow/blob/main/README.md'
      );
    }
  }

  // Step 4 — Post-rebase validation
  // Skip when OFFLINE (mirrors Steps 1/5/7/8/9 — C-refined-A). Callers in OFFLINE mode own their own validation.
  if (!alreadyUpToDate && !OFFLINE) {
    execFileSync('npm', ['test'], { encoding: 'utf8', stdio: 'inherit' });
  }
}

// Steps 5–6: FF-only merge loop with retry on race. Returns false when retries exhausted.
function ffMergeLoop(args) {
  let retries = 0;
  let forcedFailCount = 0;
  while (true) {
    // Step 5 — Pull latest main (skip if OFFLINE)
    if (!OFFLINE) {
      execFileSync('git', ['checkout', 'main'], { encoding: 'utf8' });
      execFileSync('git', ['pull', '--ff-only'], { encoding: 'utf8' });
      execFileSync('git', ['checkout', args.branch], { encoding: 'utf8' });
    }

    // Step 6 — FF-only merge onto main
    execFileSync('git', ['checkout', 'main'], { encoding: 'utf8' });

    // FORCE_FF_FAIL: test-only — make first FORCE_FF_FAIL attempts fail without calling git merge
    if (forcedFailCount < FORCE_FF_FAIL) {
      forcedFailCount++;
      retries++;
      execFileSync('git', ['checkout', args.branch], { encoding: 'utf8' });
      if (retries >= MAX_AUTOMERGE_RETRIES) {
        process.stderr.write('FF race: exhausted ' + MAX_AUTOMERGE_RETRIES + ' retries. Aborting.\n');
        process.stderr.write('Manual resolution: ensure no concurrent pushes to main and re-run sink-merge.\n');
        return false;
      }
      continue;
    }

    let mergeSuccess = false;
    try {
      execFileSync('git', ['merge', '--ff-only', '--', args.branch], { encoding: 'utf8' });
      mergeSuccess = true;
    } catch (_) {
      retries++;
      execFileSync('git', ['checkout', args.branch], { encoding: 'utf8' });
      if (retries >= MAX_AUTOMERGE_RETRIES) {
        process.stderr.write('FF race: exhausted ' + MAX_AUTOMERGE_RETRIES + ' retries. Aborting.\n');
        process.stderr.write('Manual resolution: ensure no concurrent pushes to main and re-run sink-merge.\n');
        return false;
      }
      continue;
    }

    if (mergeSuccess) return true;
  }
}

function postMergeCleanup(args) {
  // Step 7 — Push
  if (!OFFLINE) {
    execFileSync('git', ['push', 'origin', 'main'], { encoding: 'utf8' });
  }
  // Step 8 — Close issue
  if (!OFFLINE && args.issue != null) {
    try { ghExec(['issue', 'close', String(args.issue), '--comment', 'Merged via sink-merge.']); }
    catch (_) {}
  }
  // Step 9 — Delete branch
  try { execFileSync('git', ['branch', '-d', '--', args.branch], { encoding: 'utf8' }); } catch (_) {}
  if (!OFFLINE) {
    try { execFileSync('git', ['push', 'origin', '--delete', '--', args.branch], { encoding: 'utf8' }); }
    catch (_) {}
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  assert(
    args.branch && args.branch !== 'TBD' &&
    !args.branch.startsWith('-') && !args.branch.includes('\0') &&
    args.branch !== '.' && args.branch !== '..',
    '--branch is invalid or TBD'
  );
  assert(args.project && isSafeName(args.project), '--project must be a safe folder name');
  if (args.issue != null) {
    assert(Number.isFinite(args.issue) && args.issue > 0, '--issue must be a positive integer');
  }

  // Step 1 — git fetch (skip if OFFLINE; fatal throw on error)
  if (!OFFLINE) {
    execFileSync('git', ['fetch', 'origin'], { encoding: 'utf8' });
  }

  assertCleanWorktree();
  execFileSync('git', ['checkout', args.branch], { encoding: 'utf8' });

  // Step 2 — Merge-base skip-check
  let alreadyUpToDate = false;
  try {
    const mergeBase = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'],
      { encoding: 'utf8' }).trim();
    const originMain = execFileSync('git', ['rev-parse', 'origin/main'],
      { encoding: 'utf8' }).trim();
    alreadyUpToDate = (mergeBase === originMain);
  } catch (_) {
    alreadyUpToDate = false;
  }

  doRebase(args, alreadyUpToDate);

  if (!ffMergeLoop(args)) {
    process.exitCode = 2;
    return;
  }

  postMergeCleanup(args);
}

try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }
