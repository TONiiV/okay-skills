#!/usr/bin/env node
// okay-bro-try-me game runner. No dependencies.
//   node play.js build <levels.json> [--out file.html]   inject levels (+ queued review items) into game.html
//   node play.js serve [file.html] [--no-open]           serve it on 127.0.0.1, save results, run code locally
//   node play.js prefs '{"format":"levels"}'             merge player preferences into the profile
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawnSync, spawn } = require('node:child_process');

const home = path.join(process.env.OKAY_HOME || path.join(os.homedir(), '.okay'), 'try-me');
const profileFile = path.join(home, 'profile.json');
const readProfile = () => {
  try { const p = JSON.parse(fs.readFileSync(profileFile, 'utf8').replace(/^\uFEFF/, '')); return p && typeof p === 'object' && !Array.isArray(p) ? p : {}; } catch { return {}; }
};
const arr = (v) => (Array.isArray(v) ? v : []);
const writeProfile = (p) => { fs.mkdirSync(home, { recursive: true }); fs.writeFileSync(profileFile, JSON.stringify(p, null, 1)); };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }; // local date
const flag = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const die = (m) => { console.error(m); process.exit(2); };

const strs = (v, n) => Array.isArray(v) && v.length >= n && v.every((x) => typeof x === 'string');
// Returns the first problem with an item, or '' when it is playable.
function itemError(it) {
  if (!it || typeof it !== 'object') return 'item must be an object';
  if (typeof it.q !== 'string' || !it.q) return 'q must be a non-empty string';
  switch (it.t) {
    case 'mc':
      if (!strs(it.opts, 2)) return 'mc needs opts: an array of 2+ strings';
      return Number.isInteger(it.a) && it.a >= 0 && it.a < it.opts.length ? '' : 'mc needs a: an integer index into opts';
    case 'fill': return typeof it.a === 'string' || strs(it.a, 1) ? '' : 'fill needs a: a string or a non-empty array of strings';
    case 'order': return strs(it.steps, 2) ? '' : 'order needs steps: an array of 2+ strings';
    case 'write': return it.rubric == null || strs(it.rubric, 0) ? '' : 'write rubric must be an array of strings';
    case 'code':
      if (it.lang != null && it.lang !== 'js' && it.lang !== 'python') return 'code lang must be js or python';
      return typeof it.expect === 'string' ? '' : 'code needs expect: a string (stdout)';
    default: return 'unknown t "' + it.t + '" (mc, fill, order, write, code)';
  }
}
function validate(data) {
  if (!data || !Array.isArray(data.units) || !data.units.length) die('levels.json needs a non-empty "units" array');
  data.units.forEach((u, i) => {
    const at = (j, m) => die(`levels.json: unit ${i + 1}${j == null ? '' : ` item ${j + 1}`}: ${m}`);
    if (!u || typeof u.concept !== 'string') at(null, 'concept must be a string');
    if (!Array.isArray(u.items) || !u.items.length) at(null, 'items must be a non-empty array');
    u.items.forEach((it, j) => { const e = itemError(it); if (e) at(j, e); });
  });
}
const REVIEW = { en: ['Review', 'Last time these tripped you up. Again!'], zh: ['复习', '上次这些题绊住了你，再来一次！'] };

function build(src, out) {
  const data = JSON.parse(fs.readFileSync(src, 'utf8').replace(/^\uFEFF/, ''));
  validate(data);
  const review = arr(readProfile().review).filter((r) => r && !itemError(r.item)).slice(0, 3);
  const [concept, story] = REVIEW[String(data.lang || 'en').slice(0, 2).toLowerCase()] || REVIEW.en;
  if (review.length) data.units.push({ concept, story, review: true, items: review.map((r) => r.item) });
  const html = fs.readFileSync(path.join(__dirname, '..', 'game.html'), 'utf8')
    .replace('/*LEVELS*/null', () => JSON.stringify(data).replace(/</g, '\\u003c'));
  out = out || path.join(home, `${today()}.html`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(out);
}

// Calendar weeks (Monday start; 1970-01-05 was a Monday): same week keeps the streak, next week adds one, a longer gap resets.
const weekOf = (date) => Math.floor((Date.parse(date) / 864e5 + 3) / 7);
function nextStreak(streak, lastDate, date) {
  if (!lastDate) return 1;
  const gap = weekOf(date) - weekOf(lastDate);
  return gap <= 0 ? streak || 1 : gap === 1 ? (streak || 1) + 1 : 1;
}

function saveResult(r) {
  const p = readProfile();
  p.runs = arr(p.runs);
  const last = p.runs[p.runs.length - 1];
  p.streak = nextStreak(p.streak, last && last.date, today());
  p.runs.push({ date: today(), level: r.level, accuracy: r.accuracy, xp: r.xp });
  // ponytail: two first-try hits retire a review item; swap in half-life regression if reviews pile up.
  const review = new Map(arr(p.review).filter((x) => x && x.item && x.item.q).map((x) => [x.item.q, x]));
  for (const a of r.answers || []) {
    if (!a || !a.item || !a.item.q) continue;
    const x = review.get(a.item.q);
    if (a.firstTry && x) { if (++x.hits >= 2) review.delete(a.item.q); }
    else if (!a.firstTry) review.set(a.item.q, { item: a.item, concept: a.concept, hits: 0 });
  }
  p.review = [...review.values()].slice(-20);
  writeProfile(p);
  return { streak: p.streak };
}

const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
let pyCmd;   // first candidate that really runs Python (Windows Store alias stubs exist but print nothing)
function python() {
  if (pyCmd) return pyCmd;
  for (const c of ['python3', 'python', 'py']) {
    const r = spawnSync(c, ['-I', '-c', 'print(1)'], { encoding: 'utf8', timeout: 5000, env });
    if (!r.error && r.status === 0 && r.stdout.trim() === '1') return (pyCmd = c);
  }
}

function runCode({ lang, code }) {
  const py = lang === 'python';
  const cmd = py ? python() : process.execPath;
  if (!cmd) return { out: '', err: 'no python interpreter found', unavailable: true };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'try-me-'));   // private dir: nothing else lives next to the script
  try {
    const file = path.join(dir, py ? 'main.py' : 'main.js');
    fs.writeFileSync(file, String(code));
    const r = spawnSync(cmd, py ? ['-I', file] : [file], { encoding: 'utf8', timeout: 5000, maxBuffer: 1 << 20, env, cwd: dir });
    return { out: r.stdout || '', err: (r.stderr || '') + (r.error ? String(r.error.message) : '') };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function serve(file) {
  if (!file) {
    const htmls = fs.existsSync(home) ? fs.readdirSync(home).filter((n) => n.endsWith('.html')).sort() : [];
    if (!htmls.length) die('nothing to serve: run build first');
    file = path.join(home, htmls[htmls.length - 1]);
  }
  const token = crypto.randomBytes(16).toString('hex');
  let idle;
  const bump = () => { clearTimeout(idle); idle = setTimeout(() => process.exit(0), 2 * 3600e3); };
  const server = http.createServer((req, res) => {
    bump();
    const send = (code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type }); res.end(body); };
    if (req.headers.host !== `127.0.0.1:${server.address().port}`) return send(403, '{}'); // blocks DNS rebinding
    if (req.method === 'GET' && req.url.split('?')[0] === '/') return send(200, fs.readFileSync(file), 'text/html; charset=utf-8');
    if (req.method !== 'POST' || req.headers['x-token'] !== token) return send(403, '{}');
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 2e5) req.destroy(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (req.url === '/result') return send(200, JSON.stringify(saveResult(data)));
        if (req.url === '/run') return send(200, JSON.stringify(runCode(data)));
        send(404, '{}');
      } catch { send(400, '{}'); }
    });
  });
  server.listen(0,'127.0.0.1', () => {
    const url = `http://127.0.0.1:${server.address().port}/?t=${token}`;
    console.log(url);
    bump();
    if (process.argv.includes('--no-open')) return;
    const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
    spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
  });
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'build' && arg) build(arg, flag('--out'));
else if (cmd === 'serve') serve(arg && !arg.startsWith('--') ? arg : undefined);
else if (cmd === 'prefs' && arg) { const p = readProfile(); p.prefs = { ...p.prefs, ...JSON.parse(arg) }; writeProfile(p); console.log(JSON.stringify(p.prefs)); }
else die('usage: node play.js build <levels.json> [--out f] | serve [file] [--no-open] | prefs <json>');
