const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, spawn } = require('node:child_process');
const { JSDOM } = require('jsdom');

const dir = path.join(__dirname, '..', 'skills', 'okay-bro-try-me');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'try-me-'));
const node = (args, env) => spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, ...env } });

test('week.js digests recent sessions and skips sidechains', () => {
  const claude = tmp();
  const proj = path.join(claude, 'projects', 'p');
  fs.mkdirSync(path.join(proj, 'memory'), { recursive: true });
  const lines = [
    { type: 'user', cwd: '/w/app', timestamp: '2026-11-01T10:00:00Z', message: { role: 'user', content: 'login spinner never stops' } },
    { type: 'user', message: { content: [{ type: 'tool_result', is_error: true, content: 'ECONNREFUSED 127.0.0.1:3000' }] } },
    { type: 'user', isSidechain: true, message: { content: 'subagent noise' } },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Root cause: API_URL pointed at port 3000, API is on 8080.' }] } },
  ];
  fs.writeFileSync(path.join(proj, 's.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n'));
  fs.writeFileSync(path.join(proj, 'memory', 'port.md'), '---\nname: x\n---\nalways check the port');
  const r = node([path.join(dir, 'scripts', 'week.js')], { CLAUDE_CONFIG_DIR: claude, OKAY_HOME: tmp() });
  assert.equal(r.status, 0, r.stderr);
  for (const s of ['login spinner', 'ECONNREFUSED', 'port 3000', 'always check the port', 'first run: true', 'suggested level: 2']) assert.ok(r.stdout.includes(s), s);
  assert.ok(!r.stdout.includes('subagent noise'));
});

test('play.js build injects levels; the page grades a multiple-choice answer', () => {
  const home = tmp(), out = path.join(home, 'g.html');
  const r = node([path.join(dir, 'scripts', 'play.js'), 'build', path.join(dir, 'example-levels.json'), '--out', out], { OKAY_HOME: home });
  assert.equal(r.status, 0, r.stderr);
  const { window } = new JSDOM(fs.readFileSync(out, 'utf8'), { runScripts: 'dangerously', url: 'http://localhost/' });
  const d = window.document;
  d.querySelector('.node.open').click();
  d.querySelectorAll('.opt')[1].click();
  d.getElementById('check').click();
  assert.match(d.getElementById('sheet').className, /\bok\b/);
  assert.match(d.getElementById('app').textContent, /♥ 5/);
  d.getElementById('cont').click();
  assert.ok(d.getElementById('fill'), 'second item is fill-in');
});

test('play.js serve rejects requests without the token, runs code and saves results', async () => {
  const home = tmp(), out = path.join(home, 'g.html');
  node([path.join(dir, 'scripts', 'play.js'), 'build', path.join(dir, 'example-levels.json'), '--out', out], { OKAY_HOME: home });
  const p = spawn(process.execPath, [path.join(dir, 'scripts', 'play.js'), 'serve', out, '--no-open'], { env: { ...process.env, OKAY_HOME: home } });
  try {
    const url = new URL(await new Promise((ok) => p.stdout.once('data', (b) => ok(String(b).trim()))));
    const post = (p2, body, token) => fetch(new URL(p2, url), { method: 'POST', headers: token ? { 'x-token': token } : {}, body: JSON.stringify(body) });
    const t = url.searchParams.get('t');
    assert.equal((await post('/run', { lang: 'js', code: 'console.log(1)' })).status, 403);
    assert.equal((await (await post('/run', { lang: 'js', code: 'console.log(6*7)' }, t)).json()).out.trim(), '42');
    const item = { t: 'mc', q: 'Q?', opts: ['a', 'b'], a: 0 };
    await post('/result', { level: 2, accuracy: 0.5, xp: 10, answers: [{ concept: 'c', item, firstTry: false }] }, t);
    const prof = JSON.parse(fs.readFileSync(path.join(home, 'try-me', 'profile.json'), 'utf8'));
    assert.equal(prof.runs[0].accuracy, 0.5);
    assert.equal(prof.review[0].item.q, 'Q?');
  } finally { p.kill(); }
});
