/* facility.html page logic: facility explorer hotspots, moderator spectrum, quiz. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var S = window.MESynth, P = window.MEPlot;

    /* ================= S1: facility explorer ================= */
    (function explorer() {
      var svg = document.getElementById("fac-svg");
      var info = document.getElementById("fac-info");
      if (!svg || !info) return;

      var SPOTS = {
        ion: {
          title: "Ion source",
          body: "It all starts as hydrogen gas. An electric discharge (with a little caesium) turns it into H⁻ ions — protons wearing two electrons — at 35 keV, ready for acceleration. The extra electrons are stripped off later, at injection into the synchrotron.",
          stat: "35 keV", label: "starting energy"
        },
        linac: {
          title: "Linear accelerator",
          body: "Four radio-frequency tanks surf the ions up to 70 MeV and bunch them up. Think of it as the on-ramp before the motorway.",
          stat: "70 MeV", label: "energy entering the synchrotron"
        },
        synch: {
          title: "Synchrotron",
          body: "A ring 163 m around. Protons circulate about 8,000 laps, gaining ~0.1 MeV per pass from RF cavities while bending magnets hold the orbit, then two bunches are kicked out in under 0.1 µs — 50 times every second.",
          stat: "800 MeV", label: "84% of light speed · one lap in 0.65 µs"
        },
        muon: {
          title: "Muon target",
          body: "In the beamline to Target Station 1, the protons pass through a 1 cm slice of graphite. Collisions make pions, which decay within tens of nanoseconds into muons that are steered to the muon instruments. The beam barely notices — most protons carry on to the tungsten target.",
          stat: "1 cm", label: "of graphite — that’s all it takes"
        },
        ts1: {
          title: "Target Station 1",
          body: "The original workhorse, running since 1984. Receives 4 of every 5 pulses (40 per second) onto a tantalum-clad tungsten target, surrounded by water and methane moderators feeding a ring of instruments.",
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
          body: "Thirty-plus beamlines radiate from the two target stations and the muon area, each a specialized experiment: diffractometers, spectrometers, reflectometers, small-angle machines, imaging stations, muon spectrometers, and a chip-irradiation line.",
          stat: "30+", label: "instruments, ~1,200 experiments a year"
        }
      };

      function select(key) {
        svg.classList.add("has-active");
        svg.querySelectorAll(".hotspot").forEach(function (h) {
          h.classList.toggle("active", h.dataset.spot === key);
        });
        var d = SPOTS[key];
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
        info.append(h3, p, stat);
      }

      svg.querySelectorAll(".hotspot").forEach(function (h) {
        h.addEventListener("click", function () { select(h.dataset.spot); });
        h.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            select(h.dataset.spot);
          }
        });
      });
    })();

    /* ================= S3: moderator picker ================= */
    (function moderators() {
      var canvas = document.getElementById("mod-plot");
      if (!canvas) return;
      var plot = P(canvas, { xlabel: "wavelength (Å)", ylabel: "relative flux", xmin: 0, xmax: 12, ymin: 0, ymax: 1.05 });
      var label = document.getElementById("mod-label");
      var COLORS = { 300: "#ffc46b", 100: "#5fd8c8", 20: "#6aa8ff" };
      var BLURBS = {
        300: "peak ≈ 1.8 Å — atomic-spacing territory",
        100: "peak ≈ 3.1 Å — the middle of the menu",
        20: "peak ≈ 6.9 Å — long wavelengths for big, soft structures"
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
        why: "A 1 cm graphite slice in the proton beam produces pions, which decay almost immediately into muons. The slightly-depleted proton beam continues on to the neutron targets — two probes from one accelerator."
      }
    ]);
  });
})();
