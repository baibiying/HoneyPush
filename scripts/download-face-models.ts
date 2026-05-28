/**
 * Downloads face-api.js weights into public/models.
 * Run: npx tsx scripts/download-face-models.ts  (or bun run face-models)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
const FILES = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1.bin",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1.bin",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1.bin",
  "face_recognition_model-shard2.bin",
];

const dirPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public/models");

async function main() {
  await mkdir(dirPath, { recursive: true });
  for (const file of FILES) {
    const url = `${BASE}/${file}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(dirPath, file), buf);
    console.log(`✓ ${file}`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
