# checkbox

November 7, 2026. Strategy: golden pair via shadcn CLI plus engine/manual replay of local customizations. Migrated to Base UI 1.9.0.

## Changed

- src/components/ui/checkbox.tsx — Base UI Root/Indicator, existing check icon and color roles; disabled styles use data-disabled because the visible root is a span.

Source anchors: `src/components/ui/checkbox.tsx:1` (primitive imports and component implementation). The stock `radix-rhea` and `base-rhea` registry payloads were inspected through `pnpm dlx shadcn@latest view`. Local styling was preserved rather than overwritten. The per-file source sweep is clean for `radix-ui`, `@radix-ui`, `--radix-`, `asChild` and `IconPlaceholder`.

## Left alone

Calendar/react-day-picker and Sonner remain untouched because they are not Radix wrappers. Existing Cnippet toggle components remain on Base UI. Unrelated gallery and research changes were preserved. No commits were made, per the user's explicit override of the skill's checkpoint workflow.

## Behavior changes

The visible checkbox is a span with role="checkbox" plus a hidden native input. The id is on that input. AdminEventCreator already uses boolean values and needs no callback change.

## Verify by hand

Toggle the local creator checkbox by its visible label and Space; confirm checked, disabled and accessible-name behavior in the fixture.

Focused wrapper typechecking passed. Shared automated and browser results, including unperformed manual checks, are recorded in [project.md](project.md).
