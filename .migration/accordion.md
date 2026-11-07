# accordion

November 7, 2026. Strategy: golden pair via shadcn CLI plus engine/manual replay of local customizations. Migrated to Base UI 1.9.0.

## Changed

- src/components/ui/accordion.tsx — Base UI Root/Item/Header/Trigger/Panel; panel height transitions use --accordion-panel-height and starting/ending styles; disabled styles use data-disabled.
- src/components/ServicesFaq.tsx — removed Radix single/collapsible props; Base UI single, collapsible defaults retained.

Source anchors: `src/components/ui/accordion.tsx:1` (primitive imports and component implementation). The stock `radix-rhea` and `base-rhea` registry payloads were inspected through `pnpm dlx shadcn@latest view`. Local styling was preserved rather than overwritten. The per-file source sweep is clean for `radix-ui`, `@radix-ui`, `--radix-`, `asChild` and `IconPlaceholder`.

## Left alone

Calendar/react-day-picker and Sonner remain untouched because they are not Radix wrappers. Existing Cnippet toggle components remain on Base UI. Unrelated gallery and research changes were preserved. No commits were made, per the user's explicit override of the skill's checkpoint workflow.

## Behavior changes

Controlled/default values use arrays in Base UI. Arrow-key roving focus is not provided by the installed Base UI accordion; Tab and Enter/Space remain the interaction model.

## Verify by hand

In the browser fixture, expand each answer, confirm single-item expansion and collapse, and verify the disabled trigger stays disabled and dimmed.

Focused wrapper typechecking passed. Shared automated and browser results, including unperformed manual checks, are recorded in [project.md](project.md).
