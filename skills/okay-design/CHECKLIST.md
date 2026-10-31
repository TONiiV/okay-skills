# Fallback design checklist

Used when frontend-design, impeccable or landing-page-design is not installed, and by the critic as the scoring base. A project's own design system overrides every number here. Where a number conflicts with the project's tokens, use the tokens.

## 1. Intake

- Purpose: the one primary action and what counts as success.
- Audience: who, on which device, in what situation, with what prior knowledge.
- Constraints: brand, existing system, framework, content on hand, must-not-change, accessibility level.
- Tone in one line.
- Unanswered: state the assumption in one line and move on. Never stall on intake.

## 2. Direction (for variants)

Make each variant take a different position on at least two of: layout archetype, hierarchy and primary affordance, density, typographic voice, colour strategy. If two variants fit the same one-sentence description, they are one variant.

## 3. Type scale

- Pick one ratio between 1.2 and 1.333 and derive every size from it: at most six sizes on a screen.
- Body text is 16px or more. Line height about 1.5 for body, 1.1 to 1.25 for headings.
- Line length 45 to 75 characters for running text.
- At most two families and three weights. Use fluid `clamp()` only for display sizes.
- A default stack with no typographic intent is a smell. Choose type for the tone, and check it covers the languages the product uses.

## 4. Spacing

- One base unit (4px or 8px) and a short token list, for example 4, 8, 12, 16, 24, 32, 48, 64, 96. No one-off values.
- Space inside a group is smaller than space between groups. Repeat the same gap for the same relationship.
- Page gutter at least 16px at 320. Constrain the content width at large screens.

## 5. Radius, borders, elevation

- One or two radius values for the whole product, applied by component type.
- A nested shape's radius is the outer radius minus the gap between them, never below 0.
- Borders go all the way round or not at all. Use elevation sparingly and consistently.

## 6. Colour

- Tinted neutrals, one accent, and semantic colours for success, warning and error.
- Contrast: 4.5:1 for body text, 3:1 for large text and for the edges of controls and focus rings.
- Never carry meaning by colour alone. Check dark mode when the product has one.

## 7. States

Design every one that applies, and know how to force each one for a screenshot:

default, hover, focus-visible, active, disabled, loading, empty, error, success, first run, long content, many items, no permission, offline.

Focus is always visible, never removed without a replacement. Loading shows structure, not just a spinner. Errors say what happened and what to do.

## 8. Motion

- Use motion for feedback and orientation, not decoration.
- 150 to 250ms for UI feedback, ease-out; animate `transform` and `opacity`, not layout properties.
- One orchestrated entrance at most per screen. No looping ornament.
- Honour `prefers-reduced-motion`: replace movement with a fade or nothing.

## 9. Widths

Check the default state at 320, 768, 1024 and 1440.

| Width | Look for |
|---|---|
| 320 | No horizontal scroll, 16px gutters, single column, targets at least 44px high for touch, no clipped text, long words wrap |
| 768 | The tablet layout is designed, not a stretched phone or a squeezed desktop; navigation still works |
| 1024 | Columns settle; sidebars do not crush content |
| 1440 | Content width is capped, line length stays readable, empty space looks intended |

Test with long strings, a missing image and zero items, not only happy-path copy.

## 10. Accessibility basics

- Semantic structure: landmarks (`header`, `nav`, `main`, `footer`), one `h1`, headings in order, real `button` and `a` elements.
- Every input has a label; every icon-only control has an accessible name; images have `alt` (empty when decorative).
- Everything reachable and operable by keyboard, in a logical order, with a visible focus ring. No keyboard traps.
- Targets at least 24 CSS pixels (WCAG 2.2 minimum) and about 44 for touch.
- The page works at 200% zoom and does not block pinch zoom.
- Set `lang`. Announce dynamic errors and status changes.
- Run [a11y-probe.js](a11y-probe.js) and fix what it reports, then do the keyboard pass by hand.

## 11. Generic-AI tells

Check and avoid, unless the brief asks for them: a purple or blue gradient on white, three identical feature cards each topped by a rounded icon, gradient text on headings, glassmorphism everywhere, a hero with one big number and a row of stat tiles, emoji used as icons, stock-looking centred hero with two buttons, every section the same height and rhythm.

## 12. Severity scale for critique and audit

| Level | Meaning | Blocking |
|---|---|---|
| P0 | Broken or unusable: content unreachable by keyboard, text unreadable, layout broken or scrolling sideways at a required width, a state that traps the user | Yes |
| P1 | Major: fails a requirement in the checklist or the brief, contrast below 4.5:1 on body text, primary action unclear, a missing required state | Yes |
| P2 | Minor: inconsistent spacing or radius, weak hierarchy, awkward wrap, off-scale type | No |
| P3 | Polish: small alignment, copy, or motion refinements | No |

Every finding cites proof: a screenshot file and region, a command and its output, or a measured value.
