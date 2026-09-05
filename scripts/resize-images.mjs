import { readdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const IMAGE_EXTENSIONS = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);
const DEFAULT_TARGETS = ["img", "app/logo.png"];
const MINIMUM_IMAGE_SIZES = new Map([
  ["img/HIW-penguin.png", 1120],
]);

const sizeArgument = process.argv.find((argument) => argument.startsWith("--size="));
const maxSize = Number(sizeArgument?.split("=")[1] ?? 240);
const targets = process.argv
  .slice(2)
  .filter((argument) => !argument.startsWith("--size="));

if (!Number.isInteger(maxSize) || maxSize < 1) {
  throw new Error("--size must be a positive integer");
}

async function collectImages(target) {
  const targetPath = path.resolve(target);
  const targetStats = await stat(targetPath);

  if (targetStats.isFile()) {
    return IMAGE_EXTENSIONS.has(path.extname(targetPath).toLowerCase())
      ? [targetPath]
      : [];
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  const nestedImages = await Promise.all(
    entries.map((entry) => collectImages(path.join(targetPath, entry.name)))
  );

  return nestedImages.flat();
}

async function resizeImage(imagePath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const relativePath = path.relative(process.cwd(), imagePath).replaceAll("\\", "/");
  const imageMaxSize = Math.max(
    maxSize,
    MINIMUM_IMAGE_SIZES.get(relativePath) ?? 0
  );

  if (
    !metadata.width ||
    !metadata.height ||
    (metadata.width <= imageMaxSize && metadata.height <= imageMaxSize)
  ) {
    console.log(`Skipped ${relativePath}`);
    return;
  }

  const extension = path.extname(imagePath);
  const temporaryPath = `${imagePath}.resize-${process.pid}${extension}`;

  try {
    await image
      .rotate()
      .resize({
        width: imageMaxSize,
        height: imageMaxSize,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toFile(temporaryPath);

    await unlink(imagePath);
    await rename(temporaryPath, imagePath);
    console.log(
      `Resized ${relativePath}: ` +
        `${metadata.width}x${metadata.height} -> max ${imageMaxSize}x${imageMaxSize}`
    );
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

const imageGroups = await Promise.all(
  (targets.length ? targets : DEFAULT_TARGETS).map(collectImages)
);
const images = [...new Set(imageGroups.flat())];

for (const imagePath of images) {
  await resizeImage(imagePath);
}

console.log(`Processed ${images.length} image(s).`);
