# badge

November 7, 2026. Strategy: golden pair via shadcn CLI plus engine/manual replay of local customizations. Migrated to Base UI 1.9.0.

## Changed

- src/components/ui/badge.tsx — Slot replaced by Base UI useRender/mergeProps; wrapping, minimum height, max-width and text-link customizations retained.

Source anchors: `src/components/ui/badge.tsx:1` (primitive imports and component implementation). The stock `radix-rhea` and `base-rhea` registry payloads were inspected through `pnpm dlx shadcn@latest view`. Local styling was preserved rather than overwritten. The per-file source sweep is clean for `radix-ui`, `@radix-ui`, `--radix-`, `asChild` and `IconPlaceholder`.

## Left alone

Calendar/react-day-picker and Sonner remain untouched because they are not Radix wrappers. Existing Cnippet toggle components remain on Base UI. Unrelated gallery and research changes were preserved. No commits were made, per the user's explicit override of the skill's checkpoint workflow.

## Behavior changes

The polymorphic API uses render instead of asChild; no current consumer used asChild.

## Verify by hand

Check a long badge at 200% text in both themes and confirm the public gallery metadata wraps without clipping.

Focused wrapper typechecking passed. Shared automated and browser results, including unperformed manual checks, are recorded in [project.md](project.md).
