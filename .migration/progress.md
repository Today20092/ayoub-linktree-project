# progress

November 7, 2026. Strategy: golden pair via shadcn CLI plus engine/manual replay of local customizations. Migrated to Base UI 1.9.0.

## Changed

- src/components/ui/progress.tsx — Base UI Root receives value and contains Track/Indicator; removed manual translateX and flex sizing.
- src/components/GuestUpload.tsx — added Photo upload progress accessible label.

Source anchors: `src/components/ui/progress.tsx:1` (primitive imports and component implementation). The stock `radix-rhea` and `base-rhea` registry payloads were inspected through `pnpm dlx shadcn@latest view`. Local styling was preserved rather than overwritten. The per-file source sweep is clean for `radix-ui`, `@radix-ui`, `--radix-`, `asChild` and `IconPlaceholder`.

## Left alone

Calendar/react-day-picker and Sonner remain untouched because they are not Radix wrappers. Existing Cnippet toggle components remain on Base UI. Unrelated gallery and research changes were preserved. No commits were made, per the user's explicit override of the skill's checkpoint workflow.

## Behavior changes

Progress now exposes the supplied numeric value through aria-valuenow and computes indicator width through Base UI. value={null} exposes indeterminate progress. The previous wrapper discarded value before passing props to Radix Root.

## Verify by hand

Inspect progress at 0, 37 and 100%; check the accessible value, fill width, and indeterminate state. Test ZIP preparation and upload status.

Focused wrapper typechecking passed. Shared automated and browser results, including unperformed manual checks, are recorded in [project.md](project.md).
