/* ts2.html page logic: quiz only — the page is static otherwise. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    window.MEQuiz.render(document.getElementById("quiz-box"), [
      {
        q: "How much of the synchrotron’s output does TS2 receive?",
        choices: ["Every pulse, alternating with TS1", "1 of every 5 pulses — 10 per second", "4 of every 5 pulses", "Only night shifts"],
        answer: 1,
        why: "Every fifth pulse is switched out of EPB1 into a second beamline and sent to TS2. The lower 10 Hz rate is deliberate: it gives slow, long-wavelength neutrons a 100 ms frame to reach the detectors before the next pulse."
      },
      {
        q: "What was TS2 built for?",
        choices: ["Higher beam power than TS1", "Producing muons", "Cold, long-wavelength neutrons for big, soft structures — polymers, proteins, membranes", "Replacing TS1 when it retires"],
        answer: 2,
        why: "TS2 trades raw pulse rate for an optimized cold spectrum. Long wavelengths are long rulers — exactly what soft matter, biology and advanced-materials science need."
      },
      {
        q: "Which moderator pair does TS2 run?",
        choices: ["Two water tanks at 300 K", "Liquid hydrogen and solid methane", "Liquid helium and graphite", "It needs no moderators"],
        answer: 1,
        why: "TS2’s pair is liquid hydrogen plus solid methane — colder than TS1’s menu, which is what shifts its wavelength spectrum toward the long end."
      }
    ]);
  });
})();
