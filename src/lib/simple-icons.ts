import simpleIcons from '@iconify-json/simple-icons/icons.json'

/** SVG path markup for a `simple-icons:<name>` id, or an empty string. */
export const simpleIconBody = (name?: string) =>
  simpleIcons.icons[
    name?.replace('simple-icons:', '') as keyof typeof simpleIcons.icons
  ]?.body ?? ''
