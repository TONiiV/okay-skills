const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
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
  assert.equal(d.getElementById('check').disabled, true, 'Check is locked once graded');
  d.getElementById('check').click();
  assert.equal(window.eval('S.answers.length'), 1);
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

const play = path.join(dir, 'scripts', 'play.js');
async function withServer(fn) {
  const home = tmp(), out = path.join(home, 'g.html');
  node([play, 'build', path.join(dir, 'example-levels.json'), '--out', out], { OKAY_HOME: home });
  const p = spawn(process.execPath, [play, 'serve', out, '--no-open'], { env: { ...process.env, OKAY_HOME: home } });
  try {
    const url = new URL(await new Promise((ok) => p.stdout.once('data', (b) => ok(String(b).trim()))));
    const t = url.searchParams.get('t');
    const post = (p2, body) => fetch(new URL(p2, url), { method: 'POST', headers: { 'x-token': t }, body: typeof body === 'string' ? body : JSON.stringify(body) });
    const profile = () => JSON.parse(fs.readFileSync(path.join(home, 'try-me', 'profile.json'), 'utf8'));
    await fn({ url, post, profile, home });
  } finally { p.kill(); }
}
const item = { t: 'mc', q: 'Q?', opts: ['a', 'b'], a: 0 };
const ans = (firstTry) => ({ answers: [{ concept: 'c', item, firstTry }], level: 2, accuracy: 0.5, xp: 1 });
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

test('week.js skips malformed lines and oversized files, and falls back on bad flags', () => {
  const claude = tmp();
  const proj = path.join(claude, 'projects', 'p');
  fs.mkdirSync(proj, { recursive: true });
  const good = { type: 'user', cwd: '/w/app', timestamp: '2026-11-01T10:00:00Z', message: { content: 'real prompt' } };
  const bad = [
    { type: 'user', timestamp: 1700000000, message: { content: 'numeric timestamp' } },
    { type: 'user', message: { content: { text: 'x' } } },
    { type: 'user', message: { content: [null, 7, { type: 'text' }] } },
    { type: 'assistant', message: { content: [null] } },
    { type: 'user', cwd: 5, message: 'str' },
  ];
  fs.writeFileSync(path.join(proj, 's.jsonl'), [good, ...bad].map((l) => JSON.stringify(l)).concat('null', '[1]', '{').join('\n'));
  const big = path.join(proj, 'big.jsonl');
  fs.writeFileSync(big, '');
  fs.truncateSync(big, 101 * 1024 * 1024);
  const r = node([path.join(dir, 'scripts', 'week.js'), '--days', '--max'], { CLAUDE_CONFIG_DIR: claude, OKAY_HOME: tmp() });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes('real prompt'));
  assert.ok(r.stdout.includes('# last 7 days'), 'missing --days falls back to 7');
  assert.ok(r.stdout.includes('skipped 1 transcript file(s) over 100 MB'));
});

test('play.js serve: Host check, bad bodies, calendar-week streak, utf-8 for children', () => withServer(async ({ url, post, profile, home }) => {
  const hostile = await new Promise((ok) => http.get({ host: '127.0.0.1', port: url.port, path: '/', headers: { host: 'attacker.example:' + url.port } }, (res) => { res.resume(); ok(res.statusCode); }));
  assert.equal(hostile, 403);
  assert.equal((await fetch(new URL('/', url))).status, 200);
  assert.equal((await post('/result', { xp: 1, answers: [{}] })).status, 200, 'answers without item.q are skipped');
  assert.equal((await post('/result', 'null')).status, 400);
  assert.equal((await post('/run', 'null')).status, 400);
  assert.equal((await (await post('/run', { lang: 'js', code: 'console.log(process.env.PYTHONIOENCODING)' })).json()).out.trim(), 'utf-8');
  const streakAfter = async (lastDate, streak) => {
    fs.writeFileSync(path.join(home, 'try-me', 'profile.json'), JSON.stringify({ streak, runs: lastDate ? [{ date: lastDate, level: 2, accuracy: 1, xp: 1 }] : [] }));
    return (await (await post('/result', ans(true))).json()).streak;
  };
  assert.equal(await streakAfter(null), 1);
  assert.equal(await streakAfter(daysAgo(0), 3), 3, 'same week keeps');
  assert.equal(await streakAfter(daysAgo(7), 3), 4, 'previous calendar week grows');
  assert.equal(await streakAfter(daysAgo(14), 3), 1, 'a skipped week resets');
  assert.ok(!('xp' in profile()), 'no running xp total');
}));

test('play.js serve: review items retire after two first-try hits, a miss resets them', () => withServer(async ({ post, profile }) => {
  await post('/result', ans(false));
  assert.equal(profile().review[0].hits, 0);
  await post('/result', ans(true));
  assert.equal(profile().review[0].hits, 1);
  await post('/result', ans(false));
  assert.equal(profile().review[0].hits, 0, 'a miss resets hits');
  await post('/result', ans(true));
  await post('/result', ans(true));
  assert.equal(profile().review.length, 0, 'second first-try hit retires it');
}));

test('the page does not count a restarted unit twice', () => {
  const home = tmp(), out = path.join(home, 'g.html');
  node([play, 'build', path.join(dir, 'example-levels.json'), '--out', out], { OKAY_HOME: home });
  const { window } = new JSDOM(fs.readFileSync(out, 'utf8'), { runScripts: 'dangerously', url: 'http://localhost/' });
  const d = window.document;
  d.querySelector('.node.open').click();
  d.querySelectorAll('.opt')[0].click();
  d.getElementById('check').click();
  assert.equal(window.eval('S.answers.length'), 1);
  assert.equal(window.eval('S.hearts'), 4);
  d.getElementById('cont').click();
  d.getElementById('quit').click();
  d.querySelector('.node.open').click();
  assert.equal(window.eval('S.answers.length'), 0);
  assert.equal(window.eval('S.hearts'), 5);
});
