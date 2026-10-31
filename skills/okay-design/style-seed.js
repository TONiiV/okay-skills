#!/usr/bin/env node
// Style seed: one random number decides a variant's palette, type, layout and other style axes,
// so variants start from different places instead of the same template. No dependencies.
// Usage: node style-seed.js [seed] [--json]
// No seed: draws one from crypto. Same seed + same version of this file = same picks.
//
// No shell (for example claude.ai without code execution): choose a 9-digit seed yourself and
// derive the picks by hand: hue = seed mod 360; then n = floor(seed / 360) and, for each table
// below in order, index = n mod table length, n = floor(n / table length). Record it as
// "seed: <n> (manual)", because the script's mapping differs and will not reproduce it.

const AXES = {
  palette: [
    'monochrome of the base hue plus one accent',
    'analogous: base hue and its neighbours, soft contrast',
    'complementary: base hue against its opposite, high contrast',
    'dark-first: near-black surfaces, base hue as a vivid accent',
    'warm or cool neutrals tinted by the base hue, colour only for state',
    'duotone: two flat inks (base hue and a dark), no gradients',
  ],
  type: [
    'geometric sans for everything, monospace for labels and numbers',
    'serif headings, humanist sans body',
    'condensed grotesk display in caps, compact sans body',
    'slab serif headings, neutral sans body',
    'one monospace family throughout',
    'high-contrast display serif, readable serif body',
  ],
  scale: [
    'tight (ratio about 1.125, headings barely larger)',
    'moderate (ratio about 1.25)',
    'dramatic (ratio 1.5 or more, one oversized element)',
  ],
  layout: [
    'single narrative column',
    'asymmetric split panes (about 60/40)',
    'dense dashboard grid',
    'sidebar plus canvas',
    'card wall or masonry',
    'list-first with a detail drawer',
    'offset editorial grid with broken alignment',
    'full-bleed stacked bands',
  ],
  density: [
    'airy (large gaps, few items per screen)',
    'comfortable',
    'compact',
    'dense (tables, small type, tight rows)',
  ],
  shape: [
    'sharp corners with hairline borders',
    'soft radius (8 to 12px), no borders, tonal surfaces',
    'pill and full-round controls',
    'sharp containers, round controls',
    'thick borders and hard offset shadows (brutalist)',
    'borderless, depth from layered shadows',
  ],
  texture: [
    'flat solid fills',
    'subtle grain or noise on surfaces',
    'soft gradients or a gradient mesh',
    'line icons and line illustration',
    'photography-led',
    'geometric pattern accents',
    'type only, no imagery',
  ],
  motion: [
    'none, fully static',
    'quick fades and colour transitions (about 150ms)',
    'springy micro-interactions on controls',
    'scroll-linked reveals',
    'slow, deliberate transitions between states',
  ],
};

// mulberry32: small seeded PRNG, returns floats in [0, 1).
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(seed) {
  const rand = mulberry32(seed);
  const out = { seed, hue: Math.floor(rand() * 360) };
  for (const [axis, options] of Object.entries(AXES)) out[axis] = options[Math.floor(rand() * options.length)];
  return out;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const arg = args.find((a) => a !== '--json');
  if (arg !== undefined && !/^\d{1,15}$/.test(arg)) { console.error('usage: node style-seed.js [seed] [--json]  (seed: a whole number)'); process.exit(2); }
  const seed = arg === undefined ? require('node:crypto').randomInt(1, 1e9) : Number(arg);
  const p = pick(seed);
  if (args.includes('--json')) console.log(JSON.stringify(p));
  else console.log(Object.entries(p).map(([k, v]) => `${k}: ${v}`).join('\n'));
}

module.exports = { AXES, pick };
