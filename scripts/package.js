// Writes dist/<skill>.zip for every skills/okay-*, with the skill folder as the zip root.
// Upload the zips to claude.ai (Customize > Skills > Add > Upload skill; several zips per upload). `npm run package` runs the build first. Needs Node 20.15+ (zlib.crc32).
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.join(__dirname, '..');
const skillsDir = path.join(root, 'skills');
const dist = path.join(root, 'dist');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

// Fixed timestamp (2000-01-01) so the same tree always gives the same bytes.
const DOS_TIME = 0, DOS_DATE = (20 << 9) | (1 << 5) | 1;

function zip(entries) {
  const parts = [], central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const body = zlib.deflateRawSync(data);
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE((3 << 8) | 20, 4); // made on unix, so the mode below is honored
    local.copy(cd, 6, 4, 30); // version needed .. name length, same as the local header
    cd.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    parts.push(local, nameBuf, body);
    offset += 30 + nameBuf.length + body.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cdBuf, end]);
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
for (const name of fs.readdirSync(skillsDir).filter((n) => n.startsWith('okay-')).sort()) {
  const dir = path.join(skillsDir, name);
  const entries = walk(dir).map((f) => ({
    name: `${name}/${path.relative(dir, f).split(path.sep).join('/')}`,
    data: fs.readFileSync(f),
  })).sort((a, b) => (a.name < b.name ? -1 : 1));
  fs.writeFileSync(path.join(dist, `${name}.zip`), zip(entries));
  console.log(`dist/${name}.zip (${entries.length} files)`);
}
