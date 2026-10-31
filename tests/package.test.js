const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const skills = fs.readdirSync(path.join(root, 'skills')).filter((n) => n.startsWith('okay-'));

// Reads {name -> data} from the central directory of a zip buffer.
function readZip(buf) {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, 'end of central directory record');
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    assert.strictEqual(buf.readUInt32LE(p), 0x02014b50);
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    files[name] = method === 8 ? zlib.inflateRawSync(raw) : raw;
    p += 46 + nameLen + extraLen;
  }
  return files;
}

test('npm run package writes one zip per okay-* skill, skill folder as root', () => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'package.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(skills.length > 0);
  for (const name of skills) {
    const file = path.join(root, 'dist', `${name}.zip`);
    assert.ok(fs.existsSync(file), `${name}.zip exists`);
    const files = readZip(fs.readFileSync(file));
    const skillMd = files[`${name}/SKILL.md`];
    assert.ok(skillMd, `${name}.zip lists ${name}/SKILL.md`);
    assert.deepStrictEqual(skillMd, fs.readFileSync(path.join(root, 'skills', name, 'SKILL.md')));
    for (const entry of Object.keys(files)) assert.ok(entry.startsWith(`${name}/`), `${entry} is under ${name}/`);
    assert.ok(files[`${name}/shared/lanes.md`], `${name}.zip carries its shared/ copy`);
  }
});
