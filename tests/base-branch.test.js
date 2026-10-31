const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
// Every markdown file under shared/ and under each skills/okay-*/, except the
// generated skills/okay-*/shared/ copies (they mirror shared/).
function mdFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'shared' || e.name === 'node_modules' ? [] : mdFiles(p);
    return e.name.endsWith('.md') ? [p] : [];
  });
}

const files = [
  ...mdFiles(path.join(ROOT, 'shared')),
  ...fs
    .readdirSync(path.join(ROOT, 'skills'))
    .filter((n) => n.startsWith('okay-'))
    .flatMap((n) => mdFiles(path.join(ROOT, 'skills', n))),
];

// Each Bash call may run in a fresh shell: a variable set in one call is gone in the next.
describe('base branch resolution', () => {
  it('no shared rule or skill markdown file uses a shell variable for the base branch', () => {
    assert.ok(files.some((f) => f.endsWith(path.join('okay-design', 'briefs.md'))), 'scan misses skill briefs');
    assert.ok(files.some((f) => f.endsWith(path.join('shared', 'review.md'))), 'scan misses shared/review.md');
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf-8');
      assert.doesNotMatch(text, /\$b\b|\$\{b[#}:%]|\bb=\$\(/, `${path.relative(ROOT, f)} relies on a base variable`);
    }
  });

  it('shared/git.md resolves the base inline and falls back to main', () => {
    const text = fs.readFileSync(path.join(ROOT, 'shared', 'git.md'), 'utf-8');
    assert.match(text, /\$\(git symbolic-ref --short -q refs\/remotes\/origin\/HEAD \|\| echo origin\/main\)/);
  });
});
