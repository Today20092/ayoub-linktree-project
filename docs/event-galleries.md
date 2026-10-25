# Legacy event gallery workflow

Use this guide for existing local exports, R2 manifests, prebuilt ZIPs, pruning, and face-search indexes. Create new managed galleries through `/admin/galleries/` or the Android app. See the [project overview](../README.md) and [gallery infrastructure](interactive-event-galleries.md) for that workflow.

## One-time R2 setup

1. In the Cloudflare R2 dashboard, open `alphabravomedia-galleries`.
2. Connect the custom domain `photos.ayoubabed.xyz`.
3. Keep the bucket publicly readable and disable the `r2.dev` development URL
   after the custom domain is active.
4. Apply `cloudflare/r2-gallery-cors.json` under the bucket CORS settings.

After renewing Wrangler authentication, the same CORS policy can be applied
from the project root:

```powershell
npx wrangler login
npx wrangler r2 bucket cors set alphabravomedia-galleries --file cloudflare/r2-gallery-cors.json
```

## Export

Export public gallery JPEGs before uploading:

- 2400 pixels on the long edge
- sRGB
- progressive JPEG
- quality 82 to 85
- strip GPS and unnecessary EXIF metadata
- preserve the camera filename when practical

Example ImageMagick command:

```powershell
magick mogrify -path "C:\event\exports" -resize "2400x2400>" -colorspace sRGB -strip -interlace Plane -quality 84 "C:\event\edited\*.JPG"
```

## R2 object layout

```text
events/{event-slug}/
  images/
  downloads/
    {event-slug}.zip
```

Upload the `images` folder and ZIP with the existing interactive rclone helper:

```powershell
& "C:\Users\User\Documents\Upload To Google Drive Script\upload.ps1"
```

Use `copy`, choose the `r2:` remote, and upload into the matching event prefix.

## Generate portfolio metadata

Generate paste-ready YAML after the files are uploaded:

```powershell
npm run gallery:manifest -- "C:\event\exports" "https://photos.ayoubabed.xyz/events/event-slug/images/" --output "gallery.yml"
```

Optional flags:

```text
--featured "P1290931.jpg,P1290947.jpg"
--alt-prefix "Portrait from the Muslim Business Chamber networking event"
--output "gallery.yml"
```

Copy the generated `gallery:` block into a portfolio MDX file based on
`src/content/portfolio/EVENT_GALLERY_TEMPLATE.mdx.example`. Replace the
generated sequential alt text with specific descriptions before publishing.

## Verification

- Open at least one image directly through `photos.ayoubabed.xyz`.
- Verify an individual Download action saves a file instead of navigating away.
- Verify the Download All ZIP opens from the gallery page.
- Run `npm run verify` before deployment.

## Prune an uploaded gallery

Start with a clean Git worktree. Wrangler must be logged in, and the current
branch must be ready to push to `origin`.

Use filenames, current one-based photo positions, or position ranges:

```powershell
npm run gallery:prune -- muslim-business-chamber-2026 P1290863.jpg 12 20-24
```

Preview every action without changing local files, R2, or Git:

```powershell
npm run gallery:prune -- muslim-business-chamber-2026 12 20-24 --source "C:\event\exports" --dry-run
```

The first non-dry run saves the source folder in the ignored
`.gallery-prune.local.json` file. Pass `--source` again to replace it. Pass
`--yes` only in trusted automation; otherwise type the displayed confirmation.

The command validates the local folder against the MDX manifest, builds and
checks a replacement ZIP, moves rejected local files into a timestamped
`.pruned/<gallery-slug>/` folder, updates and verifies R2, runs project checks,
commits only the gallery MDX file, and pushes the current branch.

If failure happens before R2 changes, local changes roll back. If failure
happens during R2, local changes still roll back and the command prints the
exact rerun command; rerunning safely converges the ZIP and image objects.

## Face finder

New event indexes use quantized SFace and local GPU recognition. Follow the
[SFace gallery workflow](sface-gallery-workflow.md) for the default indexer,
assets, calibration, preview resources, migration, and release verification.
The commands below describe the retained **legacy Human model** workflow.

Face indexing runs locally. Cloudflare stores one anonymous vector for each
detected event face. An attendee’s selfie is analyzed in their browser, then
only its temporary numeric descriptor is sent to Vectorize. Neither the selfie
nor its search descriptor is retained.

Create the Vectorize index once:

```powershell
npx wrangler vectorize create face-search --dimensions=1024 --metric=cosine
npx wrangler vectorize create-metadata-index face-search --property-name faceOrder --type number
```

Wait for metadata-index creation to finish before publishing vectors. Check
`npx wrangler vectorize list-metadata-index face-search --json` for the numeric
`faceOrder` field and `npx wrangler vectorize info face-search --json` for the
creation mutation to be processed. `faces:publish` checks the metadata field
before uploading. Existing event vectors are unchanged until that event is
republished.

Index an exported event folder:

```powershell
node scripts/face-index-human.mjs --event muslim-business-chamber-2026 --photos "C:\event\exports"
```

The command writes `.face-index/{event-slug}/faces.json`. It does not group,
identify, name, crop, or require manual review of attendees.

For balanced threshold calibration, pass a JSON file containing labeled face
pairs:

```json
[
  { "leftId": "P1290863-1", "rightId": "P1290901-2", "samePerson": true },
  { "leftId": "P1290863-1", "rightId": "P1290908-1", "samePerson": false }
]
```

```powershell
node scripts/face-index-human.mjs --event muslim-business-chamber-2026 --photos "C:\event\exports" --labels "C:\event\face-pairs.json"
```

Publish every detected face:

```powershell
npm run faces:publish -- --event muslim-business-chamber-2026
```

Use `--no-upload` to prepare the manifest and NDJSON without changing
Vectorize. Commit and deploy the generated
`src/data/face-galleries/{event-slug}.json`; the previous versioned namespace
continues serving until the new deployment is live.

New manifests use `range-v1` search. Each face has an event-local numeric order.
Search queries at most 50 faces at once, then subdivides an order range when
all 50 returned faces exceed the event threshold. Up to four queries run at a
time. Results retain the strongest score for each photo and have no fixed
50-photo cutoff. This preserves Cloudflare's query limit without discarding
additional likely photographs. The underlying nearest-neighbor search remains
approximate.

Older manifests retain their existing single-query behavior. Republish their
existing local face index and deploy the new manifest to enable range search;
face detection does not need to run again. The new format changes the namespace,
so the old deployed version continues working while the new vectors finish
indexing. Wait for the final insertion mutation and test both early and late
face orders before deploying. Old vector IDs are retained for eventual event
deletion; republishing temporarily adds vectors instead of replacing the live
namespace.

For event-specific calibration, compare a training-selected threshold against
the unchanged default on held-out photographs before changing it. The default
can be retained when it performs better. [Angel's calibration report](face-search-calibration.md)
records this decision and the scope of its evaluation.

The attendee uploads or takes a selfie, selects their face if several are
detected, and receives matching gallery photographs ordered by strongest
similarity. Results are possible matches rather than confirmed identities.

Delete an event’s vectors and manifest:

```powershell
npm run faces:delete -- --event muslim-business-chamber-2026
```

`faceSearch` defaults to `false` in portfolio frontmatter. Enable it only for
events whose participants and organizer have approved face search. Retained
anonymous event vectors are biometric processing; confirm the model-weight
license and applicable consent requirements before commercial use.
