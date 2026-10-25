# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

The website is the primary product. The native Android app is Ayoub's personal companion for uploading photos to website galleries; it is not a separate public-facing product. Give both platforms appropriate care while preserving their different audiences and workflows.

## Users

- People exploring Ayoub's identity, channels, contact details, and links.
- Prospective media clients reviewing curated work and deciding whether to get in touch.
- Event attendees and gallery recipients finding, viewing, and downloading photos, with submissions where enabled.
- Ayoub operating the gallery dashboard and Android upload companion.

These audiences overlap: a gallery visitor may explore Ayoub's other work or channels, and someone learning about Ayoub may later become a customer. Do not assume every visitor is a prospective client.

## Product Purpose

This is primarily Ayoub Abedrabbo's personal portfolio and home on the web: the single website he shares when people want to know who he is, what he does, or see his work. It brings together his portfolio, personal information, social channels, and event galleries so visitors can discover the rest of his work from whichever page brought them there.

Success means people can understand Ayoub and his work, view the photos they came for, and find his other activities and channels. Visitors may be customers or simply interested in him or an event. The personal hub, portfolio, and galleries all matter within this shared purpose; client conversion does not automatically outrank discovery or photo delivery.

## Operating Context

The website uses Astro with Cloudflare-backed gallery services. The Android companion uses native Kotlin and Compose for phone-based photo uploads, including camera-transfer folders. Preserve native Android interactions rather than copying website controls into the app.

Public browsing, gallery administration, and photographer uploads serve different roles. Preview and production use separate gallery resources and credentials. Operational procedures remain in [README.md](README.md), [android/README.md](android/README.md), and the linked feature guides.

## Capabilities and Constraints

- The homepage is a personal introduction and link hub with portfolio cards. Supporting pages include contact, about, payments, and event photography information.
- A portfolio piece is curated public work or a case study. A gallery is a photo collection for delivery, browsing, or submissions. Keep these concepts distinct unless Ayoub explicitly requests both.
- Galleries support viewing and downloads, with sharing, guest submissions, moderation, and selfie-based photo search where configured. Follow [gallery sharing rules](docs/gallery-sharing-links.md) for access behavior.
- Android uploads photos to the selected website gallery. Preserve upload progress, recovery, and duplicate handling. Watched-folder upload is not folder mirroring: local edits and deletions do not propagate to website photos.
- Preserve existing content, contact and payment destinations, and established URLs unless a task explicitly changes them. Use redirects for intentional public URL changes.
- Repository code, proposed designs, and installed releases can differ. Check release notes and implementation before making availability claims; physical-device verification is distinct from emulator checks.

## Brand Commitments

The public identity is Ayoub Abedrabbo. Existing website copy describes digital media work for Tampa businesses and communities, including video, photography, marketing, and education. AlphaBravoMedia and personal channels are part of the existing content.

Additional voice or identity commitments remain undecided. Init does not establish a new visual direction.

## Evidence on Hand

- [Site configuration](src/data/site.yaml): identity, social links, channels, contact and payment configuration.
- [Portfolio content](src/content/portfolio/): curated projects and case studies; local media lives under `src/assets/client-work/`.
- [Website content guide](docs/website-content.md): content boundaries and editing rules.
- [Android guide](android/README.md) and [release notes](android/RELEASE_NOTES.md): companion workflows and verification limits.
- [Domain vocabulary](CONTEXT.md): client need, proof project, starting price, custom quote, and watched-folder upload session.

Use real project content as evidence. Do not invent testimonials, customer claims, performance results, or pricing.

## Product Principles

1. Present one coherent personal portfolio where people can discover who Ayoub is and the breadth of his work.
2. Keep visitors' photo and content journeys distinct from Ayoub's operational tools.
3. Make delivery progress, failures, and recovery understandable without risking source photos.
4. Preserve product truth, access boundaries, and native platform behavior through design changes.
