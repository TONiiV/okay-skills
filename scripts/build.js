// Copies shared/* into every skills/okay-*/shared/, replacing what was there.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'shared');
const skillsDir = path.join(root, 'skills');

for (const name of fs.readdirSync(skillsDir)) {
  if (!name.startsWith('okay-')) continue;
  const dest = path.join(skillsDir, name, 'shared');
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`shared -> skills/${name}/shared`);
}
