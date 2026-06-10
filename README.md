# ISIS Explained

An interactive, graphics-first introduction to **neutrons, muons, and the [ISIS Neutron and Muon Source](https://www.isis.stfc.ac.uk/)** — written for people who work at ISIS but don't come from a physics background (software engineers, technicians, support staff, new starters).

No equations you can't skip. Lots of things to click, drag, and scrub.

**▶ Live site: https://janukahw.github.io/isis-intro/**

> ⚠️ Unofficial and simplified. Built as a learning aid; not an ISIS/STFC publication.

## Quick start

No build step, no dependencies. Either:

- **Open `index.html` directly** in a browser (works from `file://`), or
- serve the folder: `python -m http.server 8000` → http://localhost:8000

The site is deployed with **GitHub Pages** (deploy from branch: `main`, root) at https://janukahw.github.io/isis-intro/ — every push to `main` redeploys automatically in about a minute.

## The pages

| Page | What it covers | Headline interactive |
|---|---|---|
| `index.html` | The whole story: proton pulse → published paper, in 8 animated scenes | Looping time-of-flight race with logged arrival times |
| `probes.html` | Why neutrons & muons are the right probes — no physics assumed | Scale zoomer (coin → atoms), X-ray vs neutron view toggle |
| `facility.html` | How ISIS works: ion source, linac, synchrotron, targets, moderators | Clickable facility map, moderator spectrum picker |
| `experiment.html` | Life of an experiment: proposal → beamtime → data → paper | 7-phase lifecycle timeline (with who/which-software per phase) |
| `data.html` | From detector events to publishable curves | **Reduction Playground** — a mini-Mantid pipeline you drive yourself |
| `techniques.html` | Nine techniques: diffraction (powder & single crystal), SANS, reflectometry, spectroscopy, µSR, imaging, irradiation, total scattering — each mapped to the ISIS science group that owns it | Rotate-a-crystal detector view, fringe/field/lattice sliders |

Each page ends with a short self-check quiz.

## How it's built

Vanilla HTML/CSS/JS — deliberately boring tech so it runs anywhere, forever:

```
├── index.html …techniques.html   # six pages, inline SVG diagrams
├── css/
│   ├── tokens.css                # design tokens (dark "beamline control room" theme)
│   ├── base.css                  # reset, layout, nav, typography
│   ├── components.css            # panels, hotspots, quizzes, sliders, step cards
│   └── story.css                 # landing-page scroll scenes
└── js/                           # plain <script defer> IIFEs, one global each
    ├── plot.js                   # MEPlot — tiny canvas plotter (the only plotting code)
    ├── synth.js                  # MESynth — ALL synthetic physics in one file
    ├── quiz.js                   # MEQuiz — quiz engine
    ├── nav.js                    # header/footer + mobile menu
    └── story.js, data.js, …      # per-page wiring
```

Design constraints worth knowing before contributing:

- **Must work from `file://`** → no `fetch()`, no ES modules, no external data files. All data lives inline in JS; all diagrams are inline SVG.
- **Animations are plain time-based CSS keyframe loops** (plus IntersectionObserver-driven reveals) — identical in every browser, no scroll-scrubbing. `prefers-reduced-motion` always leaves a fully readable static page.
- **`js/synth.js` is the single source of physics truth** — constants and formulas live there and nowhere else, so an accuracy review touches one file.
- **Keyboard and screen-reader support is expected** — skip link, static (no-JS) header/footer, `role="img"` + labels on every canvas/SVG, `aria-live` on dynamic readouts, keyboard paths for canvas interactions. New interactives should keep that bar.
- Only external dependency: Google Fonts (degrades to system fonts offline).

## Accuracy

Numbers and claims trace to:

- [A Practical Guide to the ISIS Neutron and Muon Source](https://www.isis.stfc.ac.uk/wp-content/uploads/2025/12/A-Practical-Guide-to-the-ISIS-Neutron-and-Muon-Source.pdf) (PDF) — accelerator chain, targets, moderator suite, pulse rates
- [isis.stfc.ac.uk](https://www.isis.stfc.ac.uk/about/) — facility overview, [neutrons & muons](https://www.isis.stfc.ac.uk/about/neutrons-and-muons/), [techniques](https://www.isis.stfc.ac.uk/techniques/), [applying for beamtime](https://www.isis.stfc.ac.uk/using-isis/academics/how-to-apply/)
- [Mantid documentation](https://docs.mantidproject.org/nightly/) — workspaces, algorithms, event vs histogram data, reduction workflows

The interactive models (moderator spectra, powder patterns, reflectivity, muon asymmetry) are **schematic** — qualitatively right, simplified on purpose, and labeled as such in the UI.

## Verifying changes

Open every page via `file://` *and* a local server in Chrome — zero console errors expected. Check Firefox for the scroll-animation fallback path, and an OS reduced-motion setting for the static path. Layouts are tested down to 375 px wide (the nav collapses behind a MENU button below ~704 px).
