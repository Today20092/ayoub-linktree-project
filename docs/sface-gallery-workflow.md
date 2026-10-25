# GPU face search for event galleries

New event indexes use **quantized SFace with YuNet detection**. Angel's birthday gallery is the first migration. This is the project's measured default, not a claim that SFace is universally the most accurate model. Keep checking each event's lighting, poses, missed matches, and false matches.

## What runs where

- The local indexer reads exported gallery copies. OpenCV detects faces and aligns five landmarks; ONNX Runtime DirectML runs quantized SFace recognition on the Windows GPU. On this computer, the GPU is an RTX 3070 Ti with 8 GB VRAM. A small quantization operation still uses CPU; profiling verifies actual DirectML computation.
- A guest's selfie is decoded and analyzed locally with the same pinned SFace weights. YuNet detects faces on a 640-pixel canvas; five-landmark alignment produces raw RGB, NCHW, 112×112 input. The portable browser runtime uses single-thread WASM, without requiring WebGPU or cross-origin isolation. Model download starts after consent. A selfie with several faces allows selection.
- Only the temporary 128-number descriptor goes to the event's Cloudflare search index. The request handler does not save the selfie or query descriptor. Your desktop need not stay on for guests to search.

The existing Human galleries retain their model and 1024-dimensional index. SFace descriptors and Human descriptors cannot be mixed. A smaller descriptor is not inherently more accurate; it is a different model's representation.

## One-time resources and assets

Production uses `face-search-sface-int8`; isolated preview uses `face-search-sface-int8-preview`. Both have 128 dimensions, cosine distance, and a numeric `faceOrder` metadata index. They are bound as `VECTORIZE_SFACE`; the legacy binding remains `VECTORIZE`.

```powershell
pnpm exec wrangler vectorize create face-search-sface-int8 --dimensions 128 --metric cosine
pnpm exec wrangler vectorize create-metadata-index face-search-sface-int8 --property-name faceOrder --type number
pnpm exec wrangler vectorize create face-search-sface-int8-preview --dimensions 128 --metric cosine
pnpm exec wrangler vectorize create-metadata-index face-search-sface-int8-preview --property-name faceOrder --type number
```

Do not recreate existing indexes. Verify their dimensions and wait for metadata creation before inserting. `scripts/deploy-preview-worker.mjs` explicitly selects the preview SFace index; `scripts/gallery-production-config.mjs` explicitly selects production. Preview D1/R2 must also be isolated before any admin/upload testing.

`src/data/sface-model.json` pins model identity, source commit, checksums, and the initial threshold. `scripts/copy-face-models.mjs`, run by development/build scripts, downloads missing or corrupt weights and verifies SHA-256. It copies the matching ONNX Runtime Web 1.23.0 WASM/module files. Generated assets stay under ignored `public/face-models/`; no biometric fixtures belong in Git.

The recognizer is 9.90 MB and YuNet is 0.23 MB. The browser WASM binary adds 11.82 MB before transfer compression, plus JavaScript. Keep these costs separate when discussing model size. The model source's license files are delivered alongside the weights. Check [OpenCV's SFace model page](https://github.com/opencv/opencv_zoo/tree/main/models/face_recognition_sface) when changing weights or licensing assumptions.

## Index and resume

Install Node/pnpm following the README, and install `uv` for the local Python runner. The wrapper explicitly selects Python 3.12 and the script pins OpenCV, NumPy, and ONNX Runtime. Other Python projects' versions do not change this runtime.

```powershell
npm run faces:index -- --event event-slug --photos "C:\event\delivery\photos"
```

Use the prepared filenames that the managed gallery actually serves. Do not index the raw camera folder and rename files afterward. Source media is read only. The indexer uses an 1800-pixel long-edge limit for event detection and the same SFace alignment/recognition input used by the browser.

The default requires DirectML and fails if it cannot initialize; it does not silently call CPU work GPU work. Use `--cpu` explicitly on a machine without the supported Windows GPU runtime.

Each photo has a content/model/preprocessing fingerprint and an atomic cached result in `.face-index/{slug}/sface-cache/`. Repeating the command reuses unchanged photos and recomputes changed or new ones. A new output index includes only photos present in the current input folder. Changing the chosen weights or preprocessing invalidates the cache. Corrupt cached descriptors stop the run.

A single-run lock prevents overlapping index writers. After a crash, confirm the recorded process has stopped before removing `.face-index/{slug}/.sface-index.lock` and resuming. The final `faces.json` contains model ID, threshold, 128-dimensional descriptors, image/face counts, runtime, and execution-provider evidence. Local artifacts are biometric data; keep them ignored.

## Calibrate and check

The initial SFace cosine threshold is **0.5580291381871154**, selected using Angel's calibration photos. It is a starting point for future events, not a universal confidence percentage. Human's old 0.62 threshold and normalized library similarity scores do not transfer to SFace.

Use independently checked same-person and different-person examples, with separate calibration and validation photographs. `calibrateThreshold` in `scripts/face-index-core.mjs` can score training pairs; evaluate the chosen threshold on held-out pairs before publication. Report false matches and missed matches, including faces that the detector missed. Do not pick labels by descriptor similarity or use validation examples to tune the threshold.

Different detectors draw differently sized boxes and may duplicate one face. Check geometric correspondence visually when comparing model outputs; a strict one-to-one box rule can invent missing detections. Event burst frames are easier than a fresh selfie. A new event still needs representative checks even when the default model remains unchanged.

For Angel's exported-photo index, the existing 46-photo development labels retained 34/34 validation positives with 0/110 false matches at the chosen threshold. This repeats the earlier development set; it is not a fresh blind or phone-selfie benchmark. The GPU indexed all 517 photos in about 130 seconds, producing 1,971 detections across 505 photos. Detection counts alone are not evidence of accuracy.

The automated browser check verifies raw RGB channel order, alignment against OpenCV, same-input WASM/GPU descriptor agreement, and real event-photo queries. OpenCV and JavaScript interpolation can differ by one pixel level; use a documented numeric tolerance rather than requiring byte-identical descriptors. Browser detection at 640 pixels also gives different landmarks from event indexing at 1800 pixels. Check actual retrieval as well as tensor parity.

## Publish, verify, release

```powershell
npm run faces:publish -- --event event-slug --vector-index face-search-sface-int8-preview
npm run faces:publish -- --event event-slug
```

The default publisher chooses the index by the model and rejects mismatched dimensions. `--no-upload` prepares local NDJSON and the manifest without inserting vectors. A calibrated threshold can be supplied with `--threshold`; retain the evaluation evidence for that choice.

Wait for the final insert mutation in both indexes to become processed. Check `wrangler vectorize info <name> --json` and query both early and late face orders. The manifest includes model identity, a content-derived version, and IDs, not embeddings. Its versioned namespace leaves the previous deployed search available while insertion finishes. The range search keeps the strongest match per photo and has no fixed 50-photo cutoff.

Follow the authorized GitHub/preview/production sequence in AGENTS.md. Verify all 517 cards for Angel's gallery, model assets, a real browser-to-API search, and a query with more than 50 possible photographs. Reject stale versions and descriptors of the wrong dimension. Verify legacy galleries still select Human. Distinguish desktop browser checks from physical-phone checks.

Changing only the event index cannot switch live recognition: the manifest, browser model/preprocessing, API dimension validation, and Vectorize binding must ship together. Keep old vectors until the replacement is verified so rollback remains possible. The manifest retains old Human IDs separately from stale SFace IDs; `faces:delete` deletes each group from its proper production index.

## Legacy Human operations

For an existing Human gallery that intentionally remains on that model:

```powershell
node scripts/face-index-human.mjs --event legacy-event --photos "C:\event\exports"
npm run faces:publish -- --event legacy-event
```

The legacy indexer still accepts its original `--labels` option. The new default GPU indexer accepts `--threshold`; it does not accept the legacy calibration option. See [legacy gallery operations](event-galleries.md) for deletion and range-search compatibility.
