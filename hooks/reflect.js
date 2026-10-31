#!/usr/bin/env node
// okay-reflect reminders for Stop, SessionEnd and SessionStart (dispatched on hook_event_name).
// Silent and exit 0 whenever there is nothing to do or anything fails: a hook must never break a session.
// Marker: <git dir>/okay-reflect-pending, written by every okay-* skill on delivery (shared/delivery.md).
// Queue: $OKAY_HOME/reflect-queue.jsonl (default ~/.okay), one JSON object per unreflected session.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const MARKER = 'okay-reflect-pending';

function queuePath() {
  return path.join(process.env.OKAY_HOME || path.join(os.homedir(), '.okay'), 'reflect-queue.jsonl');
}

// [gitDir, topLevel] of the repo at cwd, or null outside a git work tree.
function repoAt(cwd) {
  try {
    const out = execFileSync('git', ['rev-parse', '--absolute-git-dir', '--show-toplevel'], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000,
    });
    const [gitDir, top] = out.trim().split(/\r?\n/);
    return gitDir && top ? [gitDir, top] : null;
  } catch {
    return null;
  }
}

function readMarker(cwd) {
  const repo = repoAt(cwd);
  if (!repo) return null;
  const file = path.join(repo[0], MARKER);
  try {
    const text = fs.readFileSync(file, 'utf8').trim();
    return text ? { file, text, top: repo[1] } : null;
  } catch {
    return null;
  }
}

function queueEntries() {
  try {
    return fs.readFileSync(queuePath(), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

const tasks = (markerText) => markerText.split(/\r?\n/).filter(Boolean).length;

function onStop(input) {
  if (input.stop_hook_active) return;
  const m = readMarker(input.cwd || process.cwd());
  if (!m) return;
  return {
    decision: 'block',
    reason:
      `An okay-* task was delivered but not reflected on (${m.file}):\n${m.text}\n` +
      `Run the okay-reflect skill now. Transcript: ${input.transcript_path || 'unknown'}. ` +
      'If the user already said to skip reflection, delete the marker file instead.',
  };
}

// Move the pending marker into the queue so a later session neither re-blocks on it
// nor queues it again under its own transcript.
// ponytail: concurrent sessions in one repo share the marker, so the session that ends first claims it.
function onSessionEnd(input) {
  const m = readMarker(input.cwd || process.cwd());
  if (!m) return;
  const entry = {
    repo: m.top,
    marker: m.text,
    transcript_path: input.transcript_path || null,
    session_id: input.session_id || null,
    queued_at: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(queuePath()), { recursive: true });
  fs.appendFileSync(queuePath(), JSON.stringify(entry) + '\n');
  fs.rmSync(m.file, { force: true });
}

function onSessionStart() {
  const entries = queueEntries();
  if (!entries.length) return;
  const n = entries.reduce((sum, e) => sum + tasks(String(e.marker || '')), 0) || entries.length;
  const repos = [...new Set(entries.map((e) => e.repo))].join(', ');
  return {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext:
        `${n} okay-* task(s) from earlier sessions are not reflected yet (repos: ${repos}; queue: ${queuePath()}). ` +
        'Tell the user in one line and offer to run the okay-reflect skill on them.',
    },
  };
}

const handlers = { Stop: onStop, SessionEnd: onSessionEnd, SessionStart: onSessionStart };

try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const out = handlers[input.hook_event_name]?.(input);
  if (out) process.stdout.write(JSON.stringify(out));
} catch {
  // Silent by design.
}
