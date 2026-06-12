/* probes.html page logic: scale zoomer, X-ray/neutron contrast toggle,
   magnetism grid, muon precession animation, quiz. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.append(n);
    return n;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ================= S1: scale zoomer ================= */
    (function zoomer() {
      var root = document.getElementById("zoom-layers");
      if (!root) return;
      var W = 480, H = 240, CX = W / 2, CY = H / 2;

      // small monospace caption baked into a layer (scales/fades with it)
      function labelText(layer, str) {
        var t = el("text", { x: CX, y: 228, fill: "#8a96c2", "text-anchor": "middle", "font-size": 10, "font-family": "IBM Plex Mono, monospace" }, layer);
        t.textContent = str;
      }

      /* layer 0: coin */
      var L0 = el("g", {}, root);
      el("circle", { cx: CX, cy: CY, r: 78, fill: "#2c3a6b", stroke: "#ffb84d", "stroke-width": 3 }, L0);
      el("circle", { cx: CX, cy: CY, r: 64, fill: "none", stroke: "#3a4d85" }, L0);
      var t0 = el("text", { x: CX, y: CY + 6, fill: "#c0c9e8", "text-anchor": "middle", "font-size": 22, "font-family": "Fraunces, serif" }, L0);
      t0.textContent = "£1";

      /* layer 1: amoeba — a giant single cell, just eye-visible */
      var L1 = el("g", {}, root);
      el("path", { d: "M150,118 C150,90 170,68 200,60 C224,54 236,72 262,66 C304,56 346,80 352,118 C357,150 344,182 306,192 C282,199 260,184 234,190 C202,198 168,186 156,160 C146,142 150,140 150,118 Z", fill: "#0f2238", stroke: "#5fd8c8", "stroke-width": 1.6, opacity: 0.9 }, L1);
      el("circle", { cx: 252, cy: 120, r: 24, fill: "#13203e", stroke: "#5fd8c8", "stroke-width": 1.4 }, L1);   // nucleus
      el("circle", { cx: 252, cy: 120, r: 8, fill: "#5fd8c8", opacity: 0.5 }, L1);                              // nucleolus
      el("circle", { cx: 200, cy: 152, r: 11, fill: "none", stroke: "#5fd8c8", opacity: 0.55 }, L1);           // vacuoles
      el("circle", { cx: 305, cy: 98, r: 7, fill: "none", stroke: "#5fd8c8", opacity: 0.5 }, L1);
      labelText(L1, "amoeba — a single cell");

      /* layer 2: a human hair (its width) */
      var L2 = el("g", {}, root);
      el("path", { d: "M64,40 L104,30 L452,196 L412,208 Z", fill: "#3a2a16", stroke: "#d8a35a", "stroke-width": 1.6, opacity: 0.92 }, L2);
      el("path", { d: "M84,35 L432,202", fill: "none", stroke: "#d8a35a", "stroke-width": 1, opacity: 0.5 }, L2);   // shaft highlight
      [0.18, 0.34, 0.5, 0.66, 0.82].forEach(function (f) {                                                          // cuticle scales
        var x = 84 + (432 - 84) * f, y = 35 + (202 - 35) * f;
        el("line", { x1: x - 14, y1: y - 8, x2: x + 14, y2: y + 8, stroke: "#d8a35a", "stroke-width": 1, opacity: 0.4 }, L2);
      });
      labelText(L2, "a human hair (its width)");

      /* layer 3: bacteria — rod-shaped cells with flagella */
      var L3 = el("g", {}, root);
      [
        { x: 120, y: 96, w: 124, h: 40, rot: -16, fx: "M120,116 q-22,-14 -40,2 q-16,16 -36,4" },
        { x: 256, y: 58, w: 104, h: 34, rot: 13, fx: "M360,75 q22,-12 40,4 q16,14 34,2" },
        { x: 206, y: 150, w: 112, h: 36, rot: -5, fx: "M206,168 q-20,10 -38,-2" }
      ].forEach(function (b) {
        var g = el("g", { transform: "rotate(" + b.rot + " " + (b.x + b.w / 2) + " " + (b.y + b.h / 2) + ")" }, L3);
        el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: b.h / 2, fill: "#16241a", stroke: "#b8e986", "stroke-width": 1.6 }, g);
        el("circle", { cx: b.x + b.w * 0.36, cy: b.y + b.h / 2, r: b.h * 0.18, fill: "#b8e986", opacity: 0.4 }, g);
        el("path", { d: b.fx, fill: "none", stroke: "#b8e986", "stroke-width": 1.3, opacity: 0.65 }, g);
      });
      labelText(L3, "bacteria — rod-shaped cells");

      /* layer 4: viruses — spiky protein shells */
      var L4 = el("g", {}, root);
      [{ cx: 178, cy: 108, r: 34, n: 14 }, { cx: 320, cy: 140, r: 26, n: 12 }].forEach(function (v) {
        el("circle", { cx: v.cx, cy: v.cy, r: v.r, fill: "#2a1a12", stroke: "#ff8a5c", "stroke-width": 1.6, opacity: 0.92 }, L4);
        el("circle", { cx: v.cx, cy: v.cy, r: v.r * 0.45, fill: "none", stroke: "#ff8a5c", "stroke-width": 1, opacity: 0.4 }, L4);
        for (var i = 0; i < v.n; i++) {
          var a = (i / v.n) * Math.PI * 2;
          var sx = v.cx + Math.cos(a) * v.r, sy = v.cy + Math.sin(a) * v.r;
          var ex = v.cx + Math.cos(a) * (v.r + 12), ey = v.cy + Math.sin(a) * (v.r + 12);
          el("line", { x1: sx, y1: sy, x2: ex, y2: ey, stroke: "#ff8a5c", "stroke-width": 1.3, opacity: 0.7 }, L4);
          el("circle", { cx: ex, cy: ey, r: 3, fill: "#ff8a5c", opacity: 0.8 }, L4);
        }
      });
      labelText(L4, "a virus — a spiky protein shell");

      /* layer 5: a DNA double helix */
      var L5 = el("g", {}, root);
      var x0 = 56, xEnd = 424, amp = 34, period = 86, strandA = "", strandB = "", x;
      for (x = x0; x <= xEnd; x += 6) {
        var ph = (x - x0) / period * Math.PI * 2;
        strandA += (x === x0 ? "M" : "L") + x + "," + (CY + amp * Math.sin(ph)).toFixed(1) + " ";
        strandB += (x === x0 ? "M" : "L") + x + "," + (CY - amp * Math.sin(ph)).toFixed(1) + " ";
      }
      el("path", { d: strandA, fill: "none", stroke: "#5fe8a0", "stroke-width": 2.4 }, L5);
      el("path", { d: strandB, fill: "none", stroke: "#b8e986", "stroke-width": 2.4 }, L5);
      for (x = x0 + 14; x < xEnd; x += 22) {                                                                       // base-pair rungs
        var pr = (x - x0) / period * Math.PI * 2;
        el("line", { x1: x, y1: CY + amp * Math.sin(pr), x2: x, y2: CY - amp * Math.sin(pr), stroke: "#3a4d85", "stroke-width": 1.4 }, L5);
      }
      labelText(L5, "a strand of DNA");

      /* layer 6: atomic lattice + wavelength ruler */
      var L6 = el("g", {}, root);
      var SPACING = 56;
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 8; c++) {
          el("circle", { cx: 44 + c * SPACING, cy: 40 + r * SPACING, r: 9, fill: "#1f2a4f", stroke: "#6aa8ff" }, L6);
        }
      }
      // neutron wave matched to the lattice spacing
      var wave = "M44,210";
      for (var w = 0; w < 7; w++) {
        wave += " q" + (SPACING / 2) + ",-34 " + SPACING + ",0";
      }
      el("path", { d: wave, fill: "none", stroke: "#4fd8eb", "stroke-width": 2.4 }, L6);
      var t6 = el("text", { x: CX, y: 232, fill: "#4fd8eb", "text-anchor": "middle", "font-size": 10, "font-family": "IBM Plex Mono, monospace" }, L6);
      t6.textContent = "neutron wavelength ≈ atom spacing ✓";

      // large → small; centre = slider position where each layer peaks, chosen so
      // the size readout below roughly matches each object's real scale
      var layers = [L0, L1, L2, L3, L4, L5, L6];
      var centers = [0, 18, 33, 50, 66, 82, 96];
      var WIDTH = 14;

      var slider = document.getElementById("zoom");
      var out = document.getElementById("zoom-out");
      var label = document.getElementById("zoom-label");
      var svg = document.getElementById("zoom-svg");
      var captions = [
        "a £1 coin — about 2 cm across",
        "an amoeba — a single cell, roughly half a millimetre across and just visible to the naked eye",
        "a human hair — about 50 µm, a twentieth of a millimetre, thick",
        "a bacterium (like E. coli) — a rod-shaped cell about 2 µm long",
        "a virus — a spiky protein shell, around 100 nm across",
        "a strand of DNA — molecules just a few nanometres wide",
        "atoms — a few ångströms apart, and a slow neutron’s wave fits the spacing exactly"
      ];

      function fmtSize(z) {
        var metres = 0.02 * Math.pow(10, -8 * z / 100);
        if (metres >= 1e-2) return (metres * 100).toFixed(0) + " cm";
        if (metres >= 1e-3) return (metres * 1000).toFixed(0) + " mm";
        if (metres >= 1e-6) return (metres * 1e6).toFixed(metres >= 1e-5 ? 0 : 1) + " µm";
        if (metres >= 1e-9) return (metres * 1e9).toFixed(metres >= 1e-8 ? 0 : 1) + " nm";
        return (metres * 1e10).toFixed(1) + " Å";
      }

      function update() {
        var z = parseFloat(slider.value);
        var nearest = 0;
        layers.forEach(function (g, i) {
          var d = Math.abs(z - centers[i]);
          var op = Math.max(0, 1 - d / WIDTH);
          var sc = 0.7 + 0.9 * Math.max(0, Math.min(1, (z - (centers[i] - WIDTH)) / (2 * WIDTH)));
          g.style.opacity = op;
          g.style.transform = "scale(" + sc + ")";
          g.style.transformOrigin = CX + "px " + CY + "px";
          if (d < Math.abs(z - centers[nearest])) nearest = i;
        });
        out.textContent = fmtSize(z);
        label.textContent = captions[nearest];
        svg.setAttribute("aria-label", captions[nearest]);
      }
      slider.addEventListener("input", update);
      update();
    })();

    /* ================= S3: X-ray vs neutron contrast ================= */
    (function contrast() {
      var root = document.getElementById("mol-atoms");
      if (!root) return;

      // a hydrogen-rich molecule next to one heavy atom
      var atoms = [
        { x: 120, y: 120, elName: "C" }, { x: 170, y: 95, elName: "C" },
        { x: 220, y: 120, elName: "C" }, { x: 270, y: 95, elName: "C" },
        { x: 95, y: 90, elName: "H" }, { x: 110, y: 155, elName: "H" },
        { x: 160, y: 60, elName: "H" }, { x: 195, y: 150, elName: "H" },
        { x: 230, y: 85, elName: "H" }, { x: 260, y: 60, elName: "H" },
        { x: 295, y: 125, elName: "H" }, { x: 170, y: 130, elName: "Li" },
        { x: 360, y: 110, elName: "W" }
      ];
      // [radius, fill, opacity] per view
      var STYLE = {
        xray: { H: [2.5, "#8a96c2", 0.35], C: [8, "#c0c9e8", 0.85], Li: [3.5, "#8a96c2", 0.45], W: [22, "#eef2ff", 1] },
        neutron: { H: [9, "#4fd8eb", 1], C: [7, "#c0c9e8", 0.8], Li: [8.5, "#5fe8a0", 1], W: [8, "#c0c9e8", 0.75] }
      };

      // bonds (faint, static)
      [[0,1],[1,2],[2,3],[0,4],[0,5],[1,6],[2,7],[2,8],[3,9],[3,10]].forEach(function (b) {
        el("line", {
          x1: atoms[b[0]].x, y1: atoms[b[0]].y, x2: atoms[b[1]].x, y2: atoms[b[1]].y,
          stroke: "#233055", "stroke-width": 2
        }, root);
      });

      var nodes = atoms.map(function (a) {
        var c = el("circle", { cx: a.x, cy: a.y, r: 5, fill: "#fff" }, root);
        c.style.transition = "all 0.55s ease";
        var t = el("text", { x: a.x, y: a.y + (a.elName === "W" ? 38 : 22), "text-anchor": "middle", "font-size": 9, fill: "#8a96c2", "font-family": "IBM Plex Mono, monospace" }, root);
        t.textContent = a.elName === "W" ? "heavy metal" : a.elName;
        return { atom: a, circle: c };
      });

      var btnX = document.getElementById("view-xray");
      var btnN = document.getElementById("view-neutron");
      var labelEl = document.getElementById("mol-label");
      var svgEl = document.getElementById("mol-svg");

      function setView(v) {
        btnX.setAttribute("aria-pressed", String(v === "xray"));
        btnN.setAttribute("aria-pressed", String(v === "neutron"));
        svgEl.setAttribute("aria-label", v === "xray"
          ? "X-ray view: the heavy metal atom dominates the molecule; hydrogen and lithium are nearly invisible."
          : "Neutron view: hydrogen and lithium glow brightly; the heavy metal atom no longer dominates.");
        nodes.forEach(function (n) {
          var s = STYLE[v][n.atom.elName];
          n.circle.style.r = s[0] + "px";
          n.circle.style.fill = s[1];
          n.circle.style.fillOpacity = s[2];
        });
        labelEl.textContent = v === "xray"
          ? "X-rays: the heavy atom dominates, hydrogens almost vanish."
          : "Neutrons: hydrogen and lithium light up — the heavy atom no longer drowns them out.";
      }
      btnX.addEventListener("click", function () { setView("xray"); });
      btnN.addEventListener("click", function () { setView("neutron"); });
      setView("xray");
    })();

    /* ================= S4: magnetism grid ================= */
    (function magGrid() {
      var root = document.getElementById("mag-grid");
      if (!root) return;
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 6; c++) {
          var x = 110 + c * 50, y = 45 + r * 48;
          var up = (r + c) % 2 === 0;
          el("circle", { cx: x, cy: y, r: 11, fill: "#151d3a", stroke: "#3a4d85" }, root);
          el("path", {
            d: up ? "M" + x + "," + (y + 7) + " L" + x + "," + (y - 7) + " M" + (x - 3.5) + "," + (y - 3) + " L" + x + "," + (y - 7) + " L" + (x + 3.5) + "," + (y - 3)
                  : "M" + x + "," + (y - 7) + " L" + x + "," + (y + 7) + " M" + (x - 3.5) + "," + (y + 3) + " L" + x + "," + (y + 7) + " L" + (x + 3.5) + "," + (y + 3),
            stroke: up ? "#b78aff" : "#ff5d8f", "stroke-width": 2, fill: "none"
          }, root);
        }
      }
    })();

    /* ================= S5: muon precession ================= */
    (function muon() {
      var root = document.getElementById("muon-scene");
      if (!root) return;
      var CX = 210, CY = 110;

      // host lattice
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 5; c++) {
          el("circle", { cx: 90 + c * 60, cy: 50 + r * 60, r: 8, fill: "#151d3a", stroke: "#3a4d85" }, root);
        }
      }
      // muon at an interstitial site
      el("circle", { cx: CX, cy: CY, r: 9, fill: "#b78aff" }, root);
      var tt = el("text", { x: CX, y: CY + 30, "text-anchor": "middle", "font-size": 9, fill: "#b78aff", "font-family": "IBM Plex Mono, monospace" }, root);
      tt.textContent = "µ⁺";
      // precession cone
      el("ellipse", { cx: CX, cy: CY - 26, rx: 26, ry: 8, fill: "none", stroke: "#3a4d85", "stroke-dasharray": "3 4" }, root);
      // spin arrow (rotated by animation)
      var arrow = el("g", {}, root);
      el("line", { x1: CX, y1: CY, x2: CX + 24, y2: CY - 26, stroke: "#eef2ff", "stroke-width": 2.5 }, arrow);
      el("circle", { cx: CX + 24, cy: CY - 26, r: 4, fill: "#eef2ff" }, arrow);
      // positron flash (revealed on "decay")
      var positron = el("g", { opacity: 0 }, root);
      el("line", { x1: CX, y1: CY, x2: CX + 95, y2: CY - 92, stroke: "#5fe8a0", "stroke-width": 2, "stroke-dasharray": "6 4" }, positron);
      var pt = el("text", { x: CX + 100, y: CY - 98, "font-size": 9, fill: "#5fe8a0", "font-family": "IBM Plex Mono, monospace" }, positron);
      pt.textContent = "e⁺ — along the spin!";

      var slider = document.getElementById("prec-b");
      var out = document.getElementById("prec-b-out");
      slider.addEventListener("input", function () {
        out.textContent = slider.value + " G";
      });

      var pauseBtn = document.getElementById("prec-pause");
      if (reduceMotion) {
        if (pauseBtn) pauseBtn.hidden = true;
        return;
      }

      var paused = false, running = true;
      if (pauseBtn) {
        pauseBtn.addEventListener("click", function () {
          paused = !paused;
          pauseBtn.setAttribute("aria-pressed", String(paused));
          pauseBtn.textContent = paused ? "PLAY" : "PAUSE";
          if (!paused && !running) {
            running = true;
            last = null;
            requestAnimationFrame(frame);
          }
        });
      }

      var phase = 0, last = null, decayTimer = 0;
      function frame(ts) {
        if (paused) { running = false; return; }
        if (last == null) last = ts;
        var dt = (ts - last) / 1000;
        last = ts;
        var B = parseFloat(slider.value);
        phase += dt * B * 0.9;                       // rad — speed scales with field
        var px = CX + 26 * Math.cos(phase);
        var py = CY - 26 + 8 * Math.sin(phase);
        arrow.querySelector("line").setAttribute("x2", px);
        arrow.querySelector("line").setAttribute("y2", py);
        arrow.querySelector("circle").setAttribute("cx", px);
        arrow.querySelector("circle").setAttribute("cy", py);

        decayTimer += dt;
        if (decayTimer > 4.4) decayTimer = 0;        // a "decay" every ~4.4 s
        positron.setAttribute("opacity", decayTimer > 3.6 ? String(1 - (decayTimer - 3.6)) : "0");
        if (decayTimer > 3.6) {
          positron.querySelector("line").setAttribute("x2", CX + (px - CX) * 4);
          positron.querySelector("line").setAttribute("y2", CY + (py - CY) * 4);
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    })();

    /* ================= quiz ================= */
    window.MEQuiz.render(document.getElementById("quiz-box"), [
      {
        q: "Why are slowed-down neutrons such a good probe of materials?",
        choices: ["They’re cheap to produce", "Their wavelength matches the spacing between atoms", "They’re easy to detect with cameras", "They’re electrically charged, so they steer easily"],
        answer: 1,
        why: "A probe resolves detail comparable to its wavelength. Moderated neutrons have wavelengths of a few ångströms — exactly the atomic spacing in materials. (They’re also neutral, which is why they penetrate so deeply.)"
      },
      {
        q: "Your colleague studies lithium movement inside a working battery. Why neutrons rather than X-rays?",
        choices: ["Neutrons are faster to measure", "X-rays can’t penetrate the lab walls", "Light atoms like Li and H scatter neutrons well but are nearly invisible to X-rays next to heavy elements", "Neutrons are magnetic, and batteries are magnets"],
        answer: 2,
        why: "X-rays scatter off electrons, so light atoms vanish next to heavy ones. Neutron scattering strength varies almost randomly with the nucleus — Li and H show up clearly, even inside a sealed metal cell."
      },
      {
        q: "What does a single implanted muon report?",
        choices: ["The temperature of the whole sample", "The magnetic field at the exact spot where it sits, encoded in its precession rate", "The sample’s weight", "The average colour of the material"],
        answer: 1,
        why: "The muon’s spin precesses at a rate set by the local magnetic field, and its decay positron flies out preferentially along the spin direction — millions of decays reconstruct the field inside the material."
      },
      {
        q: "What sets a neutron’s wavelength?",
        choices: ["Its speed — slower means longer wavelength", "Its electric charge", "The detector that measures it", "Nothing — all neutrons are identical"],
        answer: 0,
        why: "λ × v ≈ 3,956 (Å·m/s). Slowing neutrons in a moderator is literally tuning their wavelength — and on a pulsed source, measuring arrival time measures speed, hence wavelength."
      }
    ]);
  });
})();
