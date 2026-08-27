/**
 * Downscale and re-encode the generated imagery.
 *
 * The raw model output is ~1 MB per image. That hurt twice: the browser had to
 * pull 11 MB to paint the grid, and every vision request shipped ~2.7 MB of
 * base64 to Gemini, which pushed calls past the 20s timeout and dropped them
 * to an "Unknown" perception.
 *
 * Floor plans keep more resolution and higher quality than photos — the agent
 * has to read small room labels off them, and that is the whole ballgame.
 *
 *   npm run assets:optimize
 */
import sharp from 'sharp';
import { readdir, stat, rename, unlink } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { ASSETS_DIR as ROOT } from '../src/paths.js';

const PROFILES: Record<string, { width: number; quality: number }> = {
  'floorplan.jpg': { width: 1600, quality: 88 }, // labels must stay legible
  'aerial.jpg': { width: 1280, quality: 82 },
  'exterior.jpg': { width: 1100, quality: 80 },
};

async function main() {
  const dirs = (await readdir(ROOT, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let before = 0;
  let after = 0;

  for (const dir of dirs) {
    for (const [file, profile] of Object.entries(PROFILES)) {
      const path = join(ROOT, dir, file);
      let original: number;
      try { original = (await stat(path)).size; } catch { continue; }

      const tmp = join(ROOT, dir, `.tmp-${basename(file)}`);
      await sharp(path)
        .resize({ width: profile.width, withoutEnlargement: true })
        .jpeg({ quality: profile.quality, mozjpeg: true, progressive: true })
        .toFile(tmp);

      const size = (await stat(tmp)).size;
      if (size >= original) {
        // Leaving the scratch file behind meant it got committed. Clean up.
        await unlink(tmp).catch(() => {});
        console.log(`  · ${dir}/${file} already optimal`);
        continue;
      }
      await rename(tmp, path);
      before += original;
      after += size;
      console.log(
        `  ✓ ${dir}/${file}  ${(original / 1024).toFixed(0)}KB → ${(size / 1024).toFixed(0)}KB`,
      );
    }
  }

  if (before) {
    console.log(
      `\nTotal ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(1)}MB ` +
      `(${(100 - (after / before) * 100).toFixed(0)}% smaller)`,
    );
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
