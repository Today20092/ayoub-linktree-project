# dialog

November 7, 2026. Strategy: golden pair via shadcn CLI plus engine/manual replay of local customizations. Migrated to Base UI 1.9.0.

## Changed

- src/components/ui/dialog.tsx — Backdrop/Popup anatomy, Close render composition, local styles and public wrapper names retained; starting/ending transitions replace mount animations.
- src/components/EventLightbox.tsx — finalFocus returns the grid opener; viewer disables outside dismissal; preparation cancels close requests and blocks pointer dismissal until it finishes.

Source anchors: `src/components/ui/dialog.tsx:1` (primitive imports and component implementation). The stock `radix-rhea` and `base-rhea` registry payloads were inspected through `pnpm dlx shadcn@latest view`. Local styling was preserved rather than overwritten. The per-file source sweep is clean for `radix-ui`, `@radix-ui`, `--radix-`, `asChild` and `IconPlaceholder`.

## Left alone

Calendar/react-day-picker and Sonner remain untouched because they are not Radix wrappers. Existing Cnippet toggle components remain on Base UI. Unrelated gallery and research changes were preserved. No commits were made, per the user's explicit override of the skill's checkpoint workflow.

## Behavior changes

Base UI normally focuses the popup itself when opened by touch. Focus/dismissal configuration moved from popup event handlers to finalFocus and Root options/onOpenChange. Ordinary viewer Escape and close actions remain available.

## Verify by hand

Open a photo at 320px and desktop; use arrows, Tab and Escape; confirm focus returns to the opener. Test pending ZIP Escape/backdrop guards, failed preparation and viewer-to-preparation focus transfer.

Focused wrapper typechecking passed. Shared automated and browser results, including unperformed manual checks, are recorded in [project.md](project.md).
