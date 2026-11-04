#!/usr/bin/env node
// Prints a compact digest of the last N days for okay-bro-try-me: per session the
// user's prompts, tool errors and the closing assistant text; memory notes written
// in the window; and the player profile. Keeps the agent from reading raw transcripts.
// Usage: node week.js [--days 7] [--max 9000]
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const arg = (k, d) => { const i = process.argv.indexOf(k); const n = i > 0 ? Number(process.argv[i + 1]) : NaN; return n > 0 ? n : d; };
const days = arg('--days', 7);
const max = arg('--max', 9000);
const since = Date.now() - days * 864e5;
const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const okayHome = process.env.OKAY_HOME || path.join(os.homedir(), '.okay');
const projects = path.join(claudeDir, 'projects');

const clip = (s, n) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
const texts = (content) => typeof content === 'string' ? [content]
  : (Array.isArray(content) ? content : []).filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text);
const list = (dir) => { try { return fs.readdirSync(dir); } catch { return []; } };
const MAX_FILE = 100 * 1024 * 1024;
let skipped = 0;
const recent = (file) => {
  try {
    const s = fs.statSync(file);
    if (s.mtimeMs < since) return false;
    if (s.size > MAX_FILE) { skipped++; return false; }
    return true;
  } catch { return false; }
};

const out = [];
for (const proj of list(projects)) {
  const pdir = path.join(projects, proj);
  for (const f of list(pdir).filter((n) => n.endsWith('.jsonl'))) {
    const file = path.join(pdir, f);
    if (!recent(file)) continue;
    let cwd = proj, day = '', prompts = [], errors = [], last = '';
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      let e; try { e = JSON.parse(line); } catch { continue; }
      if (!e || e.isSidechain || !e.message || typeof e.message !== 'object') continue;
      if (typeof e.cwd === 'string' && e.cwd) cwd = e.cwd;
      if (!day && typeof e.timestamp === 'string') day = e.timestamp.slice(0, 10);
      const c = e.message.content;
      if (e.type === 'user') {
        for (const b of Array.isArray(c) ? c : []) {
          if (b && b.type === 'tool_result' && b.is_error && errors.length < 3) {
            errors.push(clip(texts(b.content).join(' ') || String(b.content), 120));
          }
        }
        for (const t of texts(c)) if (t && !t.startsWith('<') && prompts.length < 8) prompts.push(clip(t, 200));
      } else if (e.type === 'assistant') {
        const t = texts(c).join(' ');
        if (t.trim()) last = t;
      }
    }
    if (!prompts.length) continue;
    out.push(`## ${day} ${path.basename(cwd)}\n` + prompts.map((p) => `> ${p}`).join('\n')
      + (errors.length ? `\nerrors: ${errors.join(' | ')}` : '')
      + (last ? `\nend: ${clip(last, 300)}` : ''));
  }
  for (const m of list(path.join(pdir, 'memory')).filter((n) => n.endsWith('.md') && n !== 'MEMORY.md')) {
    const file = path.join(pdir, 'memory', m);
    if (recent(file)) out.push(`## memory ${m}\n${clip(fs.readFileSync(file, 'utf8').replace(/^---[\s\S]*?---/, ''), 300)}`);
  }
}

let profile = {};
try { profile = JSON.parse(fs.readFileSync(path.join(okayHome, 'try-me', 'profile.json'), 'utf8')); } catch {}
const runs = profile.runs || [];
const lastRun = runs[runs.length - 1];
let level = lastRun ? lastRun.level : 2;
if (lastRun && lastRun.accuracy >= 0.9) level = Math.min(5, level + 1);
if (lastRun && lastRun.accuracy < 0.6) level = Math.max(1, level - 1);

let body = out.join('\n\n');
if (body.length > max) body = body.slice(0, max) + '\n…(clipped)';
console.log(`# last ${days} days: ${out.length} entries\n\n${body || '(nothing found)'}\n\n# player`);
if (skipped) console.log(`note: skipped ${skipped} transcript file(s) over 100 MB`);
console.log(`first run: ${!lastRun}; prefs: ${JSON.stringify(profile.prefs || {})}; suggested level: ${level}`
  + (lastRun ? `; last: ${lastRun.date} level ${lastRun.level} accuracy ${Math.round(lastRun.accuracy * 100)}%` : '')
  + `; review items queued: ${(profile.review || []).length}`);
