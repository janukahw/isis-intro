/* experiment.html page logic: lifecycle timeline + quiz. */
(function () {
  "use strict";

  var PHASES = [
    {
      key: "Propose",
      what: "A research team writes a short scientific case: what they want to measure, on which instrument, and why it matters. Direct Access proposals are invited twice a year (deadlines around mid-April and mid-October); Rapid Access and Xpress routes exist for urgent or simple measurements.",
      who: "Visiting researchers, with advice from ISIS instrument scientists.",
      sw: "Proposal submission system and user database."
    },
    {
      key: "Review",
      what: "Facility Access Panels — peer reviewers — score the proposals about six weeks after the deadline. Beam time is heavily oversubscribed, so good proposals are turned away every round; the winners get an allocation of days on a named instrument.",
      who: "External scientist panels, facility coordination staff.",
      sw: "Review and scoring tools fed by the proposal system."
    },
    {
      key: "Schedule",
      what: "Accepted experiments are slotted into the run cycles, typically 3–8 months after the proposal deadline. Sample-safety review happens here too: is the sample hazardous, radioactive, magnetic? Travel, training and access get arranged.",
      who: "Instrument scientists, user office, health & safety.",
      sw: "Scheduling and sample-safety systems; cycle calendars."
    },
    {
      key: "Set up",
      what: "The team arrives. The sample goes into its environment — cryostat, furnace, magnet, pressure cell, humidity chamber — and the instrument is configured and calibrated for the measurement. Hours spent here are repaid in data quality.",
      who: "User team + instrument scientist + sample-environment technicians.",
      sw: "Instrument control software; motor, chopper and environment controllers."
    },
    {
      key: "Measure",
      what: "Beam on. The data-acquisition electronics timestamp every detected neutron or muon-decay positron into event files, while slow controls log temperature, field and pressure alongside. Teams babysit dashboards, swap samples, and adapt the plan as results appear live.",
      who: "User team round the clock; instrument + on-call support staff.",
      sw: "DAQ writing NeXus/HDF5 event files; live-view displays; often a first pass of automatic reduction."
    },
    {
      key: "Reduce",
      what: "Raw events become calibrated curves in physical units: aggregate, convert units, normalize, correct. At ISIS this is Mantid’s job, and for many instruments it runs automatically as files land. Users usually leave the facility with reduced data in hand.",
      who: "Facility software (this is the staff-built part!), instrument scientists.",
      sw: "Mantid — workspaces, algorithms, provenance history."
    },
    {
      key: "Publish",
      what: "Back home, the team fits models, compares with simulations, and writes the paper — usually months of analysis for days of beam time. Data gets a DOI; the ISIS experiment number appears in the acknowledgements; results feed the next proposal.",
      who: "The research team; ~3,000 researchers a year publish on ISIS data.",
      sw: "Analysis codes (Mantid fitting and technique-specific tools), data catalogue with DOIs."
    }
  ];

  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.getElementById("phase-timeline");
    var detail = document.getElementById("phase-detail");
    if (!bar || !detail) return;

    var buttons = PHASES.map(function (p, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "timeline-node";
      b.textContent = p.key;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { select(i); });
      bar.append(b);
      return b;
    });

    function select(i) {
      buttons.forEach(function (b, k) { b.setAttribute("aria-pressed", String(k === i)); });
      var p = PHASES[i];
      detail.textContent = "";
      var h3 = document.createElement("h3");
      h3.textContent = "0" + (i + 1) + " — " + p.key;
      var what = document.createElement("p");
      what.textContent = p.what;
      what.style.maxWidth = "70ch";
      var dl = document.createElement("dl");
      [["who’s involved", p.who, "who"], ["systems & software", p.sw, "sw"]].forEach(function (row) {
        var dt = document.createElement("dt");
        dt.textContent = row[0];
        var dd = document.createElement("dd");
        dd.textContent = row[1];
        dd.className = row[2];
        dl.append(dt, dd);
      });
      detail.append(h3, what, dl);
    }
    select(0);

    window.MEQuiz.render(document.getElementById("quiz-box"), [
      {
        q: "Put these in order: (A) reduction, (B) proposal, (C) measurement, (D) peer review.",
        choices: ["B → D → C → A", "C → B → D → A", "B → C → D → A", "D → B → A → C"],
        answer: 0,
        why: "Propose → review (Facility Access Panels) → get scheduled and measure → reduce the data. Analysis and the paper come after."
      },
      {
        q: "What’s in a raw NeXus event file at the end of a run?",
        choices: ["Finished plots ready for the paper", "Timestamped detector events plus logged sample conditions (temperature, field…)", "Only a summary count per detector", "The user’s analysis scripts"],
        answer: 1,
        why: "The DAQ writes every detected event — (detector ID, time of flight) — alongside slow-control logs. Everything else (histograms, curves, plots) is computed later from these."
      },
      {
        q: "Roughly how long after the proposal deadline does an experiment typically run?",
        choices: ["The same week", "3–8 months", "5 years", "Whenever the team shows up"],
        answer: 1,
        why: "After panel review (~6 weeks post-deadline), accepted experiments are scheduled into run cycles typically 3–8 months after the deadline. Beam time is planned far ahead — which is why losing hours of it hurts."
      },
      {
        q: "Why does facility software being down during a cycle matter so much?",
        choices: ["It doesn’t — runs can be repeated for free", "Beam time is scarce, scheduled months out, and over in days — lost hours are a meaningful fraction of someone’s only chance to measure", "Because the protons are wasted", "It only matters during the day shift"],
        answer: 1,
        why: "An experiment might have 48–120 hours total, awarded competitively, scheduled months ago. Instrument control, DAQ and reduction software are in the critical path the whole time — it’s a production system with a queue of scientists behind it."
      }
    ]);
  });
})();
