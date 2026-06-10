# ISIS Explained

Interactive educational website about neutrons, muons, and the ISIS Neutron and Muon Source — for ISIS staff **without** a physics background (e.g. software engineers). Graphics-first, interactive-first.

## Architecture (hard rules)

- **Vanilla HTML/CSS/JS, no build step, no dependencies.** Must work opened via `file://` AND a static server.
- Therefore: **no `fetch()`, no ES modules.** Every JS file is a plain `<script defer>` IIFE exposing one global: `MEPlot` (canvas plotter), `MESynth` (all synthetic physics), `MEQuiz` (quiz engine), plus per-page scripts.
- All data is inline in JS; all diagrams are inline SVG in the HTML.
- `js/synth.js` is the **only** place physics math lives. `js/plot.js` is the **only** plotting code.
- CSS: `tokens.css` (design tokens only) → `base.css` (layout/nav/typography, cascade layers) → `components.css` (panels, quizzes, sliders, hotspots) → `story.css` (index scroll scenes only).
- Scroll-driven animations are gated behind `@supports ((animation-timeline: view()) and (animation-range: entry))` with an IntersectionObserver fallback in `js/story.js`. `prefers-reduced-motion` must always leave content readable.
- innerHTML is used only with static string literals — never with user or URL-derived input.

## Pages

`index.html` (scroll story) · `probes.html` (why neutrons/muons) · `facility.html` (how ISIS works) · `experiment.html` (experiment lifecycle) · `data.html` (TOF, events, reduction playground) · `techniques.html` (9 techniques).

## Accuracy

Facts must trace to isis.stfc.ac.uk pages or the Mantid repo docs (`../mantid/docs/source/`). Simplified models get a "simplified" footnote. Key constants live at the top of `js/synth.js`.

## Verify

Open each page via `file://` in Chrome — zero console errors, interactives respond. Also check Firefox (scroll-animation fallback path) and reduced-motion.
