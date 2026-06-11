# BE THE BEAM — build notes

*Development log for `bethebeam.html`, built 2026-06-10. Companion to the rules in `CLAUDE.md`; the public-facing description belongs in README.md / how.html if ever needed.*

**What it is:** a first-person WebGL ride through ISIS. You are one particle — born as an H⁻ ion in the source, stripped to a proton, accelerated to 84% of light speed, smashed into tungsten, reborn as a neutron, moderated, flown down a beamline, and finally recorded as a single timestamped detector event. One continuous ~2.5-minute flight, no stops: chapters dissolve into each other and facts pass by as HUD captions. The in-page storyboard is the canonical reading layer (and the entire experience for no-JS / no-WebGL / reduced-motion visitors).

---

## 1. The journey: facts and figures the ride is built on

All figures trace to isis.stfc.ac.uk (esp. the *Practical Guide to ISIS*) or were cross-checked against the already fact-checked pages (`js/ts1.js`, `js/facility.js`). Stops below = chapters in `js/bethebeam-scenes.js` = `sb-1`…`sb-11` in the storyboard.

| # | Stop | Key figures used |
|---|------|------------------|
| 1 | Ion source | Penning H⁻ surface-plasma source, caesiated hydrogen; **35 kV** extraction; 50 Hz operation |
| 2 | RFQ | **665 keV** output; bunches the beam at **202.5 MHz** |
| 3 | Linac | **4** DTL tanks; **70 MeV** output ≈ **37% c**; drift tubes lengthen with speed (L ≈ βλ — modeled in the geometry) |
| 4 | Stripping foil | **0.3 µm** aluminium-oxide foil strips both electrons (H⁻ → p⁺); charge-exchange injection allows painting into an occupied ring, **~130 turns** over **~200 µs** |
| 5 | Synchrotron | **163 m** circumference; **10** dipoles; **70 → 800 MeV** in **~10 ms** ≈ **~10,000 laps**; revolution period **1.47 → 0.65 µs/lap**; **2** bunches; **2.5×10¹³ protons/pulse**; exit at **84% c** |
| 6 | Extraction / EPB1 | Kickers fire in **<100 ns** (between bunches), single-turn extraction; EPB1 is **150 m** with **68 magnets**; **4 of 5** pulses → TS1 (40/s), the fifth → TS2 (10/s) |
| 7 | Muon target | **10 mm** graphite wafer in-beam; **<5%** of protons interact; pions decay to muons in ~tens of ns (animated as orange→violet sparks) |
| 8 | Tungsten target | Tantalum-clad tungsten plates; **~20 neutrons evaporated per proton**; **~5×10¹⁴ neutrons per pulse**; evaporation neutrons ~**2 MeV** ≈ **6.5% c** (~20,000 km/s) |
| 9 | Moderator | Water at **300 K**; thermalizes to **2.2 km/s** ≈ **λ 1.80 Å**; dwell modeled as **~34 µs** ("tens of µs" per the TS1 page) |
| 10 | Beamline | **18** beam ports at TS1; generic guide ~**20 m** to the instrument; TOF teaching beat: arrival time *is* wavelength |
| 11 | Detection | Bragg scatter off a 3×3×3 schematic lattice; ³He tube bank; end screen prints `EVENT det=4823 tof=9765 µs λ=1.80 Å status=COUNTED` |

### Physics math (single source: `js/synth.js`)

- Relativistic speed from kinetic energy: γ = 1 + T/m, **β = √(1 − 1/γ²)** — exact at all energies, used live by the HUD
- Rest masses (CODATA): **m_p = 938.272 MeV**, **m_n = 939.565 MeV**; **c = 299,792.458 km/s**
- Neutron speed×wavelength constant **VL = 3956 m·Å/s** → 2.2 km/s ↔ 1.80 Å; TOF constant **252.78 µs/(m·Å)**
- HUD speed checkpoints this produces: 35 keV → **0.86% c** (2,590 km/s) · 665 keV → **3.8% c** · 70 MeV → **36.6% c** · 800 MeV → **84.2% c** · thermal → **2.2 km/s**
- The LAP counter integrates the linearly-shrinking revolution period (1.47→0.65 µs/lap) against the CLOCK, landing within ~1% of 10,000 — so the two readouts can never contradict each other
- End-screen TOF: detection (20,000 µs) − moderation complete (10,235 µs) = **9,765 µs**, which at 1.80 Å implies a **21.5 m** flight path — consistent with the ride's own beamline

### The ride clock (real elapsed time, µs)

| Stop | from → to |
|---|---|
| 1 ion source | 0 → 0.2 |
| 2 RFQ | 0.2 → 0.6 |
| 3 linac | 0.6 → 1.3 |
| 4 injection painting | 1.3 → 200 |
| 5 synchrotron | 200 → 10,200 |
| 6 extraction + EPB1 | 10,200 → 10,200.45 |
| 7 muon target | 10,200.45 → 10,200.55 |
| 8 tungsten impact | 10,200.55 → 10,200.6 |
| 9 moderation | 10,200.6 → 10,235 |
| 10 beamline (~20 m at 2.2 km/s) | 10,235 → 19,400 |
| 11 sample → detector | 19,400 → 20,000 |

**Door to detector ≈ 20 ms** (the hero stat). Chapter boundaries chain exactly so the CLOCK readout never jumps across a dissolve. Playback dilation varies per stage, up to **~×10⁸** (stops 7–8 show 0.1 µs over ~12 s) — stated in the page footnote.

### Declared simplifications (footnoted on the page)

- Geometry is schematic, neon-blueprint style; not to scale
- The synchrotron flythrough shows ~2 laps of ~10,000 (the minimap dot orbits 3×)
- A single-particle fiction stands in for ~2.5×10¹³ companions (shown as the glowing bunch around the camera)
- The instrument is a generic diffractometer, not a real beamline
- One flagged liberty: a real proton's POV ends at the tungsten — the ride hands you to a neutron so you can finish the journey the beam actually makes

---

## 2. Architecture

**Files:** `bethebeam.html` (landing + ride overlay + storyboard) · `css/bethebeam.css` · `js/bethebeam.js` (engine) · `js/bethebeam-scenes.js` (11 scene builders + chapter data) · `js/bethebeam-audio.js` (soundtrack) · `vendor/three.min.js`.

- **The one dependency exception:** Three.js **r149 UMD** (last non-ESM build, MIT, ~608 KB) vendored into `vendor/` — ES modules can't load over `file://`, which is a hard project rule. Pinned; do not upgrade past r159.
- **Continuous flight:** camera rides a per-chapter Catmull-Rom spline with *directed gaze* (the viewer never steers; the scene's `gaze(t)` aims the look-at, smoothed and rate-capped). Easing is `glide(x) = 0.35x + 0.65·smoothstep(x)` — non-zero slope at both ends so motion never stops at a boundary.
- **Chapter handoff = film dissolve:** ~2.5 s render-target crossfade (two `WebGLRenderTarget`s + a fullscreen blend quad). The outgoing camera keeps flying past its path end along its final tangent at the glide end-speed while the next chapter is already in flight underneath. Diegetic flashes (foil zap, kicker, spallation white-out) are events, not edits.
- **Event animations:** plasma parting at extraction; per-gap FOV kicks in the linac; the two stripped electrons spiraling away with light trails (tagged `e⁻ ×2 — left behind`); kicker flare; pion→muon color decay; target-core boil + 20 distinct neutron tracks at spallation; molecule recoil splashes per moderator collision; TOF spread of fellow neutrons in the guide; Bragg ping ring + detector flare.
- **Minimap ("YOU ARE HERE"):** the facility.html plan miniaturized as inline SVG in the HUD corner; per-chapter route in the `MAP` table (endpoints chained so the dot never jumps); dot color tracks identity (cyan H⁻/n⁰, pink p⁺); orbits the ring 3× and rattles inside the TS1 block during moderation.
- **HUD:** YOU (H⁻/p⁺/n⁰) · ENERGY · SPEED (+bar) · CLOCK · LAP — energy comes from chapter data, speed is always derived through `MESynth` kinematics.
- **Soundtrack (`BTBAudio`):** fully procedural Web Audio — nothing downloaded, loops forever by construction. **112 BPM, A minor**, 4-bar progression **Am·Am·C·G**, lookahead sequencer (40 ms tick / 0.18 s horizon); layers (kick, acid bass arp, hats, snare, pad, lead + dotted-eighth delay ≈ 402 ms) gate in by a per-chapter intensity 0–1; `duck()` muffles during pause. Starts only from the button gesture (satisfies autoplay policy); MUTE always visible.
- **Fallbacks:** no WebGL / reduced motion / no JS ⇒ the storyboard *is* the ride; the CTA degrades to an anchor that jumps to it. Esc exits; Space pauses; ←/→ and the rail dots skip stops; focus management keeps Space non-destructive.

---

## 3. Multi-agent reviews (ultracode) — what they caught

Two adversarially-verified workflow audits (46 agents total) ran against the feature; every confirmed finding was fixed:

- **×1000 energy bug (high):** stops 1–3 had energies entered as 35 *eV* / 665 *eV* instead of keV — HUD speeds were ~30× off. The kind of bug a demo would broadcast.
- **Keyboard trap (high):** initial focus landed on EXIT, so the advertised "SPACE pause" exited the ride. Focus now lands on the overlay itself.
- **"TANK 4 twice" (the user report):** label *math* was correct — the culprit was copy. Every label ended in "/4", and at fade-in opacity "TANK 3/4" reads as "TANK …4". Now "TANK n OF 4", distance-faded, alternating sides.
- **"~5×10¹⁴ neutrons tonight" → "in this pulse alone"** (it's the per-pulse figure; "tonight" was off by ~10⁶).
- **Site-wide consistency:** the older pages said "~8,000 laps"; ISIS's official figure is ~10,000 and 8,000 was internally inconsistent (8,000 × 0.1 MeV ≠ 730 MeV gained) — `facility.js` and `index.html` were corrected.
- Plus: LAP/CLOCK mutual consistency (now period-integrated), 9-vs-10 dipole arch count, end-screen TOF vs ride-clock conflation, caption timing vs dissolve windows, caption↔storyboard parity gaps.

## 4. Verification record

- Chapter timing exact: 14.1 s measured vs 14 s configured (in-page measurement; lesson: never time across Playwright RPC calls)
- Dissolve visually confirmed (foil scene blended under the synchrotron's RF rings mid-transition); boundary continuity confirmed on CLOCK/ENERGY/LAP
- LAP↔CLOCK live check: 93 laps at +137 µs ⇒ 1.47 µs/lap (exact injection period), shrinking to 1.17 µs/lap mid-ramp
- Zero console errors across all 11 chapters, the finale, `http://` and `file://`; no horizontal overflow at 375 px
- Reduced-motion (emulated): ride stays parked, CTA anchors to the storyboard, decorative animations compute to `none`, explanatory note renders, zero errors
- Live deploy spot-check (2026-06-11): Three.js r149 loads, ride launches (overlay + WebGL canvas), subnav tab and cross-link card present, index caption reads ~10,000 laps, zero console errors / failed requests
- **Still manual:** Firefox parity, an actual listen to the soundtrack, OS-level reduced-motion toggle

*Status: committed and deployed 2026-06-11; live at https://janukahw.github.io/isis-intro/bethebeam.html.*
