const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const ATTRIBUTION = { commit: '', pr: '', sessionUrl: false };
const ignored = (p) => spawnSync('git', ['check-ignore', '-q', p], { cwd: ROOT }).status === 0;

describe('repo .claude/settings.json', () => {
  it('turns off Claude Code attribution', () => {
    const settings = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf-8'));
    assert.deepEqual(settings.attribution, ATTRIBUTION);
  });

  it('matches the block shared/git.md tells repos to add', () => {
    const text = fs.readFileSync(path.join(ROOT, 'shared', 'git.md'), 'utf-8');
    const block = text.match(/```json\r?\n([\s\S]*?)```/);
    assert.ok(block, 'shared/git.md has no json block');
    assert.deepEqual(JSON.parse(block[1]).attribution, ATTRIBUTION);
  });

  it('is tracked while the rest of .claude/ stays ignored', () => {
    assert.equal(ignored('.claude/settings.json'), false);
    assert.equal(ignored('.claude/worktrees/some-branch/file'), true);
    assert.equal(ignored('.claude/settings.local.json'), true);
  });
});
