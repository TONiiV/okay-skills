const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const er = require('../scripts/eval-rates.js');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'eval-rates.js');
const skills = fs.readdirSync(path.join(ROOT, 'skills')).filter((n) => n.startsWith('okay-'));
const TARGETS = { default: { positiveTriggerMin: 0.9, negativeFalseTriggerMax: 0.05, behaviouralPassMin: 0.8 }, skills: {} };

// A run in the shape `claude plugin eval --json` writes under cases[].arms.with.
const run = (passed, extra = {}) => ({ score: passed ? 1 : 0, passed, graders: [{ name: 'g', passed }], ...extra });
const kase = (skill, kind, id, runs) => ({ name: er.caseName(skill, kind, id), arms: { with: runs } });
const repeat = (n, f) => Array.from({ length: n }, (_, i) => f(i));

describe('eval-rates: case names', () => {
  it('round-trips skill, kind and an id that contains --', () => {
    assert.deepEqual(er.parseCaseName(er.caseName('okay-fix', 'negative', 'neg--2')), { skill: 'okay-fix', kind: 'negative', id: 'neg--2' });
  });

  it('ignores names that are not okay cases', () => {
    assert.equal(er.parseCaseName('sample'), null);
    assert.equal(er.parseCaseName('okay-fix--other--1'), null);
  });
});

describe('eval-rates: skill pattern', () => {
  const re = new RegExp(er.skillPattern('okay-to-spec'));

  it('matches the bare and plugin-namespaced skill in a Skill tool input', () => {
    assert.ok(re.test('{"skill":"okay-to-spec"}'));
    assert.ok(re.test('{"skill":"okay-skills:okay-to-spec","args":"x"}'));
  });

  it('does not match a longer skill name that contains it', () => {
    assert.ok(!re.test('{"skill":"okay-to-spec-v2"}'));
    assert.ok(!re.test('{"skill":"not-okay-to-spec"}'));
    assert.ok(!new RegExp(er.skillPattern('okay-dev')).test('{"skill":"okay-design"}'));
  });
});

describe('eval-rates: toCases', () => {
  const evals = [
    { id: 'p', kind: 'positive', description: 'd', prompt: 'P', expectations: ['runs'] },
    { id: 'n', kind: 'negative', description: 'd', prompt: 'N', expectations: ['does not run'] },
    { id: 'b', kind: 'behavioural', description: 'd', prompt: 'B', expectations: ['does A', 'does B'] },
  ];
  const cases = er.toCases('okay-x', evals);

  it('makes one case per eval, named and tagged by skill and kind', () => {
    assert.deepEqual(cases.map((c) => c.case.name), ['okay-x--positive--p', 'okay-x--negative--n', 'okay-x--behavioural--b']);
    assert.deepEqual(cases[0].case.tags, ['skill:okay-x', 'kind:positive']);
    assert.equal(cases[0].dir, path.join('okay-x', 'p'));
    assert.equal(cases[2].case.execution.prompt, 'B');
  });

  it('grades positive as the skill fired and negative as it did not', () => {
    assert.deepEqual(cases[0].case.graders, [{ type: 'tool_used', name: 'skill-fired', tool: 'Skill', input_match: er.skillPattern('okay-x'), min: 1 }]);
    assert.deepEqual(cases[1].case.graders, [{ type: 'tool_used', name: 'skill-not-fired', tool: 'Skill', input_match: er.skillPattern('okay-x'), max: 0 }]);
  });

  it('grades behavioural with an LLM judge over every expectation', () => {
    const [g] = cases[2].case.graders;
    assert.equal(g.type, 'llm');
    assert.match(g.criteria, /- does A\n- does B$/);
  });

  it('builds cases for every real okay-* skill', () => {
    for (const s of skills) {
      const ev = JSON.parse(fs.readFileSync(path.join(ROOT, 'skills', s, 'evals.json'), 'utf8'));
      const cs = er.toCases(s, ev);
      assert.equal(cs.length, ev.length);
      assert.equal(new Set(cs.map((c) => c.dir)).size, cs.length, `${s}: eval ids are unique`);
    }
  });
});

describe('eval-rates: rate math', () => {
  it('a run passes only without error and with every grader passed', () => {
    assert.equal(er.runPassed(run(true)), true);
    assert.equal(er.runPassed(run(false)), false);
    assert.equal(er.runPassed({ graders: [{ passed: true }, { passed: false }] }), false);
    assert.equal(er.runPassed({ graders: [] }), false);
    assert.equal(er.runPassed(run(true, { error: 'timeout' })), false);
  });

  it('computes trigger, false-trigger and behavioural rates per skill', () => {
    const result = {
      cases: [
        kase('okay-a', 'positive', 'p0', repeat(10, (i) => run(i < 9))), // 9/10 fired
        kase('okay-a', 'negative', 'n0', repeat(20, (i) => run(i !== 0))), // 1/20 fired
        kase('okay-a', 'behavioural', 'b0', repeat(5, (i) => run(i < 4))), // 4/5 passed
        kase('okay-b', 'positive', 'p0', [run(true), run(false)]),
        { name: 'unrelated', arms: { with: [run(false)] } },
      ],
    };
    const r = er.rates(er.tally(result));
    assert.deepEqual(Object.keys(r).sort(), ['okay-a', 'okay-b']);
    assert.deepEqual(r['okay-a'].positiveTrigger, { rate: 0.9, n: 10, errors: 0 });
    assert.deepEqual(r['okay-a'].negativeFalseTrigger, { rate: 0.05, n: 20, errors: 0 });
    assert.deepEqual(r['okay-a'].behaviouralPass, { rate: 0.8, n: 5, errors: 0 });
    assert.deepEqual(r['okay-b'], { positiveTrigger: { rate: 0.5, n: 2, errors: 0 } });
  });

  it('pools runs across cases of one kind and leaves errored runs out of the rate', () => {
    const result = { cases: [
      kase('okay-a', 'positive', 'p0', [run(true), run(true)]),
      kase('okay-a', 'positive', 'p1', [run(false), run(true, { error: 'timeout' })]),
    ] };
    assert.deepEqual(er.rates(er.tally(result))['okay-a'].positiveTrigger, { rate: 2 / 3, n: 3, errors: 1 });
  });

  it('ignores the without arm', () => {
    const result = { cases: [{ name: er.caseName('okay-a', 'positive', 'p'), arms: { with: [run(true)], without: [run(false), run(false)] } }] };
    assert.deepEqual(er.rates(er.tally(result))['okay-a'].positiveTrigger, { rate: 1, n: 1, errors: 0 });
  });

  it('gives rate null when every run errored', () => {
    const result = { cases: [kase('okay-a', 'behavioural', 'b', [run(true, { error: 'x' })])] };
    assert.deepEqual(er.rates(er.tally(result))['okay-a'].behaviouralPass, { rate: null, n: 0, errors: 1 });
  });
});

describe('eval-rates: check against targets', () => {
  const at = (pos, neg, beh) => ({ 'okay-a': {
    positiveTrigger: { rate: pos, n: 10, errors: 0 },
    negativeFalseTrigger: { rate: neg, n: 10, errors: 0 },
    behaviouralPass: { rate: beh, n: 10, errors: 0 },
  } });
  const oks = (rows) => Object.fromEntries(rows.map((r) => [r.metric, r.ok]));

  it('passes exactly at the default targets', () => {
    assert.deepEqual(oks(er.check(at(0.9, 0.05, 0.8), TARGETS)), { positiveTrigger: true, negativeFalseTrigger: true, behaviouralPass: true });
  });

  it('misses just past each default target', () => {
    assert.deepEqual(oks(er.check(at(0.89, 0.06, 0.79), TARGETS)), { positiveTrigger: false, negativeFalseTrigger: false, behaviouralPass: false });
  });

  it('a per-skill override replaces only the keys it names', () => {
    const t = { ...TARGETS, skills: { 'okay-a': { behaviouralPassMin: 0.5 } } };
    const rows = er.check(at(0.9, 0.05, 0.6), t);
    assert.deepEqual(oks(rows), { positiveTrigger: true, negativeFalseTrigger: true, behaviouralPass: true });
    assert.equal(rows.find((r) => r.metric === 'behaviouralPass').target, 0.5);
  });

  it('skips kinds with no cases and fails a kind whose runs all errored', () => {
    const rows = er.check({ 'okay-a': { behaviouralPass: { rate: null, n: 0, errors: 3 } } }, TARGETS);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ok, false);
    assert.match(er.formatRows(rows), /^MISS okay-a behaviouralPass n\/a \(n=0, 3 errored\)/);
  });
});

describe('eval-rates: targets file', () => {
  const file = JSON.parse(fs.readFileSync(path.join(ROOT, 'eval-targets.json'), 'utf8'));

  it('is valid and holds the default targets from issue #46', () => {
    assert.deepEqual(er.validateTargets(file, skills), []);
    assert.deepEqual(file.default, TARGETS.default);
  });

  it('rejects unknown keys, out-of-range values and unknown skills', () => {
    const bad = { default: { positiveTriggerMin: 1.5, negativeFalseTriggerMax: 0.05 }, skills: { 'okay-nope': { foo: 1 } } };
    const errs = er.validateTargets(bad, skills).join('\n');
    assert.match(errs, /default\.positiveTriggerMin must be a number from 0 to 1/);
    assert.match(errs, /default\.behaviouralPassMin is missing/);
    assert.match(errs, /skills\.okay-nope is not an okay-\* skill/);
    assert.match(errs, /skills\.okay-nope\.foo is not a known target/);
  });
});

describe('eval-rates: --results (no network, no claude)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'okay-eval-rates-'));
  const write = (name, obj) => { const f = path.join(tmp, name); fs.writeFileSync(f, JSON.stringify(obj)); return f; };
  const cli = (...a) => spawnSync(process.execPath, [SCRIPT, ...a], { encoding: 'utf8', cwd: tmp });

  it('exits 0 and prints ok rows when every target is met', () => {
    const f = write('good.json', { cases: [kase('okay-fix', 'positive', 'p', repeat(10, () => run(true)))] });
    const r = cli('--results', f);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^ok {3}okay-fix positiveTrigger 100\.0% \(n=10\) target >= 90\.0%$/m);
  });

  it('exits 1 when a target is missed', () => {
    const f = write('bad.json', { cases: [kase('okay-fix', 'negative', 'n', [run(false), run(true)])] });
    const r = cli('--results', f);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /^MISS okay-fix negativeFalseTrigger 50\.0%/m);
  });

  it('exits 2 when the result holds no okay-* cases', () => {
    const r = cli('--results', write('empty.json', { cases: [], partial: true, partialReason: 'cost_ceiling' }));
    assert.equal(r.status, 2);
    assert.match(r.stdout, /partial run \(cost_ceiling\)/);
  });
});
