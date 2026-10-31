const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SHARED = path.join(ROOT, 'shared');
const SKILLS = path.join(ROOT, 'skills');
const ALLOWED_KEYS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];

const okaySkills = fs.readdirSync(SKILLS).filter((n) => n.startsWith('okay-'));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

// Top-level frontmatter keys and scalar values. Block scalars (> or |) are joined.
function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      fm[key] = /^[>|][-+]?$/.test(kv[2]) ? '' : kv[2].replace(/^(['"])(.*)\1$/, '$2');
    } else if (key && /^\s+\S/.test(line)) {
      fm[key] = (fm[key] + ' ' + line.trim()).trim();
    }
  }
  return fm;
}

it('there is at least one okay-* skill', () => {
  assert.ok(okaySkills.length > 0);
});

for (const name of okaySkills) {
  const dir = path.join(SKILLS, name);

  describe(`skills/${name}`, () => {
    const skillMd = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf-8');
    const fm = frontmatter(skillMd);

    it('has frontmatter with allowed keys only', () => {
      assert.ok(fm, 'SKILL.md needs a --- frontmatter block');
      for (const k of Object.keys(fm)) assert.ok(ALLOWED_KEYS.includes(k), `key "${k}" is not allowed`);
    });

    it('declares license: MIT', () => {
      assert.equal(fm.license, 'MIT');
    });

    it('name equals folder name', () => {
      assert.equal(fm.name, name);
    });

    it('description is present and at most 1024 chars', () => {
      assert.ok(fm.description, 'description missing');
      assert.ok(fm.description.length <= 1024, `description is ${fm.description.length} chars`);
    });

    it('relative links resolve inside the skill folder', () => {
      for (const file of walk(dir).filter((f) => f.endsWith('.md'))) {
        const text = fs.readFileSync(file, 'utf-8');
        for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
          if (/^[a-z]+:|^#/.test(target)) continue;
          const resolved = path.resolve(path.dirname(file), target.split('#')[0]);
          const rel = path.relative(dir, resolved);
          assert.ok(!rel.startsWith('..') && !path.isAbsolute(rel), `${path.relative(ROOT, file)} links outside: ${target}`);
          assert.ok(fs.existsSync(resolved), `${path.relative(ROOT, file)} links to missing ${target}`);
        }
      }
    });

    it('shared/ is a byte-identical copy of the root shared/ (run npm run build)', () => {
      const want = walk(SHARED).map((f) => path.relative(SHARED, f)).sort();
      const sharedDir = path.join(dir, 'shared');
      const got = fs.existsSync(sharedDir) ? walk(sharedDir).map((f) => path.relative(sharedDir, f)).sort() : [];
      assert.deepEqual(got, want);
      for (const f of want) {
        assert.ok(fs.readFileSync(path.join(sharedDir, f)).equals(fs.readFileSync(path.join(SHARED, f))), `shared/${f} drifted`);
      }
    });

    it('evals.json meets the minimums', () => {
      const evals = JSON.parse(fs.readFileSync(path.join(dir, 'evals.json'), 'utf-8'));
      assert.ok(Array.isArray(evals));
      for (const e of evals) {
        assert.ok(e.id && e.description && e.prompt, `eval ${e.id} needs id, description, prompt`);
        assert.ok(['positive', 'negative', 'behavioural'].includes(e.kind), `eval ${e.id} has bad kind ${e.kind}`);
        assert.ok(Array.isArray(e.expectations) && e.expectations.length > 0, `eval ${e.id} needs expectations`);
      }
      const count = (k) => evals.filter((e) => e.kind === k).length;
      assert.ok(count('positive') >= 3, 'needs >= 3 positive prompts');
      assert.ok(count('negative') >= 2, 'needs >= 2 negative prompts');
      assert.ok(count('behavioural') >= 1, 'needs >= 1 behavioural case');
    });
  });
}
