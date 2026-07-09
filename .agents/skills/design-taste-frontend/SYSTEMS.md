# Systems

Use an official design system only when it matches the product, brand, and existing codebase. Prefer its official package, documentation, tokens, and accessibility conventions. Do not combine two component systems to chase isolated visual effects.

If no system fits, use a small custom token layer and the project-native stack. Keep primitives few: page container, text styles, buttons, links, surface, input, and image treatment. Custom does not mean unstructured.

Before adding a dependency, check whether the existing project already supplies the component, icon, animation primitive, or image pipeline. Install dependencies before importing them and record the command in the implementation notes.
