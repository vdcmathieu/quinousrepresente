#!/usr/bin/env node
/**
 * Copies the read-only data contract into the web app before every build.
 *
 *   ../data/site/*.json   ->  web/.data/*.json
 *   ../data/photos/*.jpg  ->  web/public/photos/*.webp
 *
 * The portraits are re-encoded on the way in: the source files are 150x192
 * JPEGs of about 29 kB each, and the same pixels as WebP weigh around 4 kB.
 * On the directory page, where several dozen portraits load, that is the
 * difference between 800 kB and 110 kB.
 *
 * Both destinations are gitignored. The copy runs on `predev` and `prebuild`,
 * so every build re-reads whatever the data pipeline produced last — nothing is
 * ever snapshotted into source.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(webRoot);

const siteSrc = join(repoRoot, "data", "site");
const siteDest = join(webRoot, ".data");
const photosSrc = join(repoRoot, "data", "photos");
const photosDest = join(webRoot, "public", "photos");

if (!existsSync(siteSrc)) {
  console.error(`[sync-data] Missing ${siteSrc}. Run the data pipeline first.`);
  process.exit(1);
}

rmSync(siteDest, { recursive: true, force: true });
mkdirSync(siteDest, { recursive: true });
const jsonFiles = readdirSync(siteSrc).filter((f) => f.endsWith(".json"));
for (const file of jsonFiles) {
  cpSync(join(siteSrc, file), join(siteDest, file));
}
console.log(`[sync-data] ${jsonFiles.length} JSON files -> .data/`);

rmSync(photosDest, { recursive: true, force: true });
mkdirSync(photosDest, { recursive: true });
let photoCount = 0;
let octets = 0;
if (existsSync(photosSrc) && statSync(photosSrc).isDirectory()) {
  const sources = readdirSync(photosSrc).filter((f) =>
    /\.(jpe?g|png|webp)$/i.test(f),
  );
  const lots = [];
  for (let i = 0; i < sources.length; i += 32) lots.push(sources.slice(i, i + 32));
  for (const lot of lots) {
    await Promise.all(
      lot.map(async (file) => {
        const dest = join(photosDest, `${parse(file).name}.webp`);
        try {
          const info = await sharp(join(photosSrc, file))
            .webp({ quality: 82 })
            .toFile(dest);
          octets += info.size;
        } catch {
          // An unreadable source is not worth failing a build over: ship the
          // original and let the browser deal with it.
          cpSync(join(photosSrc, file), join(photosDest, file));
        }
        photoCount++;
      }),
    );
  }
}
console.log(
  `[sync-data] ${photoCount} portraits -> public/photos/ (${Math.round(octets / 1024)} kB total)`,
);
