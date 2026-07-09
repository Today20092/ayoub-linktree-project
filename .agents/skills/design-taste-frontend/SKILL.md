---
name: design-taste-frontend
description: >
  Anti-slop frontend for landings, portfolios, redesigns.
  Use when user wants landing/marketing page, portfolio, brand redesign,
  Awwwards/Linear/Apple-adjacent UI, or audit of templated frontend output.
  Other skills: call when shipping public web marketing surfaces.
---

# Design Taste Frontend

Landing pages, portfolios, and redesigns only. Do not use for dashboards, dense product UI, or wizards.

Use the same process every run. The result may differ; the process does not.

## Process

### 1. Design Read

Infer page kind, audience, vibe, references, brand assets, and quiet constraints. State one line before code:

`Reading this as: <page kind> for <audience>, <vibe> language, leaning <system/family>.`

**Done when:** the Design Read matches the brief. If two readings are equally plausible, ask one clarifying question. Otherwise proceed.

### 2. Mode

- **Greenfield**: new page.
- **Redesign-preserve**: audit brand tokens, IA, and SEO first; evolve.
- **Redesign-overhaul**: refresh visual language; retain content and routes unless asked.

**Done when:** the mode is named. For redesign-preserve, audit notes cover tokens, IA, copy voice, and SEO baselines.

### 3. Three Dials

State `DESIGN_VARIANCE`, `MOTION_INTENSITY`, and `VISUAL_DENSITY` on a 1 to 10 scale. Use `8 / 6 / 4` unless the brief overrides it. Read [GLOSSARY.md](GLOSSARY.md) for the dial definitions.

**Done when:** all three numbers have a one-line reason.

### 4. Foundation

If the brief maps to an official system, read [SYSTEMS.md](SYSTEMS.md), install its official package, and use one system per project. Otherwise use the project-native stack and a minimal custom token layer. Install missing dependencies before importing them.

**Done when:** the stack is chosen and any missing dependencies have install commands.

### 5. Compose

Read [REFERENCE.md](REFERENCE.md) before composing. Apply the color, shape, and theme locks; the hero viewport law; sparse eyebrows; real imagery; and purposeful section-family variation. Use motion only when it has a job.

**Done when:** the page covers the conversion job and its layout reflects the declared dials.

### 6. Preflight

Run [PREFLIGHT.md](PREFLIGHT.md). Fix every failed applicable check before delivery.

**Done when:** every check passes, or is marked not applicable with a reason.

## Read only what applies

- Read [REDESIGN.md](REDESIGN.md) for any redesign.
- Read [MOTION.md](MOTION.md) when motion is included or the motion dial exceeds 3.
- Read [AI-TELLS.md](AI-TELLS.md) during an audit or when the result risks looking generated.
- Read [SYSTEMS.md](SYSTEMS.md) when selecting an established design system.
