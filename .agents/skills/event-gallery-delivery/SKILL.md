---
name: event-gallery-delivery
description: Cull local event photographs, prepare resumable web exports, upload managed galleries to Ayoub's website, and connect selfie-based photo search using the existing Cloudflare tools.
---

# Event gallery delivery

Use the CLI/API path for local photo batches. The project is normally at `C:/Users/User/Documents/ayoub-linktree-project`; its current AGENTS.md and gallery guides own publication rules and schema. Read `docs/interactive-event-galleries.md`, `docs/gallery-sharing-links.md`, and `docs/sface-gallery-workflow.md` for the requested operation. Keep galleries separate from curated portfolio work. This skill stays in this repository's `.agents/skills/`; do not install it into a global skill directory.

## Preflight

1. Establish source folder, event title/date, public or unlisted visibility, and whether the agent or owner is doing the culling. Date comes from the owner's event, not camera file-copy timestamps. Ask only for missing required details. Face search needs organizer/attendee approval under the project guide; a prior event's approval is not reusable consent.
2. Check `git status --short`, `git worktree list --porcelain`, and the remote master revision **before** release work. Preserve other chats' edits. Use a clean GitHub master checkout for production; a separate clone can supply it when the existing master worktree is occupied or dirty. Validate branch, exact intended commit, and clean status before running a long release command. External command failure must stop dependent commands: use `execFileSync` or check `$LASTEXITCODE` in PowerShell.
3. Read `package.json` for existing commands. Use saved Wrangler authentication (`npx wrangler whoami`) and the existing rclone `r2:` remote. Locate rclone with `Get-Command`, then the current `Rclone.Rclone*` WinGet package; versioned executable paths change. List remotes rather than printing secret configuration. Browser sign-in is a fallback when API credentials are unavailable.

## Cull

- Keep source JPEGs recoverable. Use a durable event output folder outside the source and Git checkout, such as `C:/Users/User/Documents/Photo Deliveries/<slug>`.
- Run `node <skill>/scripts/inspect.cjs <repo> <source> <output>` to make a cached focus report and numbered contact sheets. It reads only top-level JPEGs, so rejects subfolders stay excluded. Reuse its report and thumbnails on retries.
- If the owner delegates selection, inspect every contact sheet yourself, then inspect suspected rejects at a larger size. Edge sharpness ranks candidates; sharp backgrounds, low light, small faces, and shallow depth of field make it unreliable as a deletion rule. Preserve borderline or unique moments.
- Record explicit rejects with reasons. `prepare.cjs` excludes these from delivery without moving originals. If the owner requests local removal, move only those exact files into a rejects folder, check hashes/counts, and retain a restoration list. Never infer permission to permanently delete camera media.

## Prepare and upload

Run `node <skill>/scripts/prepare.cjs <config.json>`. The config is local operator data, not a secret file:

```json
{
  "repo": "C:/Users/User/Documents/ayoub-linktree-project",
  "source": "G:/DCIM/103AYOUB",
  "output": "C:/Users/User/Documents/Photo Deliveries/event-name",
  "slug": "event-name",
  "title": "Event name",
  "date": "2026-10-24",
  "category": "Event Photography",
  "summary": "Photographs from the event.",
  "cover": "P1034993.JPG",
  "reviewed": true,
  "rejects": []
}
```

`reviewed` means the requested culling pass is complete, including an agent-delegated pass. A reject is `{ "filename": "P1034545.JPG", "reason": "Severe motion blur" }`. The helper exports 2400-pixel progressive sRGB JPEGs without source metadata, checkpoints each completed export, and writes `delivery.json` plus `publish.sql`. Its stable, short photo IDs match the managed gallery filenames and keep face vector IDs within the existing format's limits. Outputs are verified on resume; a corrupt export is rebuilt. Source files stay untouched. The output folder must stay outside the repository and source.

A crashed process can leave `.prepare.lock` in the output folder. Confirm that its preparation process has ended before removing that exact lock and resuming. Temporary exports are rebuilt. If the chosen source/reject set changes after an export, use a fresh output folder or explicitly reconcile stale exports before uploading. Run helper checks with `node --test <skill>/scripts/delivery.test.cjs` after changing the helpers.

Before applying SQL, compare its columns with the current managed-gallery implementation and remote schema, and check that the slug and photo IDs are unused. Treat an existing gallery as a resume/reconciliation case, not permission to overwrite it. Prefer the authenticated companion/admin API when a suitable key is available. Direct Cloudflare D1/R2 ingestion is appropriate when the owner requests that path and the current schema is verified.

Upload **copies** from `photos/` to `r2:<intended-public-bucket>/events/<slug>/photos/` with `rclone copy --immutable`. Use `rclone check --one-way` against that exact prefix; completion means all expected files match checksums. Apply `publish.sql` only after that check. It uses separate bounded inserts, avoiding D1's statement-size limit; file import is atomic. The SQL lists the gallery publicly and leaves guest submissions disabled. An unlisted request needs the current sharing API and token workflow instead of this public SQL plan.

Verify the public listing, title/date, photo-card count, cover, and sampled actual media requests via HTTP. Bindings and IDs from the deployment scripts distinguish production and isolated preview. Progress updates should distinguish uploaded, publicly listed, vectors enqueued, vectors queryable, and face UI deployed.

## Face search and release

Index the **prepared `photos/` directory** with `npm run faces:index -- --event <slug> --photos <directory>`, not the raw camera folder. The default is pinned quantized SFace with local Windows DirectML GPU recognition; YuNet detection/alignment use CPU. `uv` selects the pinned Python 3.12 runtime. Verify actual DirectML provider activity; do not silently report CPU fallback as GPU processing. `--cpu` is an explicit alternative. Keep Human only for legacy events using `node scripts/face-index-human.mjs`.

Prepared filenames must match `publicGalleryPhoto` and Vectorize metadata. Index output lives in ignored `.face-index/<slug>/`. The SFace indexer checkpoints each photo using content/model/preprocessing hashes; rerun the same command to resume. It recomputes changed inputs and excludes removed photos from the assembled index. A stale `.sface-index.lock` needs its recorded process checked before removal. Report processed versus cached photos accurately.

For SFace, use the 128-dimensional cosine indexes `face-search-sface-int8` and isolated `face-search-sface-int8-preview`, each with numeric `faceOrder` metadata created before insertion. Publish the same index to preview with `faces:publish -- --event <slug> --vector-index face-search-sface-int8-preview`, then production with `faces:publish -- --event <slug>`. Wait for the final mutation to become processed in both indexes. Query both early and late face orders; enqueued does not mean queryable. Confirm every returned filename exists in the exported gallery. Generated manifests contain index metadata and IDs, never selfie images or embedding values. Legacy Human uses separate 1024-dimensional `face-search`; do not mix descriptors or cleanup IDs across indexes.

The manifest is bundled into the website. A gallery data upload does not deploy it. Honor the current AGENTS.md authorization and release workflow; reuse the owner's explicit authorization for that operation. Run the project's required release scripts and their checks; avoid extra full verification runs outside those scripts when the exact tree was already verified. Keep unrelated process improvements outside the content-release commit. On preview and production, verify HTTP 200, expected photo count, face component/version presence, and an actual face-search POST with correct filename results. Report browser selfie/device checks separately from API checks.

## Improve accuracy when requested

The site compares cosine scores in Vectorize. SFace's initial threshold is 0.5580291381871154, chosen on Angel's event; it is not a universal confidence percentage or a guarantee for future events. Human's old 0.62 threshold and normalized `match.similarity()` scores do not transfer. Use representative same-person/different-person examples across lighting, angles, glasses, and group shots, reserving separate photos for evaluation. Use the existing calibration helper on training pairs, evaluate held-out false/missed matches, then apply a justified `--threshold` to the SFace indexer or publisher. The old `--labels` indexer option belongs only to `face-index-human.mjs`.

New `range-v1` manifests subdivide numeric face-order ranges whenever a query fills with above-threshold hits, then deduplicate photos without a fixed result cap. Compare runtime results against exact offline cosine counts and measure latency; changing `topK` alone cannot bypass Cloudflare's metadata limit. Read `docs/sface-gallery-workflow.md` for the SFace release evidence and limits; `docs/face-search-calibration.md` records historical Human calibration. Reindexing the same inputs/model/threshold alone does not establish an accuracy improvement.

For model comparisons, calibrate each model on the training split and report detection coverage separately from recognition accuracy. Match outputs by checked geometry, never descriptor similarity. Detectors can draw differently sized boxes or duplicate one face: strict one-to-one IoU matching can invent misses. Inspect unmatched and ambiguous mappings before trusting a score. SFace is the measured default, not a universal benchmark winner. Keep event consent and publication authorization explicit under the repository rules.

Preserve the same pinned quantized weights, RGB/NCHW input, and five-landmark alignment on indexing and selfie paths. Check raw-tensor channel order, numeric agreement against OpenCV, frozen-threshold results, and provider profiles. Browser detection uses 640 pixels for bounded phone work; event detection uses up to 1800. These landmarks naturally differ, so test actual retrieval as well as same-crop parity. A production model switch must ship the manifest, browser model, API dimensions, and binding together. Keep prior namespaces for rollback until replacement verification finishes.

Wrangler 4.129's CLI filter validator silently drops a field containing `$gte` even though the binding/API supports it. For CLI smoke tests on integer `faceOrder`, use `$gt: start - 1` with `$lt: end`, and assert every returned order is inside the requested range. Test the real HTTP endpoint before release; a CLI query that returns results alone is insufficient evidence that filtering worked.
