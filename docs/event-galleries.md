# Event gallery workflow

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
