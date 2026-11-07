# dropdown-menu

November 7, 2026. Strategy: golden pair via shadcn CLI plus engine/manual replay of local customizations. Migrated to Base UI 1.9.0.

## Changed

- src/components/ui/dropdown-menu.tsx — Base UI Menu Root, Portal/Positioner/Popup; positioning props forwarded; GroupLabel, separate selection indicators, SubmenuRoot/Trigger and popup-open state; translucent styling and icons retained.

Source anchors: `src/components/ui/dropdown-menu.tsx:1` (primitive imports and component implementation). The stock `radix-rhea` and `base-rhea` registry payloads were inspected through `pnpm dlx shadcn@latest view`. Local styling was preserved rather than overwritten. The per-file source sweep is clean for `radix-ui`, `@radix-ui`, `--radix-`, `asChild` and `IconPlaceholder`.

## Left alone

Calendar/react-day-picker and Sonner remain untouched because they are not Radix wrappers. Existing Cnippet toggle components remain on Base UI. Unrelated gallery and research changes were preserved. No commits were made, per the user's explicit override of the skill's checkpoint workflow.

## Behavior changes

Checkbox/radio items remain open by default after activation in Base UI; closeOnClick is not forced. There are no current application consumers, so the browser fixture exercises the exported wrapper. GroupLabel requires Group.

## Verify by hand

Open the fixture menu by keyboard, use typeahead and arrow keys, toggle a checkbox, open a submenu and close each level with Escape; confirm trigger focus returns.

Focused wrapper typechecking passed. Shared automated and browser results, including unperformed manual checks, are recorded in [project.md](project.md).
