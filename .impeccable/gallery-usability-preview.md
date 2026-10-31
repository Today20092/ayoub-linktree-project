# Gallery usability preview

> Historical record from October 25, 2026, preserved October 31, 2026. Implementation status, checks, preview URLs, and running-server statements below describe that earlier session and require current validation.

All five requested improvements are implemented locally. The existing gallery toolbar still scrolls away, and the homepage contact exchange was not changed.

## Try it on your phone

- [Same Wi-Fi gallery preview](http://192.168.8.163:4331/galleries/angels-birthday-party-2026/)
- [Tailscale gallery preview](https://desktop-ayoub.cuttlefish-coho.ts.net:8458/galleries/angels-birthday-party-2026/)

The Tailscale link requires a connected device in the same tailnet. The local preview reads existing public gallery images and download responses; no production storage writes were enabled. The dev server and private Serve mapping remain running.

## What changed

1. **View favorites:** choose hearts, then use **View favorites (N)** beside the gallery controls. Only those photos appear, and previous/next viewer navigation stays within the favorites. **Show all photos** returns to the full gallery. Clearing the last favorite returns to all photos. Favorites and selfie-result views clear each other so hidden results do not silently intersect.
2. **Save photo:** a labelled button is directly visible in the viewer, beside favorite, share, and close controls. It saves the original gallery image through the existing download endpoint. The endpoint URL now uses the site's canonical trailing slash.
3. **Remember layout:** Grid/Masonry and photo density are stored separately for each gallery in the current browser. A narrow screen clamps the stored density to supported sizes. Browser storage failures do not prevent browsing or selecting favorites.
4. **Quiet download completion:** ZIP preparation retains its progress and retry dialog. Success closes the dialog and shows a short confirmation. An optional support link remains on the page; the automatic tipping form and amount buttons were removed.
5. **Smaller thumbnails:** the existing resizing endpoint now supplies distinct WebP candidates at 80, 160, 240, 480, and 960 pixels through native picture sources around Astro Image. Image-size controls update the browser's size hint. Original viewer and download URLs remain unchanged. Legacy remote images keep their established Astro path.

## Checks

- `npm run verify` passed: 109 tests, Astro checks, formatting, and build. Astro reported six existing hints and no errors.
- Cloudflare image-build verification passed without Sharp fallback. The existing image-service configuration was preserved.
- Source detector returned no findings; changed-source whitespace checks passed.
- Browser checks verified two favorites out of 517 photos, favorites-only viewer navigation, returning to all photos, and clearing favorites without an empty-view dead end.
- Masonry with five columns survived a reload, including its selected radio state. Favorites also survived the reload.
- The viewer exposes Save photo directly. Its endpoint returned HTTP 200 with attachment headers and the original 255,955-byte JPEG.
- A two-photo ZIP completed with a confirmation, no open dialog, no tipping form, and an optional support link.
- The matching 160 × 240 thumbnail returned a 3,306-byte WebP rather than the 255,955-byte JPEG. This is one measured image sample, not a full performance benchmark.
- The tested 320px layout had no horizontal overflow. The toolbar remained static.

Physical-phone gestures, screen readers, native mobile save destinations, and field performance remain unverified. No new changes were committed or deployed.
