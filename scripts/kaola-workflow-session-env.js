#!/usr/bin/env node
const fs = require('fs');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (_) {
    return '';
  }
}

function parseJson(input) {
  if (!input.trim()) return {};
  try {
    return JSON.parse(input);
  } catch (_) {
    return {};
  }
}

function isSafeSessionId(value) {
  return typeof value === 'string' && value.length > 0 &&
    !value.includes('/') && !value.includes('\\') &&
    !value.includes('\0') && value !== '.' && value !== '..';
}

function shellSingleQuote(value) {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

function main() {
  const input = parseJson(readStdin());
  const sessionId = input.session_id || '';
  const envFile = process.env.CLAUDE_ENV_FILE || '';
  if (!envFile || !isSafeSessionId(sessionId)) return;
  fs.appendFileSync(envFile, 'export KAOLA_SESSION_ID=' + shellSingleQuote(sessionId) + '\n');
}

try {
  main();
} catch (error) {
  process.stderr.write('[kaola-workflow session env skipped] ' + error.message + '\n');
}
