const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createRequire } = require("node:module");
const { DatabaseSync } = require("node:sqlite");
const { prepare, quote, insertBatches } = require("./prepare.cjs");
const { inspect, focus } = require("./inspect.cjs");
const repo = "C:/Users/User/Documents/ayoub-linktree-project";
const sharp = createRequire(path.join(repo, "package.json"))("sharp");

test("focus ordering distinguishes uniform, soft and sharp edges", async () => {
  const pixels = Buffer.from(
    Array.from({ length: 400 }, (_, i) => (i % 20 < 10 ? 0 : 255)),
  );
  const blurred = await sharp(pixels, {
    raw: { width: 20, height: 20, channels: 1 },
  })
    .blur(3)
    .toColourspace("b-w")
    .raw()
    .toBuffer();
  assert.equal(focus(Buffer.alloc(400, 50), 20, 20), 0);
  assert(focus(pixels, 20, 20) > focus(blurred, 20, 20));
});

test("bounded SQL preserves quotes and all 517 records in SQLite", () => {
  assert.equal(quote("Angel's"), "'Angel''s'");
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE photos(id INTEGER PRIMARY KEY,alt TEXT);");
    const rows = Array.from({ length: 517 }, (_, i) => [i, "Angel's birthday"]);
    const sql = insertBatches("photos", ["id", "alt"], rows);
    assert.equal(sql.length, 11);
    sql.forEach((statement) => db.exec(statement));
    assert.equal(db.prepare("SELECT count(*) AS n FROM photos").get().n, 517);
    assert.equal(
      db.prepare("SELECT alt FROM photos LIMIT 1").get().alt,
      "Angel's birthday",
    );
  } finally {
    db.close();
  }
});

test("prepare excludes rejects, strips EXIF, resumes and repairs corrupt exports", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "gallery-delivery-test-"),
  );
  try {
    const source = path.join(root, "source");
    await fs.mkdir(source);
    for (const name of ["cover.JPG", "keep.JPG", "reject.JPG"]) {
      await sharp({
        create: {
          width: 3000,
          height: 2000,
          channels: 3,
          background: "orange",
        },
      })
        .withExif({ IFD0: { Artist: "Metadata test" } })
        .jpeg()
        .toFile(path.join(source, name));
    }
    const original = await fs.readFile(path.join(source, "cover.JPG"));
    const config = {
      repo,
      source,
      output: path.join(root, "delivery"),
      slug: "birthday-2026",
      title: "Angel's birthday",
      summary: "Angel's party",
      date: "2026-10-24",
      cover: "cover.JPG",
      reviewed: true,
      rejects: [{ filename: "reject.JPG", reason: "Test reject" }],
    };
    const report = await inspect(repo, source, path.join(root, "inspection"));
    assert.equal(report.photos.length, 3);
    const contactSheet = await sharp(
      path.join(root, "inspection", "sheet-01.jpg"),
    ).metadata();
    assert.equal(contactSheet.width, 1800);
    const first = await prepare(config);
    assert.equal(first.photos.length, 2);
    assert(first.complete);
    assert.deepEqual(
      await fs.readFile(path.join(source, "cover.JPG")),
      original,
    );
    assert(await fs.stat(path.join(source, "reject.JPG")));
    const exportPath = path.join(
      config.output,
      "photos",
      first.photos[0].exportFilename,
    );
    const exported = await sharp(exportPath).metadata();
    assert.equal(exported.width, 2400);
    assert.equal(exported.exif, undefined);
    const before = (await fs.stat(exportPath)).mtimeMs;
    await prepare(config);
    assert.equal((await fs.stat(exportPath)).mtimeMs, before);
    await fs.writeFile(exportPath, "corrupt");
    await prepare(config);
    assert.equal((await sharp(exportPath).metadata()).width, 2400);
    await assert.rejects(prepare({ ...config, output: source }), /outside/);
    await assert.rejects(prepare({ ...config, reviewed: false }), /culling/);
    await assert.rejects(
      prepare({ ...config, date: "2026-02-31" }),
      /real YYYY/,
    );
    await assert.rejects(
      prepare({
        ...config,
        rejects: [{ filename: "missing.JPG", reason: "Missing" }],
      }),
      /exact source/,
    );
    const next = await inspect(repo, source, path.join(root, "inspection"));
    assert.deepEqual(next.photos, report.photos);
  } finally {
    // root is the exact directory created by mkdtemp for this test.
    await fs.rm(root, { recursive: true, force: true });
  }
});
