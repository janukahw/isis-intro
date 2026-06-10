/* Story-page driver for index.html.
   - Builds the scene-6 detector arc + histogram SVG content.
   - Arms reveal animations (body.js-anim) and toggles .in-view via
     IntersectionObserver — unless the user prefers reduced motion.
   - Generates scene 6's event-stream loop with the Web Animations API:
     same time-based-loop pattern as the CSS scenes, used here because the
     ~30 actors (and the tiles/bars they hit) are JS-built.
   (The other scene loops are pure CSS keyframes in story.css.) */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- scene 6: build detector tiles + histogram bars ---- */
    var NS = "http://www.w3.org/2000/svg";
    var tiles = document.getElementById("det-tiles");
    if (tiles) {
      for (var i = 0; i < 9; i++) {
        var ang = (200 + i * 17.5) * Math.PI / 180;   // arc beneath the sample
        var r = 95;
        var x = 210 + r * Math.cos(ang), y = 80 - r * Math.sin(ang);
        var t = document.createElementNS(NS, "rect");
        t.setAttribute("x", x - 9); t.setAttribute("y", y - 5);
        t.setAttribute("width", 18); t.setAttribute("height", 10);
        t.setAttribute("rx", 2);
        t.setAttribute("transform", "rotate(" + (90 - ang * 180 / Math.PI) + " " + x + " " + y + ")");
        t.setAttribute("fill", "#4fd8eb");
        t.setAttribute("class", "det-tile");
        t.style.setProperty("--i", i);
        tiles.append(t);
      }
    }
    var HEIGHTS = [4, 7, 12, 22, 38, 30, 18, 26, 40, 24, 14, 9, 6, 4, 3];
    var histo = document.getElementById("det-histo");
    if (histo) {
      HEIGHTS.forEach(function (h, k) {
        var b = document.createElementNS(NS, "rect");
        b.setAttribute("x", 120 + k * 13);
        b.setAttribute("y", 218 - h);
        b.setAttribute("width", 10);
        b.setAttribute("height", h);
        b.setAttribute("fill", "#ffb84d");
        b.style.transformBox = "fill-box";     // grow from the baseline when animated
        b.style.transformOrigin = "bottom";
        histo.append(b);
      });
    }

    if (reduceMotion) return;          // static, fully readable page

    /* ---- reveals ---- */
    document.body.classList.add("js-anim");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("in-view");
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.25 });
      document.querySelectorAll(".scene").forEach(function (s) { io.observe(s); });
    } else {
      document.querySelectorAll(".scene").forEach(function (s) { s.classList.add("in-view"); });
    }

    /* ---- scene 6: the event stream (generated WAAPI loop) ----
       One pulse per 12 s cycle: ~30 neutrons fly from the sample to the
       detector arc in time-of-flight order (one neutron per ≈9 counts of bar
       height). Every hit flashes its tile and bumps its histogram bin by one
       discrete step — 1 step = 1 hit — and four sample hits reveal the event
       log lines authored in the HTML (their det/TOF text matches these
       generated arrivals). Everything fades at 92% and the next pulse
       starts the histogram from zero. */
    if (tiles && histo && histo.animate) {
      var CYCLE = 12000;                       // ms per pulse
      var T0 = 0.13, T1 = 0.86;                // arrival window (cycle fraction)
      var FLIGHT = 0.045;                      // sample→detector flight time
      var RESET = 0.92;                        // global fade-out starts here
      var WL = ["#ff8a5c", "#ffc46b", "#b8e986", "#5fd8c8", "#6aa8ff"];
      var svg = tiles.closest("svg");
      var barEls = histo.querySelectorAll("rect");
      var tileEls = tiles.querySelectorAll("rect");
      var binW = (T1 - T0) / HEIGHTS.length;

      /* the four sampled hits: bin/index-within-bin → forced tile, so the
         static log lines stay truthful (det NN = tile index + 1) */
      var LOGGED = {
        "2/0": { tile: 1, line: "l1" },
        "4/2": { tile: 6, line: "l2" },
        "8/0": { tile: 3, line: "l3" },
        "12/0": { tile: 8, line: "l4" }
      };

      var perTile = [];
      HEIGHTS.forEach(function (h, k) {
        var n = Math.max(1, Math.round(h / 9));    // hits for this bin
        var hitTimes = [];
        for (var j = 0; j < n; j++) {
          var t = T0 + binW * (k + (j + 0.5) / n);
          var logged = LOGGED[k + "/" + j];
          var tile = logged ? logged.tile : (k * 4 + j * 7) % 9;
          hitTimes.push(t);
          (perTile[tile] = perTile[tile] || []).push(t);

          var c = document.createElementNS(NS, "circle");
          c.setAttribute("cx", 210);
          c.setAttribute("cy", 80);
          c.setAttribute("r", 3);
          c.setAttribute("fill", WL[Math.floor(k / 3)]);
          c.setAttribute("opacity", "0");
          svg.insertBefore(c, histo);
          var ang = (200 + tile * 17.5) * Math.PI / 180;   // same arc geometry as the tiles
          var move = "translate(" + (95 * Math.cos(ang)).toFixed(1) + "px," +
            (-95 * Math.sin(ang)).toFixed(1) + "px)";
          c.animate([
            { offset: 0, transform: "translate(0,0)", opacity: 0 },
            { offset: t - FLIGHT, transform: "translate(0,0)", opacity: 0 },
            { offset: t - FLIGHT + 0.008, opacity: 1 },
            { offset: t, transform: move, opacity: 1 },
            { offset: Math.min(t + 0.012, 1), transform: move, opacity: 0 },
            { offset: 1, transform: move, opacity: 0 }
          ], { duration: CYCLE, iterations: Infinity });

          if (logged) {
            var line = document.querySelector(".ev-log ." + logged.line);
            if (line) line.animate([
              { offset: 0, opacity: 0 },
              { offset: t, opacity: 0 },
              { offset: t + 0.015, opacity: 1 },
              { offset: RESET, opacity: 1 },
              { offset: RESET + 0.05, opacity: 0 },
              { offset: 1, opacity: 0 }
            ], { duration: CYCLE, iterations: Infinity });
          }
        }

        /* the bar: one discrete step up per hit, reset for the next pulse */
        var frames = [{ offset: 0, transform: "scaleY(0)", opacity: 1 }];
        hitTimes.forEach(function (ht, j) {
          frames.push({ offset: ht - 0.002, transform: "scaleY(" + (j / n) + ")" });
          frames.push({ offset: ht, transform: "scaleY(" + ((j + 1) / n) + ")" });
        });
        frames.push({ offset: RESET, transform: "scaleY(1)", opacity: 1 });
        frames.push({ offset: 0.97, transform: "scaleY(1)", opacity: 0 });
        frames.push({ offset: 1, transform: "scaleY(0)", opacity: 0 });
        barEls[k].animate(frames, { duration: CYCLE, iterations: Infinity });
      });

      /* tile flashes: one animation per tile, a brightness spike per hit */
      perTile.forEach(function (times, ti) {
        if (!times) return;
        var frames = [{ offset: 0, filter: "brightness(1)" }];
        var prev = 0;
        times.sort(function (a, b) { return a - b; }).forEach(function (t) {
          var up = Math.max(prev + 0.001, t - 0.004);
          var peak = Math.max(up + 0.001, t);
          var down = Math.min(1, peak + 0.02);
          frames.push({ offset: up, filter: "brightness(1)" });
          frames.push({ offset: peak, filter: "brightness(2.4)" });
          frames.push({ offset: down, filter: "brightness(1)" });
          prev = down;
        });
        frames.push({ offset: 1, filter: "brightness(1)" });
        tileEls[ti].animate(frames, { duration: CYCLE, iterations: Infinity });
      });
    }
  });
})();
