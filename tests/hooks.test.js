const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'hooks', 'reflect.js');
const MARKER_LINE = '2026-10-31T10:00:00Z\tokay-fix\tfix slugify double dash\n';

let okayHome;

function env(extra = {}) {
  const e = { ...process.env, OKAY_HOME: okayHome, ...extra };
  delete e.GIT_DIR;
  delete e.GIT_WORK_TREE;
  return e;
}

function run(input, extraEnv) {
  const r = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(input), env: env(extraEnv), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'okay-hooks-'));
}

function gitRepo() {
  const dir = tmp();
  execFileSync('git', ['init', '-q'], { cwd: dir, env: env() });
  return dir;
}

const markerFile = (repo) => path.join(repo, '.git', 'okay-reflect-pending');
const queueFile = () => path.join(okayHome, 'reflect-queue.jsonl');

beforeEach(() => {
  okayHome = path.join(tmp(), 'okay-home');
});

describe('hooks/hooks.json', () => {
  it('runs hooks/reflect.js for Stop, SessionEnd and SessionStart', () => {
    const { hooks } = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8'));
    for (const event of ['Stop', 'SessionEnd', 'SessionStart']) {
      assert.equal(hooks[event][0].hooks[0].command, 'node "${CLAUDE_PLUGIN_ROOT}/hooks/reflect.js"');
    }
  });
});

describe('Stop', () => {
  it('blocks when the marker exists', () => {
    const repo = gitRepo();
    fs.writeFileSync(markerFile(repo), MARKER_LINE);
    const out = JSON.parse(run({ hook_event_name: 'Stop', cwd: repo, stop_hook_active: false, transcript_path: '/t.jsonl' }));
    assert.equal(out.decision, 'block');
    assert.match(out.reason, /okay-reflect/);
    assert.match(out.reason, /fix slugify double dash/);
    assert.match(out.reason, /\/t\.jsonl/);
  });

  it('never blocks when stop_hook_active is set', () => {
    const repo = gitRepo();
    fs.writeFileSync(markerFile(repo), MARKER_LINE);
    assert.equal(run({ hook_event_name: 'Stop', cwd: repo, stop_hook_active: true }), '');
  });

  it('is silent without a marker', () => {
    assert.equal(run({ hook_event_name: 'Stop', cwd: gitRepo(), stop_hook_active: false }), '');
  });

  it('is silent outside a git repo', () => {
    const dir = tmp();
    const out = run({ hook_event_name: 'Stop', cwd: dir, stop_hook_active: false }, { GIT_CEILING_DIRECTORIES: path.dirname(dir) });
    assert.equal(out, '');
  });

  it('is silent on garbage stdin', () => {
    const r = spawnSync(process.execPath, [SCRIPT], { input: 'not json', env: env(), encoding: 'utf8' });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  });
});

describe('SessionEnd', () => {
  it('moves a pending marker into the queue', () => {
    const repo = gitRepo();
    fs.writeFileSync(markerFile(repo), MARKER_LINE);
    assert.equal(run({ hook_event_name: 'SessionEnd', cwd: repo, session_id: 's1', transcript_path: '/t.jsonl' }), '');
    const lines = fs.readFileSync(queueFile(), 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.session_id, 's1');
    assert.equal(entry.transcript_path, '/t.jsonl');
    assert.equal(entry.marker, MARKER_LINE.trim());
    assert.equal(fs.realpathSync(entry.repo), fs.realpathSync(repo));
    assert.ok(!fs.existsSync(markerFile(repo)), 'marker should be removed once queued');
  });

  it('queues nothing without a marker', () => {
    run({ hook_event_name: 'SessionEnd', cwd: gitRepo(), session_id: 's1' });
    assert.ok(!fs.existsSync(queueFile()));
  });
});

describe('SessionStart', () => {
  it('reports the number of unreflected tasks', () => {
    fs.mkdirSync(okayHome, { recursive: true });
    const two = MARKER_LINE + '2026-10-31T11:00:00Z\tokay-dev\tadd export\n';
    fs.writeFileSync(queueFile(), [
      JSON.stringify({ repo: '/a', marker: two.trim(), session_id: 's1' }),
      JSON.stringify({ repo: '/b', marker: MARKER_LINE.trim(), session_id: 's2' }),
    ].join('\n') + '\n');
    const out = JSON.parse(run({ hook_event_name: 'SessionStart', cwd: tmp(), source: 'startup' }));
    assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.match(out.hookSpecificOutput.additionalContext, /^3 okay-\* task\(s\)/);
    assert.match(out.hookSpecificOutput.additionalContext, /okay-reflect/);
  });

  it('is silent when the queue is empty or missing', () => {
    assert.equal(run({ hook_event_name: 'SessionStart', cwd: tmp(), source: 'startup' }), '');
  });
});
