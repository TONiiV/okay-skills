#!/usr/bin/env node
// Headless screenshots at exact CSS widths (plain --window-size cannot go below ~500px).
// Needs Node 22+ (global WebSocket) and Chrome, Edge or Chromium. No dependencies.
// Usage: node shoot.js <url> <outDir> [--name after] [--widths 320,768,1024,1440] [--height 900]
//                      [--eval "js that forces a state"] [--full] [--bin <browser>]
// Writes <outDir>/<name>-<width>.png and prints the measured window.innerWidth next to each.
// --eval runs after load at every width; a returned value is printed (use it to force a state or run a11y-probe.js).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const [url, outDir] = args;
if (!url || !outDir) { console.error('usage: node shoot.js <url> <outDir> [--name n] [--widths a,b] [--height h] [--eval js] [--full] [--bin path]'); process.exit(2); }
const name = flag('name', 'shot');
const widths = flag('widths', '320,768,1024,1440').split(',').map(Number);
const height = Number(flag('height', 900));
const evalJs = flag('eval', '');
const full = args.includes('--full');

const candidates = [flag('bin', process.env.BROWSER_BIN),
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
const bin = candidates.find((p) => p && fs.existsSync(p));
if (!bin) { console.error('no Chrome/Edge/Chromium found; pass --bin or set BROWSER_BIN'); process.exit(2); }

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'okay-shoot-'));
  const proc = spawn(bin, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let port;
  await new Promise((res, rej) => {
    let buf = '';
    proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/ws:\/\/127\.0\.0\.1:(\d+)\//); if (m) { port = m[1]; res(); } });
    proc.on('exit', () => rej(new Error('browser exited early')));
    setTimeout(() => rej(new Error('browser did not start')), 15000);
  });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const waiters = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else waiters.slice().forEach((w) => w(m));
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const once = (method) => new Promise((r) => { const w = (m) => { if (m.method === method) { waiters.splice(waiters.indexOf(w), 1); r(m); } }; waiters.push(w); });
  const val = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.result.value;

  try {
    fs.mkdirSync(outDir, { recursive: true });
    await send('Page.enable');
    for (const w of widths) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height, deviceScaleFactor: 1, mobile: w < 768 });
      const loaded = once('Page.loadEventFired');
      const nav = await send('Page.navigate', { url });
      if (nav.result.errorText) throw new Error(`cannot load ${url}: ${nav.result.errorText}`); // Chrome would screenshot its own error page
      await loaded;
      if (evalJs) { const r = await val(evalJs); if (r !== undefined) console.log(`  eval(${w}): ${JSON.stringify(r)}`); }
      await new Promise((r) => setTimeout(r, 400)); // let fonts, transitions and the forced state settle
      const inner = await val('innerWidth');
      const overflow = await val('document.documentElement.scrollWidth > document.documentElement.clientWidth');
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
      const file = path.join(outDir, `${name}-${w}.png`);
      fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
      console.log(`${file}  innerWidth=${inner}${inner === w ? '' : ' MISMATCH'}${overflow ? '  HORIZONTAL OVERFLOW' : ''}`);
    }
  } finally { // also when the URL is unreachable: never leave the browser running
    ws.close(); proc.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
