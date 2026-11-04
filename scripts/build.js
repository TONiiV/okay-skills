// Copies into every skills/okay-*/shared/ only the shared/* files that skill references
// (as shared/<file>.md), plus the files those files link to. Replaces what was there.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'shared');
const skillsDir = path.join(root, 'skills');

function mdFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'shared' ? [] : mdFiles(p);
    return e.name.endsWith('.md') ? [p] : [];
  });
}

// Names of the shared/ files a skill folder needs, sorted.
function neededShared(skillDir, sharedDir = src) {
  const have = new Set(fs.readdirSync(sharedDir));
  const need = new Set();
  const add = (text, re) => {
    for (const m of text.matchAll(re)) if (have.has(m[1]) && !need.has(m[1])) queue.push(m[1]), need.add(m[1]);
  };
  const queue = [];
  for (const f of mdFiles(skillDir)) add(fs.readFileSync(f, 'utf-8'), /shared\/([\w.-]+\.md)/g);
  while (queue.length) add(fs.readFileSync(path.join(sharedDir, queue.pop()), 'utf-8'), /\]\(([\w.-]+\.md)(?:#[^)]*)?\)/g);
  return [...need].sort();
}

module.exports = { neededShared };

if (require.main === module) {
  for (const name of fs.readdirSync(skillsDir)) {
    if (!name.startsWith('okay-')) continue;
    const dest = path.join(skillsDir, name, 'shared');
    fs.rmSync(dest, { recursive: true, force: true });
    const files = neededShared(path.join(skillsDir, name));
    if (files.length) fs.mkdirSync(dest);
    for (const f of files) fs.copyFileSync(path.join(src, f), path.join(dest, f));
    console.log(`skills/${name}/shared: ${files.length} of ${fs.readdirSync(src).length} files`);
  }
}
