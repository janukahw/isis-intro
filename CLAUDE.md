# ISIS Explained

Interactive educational website about neutrons, muons, and the ISIS Neutron and Muon Source — for ISIS staff **without** a physics background (e.g. software engineers). Graphics-first, interactive-first, plain-language: every physics term gets an inline gloss the first time it appears on a page.

**Status:** live at https://janukahw.github.io/isis-intro/ (GitHub Pages). All seven pages built, fact-checked, and responsive-tested. See README.md for the public-facing overview.

## Commands

- **Run:** open `index.html` directly (`file://` works by design) or `python -m http.server 8000`. No build step, no install.
- **Deploy:** push to `main` on https://github.com/janukahw/isis-intro — GitHub Pages (deploy-from-branch, root) redeploys automatically in ~1 minute. The site lives at the `/isis-intro/` subpath, so all URLs must stay relative.
- **Lint/test:** none configured. `node --check js/*.js` for syntax; manual verification per the checklist below.

## Architecture (hard rules)

- **Vanilla HTML/CSS/JS, no build step, no dependencies** (only external: Google Fonts, which degrades to system fonts offline). Must work via `file://` AND a static server.
- Therefore **no `fetch()`, no ES modules.** Every JS file is a plain `<script defer>` IIFE exposing one global: `MEPlot` (canvas plotter), `MESynth` (all synthetic physics), `MEQuiz` (quiz engine), plus per-page scripts.
- All data is inline in JS; all diagrams are inline SVG in the HTML.
- `js/synth.js` is the **only** place physics math lives. `js/plot.js` is the **only** plotting code. Don't add a second abstraction for either.
- CSS load order: `tokens.css` (design tokens only) → `base.css` (reset/layout/nav/typography, cascade layers) → `components.css` (panels, quizzes, sliders, hotspots, step cards) → `story.css` (index scroll scenes only).
- Pages: `index.html` (animated story) · `probes.html` (why neutrons/muons) · `facility.html` (how ISIS works) · `experiment.html` (experiment lifecycle) · `data.html` (TOF, events, reduction playground) · `techniques.html` (9 techniques) · `how.html` (meta: how the site was built — footer-linked only, served as `/how` on Pages). Each topic page ends with a quiz and cross-link cards.

## Conventions

- **Progressive enhancement:** every page ships a static header/footer in its HTML; `js/nav.js` only fills in whichever is missing, then adds the mobile MENU toggle (nav collapses below ~44rem, only when JS runs via `body.has-navjs`).
- **Motion:** time-based loops (CSS keyframes; Web Animations API in `js/story.js` where the actors are JS-generated, e.g. scene 6's event stream) plus IntersectionObserver-driven reveals — no scroll-scrubbed animations. `prefers-reduced-motion` must always leave a fully readable static page.
- **Accessibility bar for new work:** skip link, `role="img"` + `aria-label` on every SVG/canvas, `aria-live` on dynamic info panels, keyboard paths for all hotspot/canvas interactions (tabindex + Enter/Space), tap targets ≥44px.
- **Security:** `innerHTML` only with static string literals — never user or URL-derived input.
- **Voice:** software/data analogies (events ≈ log lines, reduction ≈ ETL, history ≈ audit log); ≤2 sentences per story scene; mono-font stat callouts with units.

## Design direction

Bold, distinctive visual design (the `frontend-design` skill's direction) is **welcome and encouraged** here — an intentional aesthetic point of view, characterful typography, atmospheric backgrounds/texture, and high-impact motion — within these boundaries:

- **Vanilla HTML/CSS/JS only.** No animation or UI libraries (no Motion, GSAP, etc.), no new dependencies, no build step. Prefer CSS-only effects; JS-driven effects follow the existing per-page IIFE pattern.
- **Fonts via Google Fonts only** (the one allowed external), always with a system-font fallback stack so the site stays readable offline.
- **Express the aesthetic through `tokens.css`** (colors, type, spacing as tokens), not scattered one-off values.
- The **Motion and Accessibility rules above always win**: `prefers-reduced-motion` leaves a fully readable static page, and effects must not break keyboard paths, contrast, tap targets, `file://`, or the responsive widths in the checklist.

## Accuracy

Facts must trace to isis.stfc.ac.uk (especially the "Practical Guide to ISIS" PDF) or the Mantid repo docs (`../mantid/docs/source/`) — links in README.md. Interactive models are intentionally schematic and must carry a "simplified" footnote. Physics constants live at the top of `js/synth.js` with their meaning documented; change them only against a cited source.

## Verification checklist

1. Every page via `file://` **and** a local server in Chrome — zero console errors, interactives respond.
2. Playground end-to-end: Load → ConvertUnits (peaks align) → Rebin → Normalize → Fit near 3.14 Å reports the centre within ±0.01 Å; Reset restores; steps can't run out of order.
3. Firefox for animation parity (loops are plain CSS keyframes); OS reduced-motion for the static path.
4. Responsive: no horizontal overflow at 375 / 768 / 1024 / 1366 / 1920 px; nav collapses behind MENU on narrow widths.
5. After pushing: spot-check https://janukahw.github.io/isis-intro/ (subpath-relative links, console clean).
