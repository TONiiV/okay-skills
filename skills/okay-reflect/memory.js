#!/usr/bin/env node
// Local fact memory for the okay-* pack. Zero dependencies, so it works when the skill is uploaded alone.
// Store: $OKAY_HOME/memory/USER.md (cap 1500 chars) and $OKAY_HOME/memory/projects/<slug>.md (cap 2500; one file per repo, shared by its linked worktrees), default OKAY_HOME ~/.okay.
// One fact per "- " bullet line. Usage: see shared/memory.md.
// Also required by hooks/reflect.js, so the threat list below is the only definition.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const CAPS = { user: 1500, project: 2500 };

// The one threat-scan list: secrets, exfiltration, prompt injection, invisible or bidi Unicode.
// ponytail: regex heuristics, not a parser; they catch the common shapes. Extend the list when a miss shows up.
const THREATS = [
  ['secret assignment', /(api[_-]?key|secret|token|passw(or)?d)\w*\s*[:=]\s*\S{8,}/i],
  ['secret key prefix', /\b(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,})/],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['exfiltration command', /\b(curl|wget)\b[^\n]*\$\{?\w*(KEY|TOKEN|SECRET|PASSW)/i],
  ['credential file read', /\b(cat|less|more|head|tail|type|source)\s+[^\n]*\.(env|netrc)\b/i],
  ['prompt injection', /\b(ignore|disregard|forget)\b(\s+\w+){0,3}?\s+(previous|prior|above|earlier|preceding)\b|\byou are now\b|\b(reveal|print|show)\s+(your\s+)?system prompt\b|\bdo not tell the user\b|<\/?(system|assistant)>/i],
  ['invisible or bidi Unicode', /[\u00AD\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u{E0000}-\u{E007F}]/u],
];

const threat = (text) => THREATS.find(([, re]) => re.test(text))?.[0] || null;
const off = () => (process.env.OKAY_MEMORY || '').trim().toLowerCase() === 'off';
const memoryDir = () => path.join(process.env.OKAY_HOME || path.join(os.homedir(), '.okay'), 'memory');
const userFile = () => path.join(memoryDir(), 'USER.md');

// Project file for the repo at cwd, or null outside git. Keyed on the common git dir, so a repo and all its linked worktrees share one file.
function projectFile(cwd) {
  let common;
  try {
    common = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000,
    }).trim();
  } catch {
    return null;
  }
  if (!common) return null;
  const real = fs.realpathSync.native(path.resolve(cwd, common)); // relative to cwd in the main work tree
  const hash = crypto.createHash('sha1').update(real).digest('hex').slice(0, 8);
  const name = path.basename(real) === '.git' ? path.basename(path.dirname(real)) : path.basename(real);
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'repo';
  return path.join(memoryDir(), 'projects', base + '-' + hash + '.md');
}

// Frozen view of one file for injection: threat lines dropped, cut to the cap at a line boundary.
function snapshot(file, cap) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !threat(l));
  let out = '';
  for (const l of lines) {
    if (out.length + l.length > cap) break; // out.length + l.length is the body length with this line
    out += l + '\n';
  }
  return out.trim();
}

// A write that does not grow the file passes even over the cap, so a hand-edited file can be merged down.
function save(file, lines, cap, before) {
  const body = lines.join('\n');
  if (body.length > cap && body.length > before.join('\n').length) throw new Error(`over the ${cap}-char cap (${body.length}); merge first: patch or remove existing facts, then retry`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, body ? body + '\n' : '');
  fs.renameSync(tmp, file); // atomic replace
}

function check(text, lines) {
  if (!text.trim()) throw new Error('a fact must not be empty');
  if (/[\r\n]/.test(text)) throw new Error('a fact must be one line');
  const t = threat(text);
  if (t) throw new Error(`threat scan rejected the text (${t})`);
  if (lines.includes(`- ${text}`)) throw new Error('duplicate fact');
}

function matchOne(lines, needle) {
  if (!needle.trim()) throw new Error('the substring must not be empty');
  const hits = lines.map((l, i) => (l.startsWith('- ') && l.slice(2).includes(needle) ? i : -1)).filter((i) => i >= 0);
  if (!hits.length) throw new Error(`no fact contains "${needle}"`);
  if (hits.length > 1) throw new Error(`ambiguous: ${hits.length} facts contain "${needle}"; use a longer substring`);
  return hits[0];
}

function run(argv) {
  const [cmd, target, a, b] = argv;
  const usage = () => {
    throw Object.assign(new Error('usage: memory.js add <user|project> <fact> | patch <user|project> <old> <new> | remove <user|project> <substring>'), { code: 2 });
  };
  if (!['add', 'patch', 'remove'].includes(cmd) || !Object.hasOwn(CAPS, target) || !a || (cmd === 'patch' && b === undefined)) usage();
  if (off()) throw new Error('OKAY_MEMORY=off: memory writes are disabled');
  let file = userFile();
  if (target === 'project') {
    file = projectFile(process.cwd());
    if (!file) throw new Error('the project target needs a git repo');
  }
  let lines = [];
  try {
    lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const before = lines.slice();
  if (cmd === 'add') {
    check(a, lines);
    lines.push(`- ${a}`);
  } else {
    const i = matchOne(lines, a);
    if (cmd === 'remove') {
      lines.splice(i, 1);
    } else {
      const next = lines[i].slice(2).replace(a, () => b);
      check(next, lines.filter((_, j) => j !== i));
      lines[i] = `- ${next}`;
    }
  }
  save(file, lines, CAPS[target], before);
  return `ok: ${cmd} ${target} (${file})`;
}

if (require.main === module) {
  try {
    console.log(run(process.argv.slice(2)));
  } catch (e) {
    console.error(`memory: ${e.message}`);
    process.exit(e.code === 2 ? 2 : 1);
  }
}

module.exports = { CAPS, off, userFile, projectFile, snapshot };
