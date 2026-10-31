const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

test('README lists every okay-* skill', () => {
  for (const name of fs.readdirSync(path.join(root, 'skills')).filter((n) => n.startsWith('okay-'))) {
    assert.ok(readme.includes(`\`${name}\``), `README mentions ${name}`);
  }
});

test('README has the install lines and the contributor-mode template', () => {
  assert.ok(readme.includes('claude plugin marketplace add TONiiV/okay-skills'));
  assert.ok(readme.includes('/plugin install okay-skills --marketplace TONiiV/okay-skills'));
  assert.ok(readme.includes('npm run package'));
  assert.ok(readme.includes('python ~/.claude/skills/jev/scripts/jev.py router off'));
  assert.ok(readme.includes('Bash(gh pr merge:*)') && readme.includes('Bash(glab mr merge:*)'));
  assert.ok(readme.includes('## Contributor repos'), 'template uses the heading shared/contributor-mode.md reads');
});

test('README credits every source named in a NOTICE.md', () => {
  const credits = readme.slice(readme.indexOf('## Credits'));
  assert.ok(credits.length > 10, 'README has a Credits section');
  for (const name of fs.readdirSync(path.join(root, 'skills')).filter((n) => n.startsWith('okay-'))) {
    const notice = fs.readFileSync(path.join(root, 'skills', name, 'NOTICE.md'), 'utf8');
    for (const [, repo] of notice.matchAll(/\]\(https:\/\/github\.com\/([\w.-]+\/[\w.-]+)/g)) {
      assert.ok(credits.includes(repo), `Credits names ${repo} (from ${name}/NOTICE.md)`);
    }
  }
});
