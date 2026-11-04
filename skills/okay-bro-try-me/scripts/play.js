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
const readProfile = () => { try { return JSON.parse(fs.readFileSync(profileFile, 'utf8')); } catch { return {}; } };
const writeProfile = (p) => { fs.mkdirSync(home, { recursive: true }); fs.writeFileSync(profileFile, JSON.stringify(p, null, 1)); };
const today = () => new Date().toISOString().slice(0, 10);
const flag = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const die = (m) => { console.error(m); process.exit(2); };

function build(src, out) {
  const data = JSON.parse(fs.readFileSync(src, 'utf8'));
  if (!Array.isArray(data.units) || !data.units.length) die('levels.json needs a non-empty "units" array');
  const review = (readProfile().review || []).slice(0, 3);
  if (review.length) data.units.push({ concept: 'Review', story: 'Last time these tripped you up. Again!', review: true, items: review.map((r) => r.item) });
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
  p.runs = p.runs || [];
  const last = p.runs[p.runs.length - 1];
  p.streak = nextStreak(p.streak, last && last.date, today());
  p.runs.push({ date: today(), level: r.level, accuracy: r.accuracy, xp: r.xp });
  // ponytail: two first-try hits retire a review item; swap in half-life regression if reviews pile up.
  const review = new Map((p.review || []).map((x) => [x.item.q, x]));
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

function runCode({ lang, code }) {
  const ext = lang === 'python' ? 'py' : 'js';
  const file = path.join(os.tmpdir(), `try-me-${crypto.randomBytes(4).toString('hex')}.${ext}`);
  fs.writeFileSync(file, String(code));
  const cmds = ext === 'py' ? ['python3', 'python', 'py'] : [process.execPath];
  try {
    for (const cmd of cmds) {
      const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
      const r = spawnSync(cmd, [file], { encoding: 'utf8', timeout: 5000, maxBuffer: 1 << 20, env });
      if (r.error && r.error.code === 'ENOENT') continue;
      return { out: r.stdout || '', err: (r.stderr || '') + (r.error ? String(r.error.message) : '') };
    }
    return { out: '', err: `no ${lang} interpreter found` };
  } finally { fs.rmSync(file, { force: true }); }
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
