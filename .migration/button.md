# button

November 7, 2026. Strategy: golden pair via shadcn CLI plus engine/manual replay of local customizations. Migrated to Base UI 1.9.0.

## Changed

- src/components/ui/button.tsx — real Base UI Button; existing variants, data-slot, sizes and visual tokens retained.
- src/components/EventLightbox.tsx, src/components/AdminGallery.tsx, src/pages/admin/galleries/[slug].astro, src/pages/galleries/[slug]/upload.astro, src/pages/galleries/[slug]/upload/[token].astro — former asChild links now native anchors styled with buttonVariants.

Source anchors: `src/components/ui/button.tsx:1` (primitive imports and component implementation). The stock `radix-rhea` and `base-rhea` registry payloads were inspected through `pnpm dlx shadcn@latest view`. Local styling was preserved rather than overwritten. The per-file source sweep is clean for `radix-ui`, `@radix-ui`, `--radix-`, `asChild` and `IconPlaceholder`.

## Left alone

Calendar/react-day-picker and Sonner remain untouched because they are not Radix wrappers. Existing Cnippet toggle components remain on Base UI. Unrelated gallery and research changes were preserved. No commits were made, per the user's explicit override of the skill's checkpoint workflow.

## Behavior changes

Commands now default to type="button". Existing form submitters explicitly use type="submit". Links retain native anchor semantics instead of Base UI button behavior.

## Verify by hand

Activate a command with Enter/Space, submit a form, and confirm button-styled links still open normally and support opening in a new tab.

Focused wrapper typechecking passed. Shared automated and browser results, including unperformed manual checks, are recorded in [project.md](project.md).
