const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const files = [
  path.join(ROOT, 'shared', 'git.md'),
  path.join(ROOT, 'shared', 'lanes.md'),
  ...fs
    .readdirSync(path.join(ROOT, 'skills'))
    .filter((n) => n.startsWith('okay-'))
    .map((n) => path.join(ROOT, 'skills', n, 'SKILL.md')),
];

// Each Bash call may run in a fresh shell: a variable set in one call is gone in the next.
describe('base branch resolution', () => {
  it('no shared rule or SKILL.md uses a shell variable for the base branch', () => {
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
