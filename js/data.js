/* data.html page logic: TOF scrubber, events/histogram demo, reduction playground, quiz. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var S = window.MESynth, P = window.MEPlot, Q = window.MEQuiz;
    var WL_COLORS = ["#ff8a5c", "#ffc46b", "#b8e986", "#5fd8c8", "#6aa8ff"];

    /* ================= S1: TOF scrubber ================= */
    (function tofScrubber() {
      var svg = document.getElementById("tof-svg");
      if (!svg) return;
      var group = document.getElementById("tof-neutrons");
      var slider = document.getElementById("tof-time");
      var out = document.getElementById("tof-time-out");
      var playBtn = document.getElementById("tof-play");

      var L = 11;                              // m
      var lambdas = [1, 2, 4, 6, 8];           // Å
      var X0 = 40, X1 = 560, Y = 65;           // svg px
      var dots = lambdas.map(function (lam, i) {
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("r", "6");
        c.setAttribute("cy", Y);
        c.setAttribute("cx", X0);
        c.setAttribute("fill", WL_COLORS[i]);
        var t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("y", Y - 12 - i * 0);
        t.setAttribute("x", X0);
        t.setAttribute("fill", WL_COLORS[i]);
        t.setAttribute("font-size", "8");
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-family", "IBM Plex Mono, monospace");
        t.textContent = lam + " Å";
        g.append(c, t);
        group.append(g);
        return { lam: lam, circle: c, label: t, arrive: L * lam / S.C.VL * 1000 }; // ms
      });

      var hist = P(document.getElementById("tof-hist"), {
        xlabel: "arrival time (ms)", ylabel: "hits",
        xmin: 0, xmax: 25, ymin: 0, ymax: 1.4
      });

      function update(tms) {
        out.textContent = tms.toFixed(1) + " ms";
        var arrived = [];
        dots.forEach(function (d, i) {
          var frac = Math.min(1, d.arrive > 0 ? tms / d.arrive : 1);
          var x = X0 + (X1 - X0) * frac;
          d.circle.setAttribute("cx", x);
          d.label.setAttribute("x", x);
          // stagger vertically a touch so dots don't fully overlap at start
          d.circle.setAttribute("cy", Y + (i - 2) * 4);
          if (frac >= 1) arrived.push(i);
        });
        hist.setSeries(arrived.map(function (i) {
          return { x: [dots[i].arrive], y: [1], color: WL_COLORS[i], type: "bars" };
        }));
        hist.draw();
      }

      slider.addEventListener("input", function () {
        stopPlay();
        update(parseFloat(slider.value));
      });

      var raf = null;
      function stopPlay() {
        if (raf) { cancelAnimationFrame(raf); raf = null; playBtn.textContent = "▶ play"; }
      }
      playBtn.addEventListener("click", function () {
        if (raf) { stopPlay(); return; }
        playBtn.textContent = "❚❚ pause";
        var t0 = null, from = parseFloat(slider.value);
        if (from >= 24.9) from = 0;
        function frame(ts) {
          if (t0 == null) t0 = ts;
          var tms = from + (ts - t0) / 1000 * 5;   // 5 ms of TOF per real second
          if (tms >= 25) { tms = 25; }
          slider.value = tms;
          update(tms);
          if (tms < 25) raf = requestAnimationFrame(frame);
          else stopPlay();
        }
        raf = requestAnimationFrame(frame);
      });

      update(0);
    })();

    /* ================= S2: events vs histogram ================= */
    (function eventsDemo() {
      var canvas = document.getElementById("ev-plot");
      if (!canvas) return;
      var events = S.sampleTofEvents(4000, 42);
      var rng = S.mulberry32(99);
      var jitter = events.map(function () { return rng(); });

      var btnEv = document.getElementById("ev-mode-events");
      var btnHist = document.getElementById("ev-mode-hist");
      var binSlider = document.getElementById("ev-bins");
      var binOut = document.getElementById("ev-bins-out");

      var plot = P(canvas, { xlabel: "time of flight (µs)", ylabel: "" , xmin: 1000, xmax: 19800 });
      var mode = "events";

      function binWidth() {
        return Math.round(50 * Math.pow(40, parseFloat(binSlider.value)));  // 50…2000 µs
      }

      function render() {
        if (mode === "events") {
          plot.opts.ylabel = "event # (jittered)";
          plot.opts.ymin = 0; plot.opts.ymax = 1;
          plot.setSeries([{ x: events, y: jitter, color: "#4fd8eb", type: "points", size: 1.6, alpha: 0.7 }]);
          binOut.textContent = "— µs";
        } else {
          var w = binWidth();
          var h = S.histogram(events, 1000, 19800, w);
          plot.opts.ylabel = "counts per bin";
          plot.opts.ymin = 0; plot.opts.ymax = null;
          plot.setSeries([{ x: h.x, y: h.y, color: "#ffb84d", type: "bars" }]);
          binOut.textContent = w + " µs";
        }
        plot.draw();
      }

      function setMode(m) {
        mode = m;
        btnEv.setAttribute("aria-pressed", String(m === "events"));
        btnHist.setAttribute("aria-pressed", String(m === "hist"));
        binSlider.disabled = m !== "hist";
        render();
      }
      btnEv.addEventListener("click", function () { setMode("events"); });
      btnHist.addEventListener("click", function () { setMode("hist"); });
      binSlider.addEventListener("input", render);

      render();
    })();

    /* ================= S4: reduction playground ================= */
    (function playground() {
      var canvas = document.getElementById("pg-plot");
      if (!canvas) return;

      var plot = P(canvas, { xlabel: "", ylabel: "counts" });
      var legend = document.getElementById("pg-legend");
      var caption = document.getElementById("pg-caption");
      var historyEl = document.getElementById("pg-history");
      var resultEl = document.getElementById("pg-result");
      var binSlider = document.getElementById("pg-binw");
      var binOut = document.getElementById("pg-binw-out");
      var fitHint = document.getElementById("pg-fit-hint");

      var ORDER = ["load", "convert", "rebin", "normalize", "fit"];
      var stage;          // index of last completed step (-1 = nothing)
      var banksTof;       // [{x,y}] per bank, TOF µs
      var banksD;         // [{x,y}] per bank, d Å
      var combined;       // {x,y} rebinned sum
      var normalized;     // {x,y}
      var fitCurve;       // {x,y} | null

      var D_LO = 0.6, D_HI = 3.6;

      function card(step) {
        return document.querySelector('.step-card[data-step="' + step + '"]');
      }
      function btn(step) {
        return document.querySelector('[data-apply="' + step + '"]');
      }

      function setStates() {
        ORDER.forEach(function (step, i) {
          var c = card(step);
          var state = i <= stage ? "done" : (i === stage + 1 ? "ready" : "locked");
          c.dataset.state = state;
          var b = btn(step);
          if (b) b.disabled = state !== "ready";
        });
        binSlider.disabled = stage < 2;            // active once rebin is ready/done
        var fitReady = stage >= 3;
        fitHint.textContent = fitReady
          ? (stage >= 4 ? "click another peak to re-fit" : "→ click near a peak in the plot")
          : "apply steps 1–4 first";
        canvas.style.cursor = fitReady ? "crosshair" : "default";
      }

      function pushHistory(name, args) {
        var li = document.createElement("li");
        li.textContent = name;
        if (args) {
          var span = document.createElement("span");
          span.className = "args";
          span.textContent = "(" + args + ")";
          li.append(span);
        }
        historyEl.append(li);
      }

      function setLegend(items) {
        legend.textContent = "";
        items.forEach(function (it) {
          var span = document.createElement("span");
          var sw = document.createElement("span");
          sw.className = "swatch";
          sw.style.background = it[1];
          span.append(sw, document.createTextNode(it[0]));
          legend.append(span);
        });
      }

      /* ---- steps ---- */

      function doLoad() {
        banksTof = S.INSTRUMENT.banks.map(function (_, i) { return S.powderTofMeasured(i); });
        plot.opts.xlabel = "time of flight (µs)";
        plot.opts.ylabel = "counts";
        plot.opts.xmin = 1000; plot.opts.xmax = 19800; plot.opts.ymin = 0; plot.opts.ymax = null;
        plot.setSeries(banksTof.map(function (b, i) {
          return { x: b.x, y: b.y, color: S.INSTRUMENT.banks[i].color, type: "line", width: 1.2 };
        }));
        plot.draw();
        setLegend(S.INSTRUMENT.banks.map(function (b) { return [b.name, b.color]; }));
        caption.textContent = "FIG 5.4 — raw counts vs TOF. one crystal, three banks — and the peaks don’t line up.";
        pushHistory("Load", "run=SYNTH000123, banks=3");
      }

      function doConvert() {
        banksD = banksTof.map(function (b, i) {
          var D = S.difc(i);
          return { x: b.x.map(function (t) { return t / D; }), y: b.y.slice() };
        });
        plot.opts.xlabel = "d-spacing (Å)";
        plot.opts.xmin = D_LO; plot.opts.xmax = D_HI;
        plot.animateTo(banksD.map(function (b, i) {
          return { x: b.x, y: b.y, color: S.INSTRUMENT.banks[i].color, type: "line", width: 1.2 };
        }), 900);
        caption.textContent = "FIG 5.4 — same data in d-spacing: the peaks from all three banks snap into alignment. that’s calibration.";
        pushHistory("ConvertUnits", "Target=dSpacing");
      }

      function rebinGrid() {
        var w = parseFloat(binSlider.value);
        var n = Math.max(8, Math.round((D_HI - D_LO) / w));
        return S.linspace(D_LO, D_HI, n);
      }

      function doRebin(animate) {
        var grid = rebinGrid();
        var ys = banksD.map(function (b) { return S.rebinTo(b.x, b.y, grid); });
        var sum = grid.map(function (_, k) { return ys[0][k] + ys[1][k] + ys[2][k]; });
        combined = { x: grid, y: sum };
        var series = [{ x: grid, y: sum, color: "#4fd8eb", type: "line", width: 1.8 }];
        if (animate) plot.animateTo(series, 600);
        else { plot.setSeries(series); plot.draw(); }
        setLegend([["all banks, common bins", "#4fd8eb"]]);
        caption.textContent = "FIG 5.4 — three banks merged onto common bins (Δd = " +
          parseFloat(binSlider.value).toFixed(3) + " Å). try the slider: too wide blurs, too narrow gets noisy.";
      }

      function envelopeD(grid) {
        // incident-spectrum envelope mapped into d via the 90° bank: λ = 2·sin(45°)·d
        var env = grid.map(function (d) {
          var lam = 2 * Math.sin(Math.PI / 4) * d;
          return S.maxwell(lam, S.INSTRUMENT.modT) * 40 + 0.4;
        });
        var m = Math.max.apply(null, env);
        return env.map(function (v) { return Math.max(v / m, 0.05); });
      }

      function doNormalize() {
        var env = envelopeD(combined.x);
        normalized = {
          x: combined.x.slice(),
          y: combined.y.map(function (v, k) { return v / env[k]; })
        };
        plot.opts.ylabel = "normalized intensity";
        plot.animateTo([{ x: normalized.x, y: normalized.y, color: "#4fd8eb", type: "line", width: 1.8 }], 700);
        caption.textContent = "FIG 5.4 — divided by the source spectrum: the slope is gone and peak heights mean something.";
        pushHistory("Normalize", "by=incident spectrum");
      }

      function doFit(dClick) {
        var data = normalized;
        var xs = [], ys = [];
        for (var i = 0; i < data.x.length; i++) {
          if (Math.abs(data.x[i] - dClick) <= 0.08) { xs.push(data.x[i]); ys.push(data.y[i]); }
        }
        var fit = xs.length >= 6 ? S.fitGaussian(xs, ys) : null;
        if (!fit || fit.A < (Math.max.apply(null, data.y) * 0.04)) {
          caption.textContent = "FIG 5.4 — no clear peak there. click closer to one of the peaks.";
          return;
        }
        var fx = S.linspace(xs[0], xs[xs.length - 1], 80);
        var fy = fx.map(function (x) {
          var z = (x - fit.c) / fit.sigma;
          return fit.A * Math.exp(-0.5 * z * z) + fit.b;
        });
        fitCurve = { x: fx, y: fy };
        plot.setSeries([
          { x: data.x, y: data.y, color: "#4fd8eb", type: "line", width: 1.4, alpha: 0.75 },
          { x: fx, y: fy, color: "#ffb84d", type: "line", width: 2.4 }
        ]);
        plot.draw();
        setLegend([["reduced data", "#4fd8eb"], ["Gaussian fit", "#ffb84d"]]);
        caption.textContent = "FIG 5.4 — fitted. the centre is an interatomic spacing, measured to a fraction of a percent.";
        if (stage < 4) { stage = 4; setStates(); pushHistory("Fit", "function=Gaussian+flat"); }

        resultEl.hidden = false;
        resultEl.textContent = "";
        [["peak centre", fit.c.toFixed(4) + " Å"],
         ["FWHM", fit.fwhm.toFixed(4) + " Å"],
         ["area", fit.area.toFixed(1) + " a.u."]].forEach(function (kv) {
          var dt = document.createElement("dt"); dt.textContent = kv[0];
          var dd = document.createElement("dd"); dd.textContent = kv[1];
          resultEl.append(dt, dd);
        });
        var note = document.createElement("dt");
        note.textContent = "→ this number goes in the paper.";
        resultEl.append(note);
      }

      /* ---- wiring ---- */

      document.getElementById("pg-steps").addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-apply]");
        if (!b || b.disabled) return;
        var step = b.dataset.apply;
        var idx = ORDER.indexOf(step);
        if (idx !== stage + 1) return;
        if (step === "load") doLoad();
        else if (step === "convert") doConvert();
        else if (step === "rebin") { doRebin(true); pushHistory("Rebin", "Δd=" + parseFloat(binSlider.value).toFixed(3) + " Å"); }
        else if (step === "normalize") doNormalize();
        stage = idx;
        setStates();
      });

      binSlider.addEventListener("input", function () {
        binOut.textContent = parseFloat(binSlider.value).toFixed(3) + " Å";
        if (stage === 2) doRebin(false);                  // live re-bin before normalize
      });

      canvas.addEventListener("click", function (ev) {
        if (stage < 3) return;
        var d = plot.eventToX(ev);
        if (d == null) return;
        doFit(d);
      });

      function reset() {
        stage = -1;
        banksTof = banksD = combined = normalized = fitCurve = null;
        historyEl.textContent = "";
        resultEl.hidden = true;
        binSlider.value = "0.01";
        binOut.textContent = "0.010 Å";
        plot.opts.xlabel = "";
        plot.opts.xmin = null; plot.opts.xmax = null; plot.opts.ymin = 0; plot.opts.ymax = 1;
        plot.setSeries([]);
        plot.draw();
        setLegend([]);
        caption.textContent = "FIG 5.4 — workspace view. apply STEP 1 to load the run.";
        setStates();
      }
      document.getElementById("pg-reset").addEventListener("click", reset);

      reset();
    })();

    /* ================= quiz ================= */
    Q.render(document.getElementById("quiz-box"), [
      {
        q: "Two neutrons leave the moderator in the same pulse. One arrives at the detector at 5 ms, the other at 10 ms. Which has the longer wavelength?",
        choices: ["The 5 ms one — faster means longer wavelength", "The 10 ms one — slower means longer wavelength", "They have the same wavelength", "You can’t tell from arrival time"],
        answer: 1,
        why: "Wavelength grows with slowness: λ ≈ 3956·t/L. The late arrival is the slow, long-wavelength neutron — that’s the whole trick of time-of-flight."
      },
      {
        q: "Why does ConvertUnits need to know the instrument geometry?",
        choices: ["It doesn’t — it’s a pure unit relabel", "Because turning a time into a wavelength or d-spacing requires the flight path and detector angle", "Because detectors drift over time", "To correct for the muon background"],
        answer: 1,
        why: "The same arrival time means different physics at different flight paths and angles. λ needs L; d-spacing needs L and 2θ. That’s why each bank converted differently in the playground."
      },
      {
        q: "What does a workspace’s history give you?",
        choices: ["A backup of the raw file", "The list of users who touched the data", "Full provenance: the exact algorithm chain (with parameters) that produced the data, replayable as a script", "Faster loading next time"],
        answer: 2,
        why: "Like an audit log or a git log for data: any reduced result can be traced and re-run exactly. Reproducibility is built into the data structure."
      },
      {
        q: "Choosing a histogram bin width is…",
        choices: ["A property of the detector hardware", "Fixed by the facility for all experiments", "A lossy aggregation choice you make after the fact — the events remain the ground truth", "Irrelevant to data quality"],
        answer: 2,
        why: "In event mode you can re-bin the same data any number of ways. Wide bins blur structure; narrow bins amplify noise. The events themselves never change."
      }
    ]);
  });
})();
