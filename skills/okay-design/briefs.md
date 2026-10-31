# Briefs and snippets

Prompts and code for the agents `okay-design` dispatches. Fill the `<...>` fields. Every agent starts with fresh context, so each brief carries everything the agent needs.

## Design context block

Paste this into every brief.

```
Design context
Purpose: <the one thing the UI lets someone do, success measure>
Audience: <who, device, situation>
Constraints: <brand, design system, framework, content, must-not-change, accessibility level>
Tone: <one line>
Assumed: <assumptions the user did not answer, or "none">
Project: <stack, dev command and URL, styling system, component library, token file>
Design skills available: <names found installed, or "none: follow CHECKLIST.md">
```

## Variant builder

Model sonnet, high. One agent per variant, spawned in the same message.

```
You build ONE throwaway UI variant. Speed over polish: no tests, no abstractions, no error handling beyond what makes it render. Read-only: stub any mutation.

<design context block>

Your direction: <variant letter and a one-paragraph direction: layout archetype, hierarchy and primary affordance, density, typographic voice, colour strategy>
The other variants take these directions, so do NOT build anything like them: <one line each>

Rules:
1. Write only inside <variants/<letter>/>. Do not touch other files. Export one entry: <component VariantX or file variant-x.html>.
2. Use the project's real data or a realistic stub, and its styling system. Use real-length copy, not lorem ipsum.
3. Structure must differ from the other variants: different layout, different hierarchy, different primary affordance. A palette swap is a failure.
4. If frontend-design / landing-page-design is installed, load it first and follow it; otherwise follow CHECKLIST.md sections 3 to 6.
5. It must work at 320 and 1440 without horizontal scroll.
6. Do not interview the user. Everything you need is above.

Return: the files you wrote, and one sentence on what makes this variant different.
```

## Switcher

Model haiku, medium. Runs after the three builders return.

```
Wire the three variants behind ONE switcher. Do not edit the variants' internals.

Variants: <paths>. Host: <the real route or page that renders them, else a throwaway route with "prototype" in its name>.

1. Keep the host's data loading. Only the rendered subtree changes per variant.
2. Read the variant from the `?variant=a|b|c` search param (default a). Update it with the project's router (replace, not push) so the URL is shareable and survives a reload.
3. Render a small fixed bar, bottom centre, high contrast, that does not look like the design under test: previous button, label ("B", plus the variant's name), next button. Wrap around.
4. Left and right arrow keys cycle too, except while an input, textarea or contenteditable is focused.
5. Render nothing in production builds (the project's equivalent of NODE_ENV === 'production').
6. Make the whole thing start from the project's usual one command; print the URL to open.
```

For a static HTML project with no router, use one `index.html` shell:

```html
<iframe id="v" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>
<div style="position:fixed;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:12px;align-items:center;padding:8px 14px;border-radius:999px;background:#111;color:#fff;font:14px system-ui;z-index:99">
  <button id="p" aria-label="Previous variant">&larr;</button><b id="l"></b><button id="n" aria-label="Next variant">&rarr;</button>
</div>
<script>
  const keys = ['a', 'b', 'c'], f = document.getElementById('v'), l = document.getElementById('l');
  const set = (k) => { k = keys.includes(k) ? k : 'a'; f.src = `variants/${k}/index.html`; l.textContent = k.toUpperCase(); history.replaceState(null, '', `?variant=${k}`); };
  const step = (d) => set(keys[(keys.indexOf(new URLSearchParams(location.search).get('variant') || 'a') + d + keys.length) % keys.length]);
  document.getElementById('p').onclick = () => step(-1); document.getElementById('n').onclick = () => step(1);
  addEventListener('keydown', (e) => { if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) || document.activeElement.isContentEditable) return; if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
  set(new URLSearchParams(location.search).get('variant'));
</script>
```

Screenshot a variant directly with `?variant=<k>`, or its own page, so the switcher bar is not in the image.

## Contact sheet

Side-by-side screenshots in one page. Write it next to the images, serve or open it, and screenshot it for the user.

```html
<!doctype html><meta charset="utf-8"><title>Variants</title>
<style>body{margin:16px;font:14px system-ui}.row{display:flex;gap:16px;align-items:flex-start;margin-bottom:24px}
figure{margin:0;flex:1;min-width:0}img{width:100%;border:1px solid #888}figcaption{margin-bottom:6px;font-weight:600}</style>
<!-- one .row per width (1440, 320) or per state; one figure per variant, or "before" and "after" for pairs -->
<div class="row">
  <figure><figcaption>A - 1440</figcaption><img src="variants/a-default-1440.png"></figure>
  <figure><figcaption>B - 1440</figcaption><img src="variants/b-default-1440.png"></figure>
  <figure><figcaption>C - 1440</figcaption><img src="variants/c-default-1440.png"></figure>
</div>
```

## Builder of the chosen design

Model sonnet, high (opus when the change crosses modules). A fresh agent, not a variant author.

```
Build the chosen design for production.

<design context block>

Chosen: <the user's pick or merge, in their words>
Reference: <path of the chosen variant; second path and what to take from it for a merge>. It is a throwaway sketch. Rewrite it; do not rename and keep it.

Rules:
1. Branch <branch>. No switcher, no other variants, no prototype code.
2. Reuse the project's components, tokens and utilities before adding new ones. Match its conventions.
3. Build every state that applies (default, hover, focus-visible, active, disabled, loading, empty, error, success, long content), not only the one the sketch showed. Make each state reachable so it can be screenshotted: a query flag, a fixture, or a story, following what the repo already does.
4. Work at 320, 768, 1024 and 1440 with no horizontal scroll.
5. Accessibility: semantic HTML, labels, names for icon buttons, keyboard operable with a visible focus ring, contrast 4.5:1, honour prefers-reduced-motion.
6. Run the repo's typecheck, lint and tests; add a test where the repo tests UI.
7. If typeset, arrange, adapt, polish or harden are installed, run them on the result.
8. One-line commit messages, no body, no trailer.

Return: files changed, the commands you ran with their results, and how to force each state.
```

## Critic

Model opus, high. A fresh agent, never the builder, never a variant author.

```
You critique and audit a finished UI. You report; you never fix.

You get: the design context, the before and after screenshots (paths below), the URL to run, the diff, and the repo standards files. You do NOT get the builder's explanation, and you must ignore any claim about what is good or accessible: check it yourself.

<design context block>
Before: <paths or "none (new surface)">
After: <paths: 320, 768, 1024, 1440 default, plus each state>
Run: <command and URL>
Diff: <git diff <base>>

Do both, in this order:
1. Critique (impeccable `critique` when installed, else CHECKLIST.md sections 2, 3, 4, 5, 6, 8, 11): hierarchy, information design, consistency, tone fit against the design context, generic-AI tells.
2. Audit (impeccable `audit` when installed, else CHECKLIST.md sections 7, 9, 10): states, widths, accessibility, theming, performance basics. Run a11y-probe.js at 320 and 1440, tab through the main flow, check contrast, and check 200% zoom.

Rules:
1. Report only findings you proved. Cite a screenshot file and region, a command and its output, or a measured value. Drop anything you cannot prove.
2. Tag each finding [R<round>-<n>] blocking|non-blocking, with severity P0 to P3 (P0 and P1 blocking), per CHECKLIST.md section 12.
3. Separate the two parts in your report: Critique, then Audit. Give a score from 0 to 4 for each of hierarchy, consistency, states, responsiveness, accessibility, with one line of evidence each.
4. If there is no blocking finding, your reply starts with APPROVED.
5. Do not suggest redesigns that change the chosen direction; judge the result against its own brief.
```

## Fixer

Model sonnet, high. A fresh agent, never the critic.

```
Fix these blocking findings and nothing else: <list with [R<round>-<n>], severity, proof>.

<design context block>
Branch: <branch>. Diff base: <base>.
Fix at the root cause, keep the chosen design, rerun the repo's typecheck, lint and tests, and return the files changed and the command output. Do not argue with a finding; if you believe it is wrong, say so with evidence and leave the code as it is.
```
