const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { createRequire } = require("node:module");
const assert = require("node:assert/strict");

const hash = (bytes, algorithm = "sha256") =>
  createHash(algorithm).update(bytes).digest("hex");
const quote = (value) =>
  value === null
    ? "NULL"
    : typeof value === "number"
      ? String(value)
      : "'" + String(value).replaceAll("'", "''") + "'";
function insertBatches(table, columns, rows, size = 50) {
  const result = [];
  for (let i = 0; i < rows.length; i += size) {
    const statement =
      `INSERT INTO ${table} (${columns.join(",")}) VALUES\n` +
      rows
        .slice(i, i + size)
        .map((row) => "(" + row.map(quote).join(",") + ")")
        .join(",\n") +
      ";";
    assert(
      Buffer.byteLength(statement) < 90_000,
      "SQL batch exceeds the safe statement limit",
    );
    result.push(statement);
  }
  return result;
}
async function atomicJson(filename, value) {
  const temporary = filename + ".tmp";
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + "\n");
  await fs.rename(temporary, filename);
}
async function prepare(config) {
  const source = await fs.realpath(config.source);
  const output = path.resolve(config.output);
  const repo = await fs.realpath(config.repo);
  const inside = (parent, child) => {
    const relative = path.relative(parent, child);
    return (
      relative === "" ||
      (!relative.startsWith(".." + path.sep) &&
        relative !== ".." &&
        !path.isAbsolute(relative))
    );
  };
  assert(
    !inside(source, output) && !inside(output, source) && !inside(repo, output),
    "Output must be outside the source and repository",
  );
  assert(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.slug) && config.slug.length <= 28,
    "Use a slug up to 28 characters for bounded face vector IDs",
  );
  assert(
    typeof config.title === "string" &&
      config.title.trim() &&
      config.title.length <= 200,
    "A title up to 200 characters is required",
  );
  assert(
    typeof config.summary === "string" &&
      config.summary.trim() &&
      config.summary.length <= 5000,
    "A summary up to 5000 characters is required",
  );
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(config.date) &&
      Number.isFinite(Date.parse(config.date)) &&
      new Date(config.date).toISOString().slice(0, 10) === config.date,
    "Use a real YYYY-MM-DD event date",
  );
  assert(config.reviewed === true, "Finish the requested culling pass first");
  assert(
    !config.category ||
      (typeof config.category === "string" && config.category.length <= 120),
    "Category is too long",
  );
  const sharp = createRequire(path.join(repo, "package.json"))("sharp");
  const originals = (await fs.readdir(source, { withFileTypes: true }))
    .filter((f) => f.isFile() && /\.jpe?g$/i.test(f.name))
    .map((f) => f.name)
    .sort();
  const rejects = config.rejects ?? [];
  assert(Array.isArray(rejects));
  const excluded = new Set();
  for (const reject of rejects) {
    assert(
      originals.includes(reject.filename) &&
        typeof reject.reason === "string" &&
        reject.reason.trim(),
      "Every reject needs an exact source filename and reason",
    );
    assert(!excluded.has(reject.filename), "Duplicate reject");
    excluded.add(reject.filename);
  }
  const filenames = originals.filter((filename) => !excluded.has(filename));
  assert(
    filenames.length > 0 && filenames.includes(config.cover),
    "Choose a retained photo as the cover",
  );
  await fs.mkdir(output, { recursive: true });
  assert(
    !inside(source, await fs.realpath(output)) &&
      !inside(repo, await fs.realpath(output)),
    "Output resolves inside source or repository",
  );
  const lock = await fs.open(path.join(output, ".prepare.lock"), "wx");
  try {
    const manifestPath = path.join(output, "delivery.json");
    let previous;
    try {
      previous = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (previous)
      assert(
        previous.slug === config.slug && previous.source === source,
        "Output belongs to a different delivery",
      );
    const completed = new Map(
      (previous?.photos ?? []).map((photo) => [photo.originalFilename, photo]),
    );
    const manifest = {
      slug: config.slug,
      source,
      title: config.title,
      date: config.date,
      complete: false,
      rejects,
      photos: [],
    };
    const photosDirectory = path.join(output, "photos");
    await fs.mkdir(photosDirectory, { recursive: true });
    // Existing remote objects are immutable: stale exports require explicit reconciliation.
    const expectedNames = new Set(
      filenames.map(
        (filename) =>
          "photo-" + hash(config.slug + ":" + filename).slice(0, 12) + ".jpg",
      ),
    );
    assert.equal(
      path.relative(
        await fs.realpath(output),
        await fs.realpath(photosDirectory),
      ),
      "photos",
      "Photos output must not redirect through a symlink",
    );
    const unexpected = (await fs.readdir(photosDirectory)).filter(
      (filename) =>
        !expectedNames.has(filename) &&
        !(
          filename.endsWith(".tmp") && expectedNames.has(filename.slice(0, -4))
        ),
    );
    assert.equal(
      unexpected.length,
      0,
      "Output has stale or unexpected exports; use a fresh delivery folder or reconcile explicitly",
    );
    for (const [index, filename] of filenames.entries()) {
      const sourceBytes = await fs.readFile(path.join(source, filename));
      const sourceSha256 = hash(sourceBytes);
      const id = "photo-" + hash(config.slug + ":" + filename).slice(0, 12);
      assert(
        Buffer.byteLength(`${config.slug}:0123456789ab:${id}-100`) <= 64,
        "Face vector ID too long",
      );
      const exportFilename = id + ".jpg";
      const exportPath = path.join(photosDirectory, exportFilename);
      const prior = completed.get(filename);
      let reused = false;
      if (
        prior?.sourceSha256 === sourceSha256 &&
        prior.exportFilename === exportFilename
      ) {
        try {
          reused = hash(await fs.readFile(exportPath), "md5") === prior.md5;
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      if (!reused) {
        const temporary = exportPath + ".tmp";
        await sharp(sourceBytes)
          .autoOrient()
          .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
          .toColourspace("srgb")
          .jpeg({ quality: 84, progressive: true })
          .toFile(temporary);
        await fs.rename(temporary, exportPath);
      }
      const bytes = await fs.readFile(exportPath);
      const meta = await sharp(bytes).metadata();
      assert(
        !meta.exif && !meta.xmp && Math.max(meta.width, meta.height) <= 2400,
        "Export metadata or dimensions are invalid",
      );
      manifest.photos.push({
        id,
        originalFilename: filename,
        exportFilename,
        objectKey: `events/${config.slug}/photos/${exportFilename}`,
        sourceSha256,
        md5: hash(bytes, "md5"),
        bytes: bytes.length,
        width: meta.width,
        height: meta.height,
        alt: `${config.title} — ${config.date} (${filename})`,
      });
      await atomicJson(manifestPath, manifest);
      if ((index + 1) % 100 === 0)
        console.log(`Prepared ${index + 1}/${filenames.length}`);
    }
    assert.equal(
      new Set(manifest.photos.map((p) => p.id)).size,
      filenames.length,
      "Photo ID collision",
    );
    const cover = manifest.photos.find(
      (p) => p.originalFilename === config.cover,
    );
    const createdAt = Math.floor(Date.parse(config.date) / 1000);
    const statements = insertBatches(
      "event_galleries",
      [
        "event_slug",
        "title",
        "event_date",
        "summary",
        "category",
        "coming_soon",
        "status",
        "is_unlisted",
        "cover_src",
        "cover_width",
        "cover_height",
        "cover_alt",
        "updated_at",
      ],
      [
        [
          config.slug,
          config.title,
          config.date,
          config.summary,
          config.category || "Event Photography",
          0,
          "published",
          0,
          `/api/gallery-media/${cover.objectKey}/`,
          cover.width,
          cover.height,
          cover.alt,
          Math.floor(Date.now() / 1000),
        ],
      ],
    );
    statements.push(
      ...insertBatches(
        "gallery_photos",
        [
          "id",
          "event_slug",
          "object_key",
          "original_filename",
          "width",
          "height",
          "alt",
          "uploader_name",
          "source",
          "created_at",
        ],
        manifest.photos.map((photo, index) => [
          photo.id,
          config.slug,
          photo.objectKey,
          photo.originalFilename,
          photo.width,
          photo.height,
          photo.alt,
          "Ayoub Abedrabbo",
          "admin",
          createdAt + index,
        ]),
      ),
    );
    await fs.writeFile(
      path.join(output, "publish.sql"),
      statements.join("\n") + "\n",
    );
    manifest.complete = true;
    await atomicJson(manifestPath, manifest);
    console.log(
      JSON.stringify({
        photos: filenames.length,
        rejects: rejects.length,
        output,
        sqlStatements: statements.length,
      }),
    );
    return manifest;
  } finally {
    await lock.close();
    await fs.unlink(path.join(output, ".prepare.lock"));
  }
}
module.exports = { prepare, quote, insertBatches };
if (require.main === module) {
  fs.readFile(process.argv[2] ?? "", "utf8")
    .then(JSON.parse)
    .then(prepare)
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
