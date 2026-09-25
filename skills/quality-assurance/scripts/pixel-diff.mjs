#!/usr/bin/env node
// Pixel-diff helper for UI validation. Self-contained: resolves pngjs/pixelmatch
// from whatever the runtime provides, else installs them once into a shared /tmp
// dir. Usage:
//   node pixel-diff.mjs <impl.png> <ref.png> <out-mask.png> [threshold=0.15]
// Never stretches: an exact integer-multiple pair is matched by shrinking the larger
// image (k×k block average); any other size mismatch exits 3.
// Prints JSON: { numDiff, pct, width, height, factor } and writes the diff mask to <out>.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const depsDir = '/tmp/qa-pixel-diff'; // shared across runs in a session; cleared with /tmp

// Load { PNG, pixelmatch } using a require rooted at `base`.
// pngjs is CJS (require), pixelmatch@7 is ESM (resolve path, then import as URL).
async function loadFrom(base) {
  const req = createRequire(base);
  const { PNG } = req('pngjs');
  const pixelmatch = (await import(pathToFileURL(req.resolve('pixelmatch')).href)).default;
  return { PNG, pixelmatch };
}

async function getDeps() {
  const depsBase = pathToFileURL(join(depsDir, 'index.js')).href;

  // 1. Whatever the runtime already provides (provisioned sandbox, or a
  //    node_modules at/above this script). No network, no side effects.
  try {
    return await loadFrom(import.meta.url);
  } catch {
    /* fall through */
  }

  // 2. A previous run's install in the shared /tmp dir. Skips npm entirely,
  //    so it works offline once the first run of the session has bootstrapped.
  try {
    return await loadFrom(depsBase);
  } catch {
    /* fall through */
  }

  // 3. First run of the session: install once into the shared /tmp dir.
  execFileSync('npm', ['i', '--prefix', depsDir, 'pngjs@^7', 'pixelmatch@^7'], {
    stdio: 'inherit',
  });
  return await loadFrom(depsBase);
}

// Shrink by an exact integer factor, averaging each k×k block into one pixel.
function downscale(PNG, src, k) {
  const w = src.width / k, h = src.height / k;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sum = [0, 0, 0, 0];
      for (let dy = 0; dy < k; dy++) {
        for (let dx = 0; dx < k; dx++) {
          const si = ((y * k + dy) * src.width + (x * k + dx)) * 4;
          for (let c = 0; c < 4; c++) sum[c] += src.data[si + c];
        }
      }
      const di = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) out.data[di + c] = Math.round(sum[c] / (k * k));
    }
  }
  return out;
}

// Integer k where big is exactly k× small in both dimensions, else 0.
function exactFactor(big, small) {
  const k = big.width / small.width;
  return Number.isInteger(k) && k >= 1 && big.height === small.height * k ? k : 0;
}

async function main() {
  const [implPath, refPath, outPath, thresholdArg] = process.argv.slice(2);
  if (!implPath || !refPath || !outPath) {
    console.error('usage: node pixel-diff.mjs <impl.png> <ref.png> <out-mask.png> [threshold=0.15]');
    process.exit(2);
  }
  const threshold = Number(thresholdArg ?? 0.15);

  const { PNG, pixelmatch } = await getDeps();

  let impl = PNG.sync.read(readFileSync(implPath));
  let ref = PNG.sync.read(readFileSync(refPath));

  // Never stretch: shrink the larger image by an exact integer factor, or refuse.
  let factor = 1;
  if (exactFactor(ref, impl) > 1) ref = downscale(PNG, ref, (factor = exactFactor(ref, impl)));
  else if (exactFactor(impl, ref) > 1) impl = downscale(PNG, impl, (factor = exactFactor(impl, ref)));
  else if (exactFactor(ref, impl) !== 1) {
    console.error(
      `size mismatch: impl ${impl.width}x${impl.height}, ref ${ref.width}x${ref.height} — not an exact multiple. ` +
        'Set the viewport to the Figma frame size and re-capture.',
    );
    process.exit(3);
  }
  const { width, height } = ref;
  const diff = new PNG({ width, height });

  const numDiff = pixelmatch(impl.data, ref.data, diff.data, width, height, { threshold });
  writeFileSync(outPath, PNG.sync.write(diff));

  const pct = Number(((numDiff / (width * height)) * 100).toFixed(2));
  console.log(JSON.stringify({ numDiff, pct, width, height, factor }));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
