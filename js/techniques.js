/* techniques.html page logic: six interactive technique cards + quiz. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var S = window.MESynth, P = window.MEPlot;

    function bindSlider(id, outId, fmt, onInput) {
      var s = document.getElementById(id), o = document.getElementById(outId);
      if (!s) return null;
      s.addEventListener("input", function () {
        o.textContent = fmt(parseFloat(s.value));
        onInput(parseFloat(s.value));
      });
      return s;
    }

    /* ---- 1. powder diffraction ---- */
    (function powder() {
      var canvas = document.getElementById("t-powder-plot");
      if (!canvas) return;
      var plot = P(canvas, { xlabel: "d-spacing (Å)", ylabel: "intensity", xmin: 0.8, xmax: 4.2, ymin: 0, ymax: 1.15 });
      function show(a, animate) {
        var pat = S.cubicPowder(a);
        var series = [{ x: pat.x, y: pat.y, color: "#ffb84d", type: "line", width: 1.8 }];
        if (animate) plot.animateTo(series, 180);
        else { plot.setSeries(series); plot.draw(); }
      }
      bindSlider("t-lattice", "t-lattice-out", function (v) { return v.toFixed(2) + " Å"; }, function (v) { show(v, false); });
      show(5.43, false);
    })();

    /* ---- 2. single crystal (custom canvas) ---- */
    (function sxd() {
      var canvas = document.getElementById("t-sxd-plot");
      if (!canvas) return;
      var ctx = canvas.getContext("2d");
      var powderMode = false;
      var rot = 30;

      function draw() {
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var w = rect.width, h = rect.height;
        var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 12;

        // detector face
        ctx.fillStyle = "#070b16";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#233055";
        ctx.strokeRect(cx - R - 6, cy - R - 6, 2 * R + 12, 2 * R + 12);
        // beam centre
        ctx.fillStyle = "#1f2a4f";
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();

        if (powderMode) {
          // rings: a single crystal in all orientations at once
          [0.30, 0.52, 0.74, 0.90].forEach(function (r, i) {
            ctx.strokeStyle = "rgba(79,216,235," + (0.85 - i * 0.15) + ")";
            ctx.lineWidth = 5 - i;
            ctx.beginPath();
            ctx.arc(cx, cy, r * R, 0, Math.PI * 2);
            ctx.stroke();
          });
          ctx.fillStyle = "#8a96c2";
          ctx.font = '10px "IBM Plex Mono", monospace';
          ctx.textAlign = "center";
          ctx.fillText("a powder = this crystal in every orientation at once → spots smear into rings", cx, h - 8);
        } else {
          S.crystalSpots(rot).forEach(function (sp) {
            if (sp.on < 0.02) return;
            var x = cx + sp.x * R, y = cy + sp.y * R;
            var glow = ctx.createRadialGradient(x, y, 0, x, y, 9);
            glow.addColorStop(0, "rgba(79,216,235," + (sp.on * sp.intensity) + ")");
            glow.addColorStop(1, "rgba(79,216,235,0)");
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(238,242,255," + sp.on * sp.intensity + ")";
            ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
          });
          ctx.fillStyle = "#8a96c2";
          ctx.font = '10px "IBM Plex Mono", monospace';
          ctx.textAlign = "center";
          ctx.fillText("2D detector — spots flash as rotations satisfy Bragg’s condition", cx, h - 8);
        }
      }

      bindSlider("t-rot", "t-rot-out", function (v) { return v.toFixed(0) + "°"; }, function (v) {
        rot = v;
        if (!powderMode) draw();
      });
      var modeBtn = document.getElementById("t-powder-mode");
      modeBtn.addEventListener("click", function () {
        powderMode = !powderMode;
        modeBtn.setAttribute("aria-pressed", String(powderMode));
        modeBtn.textContent = powderMode ? "show as single crystal" : "show as powder";
        draw();
      });
      if (window.ResizeObserver) new ResizeObserver(draw).observe(canvas);
      draw();
    })();

    /* ---- 3. SANS ---- */
    (function sans() {
      var canvas = document.getElementById("t-sans-plot");
      if (!canvas) return;
      var plot = P(canvas, { xlabel: "Q (1/Å) — small Q = large scale", ylabel: "I(Q)", ylog: true, ymin: 5e-5, ymax: 2 });
      function show(R) {
        var d = S.sphereIQ(R);
        plot.setSeries([{ x: d.x, y: d.y, color: "#5fd8c8", type: "line", width: 1.8 }]);
        plot.draw();
      }
      bindSlider("t-radius", "t-radius-out", function (v) { return v.toFixed(0) + " Å"; }, show);
      show(60);
    })();

    /* ---- 4. reflectometry ---- */
    (function refl() {
      var canvas = document.getElementById("t-refl-plot");
      if (!canvas) return;
      var plot = P(canvas, { xlabel: "Q (1/Å)", ylabel: "reflectivity", ylog: true, ymin: 1e-7, ymax: 2 });
      function show(t) {
        var d = S.reflectivity(t);
        plot.setSeries([{ x: d.x, y: d.y, color: "#6aa8ff", type: "line", width: 1.8 }]);
        plot.draw();
      }
      bindSlider("t-thick", "t-thick-out", function (v) { return v.toFixed(0) + " Å"; }, show);
      show(150);
    })();

    /* ---- 6. muons ---- */
    (function muons() {
      var canvas = document.getElementById("t-muon-plot");
      if (!canvas) return;
      var plot = P(canvas, { xlabel: "time after implantation (µs)", ylabel: "asymmetry", xmin: 0, xmax: 16, ymin: -0.32, ymax: 0.32 });
      var B = 15, relax = 0.1;
      function show() {
        var noisy = S.muonAsym(B, relax, 120, true);
        var smooth = S.muonAsym(B, relax, 400, false);
        plot.setSeries([
          { x: noisy.x, y: noisy.y, color: "#8a96c2", type: "points", size: 1.8, alpha: 0.8 },
          { x: smooth.x, y: smooth.y, color: "#b78aff", type: "line", width: 1.8 }
        ]);
        plot.draw();
      }
      bindSlider("t-field", "t-field-out", function (v) { return v.toFixed(0) + " G"; }, function (v) { B = v; show(); });
      bindSlider("t-relax", "t-relax-out", function (v) { return v.toFixed(2) + " /µs"; }, function (v) { relax = v; show(); });
      show();
    })();

    /* ---- quiz ---- */
    window.MEQuiz.render(document.getElementById("quiz-box"), [
      {
        q: "A colleague needs the exact 3D position of hydrogen atoms in a new crystal. Which technique?",
        choices: ["SANS", "Single crystal neutron diffraction", "Irradiation testing", "Reflectometry"],
        answer: 1,
        why: "Single crystal diffraction maps individual Bragg spots into a full 3D structure — and because these are neutrons, the hydrogens actually show up."
      },
      {
        q: "In reflectometry, the fringes get closer together. What happened to the film?",
        choices: ["It got thinner", "It got thicker", "It heated up", "Nothing — fringes don’t relate to thickness"],
        answer: 1,
        why: "Fringe spacing ≈ 2π/thickness: a thicker film means waves from its top and bottom surfaces interfere more rapidly as Q changes — tighter fringes. (Try doubling the slider.)"
      },
      {
        q: "A single crystal gives sharp spots on the detector. Why does a powder give rings?",
        choices: ["Powder grains absorb more neutrons", "The detector blurs at high count rates", "A powder is millions of tiny crystals in every orientation — each spot is smeared around a full circle", "Rings are an artifact of reduction"],
        answer: 2,
        why: "Every grain satisfies Bragg’s law at the same angle but in a random direction, so the spot sweeps into a cone — a ring on the detector. (Hit “show as powder”.)"
      },
      {
        q: "Why would a car manufacturer send engine-control chips to ChipIr?",
        choices: ["To sterilize them", "To replay years of cosmic-ray neutron exposure in hours and prove the electronics fail safely", "To charge their batteries", "To measure their crystal structure"],
        answer: 1,
        why: "Atmospheric neutrons flip bits in electronics at ground level and altitude. ChipIr’s intense beam accelerates that aging so a design’s soft-error rate can be measured before it ships."
      }
    ]);
  });
})();
