// Runs every okay-* skill's evals.json through `claude plugin eval` and checks per-skill rates against eval-targets.json.
//
//   npm run eval                                    run all skills, then check
//   npm run eval -- --skill okay-fix --runs 1       one skill, one run per case
//   npm run eval -- --results <file.json>           check an earlier `claude plugin eval --json` result, no run
//   npm run eval -- --cases-only                    only write the cases to eval-cases/
//
// Other flags (--runs, --max-cost-usd, --model, -j, --trust-plugin, ...) go to `claude plugin eval` as given.
// Exit 0: every measured rate meets its target. 1: a target is missed. 2: usage error or the run failed.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SKILLS = path.join(ROOT, 'skills');
const CASES_DIR = 'eval-cases';
const KINDS = ['positive', 'negative', 'behavioural'];
const TARGET_KEYS = ['positiveTriggerMin', 'negativeFalseTriggerMax', 'behaviouralPassMin'];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Matches the skill name in a Skill tool input (bare or plugin-namespaced), not a longer name that starts with it.
function skillPattern(skill) {
  return `(?<![\\w-])${escapeRe(skill)}(?![\\w-])`;
}

const caseName = (skill, kind, id) => `${skill}--${kind}--${id}`;

function parseCaseName(name) {
  const [skill, kind, ...rest] = String(name).split('--');
  if (!skill || !KINDS.includes(kind) || rest.length === 0) return null;
  return { skill, kind, id: rest.join('--') };
}

// One `claude plugin eval` case per eval entry. positive: the skill fires; negative: it does not; behavioural: an LLM judge checks the expectations.
function toCases(skill, evals) {
  return evals.map((e) => {
    const trigger = e.kind !== 'behavioural';
    const graders = e.kind === 'positive'
      ? [{ type: 'tool_used', name: 'skill-fired', tool: 'Skill', input_match: skillPattern(skill), min: 1 }]
      : e.kind === 'negative'
        ? [{ type: 'tool_used', name: 'skill-not-fired', tool: 'Skill', input_match: skillPattern(skill), max: 0 }]
        : [{ type: 'llm', name: 'expectations', criteria: `The ${skill} skill handled the request and the response meets every expectation:\n${e.expectations.map((x) => `- ${x}`).join('\n')}` }];
    return {
      dir: path.join(skill, String(e.id)),
      case: {
        schema_version: '1.0',
        name: caseName(skill, e.kind, e.id),
        description: e.description,
        tags: [`skill:${skill}`, `kind:${e.kind}`],
        execution: {
          prompt: e.prompt,
          max_turns: trigger ? 5 : 15,
          allowed_tools: ['Skill', 'Read', 'Glob', 'Grep'],
        },
        graders,
      },
    };
  });
}

// A run passes when it ended without error and every grader passed.
function runPassed(run) {
  return !run.error && Array.isArray(run.graders) && run.graders.length > 0 && run.graders.every((g) => g.passed === true);
}

// Counts passing, scored and errored runs per skill and kind from a `claude plugin eval --json` result (with-arm only).
function tally(result) {
  const out = {};
  for (const c of result.cases || []) {
    const meta = parseCaseName(c.name);
    if (!meta) continue;
    const t = ((out[meta.skill] ||= {})[meta.kind] ||= { passed: 0, total: 0, errors: 0 });
    for (const run of (c.arms && c.arms.with) || []) {
      if (run.error) { t.errors++; continue; }
      t.total++;
      if (runPassed(run)) t.passed++;
    }
  }
  return out;
}

const ratio = (a, b) => (b === 0 ? null : a / b);

// Per skill: positive trigger rate, negative false-trigger rate, behavioural pass rate. A kind with no cases is absent.
function rates(tallies) {
  const out = {};
  for (const [skill, t] of Object.entries(tallies)) {
    const r = (out[skill] = {});
    if (t.positive) r.positiveTrigger = { rate: ratio(t.positive.passed, t.positive.total), n: t.positive.total, errors: t.positive.errors };
    if (t.negative) r.negativeFalseTrigger = { rate: ratio(t.negative.total - t.negative.passed, t.negative.total), n: t.negative.total, errors: t.negative.errors };
    if (t.behavioural) r.behaviouralPass = { rate: ratio(t.behavioural.passed, t.behavioural.total), n: t.behavioural.total, errors: t.behavioural.errors };
  }
  return out;
}

function targetsFor(targets, skill) {
  return { ...targets.default, ...((targets.skills || {})[skill] || {}) };
}

const METRICS = [
  { metric: 'positiveTrigger', key: 'positiveTriggerMin', ok: (r, t) => r >= t, op: '>=' },
  { metric: 'negativeFalseTrigger', key: 'negativeFalseTriggerMax', ok: (r, t) => r <= t, op: '<=' },
  { metric: 'behaviouralPass', key: 'behaviouralPassMin', ok: (r, t) => r >= t, op: '>=' },
];

// One row per measured metric. A metric whose runs all errored has rate null and fails.
function check(skillRates, targets) {
  const rows = [];
  for (const skill of Object.keys(skillRates).sort()) {
    const want = targetsFor(targets, skill);
    for (const { metric, key, ok, op } of METRICS) {
      const m = skillRates[skill][metric];
      if (!m) continue;
      const target = want[key];
      rows.push({ skill, metric, rate: m.rate, n: m.n, errors: m.errors, op, target, ok: m.rate !== null && ok(m.rate, target) });
    }
  }
  return rows;
}

function validateTargets(targets, skillNames) {
  const errs = [];
  const checkSet = (where, set, full) => {
    if (!set || typeof set !== 'object') return errs.push(`${where} must be an object`);
    for (const k of Object.keys(set)) if (!TARGET_KEYS.includes(k)) errs.push(`${where}.${k} is not a known target`);
    for (const k of TARGET_KEYS) {
      if (!(k in set)) { if (full) errs.push(`${where}.${k} is missing`); continue; }
      if (typeof set[k] !== 'number' || set[k] < 0 || set[k] > 1) errs.push(`${where}.${k} must be a number from 0 to 1`);
    }
  };
  checkSet('default', targets.default, true);
  for (const [skill, set] of Object.entries(targets.skills || {})) {
    if (!skillNames.includes(skill)) errs.push(`skills.${skill} is not an okay-* skill`);
    checkSet(`skills.${skill}`, set, false);
  }
  return errs;
}

function formatRows(rows) {
  const pct = (r) => (r === null ? 'n/a' : `${(r * 100).toFixed(1)}%`);
  return rows.map((r) => `${r.ok ? 'ok  ' : 'MISS'} ${r.skill} ${r.metric} ${pct(r.rate)} (n=${r.n}${r.errors ? `, ${r.errors} errored` : ''}) target ${r.op} ${pct(r.target)}`).join('\n');
}

const okaySkills = () => fs.readdirSync(SKILLS).filter((n) => n.startsWith('okay-')).sort();

function writeCases(dir, skills) {
  for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (name !== 'results') fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  }
  let count = 0;
  for (const skill of skills) {
    const evals = JSON.parse(fs.readFileSync(path.join(SKILLS, skill, 'evals.json'), 'utf8'));
    for (const c of toCases(skill, evals)) {
      fs.mkdirSync(path.join(dir, c.dir), { recursive: true });
      // JSON is valid YAML, so case.yaml needs no YAML writer.
      fs.writeFileSync(path.join(dir, c.dir, 'case.yaml'), JSON.stringify(c.case, null, 2) + '\n');
      count++;
    }
  }
  return count;
}

function main(argv) {
  const own = { skill: [], results: null, casesOnly: false, targets: path.join(ROOT, 'eval-targets.json') };
  const pass = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--skill') own.skill.push(argv[++i]);
    else if (a === '--results') own.results = argv[++i];
    else if (a === '--targets') own.targets = argv[++i];
    else if (a === '--cases-only') own.casesOnly = true;
    else pass.push(a);
  }
  const all = okaySkills();
  const targets = JSON.parse(fs.readFileSync(own.targets, 'utf8'));
  const bad = validateTargets(targets, all);
  if (bad.length) { console.error(`eval-rates: bad targets file:\n${bad.join('\n')}`); return 2; }
  for (const s of own.skill) if (!all.includes(s)) { console.error(`eval-rates: unknown skill ${s}`); return 2; }

  let resultFile = own.results;
  if (!resultFile) {
    const dir = path.join(ROOT, CASES_DIR);
    const n = writeCases(dir, own.skill.length ? own.skill : all);
    console.log(`eval-rates: wrote ${n} cases to ${CASES_DIR}/`);
    if (own.casesOnly) return 0;
    fs.mkdirSync(path.join(dir, 'results'), { recursive: true });
    resultFile = path.join(dir, 'results', `rates-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    // --ablation none: under a with/without split, `tool_used: Skill` graders stop counting toward the score.
    const args = ['plugin', 'eval', '.', '--eval-dir', CASES_DIR, '--ablation', 'none', '--threshold', '0', '--no-publish', '--json', resultFile, ...pass];
    const r = spawnSync('claude', args, { cwd: ROOT, stdio: 'inherit' });
    if (r.error) { console.error(`eval-rates: cannot run claude (${r.error.code || r.error.message}); install Claude Code and log in`); return 2; }
    if (!fs.existsSync(resultFile)) { console.error(`eval-rates: claude plugin eval exited ${r.status} without writing ${resultFile}`); return 2; }
  }
  const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
  if (result.partial) console.log(`eval-rates: partial run (${result.partialReason || 'unknown reason'})`);
  const rows = check(rates(tally(result)), targets);
  if (rows.length === 0) { console.error(`eval-rates: no scored okay-* cases in ${resultFile}`); return 2; }
  console.log(formatRows(rows));
  console.log(`eval-rates: result ${path.relative(process.cwd(), resultFile)}`);
  return rows.every((r) => r.ok) ? 0 : 1;
}

module.exports = { skillPattern, caseName, parseCaseName, toCases, runPassed, tally, rates, check, validateTargets, formatRows };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
