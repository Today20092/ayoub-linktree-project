# Homepage and portfolio suggestions

> Historical review backlog from October 25, 2026, preserved October 31, 2026. Recommendations, preview URLs, and operational statements below describe that earlier session and require current validation.

These are the remaining recommendations from the October 25, 2026 reviews. They have not been applied. Keep the homepage contact exchange prominent.

## Homepage

1. **Fix light-theme keyboard focus contrast first.** The green focus ring measured 2.47:1 against white; the authored indicator needs at least 3:1. Darken the light-theme ring token and check buttons that apply ring opacity. This is the audit's P1 accessibility finding.
2. **Enlarge the shared footer's touch targets.** About, Contact, Event photography, and Privacy are only 16px high. Add vertical padding while preserving the restrained appearance. This is a P2 usability improvement, not a confirmed WCAG target-spacing failure.

## Portfolio project pages

3. **Explain your contribution before the large media hero.** Put a compact project title and role summary above the image/video, so a direct visitor knows what you did before pressing Play.
4. **Bring selected photography forward.** On photography pieces such as Al Forno, show the selected photographs shortly after the introduction; follow them with process, location, equipment, and behind-the-scenes detail.
5. **Provide a shorter path through long case studies.** Give pieces such as Chop Shop a concise contribution/deliverables/results summary and links to Work, Results, and Process. Trim repeated service descriptions while preserving attribution and reporting caveats.
6. **Correct generic video wording.** Al Forno's behind-the-scenes clip should not be described as the finished client production. Use the actual video label or remove the generic sentence.
7. **Make the Ya Hala comparison easier to judge.** Add truthful viewing notes or timestamps for camera, lighting, color, and sound differences. Explain that these are different productions rather than a controlled same-scene comparison.

Items 3–6 are P2 recommendations. Item 7 is P3. They are editorial refinements, not a request to redesign the site or turn every page into a sales funnel.

## Full evidence

- [Homepage technical audit](audit/homepage-2026-10-25.md): 16/20, including measurements and testing limits.
- [Portfolio project-page critique](critique/2026-10-25T05-53-49Z__src-pages-portfolio-slug-astro.md): 24/32, with representative-page evidence and source locations.

## Current development preview

- Same Wi-Fi: [Homepage](http://192.168.8.163:4331/), [Gallery](http://192.168.8.163:4331/galleries/angels-birthday-party-2026/), [About portrait](http://192.168.8.163:4331/about/).
- With Tailscale connected: [Homepage](https://desktop-ayoub.cuttlefish-coho.ts.net:8458/), [Gallery](https://desktop-ayoub.cuttlefish-coho.ts.net:8458/galleries/angels-birthday-party-2026/), [About portrait](https://desktop-ayoub.cuttlefish-coho.ts.net:8458/about/).

The gallery layout/size toolbar now scrolls with the page. Only the shared navigation remains sticky. Grid/Masonry and photo sizing were checked in the synthetic phone viewport. Existing public photo reads are proxied for this local preview because local storage has none of those photos; other application routes and storage remain local. The temporary configuration is `.astro/phone-preview.config.mjs`, which is ignored by Git.

The dev server is intentionally left running. Its stop command is `pnpm exec astro dev stop`. The new tailnet-only proxy can be disabled with `tailscale serve --https=8458 off`. Existing Tailscale mappings were preserved.

Verification passed. No new changes were committed or deployed to production. Physical-phone execution remains unverified; the links were checked from this computer.
