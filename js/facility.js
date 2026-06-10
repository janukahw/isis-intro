/* facility.html page logic: facility explorer hotspots, moderator spectrum, quiz. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var S = window.MESynth, P = window.MEPlot;

    /* Shared hotspot-explorer wiring: click (or Enter/Space) selects a part
       and fills the info card; clicking the active part again, pressing
       Escape, or the card's close button deselects and restores the default
       card. */
    function wireExplorer(svgId, infoId, attr, spots, defaultCard) {
      var svg = document.getElementById(svgId);
      var info = document.getElementById(infoId);
      if (!svg || !info) return;
      var active = null;

      function showDefault() {
        active = null;
        svg.classList.remove("has-active");
        svg.querySelectorAll(".hotspot").forEach(function (h) {
          h.classList.remove("active");
        });
        info.textContent = "";
        var h3 = document.createElement("h3");
        h3.textContent = defaultCard.title;
        var p = document.createElement("p");
        p.textContent = defaultCard.body;
        info.append(h3, p);
      }

      function select(key) {
        if (key === active) { showDefault(); return; }   // toggle off
        active = key;
        svg.classList.add("has-active");
        svg.querySelectorAll(".hotspot").forEach(function (h) {
          h.classList.toggle("active", h.dataset[attr] === key);
        });
        var d = spots[key];
        info.textContent = "";
        var h3 = document.createElement("h3");
        h3.textContent = d.title;
        var p = document.createElement("p");
        p.textContent = d.body;
        var stat = document.createElement("p");
        stat.className = "stat";
        var num = document.createElement("span");
        num.className = "num";
        num.textContent = d.stat;
        var lab = document.createElement("span");
        lab.className = "label";
        lab.textContent = d.label;
        stat.append(num, lab);
        var close = document.createElement("button");
        close.type = "button";
        close.className = "btn ghost";
        close.textContent = "✕ close";
        close.style.marginTop = "var(--sp-2)";
        close.addEventListener("click", showDefault);
        info.append(h3, p, stat, close);
        info.scrollIntoView({ block: "nearest" });
      }

      svg.querySelectorAll(".hotspot").forEach(function (h) {
        h.addEventListener("click", function () { select(h.dataset[attr]); });
        h.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            select(h.dataset[attr]);
          }
        });
      });
      svg.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && active) showDefault();
      });
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && active) showDefault();
      });

      showDefault();
    }

    /* ================= S1: facility explorer ================= */
    (function explorer() {
      var SPOTS = {
        ion: {
          title: "Ion source",
          body: "It all starts as hydrogen gas. An electric discharge (with a little caesium) turns it into H⁻ ions — protons wearing two electrons — at 35 keV, ready for acceleration. (An electron-volt is the energy one electron gains crossing a 1-volt battery; MeV = a million of those.) The extra electrons are stripped off later, at injection into the synchrotron.",
          stat: "35 keV", label: "starting energy"
        },
        linac: {
          title: "Linear accelerator",
          body: "Four radio-frequency tanks — an oscillating voltage timed so the ions always feel a forward push — surf them up to 70 MeV and bunch them up. Think of it as the on-ramp before the motorway.",
          stat: "70 MeV", label: "37% of light speed · entering the synchrotron"
        },
        synch: {
          title: "Synchrotron",
          body: "A ring 163 m around. Protons circulate about 8,000 laps, gaining ~0.1 MeV per pass from RF cavities (the same timed voltage push as the linac) while bending magnets hold the orbit, then two bunches are kicked out in under 0.1 µs — 50 times every second.",
          stat: "800 MeV", label: "84% of light speed · one lap in 0.65 µs"
        },
        muon: {
          title: "Muon target",
          body: "In the beamline to Target Station 1, the protons pass through a 1 cm slice of graphite. Collisions make pions — short-lived particles born in the impact — which decay within tens of nanoseconds into muons that are steered to the muon instruments. The beam barely notices — most protons carry on to the tungsten target.",
          stat: "1 cm", label: "of graphite — that’s all it takes"
        },
        ts1: {
          title: "Target Station 1",
          body: "The original workhorse, running since 1984. Receives 4 of every 5 pulses (40 per second) onto a tantalum-clad tungsten target, surrounded by water and methane moderators (small tanks that slow the neutrons — see the moderators hotspot) feeding a ring of instruments.",
          stat: "40 /s", label: "pulses received"
        },
        ts2: {
          title: "Target Station 2",
          body: "Opened in 2008 and built for cold, long-wavelength neutrons — soft matter, biology, advanced materials. Takes 1 in 5 pulses, trading raw rate for an optimized, gentler spectrum.",
          stat: "10 /s", label: "pulses received — 1 in 5"
        },
        mod: {
          title: "Moderators",
          body: "Small tanks of water, liquid methane or liquid hydrogen hugging each target. Fresh spallation neutrons bounce around inside and emerge thousands of times slower — with wavelengths matched to atomic structure. Temperature = wavelength menu.",
          stat: "300→20 K", label: "moderator temperatures available"
        },
        instr: {
          title: "Instruments",
          body: "Thirty-plus beamlines radiate from the two target stations and the muon area, each a specialized experiment: diffractometers, spectrometers, reflectometers, small-angle machines, imaging stations, muon spectrometers, and a chip-irradiation line — each type is unpacked on the techniques page.",
          stat: "30+", label: "instruments, ~1,200 experiments a year"
        }
      };

      wireExplorer("fac-svg", "fac-info", "spot", SPOTS, {
        title: "Pick a component",
        body: "Click any highlighted part of the machine — or press Tab and Enter — to see what it does. Click it again (or press Escape) to step back out."
      });
    })();

    /* ================= S4: instrument anatomy explorer ================= */
    (function anatomy() {
      var PARTS = {
        moderator: {
          title: "Moderator face",
          body: "The beamline starts at the glowing face of a moderator — the tank that slowed the neutrons (section 2.3). Every pulse leaves here at a known instant, which is what makes time-of-flight work: every stopwatch on the instrument is timed from this point.",
          stat: "t = 0", label: "every neutron’s stopwatch starts here, 50×/s"
        },
        chopper: {
          title: "Chopper",
          body: "A rapidly spinning disc with a window, phase-locked to the source: it opens just as the wavelengths the instrument wants fly past, and blocks everything else — including stragglers from the previous pulse that would otherwise masquerade as slow neutrons. Several choppers in series sharpen the selection.",
          stat: "Δλ", label: "selects the wavelength band and stops pulse overlap"
        },
        monitor: {
          title: "Monitor",
          body: "A deliberately feeble detector sitting in the beam itself, counting a tiny fraction of what flies through. It records exactly what the source delivered, pulse by pulse — and reduction later divides the data by it, so results don’t depend on the machine’s mood that day.",
          stat: "I₀", label: "the denominator in every normalization"
        },
        slits: {
          title: "Slits",
          body: "Adjustable neutron-absorbing jaws that trim the beam down to the size of the sample. Any beam that misses the sample can only contribute background, so tighter slits mean cleaner data (at the price of intensity).",
          stat: "mm", label: "beam tailored to the sample’s size"
        },
        environment: {
          title: "Sample environment",
          body: "The kit surrounding the sample: cryostats (very cold fridges), furnaces, magnets, pressure cells, humidity chambers. Because neutrons pass through metal walls easily, the sample can be measured while genuinely cold, hot, squeezed or magnetized — conditions logged alongside every event.",
          stat: "20 mK–2,000 °C", label: "sample conditions available at ISIS"
        },
        sample: {
          title: "Sample",
          body: "The few grams of material everything else exists for. It sits in the beam for hours to days while detectors accumulate events; teams often measure several samples (or one sample at several temperatures) in a single allocation.",
          stat: "hours–days", label: "of beam time per measurement"
        },
        detectors: {
          title: "Detector banks",
          body: "Arrays of neutron detectors covering as much solid angle around the sample as the science needs. Each detection becomes one event in the data file: which pixel fired, and when — the raw material of the whole data page.",
          stat: "(ID, t)", label: "every hit logged as pixel + arrival time"
        },
        beamstop: {
          title: "Beamstop",
          body: "Most neutrons sail straight through the sample without scattering. The beamstop absorbs that direct beam so it can’t blind the detectors or bounce around the room as background — the quietest-sounding part of the instrument, and one of the most necessary.",
          stat: "most", label: "of the beam never scatters — this absorbs it"
        }
      };

      wireExplorer("anat-svg", "anat-info", "part", PARTS, {
        title: "Pick a part",
        body: "Click any part of the beamline — moderator to beamstop — to see the job it does. Click again or press Escape to step back out."
      });
    })();

    /* ================= S3: moderator picker ================= */
    (function moderators() {
      var canvas = document.getElementById("mod-plot");
      if (!canvas) return;
      var plot = P(canvas, { xlabel: "wavelength (Å)", ylabel: "relative neutron count", xmin: 0, xmax: 12, ymin: 0, ymax: 1.05 });
      var label = document.getElementById("mod-label");
      var COLORS = { 300: "#ffc46b", 100: "#5fd8c8", 20: "#6aa8ff" };
      var BLURBS = {
        300: "peak ≈ 1.1 Å — atomic-spacing territory",
        100: "peak ≈ 1.9 Å — the middle of the menu",
        20: "peak ≈ 4.4 Å — long wavelengths for big, soft structures"
      };

      function show(T, animate) {
        var spec = S.moderatorSpectrum(T);
        var series = [{ x: spec.x, y: spec.y, color: COLORS[T], type: "line", width: 2.2 }];
        if (animate) plot.animateTo(series, 600);
        else { plot.setSeries(series); plot.draw(); }
        label.textContent = BLURBS[T];
        label.style.color = COLORS[T];
      }

      var buttons = document.querySelectorAll('[data-temp]');
      buttons.forEach(function (b) {
        b.addEventListener("click", function () {
          buttons.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
          show(parseInt(b.dataset.temp, 10), true);
        });
      });
      show(300, false);
    })();

    /* ================= quiz ================= */
    window.MEQuiz.render(document.getElementById("quiz-box"), [
      {
        q: "Why does ISIS make neutrons in pulses rather than a continuous stream?",
        choices: ["Continuous beams are illegal in the UK", "Pulses let every neutron be timed — arrival time gives wavelength, so no neutrons are wasted on filters", "The synchrotron can’t run continuously", "Pulses are easier on the detectors"],
        answer: 1,
        why: "A pulsed source starts every neutron’s stopwatch at the same instant. Time-of-flight then sorts them by wavelength, using the whole spectrum at once — a reactor must filter one wavelength and discard the rest."
      },
      {
        q: "You want to study a protein membrane — a structure hundreds of ångströms across. Which moderator’s beamline do you book?",
        choices: ["Water at 300 K — short wavelengths", "Liquid hydrogen at 20 K — long wavelengths", "No moderator: raw target neutrons", "Any — wavelength doesn’t matter"],
        answer: 1,
        why: "Big structures need long rulers. The coldest moderator (liquid hydrogen, ~20 K) produces the longest wavelengths — that’s exactly why TS2 was built around cold beams for soft matter and biology."
      },
      {
        q: "What does a chopper do?",
        choices: ["Cools the sample", "Splits the proton beam between target stations", "A spinning disc that passes only the slice of wavelengths the instrument wants", "Removes muons from the beam"],
        answer: 2,
        why: "Choppers are precisely-phased spinning discs with windows. By opening at the right moment after each pulse, they let through only the wavelength band (or single pulse) the measurement needs."
      },
      {
        q: "Where do ISIS’s muons come from?",
        choices: ["A dedicated muon reactor", "The proton beam passing through a thin graphite target, making pions that decay to muons", "Cosmic rays collected on the roof", "The tungsten targets, same as neutrons"],
        answer: 1,
        why: "A 1 cm graphite slice in the proton beam produces pions — short-lived particles born in the impact — which decay almost immediately into muons. The slightly-depleted proton beam continues on to the neutron targets — two probes from one accelerator."
      }
    ]);
  });
})();
