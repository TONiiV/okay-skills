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
// ponytail: regex heuristics, not a parser; they catch the common shapes. Cyrillic or Greek look-alikes are not folded; extend the list when a miss shows up.
// Invisible characters are matched as a class; the Hangul fillers are listed in case a Unicode version drops them from the property.
const INVISIBLE = /[\p{Default_Ignorable_Code_Point}\u{61C}\u{200E}\u{200F}\u{202A}-\u{202E}\u{2066}-\u{2069}\u{115F}\u{1160}\u{3164}\u{FFA0}\u{2800}]/u;
const SECRET_WORD = String.raw`(?<![a-z0-9])(?:password|passwd|secret|token|api[ _-]?key|access[ _-]?key|private[ _-]?key)s?(?:[_-][a-z0-9]+)*["']?`;
// "=" takes any 8+ char value; ":" and "is" need a digit and a letter, so "Prefers tokens: verbose_output_mode" passes.
const SECRET_ASSIGN = new RegExp(SECRET_WORD + String.raw`\s*(?:=\s*["']?[^\s"']{8,}|(?::|\s+is)\s*["']?(?=[^\s"']*\d)(?=[^\s"']*[a-z])[^\s"']{8,})`, 'i');
const ENV_SECRET = /\$\{?\w*(?:KEY|TOKEN|SECRET|PASSW)\w*|\$env:\w*(?:KEY|TOKEN|SECRET|PASSW)\w*|%\w*(?:KEY|TOKEN|SECRET|PASSW)\w*%/i;
const NET_TOOL = /\b(?:curl|wget|invoke-webrequest|invoke-restmethod|iwr|irm|nc|ncat|netcat)\b/i;
const UPLOAD = /(?:^|\s)(?:-F\s*\S*=@|(?:-d|--data(?:-\w+)?)[\s=]*@|(?:-T|--upload-file|--post-file|--body-file|-InFile)[\s=]+\S)/i;
const CRED_FILE = /(?:^|[\s/\\"'=@~(<>])(?:\.env(?!\.(?:example|sample|template)\b)(?!\w)|\.netrc\b|id_rsa|id_ed25519|id_ecdsa|\.ssh[/\\]|\.aws[/\\]credentials)/i;
const READ_CMD = /\b(?:cat|less|more|head|tail|type|source|get-content|gc|xxd|base64|strings)\b/i;
const NEGATED = /\b(?:never|don'?t|do not|avoid|must not|mustn'?t|shouldn'?t|not)\b/i;
const FILLER = String.raw`(?:\w+\s+){0,4}?`;
// Tests get the NFKC text (n) and the same text with "-" and "_" collapsed to spaces (inj).
const THREATS = [
  ['secret assignment', (n) => SECRET_ASSIGN.test(n)],
  ['secret key prefix', (n) => /\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_\w{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,})/.test(n)],
  ['private key block', (n) => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(n)],
  ['exfiltration command', (n) => NET_TOOL.test(n) && (ENV_SECRET.test(n) || UPLOAD.test(n))],
  ['credential file exfiltration', (n) => CRED_FILE.test(n) && (NET_TOOL.test(n) || n.includes('|'))],
  ['credential file read', (n) => CRED_FILE.test(n) && READ_CMD.test(n) && !NEGATED.test(n)],
  ['prompt injection', (n, inj) => new RegExp(String.raw`\b(?:ignore|disregard|forget|override)\s+${FILLER}(?:previous|prior|above|earlier|all)\s+(?:\w+\s+)?(?:instructions|rules|prompts|messages|context|system prompt)\b|\b(?:ignore|disregard|forget|override)\s+(?:everything|anything|all)\s+(?:above|before|earlier|prior|previously)\b|\byou are now\b|\bnew instructions\s*:|\bsystem prompt\s*:|\b(?:reveal|print|show|leak)\s+(?:your\s+)?system prompt\b|\bdo not tell the user\b|</?\s*(?:system|assistant)\s*>`, 'i').test(inj)],
];

function threat(text) {
  if (INVISIBLE.test(text)) return 'invisible or bidi Unicode';
  const n = text.normalize('NFKC');
  if (INVISIBLE.test(n)) return 'invisible or bidi Unicode';
  const inj = n.replace(/[-_]+/g, ' ');
  return THREATS.find(([, test]) => test(n, inj))?.[0] || null;
}
const len = (s) => [...s].length; // caps count code points, not UTF-16 units
const readLines = (file) => fs.readFileSync(file, 'utf8').replace(/^\u{FEFF}/u, ''); // a hand-edited file may start with a BOM
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
    text = readLines(file);
  } catch {
    return '';
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !threat(l));
  let out = '';
  for (const l of lines) {
    if (len(out) + len(l) > cap) break; // len(out) + len(l) is the body length with this line
    out += l + '\n';
  }
  return out.trim();
}

// A write that does not grow the file passes even over the cap, so a hand-edited file can be merged down.
function save(file, lines, cap, before) {
  const body = lines.join('\n');
  if (len(body) > cap && len(body) > len(before.join('\n'))) throw new Error(`over the ${cap}-char cap (${len(body)}); merge first: patch or remove existing facts, then retry`);
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
    lines = readLines(file).split(/\r?\n/).filter(Boolean);
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

module.exports = { CAPS, off, userFile, projectFile, snapshot, threat };
