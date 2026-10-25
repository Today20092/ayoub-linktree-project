const fs = require("node:fs/promises");
const path = require("node:path");
const { createRequire } = require("node:module");
const assert = require("node:assert/strict");

function focus(data, width, height) {
  let sum = 0,
    square = 0,
    count = 0;
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const v =
        4 * data[i] -
        data[i - 1] -
        data[i + 1] -
        data[i - width] -
        data[i + width];
      sum += v;
      square += v * v;
      count++;
    }
  return count ? square / count - (sum / count) ** 2 : 0;
}
const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
async function inspect(repo, source, output) {
  source = await fs.realpath(source);
  output = path.resolve(output);
  const relative = path.relative(source, output);
  assert(
    relative &&
      (relative === ".." ||
        relative.startsWith(".." + path.sep) ||
        path.isAbsolute(relative)),
    "Inspection output must be outside source",
  );
  const sharp = createRequire(path.join(path.resolve(repo), "package.json"))(
    "sharp",
  );
  await fs.mkdir(output, { recursive: true });
  const physicalOutput = await fs.realpath(output);
  const physicalRelative = path.relative(source, physicalOutput);
  assert(
    physicalRelative &&
      (physicalRelative === ".." ||
        physicalRelative.startsWith(".." + path.sep) ||
        path.isAbsolute(physicalRelative)),
    "Inspection output resolves inside source",
  );
  const repoRelative = path.relative(await fs.realpath(repo), physicalOutput);
  assert(
    repoRelative &&
      (repoRelative === ".." ||
        repoRelative.startsWith(".." + path.sep) ||
        path.isAbsolute(repoRelative)),
    "Inspection output must be outside repository",
  );
  await fs.mkdir(path.join(output, "thumbnails"), { recursive: true });
  assert.equal(
    path.relative(
      physicalOutput,
      await fs.realpath(path.join(output, "thumbnails")),
    ),
    "thumbnails",
    "Thumbnails must not redirect through a symlink",
  );
  const reportPath = path.join(output, "scan.json");
  let cached;
  try {
    cached = JSON.parse(await fs.readFile(reportPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (cached)
    assert.equal(
      cached.source,
      source,
      "Inspection folder belongs to another source",
    );
  const byName = new Map((cached?.photos ?? []).map((p) => [p.filename, p]));
  const filenames = (await fs.readdir(source, { withFileTypes: true }))
    .filter((p) => p.isFile() && /\.jpe?g$/i.test(p.name))
    .map((p) => p.name)
    .sort();
  assert(filenames.length, "No top-level JPEGs found");
  const report = { source, photos: [] };
  for (const [index, filename] of filenames.entries()) {
    const fullPath = path.join(source, filename);
    const stat = await fs.stat(fullPath);
    const thumbnail = String(index).padStart(6, "0") + ".jpg";
    const prior = byName.get(filename);
    const thumbnailPath = path.join(output, "thumbnails", thumbnail);
    let photo;
    if (
      prior?.size === stat.size &&
      prior.mtimeMs === stat.mtimeMs &&
      prior.thumbnail === thumbnail
    ) {
      try {
        await sharp(thumbnailPath).metadata();
        photo = prior;
      } catch {
        /* Rebuild a missing or invalid preview. */
      }
    }
    if (!photo) {
      const image = sharp(fullPath).autoOrient();
      const { data, info } = await image
        .clone()
        .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
        .greyscale()
        .toColourspace("b-w")
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(info.channels, 1);
      await image
        .clone()
        .resize(296, 195, { fit: "contain", background: "#161616" })
        .jpeg({ quality: 88 })
        .toFile(thumbnailPath);
      photo = {
        filename,
        thumbnail,
        focus: focus(data, info.width, info.height),
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      };
    }
    report.photos.push(photo);
    await fs.writeFile(reportPath + ".tmp", JSON.stringify(report, null, 2));
    await fs.rename(reportPath + ".tmp", reportPath);
    if ((index + 1) % 100 === 0)
      console.log(`Inspected ${index + 1}/${filenames.length}`);
  }
  async function sheet(photos, name) {
    const layers = [];
    for (const [index, photo] of photos.entries()) {
      const left = (index % 6) * 300,
        top = Math.floor(index / 6) * 225;
      layers.push({
        input: path.join(output, "thumbnails", photo.thumbnail),
        left,
        top,
      });
      layers.push({
        input: Buffer.from(
          `<svg width="300" height="28"><rect width="300" height="28" fill="#161616"/><text x="6" y="18" font-size="13" fill="white">${xml(photo.filename)} | ${photo.focus.toFixed(1)}</text></svg>`,
        ),
        left,
        top: top + 195,
      });
    }
    await sharp({
      create: {
        width: 1800,
        height: Math.ceil(photos.length / 6) * 225,
        channels: 3,
        background: "#161616",
      },
    })
      .composite(layers)
      .jpeg({ quality: 88 })
      .toFile(path.join(output, name + ".jpg"));
  }
  await sheet(
    [...report.photos].sort((a, b) => a.focus - b.focus).slice(0, 36),
    "softest",
  );
  for (let index = 0; index < report.photos.length; index += 36)
    await sheet(
      report.photos.slice(index, index + 36),
      "sheet-" + String(index / 36 + 1).padStart(2, "0"),
    );
  console.log(
    JSON.stringify({
      photos: filenames.length,
      sheets: Math.ceil(filenames.length / 36),
      output,
    }),
  );
  return report;
}
module.exports = { inspect, focus };
if (require.main === module) {
  const [repo, source, output] = process.argv.slice(2);
  if (!repo || !source || !output) {
    console.error("Usage: node inspect.cjs <repo> <source> <output>");
    process.exitCode = 1;
  } else
    inspect(repo, source, output).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
