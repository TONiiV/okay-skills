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
async function withServer(fn, env = {}) {
  const home = tmp(), out = path.join(home, 'g.html');
  node([play, 'build', path.join(dir, 'example-levels.json'), '--out', out], { OKAY_HOME: home });
  const p = spawn(process.execPath, [play, 'serve', out, '--no-open'], { env: { ...process.env, OKAY_HOME: home, ...env } });
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
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toLocaleDateString('sv');

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
  assert.equal(window.eval('S.answers.length'), 1, 'the miss stays');
  assert.equal(window.eval('S.hearts'), 5);
  d.querySelectorAll('.opt')[1].click();
  d.getElementById('check').click();
  assert.equal(window.eval('S.answers.length'), 1, 'the same item is not counted twice');
  assert.equal(window.eval('S.answers[0].firstTry'), false);
});

function page(levels, url = 'http://localhost/') {
  const home = tmp(), src = path.join(home, 'l.json'), out = path.join(home, 'g.html');
  fs.writeFileSync(src, JSON.stringify(levels));
  node([play, 'build', src, '--out', out], { OKAY_HOME: home });
  return new JSDOM(fs.readFileSync(out, 'utf8'), { runScripts: 'dangerously', url }).window;
}
const tick = () => new Promise((ok) => setTimeout(ok, 20));

test('the page speaks the levels lang, falls back to English, and copies a wrong question', async () => {
  const levels = JSON.parse(fs.readFileSync(path.join(dir, 'example-levels.json'), 'utf8'));
  assert.equal(levels.lang, 'zh');
  const w = page(levels), d = w.document;
  assert.equal(d.documentElement.lang, 'zh');
  d.querySelector('.node.open').click();
  assert.equal(d.getElementById('check').textContent, '检查');
  let copied = '';
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: (t) => { copied = t; return Promise.resolve(); } } });
  d.querySelectorAll('.opt')[0].click();
  d.getElementById('check').click();
  d.getElementById('copy').click();
  await tick();
  assert.equal(d.getElementById('copy').textContent, '已复制');
  assert.ok(copied.includes(levels.units[0].items[0].q) && copied.includes('我的答案：' + levels.units[0].items[0].opts[0]), copied);
  assert.equal(page({ ...levels, lang: 'xx' }).document.documentElement.lang, 'en');
});

test('the code item says the runner is offline instead of hanging, then self-grades', async () => {
  const w = page({ lang: 'en', units: [{ concept: 'c', items: [{ t: 'code', q: 'q', start: '', expect: '1', solution: 'SOL' }] }] }, 'http://localhost/?t=x');
  const d = w.document;
  d.querySelector('.node.open').click();
  d.getElementById('run').click();
  await tick();
  assert.match(d.getElementById('out').textContent, /node scripts\/play\.js serve/);
  assert.equal(d.getElementById('check').textContent, 'Show solution');
  d.getElementById('check').click();
  assert.ok(d.getElementById('y'), 'self-check against the solution');
});

test('levels text never becomes markup', () => {
  const x = '<img src=x onerror="window.pwned=1">';
  const w = page({ lang: x, level: x, title: x, intro: x, units: [{ concept: x, story: x, items: [
    { t: 'mc', q: x, opts: [x, 'b'], a: 0, why: x },
    { t: 'order', q: x, steps: [x, 'b'], why: x },
  ] }] });
  const d = w.document;
  assert.equal(d.querySelectorAll('img').length, 0, 'home');
  d.querySelector('.node.open').click();
  assert.equal(d.querySelectorAll('img').length, 0, 'item');
  d.querySelector('.opt').click();
  d.getElementById('check').click();
  assert.equal(d.querySelectorAll('img').length, 0, 'sheet');
  assert.equal(w.pwned, undefined);
});

test('a missing interpreter falls back to self-check without losing a heart', async () => {
  const levels = { lang: 'en', units: [{ concept: 'c', items: [{ t: 'code', lang: 'python', q: 'q', start: '', expect: '42', solution: 'print(42)' }] }] };
  const w = page(levels, 'http://localhost/?t=x'), d = w.document;
  w.fetch = () => Promise.resolve({ json: () => Promise.resolve({ out: '', err: 'no python interpreter found', unavailable: true }) });
  d.querySelector('.node.open').click();
  d.getElementById('run').click();
  await tick();
  assert.equal(d.getElementById('check').textContent, 'Show solution');
  d.getElementById('check').click();
  d.getElementById('y').click();
  assert.equal(w.eval('S.hearts'), 5);
  assert.equal(w.eval('S.answers[0].firstTry'), true);
});

test('editing the code needs a fresh Run before Check', async () => {
  const levels = { lang: 'en', units: [{ concept: 'c', items: [{ t: 'code', q: 'q', start: '', expect: '42' }] }] };
  const w = page(levels, 'http://localhost/?t=x'), d = w.document;
  w.fetch = () => Promise.resolve({ json: () => Promise.resolve({ out: '42', err: '' }) });
  d.querySelector('.node.open').click();
  d.getElementById('run').click();
  await tick();
  assert.equal(d.getElementById('check').disabled, false);
  const ed = d.getElementById('ed');
  ed.value = 'print(7)';
  ed.dispatchEvent(new w.Event('input'));
  assert.equal(d.getElementById('check').disabled, true);
});

test('server: no interpreter is reported as unavailable; dates are local; a null profile is tolerated', () => withServer(async ({ post, profile, home }) => {
  const r = await (await post('/run', { lang: 'python', code: 'print(1)' })).json();
  assert.equal(r.unavailable, true);
  fs.mkdirSync(path.join(home, 'try-me'), { recursive: true });
  fs.writeFileSync(path.join(home, 'try-me', 'profile.json'), 'null');
  assert.equal((await post('/result', ans(false))).status, 200);
  const zone = 'Pacific/Kiritimati';
  assert.equal(profile().runs[0].date, new Date().toLocaleDateString('sv', { timeZone: zone }), 'local date, not UTC');
}, { TZ: 'Pacific/Kiritimati', PATH: '' }));

test('week.js tolerates a null profile, a BOM, empty errors and a root cwd', () => {
  const claude = tmp(), okay = tmp();
  const proj = path.join(claude, 'projects', 'proj');
  fs.mkdirSync(proj, { recursive: true });
  fs.mkdirSync(path.join(okay, 'try-me'), { recursive: true });
  fs.writeFileSync(path.join(okay, 'try-me', 'profile.json'), 'null');
  const lines = [
    { type: 'user', cwd: '/', timestamp: '2026-11-01T10:00:00Z', message: { content: 'only prompt' } },
    { type: 'user', message: { content: [{ type: 'tool_result', is_error: true }] } },
  ];
  fs.writeFileSync(path.join(proj, 's.jsonl'), String.fromCharCode(0xfeff) + lines.map((l) => JSON.stringify(l)).join('\n'));
  const r = node([path.join(dir, 'scripts', 'week.js')], { CLAUDE_CONFIG_DIR: claude, OKAY_HOME: okay });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.includes('only prompt'), 'BOM line kept');
  assert.ok(!r.stdout.includes('undefined'));
  assert.ok(r.stdout.includes('## 2026-11-01 proj'), 'falls back to the project folder');
  assert.ok(r.stdout.includes('first run: true'));
});

test('a wrong answer shakes the card; sound is optional, mutable and never throws', () => {
  const levels = { lang: 'en', units: [{ concept: 'c', items: [
    { t: 'mc', q: 'a?', opts: ['x', 'y'], a: 0 }, { t: 'mc', q: 'b?', opts: ['x', 'y'], a: 0 }, { t: 'mc', q: 'c?', opts: ['x', 'y'], a: 0 }] }] };
  const w = page(levels), d = w.document;   // no AudioContext in jsdom: everything must still work
  d.querySelector('.node.open').click();
  d.querySelectorAll('.opt')[1].click();
  d.getElementById('check').click();
  assert.ok(d.getElementById('card').classList.contains('shake'));
  assert.ok(d.querySelector('.hearts').classList.contains('pop'));
  d.getElementById('cont').click();

  let tones = 0;
  const ctx = { currentTime: 0, state: 'running', destination: {}, createOscillator: () => { tones++; return { frequency: {}, connect() {}, start() {}, stop() {} }; },
    createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }) };
  w.AudioContext = function () { return ctx; };
  d.querySelectorAll('.opt')[0].click();
  assert.ok(tones > 0, 'tap makes a click');
  d.getElementById('check').click();
  assert.match(d.getElementById('sheet').className, /\bok\b/);
  assert.match(d.querySelector('.float').textContent, /\+\d+ XP/);
  const before = tones;
  d.querySelector('.snd').click();
  assert.equal(d.querySelector('.snd').textContent, '🔇');
  d.getElementById('cont').click();
  d.querySelectorAll('.opt')[0].click();
  assert.equal(tones, before, 'muted stays silent');
  w.AudioContext = function () { throw new Error('blocked'); };
  d.querySelector('.snd').click();   // unmute with a throwing AudioContext: still no throw
  d.getElementById('check').click();
});

test('every item shows the unit scene and an optional hint', () => {
  const levels = { lang: 'en', units: [{ concept: 'c', story: 'The cache served stale names.', items: [
    { t: 'mc', q: 'a?', opts: ['x', 'y'], a: 0 }, { t: 'write', q: 'b?', hint: 'Think about change rate.' }] }] };
  const d = page(levels).document;
  d.querySelector('.node.open').click();
  assert.ok(d.querySelector('div.story') && !d.querySelector('details.scene'), 'full story on the first item');
  d.querySelectorAll('.opt')[0].click();
  d.getElementById('check').click();
  d.getElementById('cont').click();
  assert.match(d.querySelector('details.scene summary').textContent, /Scene.*stale names/);
  assert.match(d.getElementById('card').textContent, /Think about change rate/);
});

test('muting leaves the stats line and an item hint intact', () => {
  const d = page({ lang: 'en', units: [{ concept: 'c', items: [{ t: 'write', q: 'b?', hint: 'Think about change rate.' }] }] }).document;
  d.querySelector('.snd').click();
  assert.match(d.querySelector('p.mute').textContent, /Level 1/);
  d.querySelector('.node.open').click();
  d.querySelector('.snd').click();
  assert.match(d.getElementById('card').textContent, /Think about change rate/);
  assert.equal(d.querySelector('.snd').textContent, '🔊');
});

test('build rejects levels that cannot be played', () => {
  const good = { t: 'mc', q: 'q', opts: ['a', 'b'], a: 0 };
  const bads = [
    [{ units: [] }, /non-empty "units"/],
    [{ units: [{ concept: 'c', items: [] }] }, /unit 1: items/],
    [{ units: [{ concept: 'c', items: [good, { ...good, a: '1' }] }] }, /unit 1 item 2: mc needs a/],
    [{ units: [{ concept: 'c', items: [{ ...good, a: 2 }] }] }, /mc needs a/],
    [{ units: [{ concept: 'c', items: [{ t: 'mc', q: 'q', a: 0 }] }] }, /mc needs opts/],
    [{ units: [{ concept: 'c', items: [{ t: 'fill', q: 'q', a: [] }] }] }, /fill needs a/],
    [{ units: [{ concept: 'c', items: [{ t: 'order', q: 'q', steps: ['one'] }] }] }, /order needs steps/],
    [{ units: [{ concept: 'c', items: [{ t: 'code', q: 'q', lang: 'ruby', expect: '1' }] }] }, /lang/],
    [{ units: [{ concept: 'c', items: [{ t: 'code', q: 'q' }] }] }, /expect/],
    [{ units: [{ concept: 'c', items: [{ t: 'bogus', q: 'q' }] }] }, /unknown t/],
    [{ units: [{ items: [good] }] }, /concept/],
  ];
  for (const [levels, msg] of bads) {
    const home = tmp(), src = path.join(home, 'l.json');
    fs.writeFileSync(src, JSON.stringify(levels));
    const r = node([play, 'build', src, '--out', path.join(home, 'g.html')], { OKAY_HOME: home });
    assert.equal(r.status, 2, JSON.stringify(levels));
    assert.match(r.stderr, msg);
    assert.ok(r.stderr.startsWith('levels.json'), r.stderr);
  }
});

test('the appended review unit follows the levels lang', () => {
  const home = tmp(), out = path.join(home, 'g.html');
  fs.mkdirSync(path.join(home, 'try-me'), { recursive: true });
  fs.writeFileSync(path.join(home, 'try-me', 'profile.json'), JSON.stringify({ review: [{ item: { t: 'mc', q: 'Q?', opts: ['a', 'b'], a: 0 }, hits: 0 }] }));
  const unitOf = (src, o) => {
    assert.equal(node([play, 'build', src, '--out', o], { OKAY_HOME: home }).status, 0);
    const w = new JSDOM(fs.readFileSync(o, 'utf8'), { runScripts: 'dangerously', url: 'http://localhost/' }).window;
    return w.eval('DATA.units[DATA.units.length - 1]');
  };
  assert.equal(unitOf(path.join(dir, 'example-levels.json'), out).concept, '复习');
  const en = path.join(home, 'en.json');
  fs.writeFileSync(en, JSON.stringify({ lang: 'en', units: [{ concept: 'c', items: [{ t: 'mc', q: 'q', opts: ['a', 'b'], a: 0 }] }] }));
  assert.equal(unitOf(en, path.join(home, 'e.html')).concept, 'Review');
});

test('a run that returns after an edit is ignored', async () => {
  const levels = { lang: 'en', units: [{ concept: 'c', items: [{ t: 'code', q: 'q', start: '', expect: '7' }] }] };
  const w = page(levels, 'http://localhost/?t=x'), d = w.document;
  let finish;
  w.fetch = () => new Promise((ok) => { finish = () => ok({ json: () => Promise.resolve({ out: '42', err: '' }) }); });
  d.querySelector('.node.open').click();
  d.getElementById('run').click();
  const ed = d.getElementById('ed');
  ed.value = 'console.log(7)';
  ed.dispatchEvent(new w.Event('input'));
  finish();
  await tick();
  assert.equal(d.getElementById('check').disabled, true, 'the stale 42 must not enable Check');
});

test('python runs from a private dir, isolated from planted modules', (t) => {
  const probe = spawnSync('python', ['-c', 'print(1)'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) return t.skip('no python on this machine');
  const planted = path.join(os.tmpdir(), 'json.py');
  if (fs.existsSync(planted)) return t.skip('a json.py already sits in the temp dir');
  fs.writeFileSync(planted, 'print("PLANTED")');
  return withServer(async ({ post }) => {
    const r = await (await post('/run', { lang: 'python', code: 'import json\nprint(json.dumps(1))' })).json();
    assert.equal(r.out.trim(), '1', r.err);
  }).finally(() => fs.rmSync(planted, { force: true }));
});
