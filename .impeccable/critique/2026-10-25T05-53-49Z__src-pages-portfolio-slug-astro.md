---
target: portfolio project pages
total_score: 24
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 0
target_identity: "file:C:\\Users\\User\\Documents\\ayoub-linktree-project\\src\\pages\\portfolio\\[slug].astro"
target_fingerprint: 'sha256:52c370fa416bc2bbd5be5a4bf80f5e4877f58db7889d8d81e0a93288da5c7d99'
target_path: "C:\\Users\\User\\Documents\\ayoub-linktree-project\\src\\pages\\portfolio\\[slug].astro"
timestamp: 2026-10-25T05-53-49Z
slug: src-pages-portfolio-slug-astro
---

Method: dual-agent (A: /root/project_critique_design · B: /root/project_critique_evidence)

# Portfolio project-page critique

Target: `src/pages/portfolio/[slug].astro`. Representative pages: Ya Hala with Haithum, Al Forno menu photography, and Chop Shop Show Podcast. Reviewed October 25, 2026 against the personal-portfolio purpose in PRODUCT.md. No project-page changes were made.

## Design specificity and overall impression

The real photographs, named collaborators, precise responsibilities, and candid production stories make the content recognizably Ayoub's. The presentation is less tailored: the shared hero → prose → Work → Details → Outcomes sequence gives very different projects the same editorial emphasis.

The strongest next step is to introduce Ayoub's contribution briefly, then bring the most relevant evidence forward. Photography should be easy to experience; technical production stories should remain available without becoming an obstacle to the work.

## Design health

| #   | Heuristic                       | Score     | Evidence                                                                                        |
| --- | ------------------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| 1   | Visibility of system status     | 3/4       | Breadcrumbs and explicit Play actions; no loading feedback before iframe arrival in source.     |
| 2   | Match with the real world       | 3/4       | Clear titles and roles; lengthy technical language assumes familiarity.                         |
| 3   | User control and freedom        | 3/4       | Breadcrumbs, previous/next projects, and direct YouTube links offer exits.                      |
| 4   | Consistency and standards       | 3/4       | Cohesive typography and navigation; generic video framing mismatches behind-the-scenes content. |
| 5   | Error prevention                | 3/4       | Explicit media activation and named destinations; new-tab indication varies.                    |
| 6   | Recognition rather than recall  | 3/4       | Visible headings help; long narratives require remembering where proof and sections lie.        |
| 7   | Flexibility and efficiency      | n/a       | Expert accelerators are unnecessary for portfolio discovery.                                    |
| 8   | Aesthetic and minimalist design | 3/4       | Strong media and restrained framing; repetition weakens focus.                                  |
| 9   | Error recovery                  | 3/4       | Direct YouTube fallback; playback failure was not induced.                                      |
| 10  | Help and documentation          | n/a       | Clear content and navigation matter more than separate documentation here.                      |
|     | **Total**                       | **24/32** | **Good foundation; editorial ordering is the main opportunity.**                                |

Scores are qualitative design judgments, not measured visitor outcomes or an accessibility certification.

## What works

- The actual work supplies identity. Al Forno's food photography is particularly effective against the quiet page framing.
- Attribution is candid. Ya Hala distinguishes Ayoub's technical finishing from editing performed by others. Chop Shop distinguishes channel-wide figures and reporting windows.
- Mobile headings, wrapping, results tables, and collapsed equipment detail support reading. Adjacent-project links encourage further discovery.

## Priority issues

### P2 — Explain authorship before the large media hero

On Ya Hala desktop, the episode thumbnail dominates the first viewport and the title and contribution summary follow below. A direct visitor first sees a client's episode cover, then must scroll to understand Ayoub's role.

Place a compact project title and contribution line before the hero. Keep the media generous and preserve existing attribution. Location: shared template around lines 210 and 248. Suggested command: `$impeccable layout portfolio project pages`.

### P2 — Bring selected photographs forward on photography projects

Al Forno's fourteen-image series follows Overview, location/map, Work, Details, a behind-the-scenes video, and Outcomes. One photograph leads, but the rest of the work is separated from it by a substantial informational detour.

Put selected photographs directly after a compact introduction, then provide process, location, and equipment. Location: shared template around lines 264, 273, 418, and 596; Al Forno MDX around line 42. Suggested command: `$impeccable layout portfolio photography pages`.

### P2 — Offer a short path through long case studies

Chop Shop includes extensive narrative, two metric tables, seven Outcomes items, and repeated descriptions of services. The details are useful, but concise proof is harder to scan.

Provide a short contribution/deliverables/results introduction and in-page links to Work, Results, and Process. Remove duplicate descriptions while retaining reporting caveats next to figures. Do not present channel-wide views as growth attributable to Ayoub. Location: Chop Shop MDX around lines 14, 32, and 53–181; shared template around lines 264, 280, and 529. Suggested commands: `$impeccable distill` and `$impeccable clarify` scoped to long case studies.

### P2 — Match video framing to the artifact

Al Forno identifies its clip as behind the scenes, but shared copy says, “Watch the finished production directly from the client project.” This contradicts the artifact's purpose.

Use the existing video label for the introduction or remove the generic claim. Location: shared template around lines 424–434; Al Forno MDX around lines 36–41. Suggested command: `$impeccable clarify portfolio video introductions`.

### P3 — Give honest viewing cues for the Ya Hala comparison

The two episodes illustrate changes in camera, color, lighting, and sound, but are different productions. Viewers must inspect full episodes and remember differences without specific cues.

Add truthful viewing notes or timestamps and state the comparison's limits. Do not imply a controlled same-scene comparison. Location: shared template around lines 348–410; Ya Hala MDX around lines 49–61. Suggested command: `$impeccable clarify Ya Hala comparison`.

## Cognitive load and emotional journey

The opening media creates an immediate peak; technical candor builds trust. Long prose can become a valley before additional photographs or results appear. Technical terminology, repeated service descriptions, and remembering where proof sits are the main cognitive demands. Lists with more than four descriptive items are not automatically excessive choices; repetition is the concern here.

- First-time explorers may ask what Ayoub did before the page answers it.
- Distracted mobile visitors must scroll through process before reaching selected photographs or concise project proof.
- Semantic headings and image descriptions help assistive-technology users, but full screen-reader and keyboard testing was not performed for this critique.

## Deterministic and browser evidence

The source detector reported **zero findings** across the shared template, YouTubeEmbed, PortfolioLocation, MotionPreview, UpcomingVideo, and the three representative MDX files. There were no source false positives.

Browser injection executed on all three desktop pages. It reported unclassified summary counts of 7 for Ya Hala, 5 for Al Forno, and 15 for Chop Shop. The bounded pass did not expose rule identities or affected selectors; these counts are not confirmed defects and do not contribute to the priority list or score. No user-visible overlay remains open.

Design inspection included Ya Hala desktop, Al Forno at 390 × 844, and the Chop Shop mobile results section. It does not establish every portfolio variant's behavior. Playback failure, slow networks, complete keyboard navigation, screen readers, and measured portfolio contrast remain untested.

## Decisions before implementation

1. Should project pages lead with selected work, or offer equally clear routes to selected work and the production story?
2. Should the next pass address only the misleading video sentence, or also reorder the representative project types?
