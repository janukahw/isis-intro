/* ts1.html page logic: hall explorer hotspots, the particle simulation
   (canvas overlay on the static SVG plan), pulse timeline, quiz.
   Choreography only lives here — wavelength physics comes from MESynth. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var S = window.MESynth;

    /* ================= hall explorer (same grammar as the facility page) ================= */
    (function explorer() {
      var SPOTS = {
        epb1: {
          title: "EPB1 — the proton road",
          body: "The extracted proton beamline: 150 m of vacuum pipe and 68 magnets carrying 800 MeV protons (84% of light speed) from the synchrotron. Four of every five pulses come this way — think of a load balancer with a fixed 4:1 split.",
          stat: "160 kW", label: "average beam power delivered to TS1"
        },
        ts2b: {
          title: "The 1-in-5 branch",
          body: "A pulsed switchyard: every fifth pulse is deflected into a second beamline and sent to Target Station 2, which is optimized for cold, long-wavelength neutrons. TS1 keeps the other four.",
          stat: "10 /s", label: "pulses diverted to TS2"
        },
        mut: {
          title: "Muon target — 10 mm of graphite",
          body: "The proton beam passes straight through this thin slice. Fewer than 5% of protons collide in it, making pions that decay into muons within tens of nanoseconds. Muons are steered off both sides of the beamline while the barely-depleted proton beam carries on to the tungsten. Two probes from one accelerator.",
          stat: "<5%", label: "of protons interact — the rest fly on"
        },
        ec: {
          title: "EC muon facility",
          body: "Three μSR spectrometers — MuSR, EMU and HiFi — use “surface” muons, born right at the graphite target’s skin, all with the same momentum and spin direction. Implanted in a sample, each muon’s spin wobbles with the local magnetic field — a probe that reports atom by atom.",
          stat: "28 MeV/c", label: "surface-muon momentum, spin-polarized"
        },
        riken: {
          title: "RIKEN–RAL muon facility",
          body: "Japan’s RIKEN institute runs four muon ports on the other side of the beamline, using “decay” muons collected from pions that decay in flight. Higher momentum means they penetrate deeper — into bulkier samples and pressure cells. ARGUS and CHRONUS are its μSR workhorses.",
          stat: "17–120 MeV/c", label: "decay-muon momentum range"
        },
        monolith: {
          title: "The shielding monolith",
          body: "Several metres of steel and concrete wrap the target so the only neutrons that leave are the ones aimed down a beamline. Eighteen port channels pierce the shielding; everything else is absorbed.",
          stat: "18", label: "channels through the shielding"
        },
        ports: {
          title: "Eighteen beam ports",
          body: "Beamlines N1–N9 and S1–S9 fan out to the instruments, each viewing the moderator whose wavelength menu suits its science. Most instruments sit 10–40 m out; HRPD’s neutrons ride a curved guide to 96 m, buying it record wavelength resolution.",
          stat: "96 m", label: "HRPD’s flight path — the longest at TS1"
        },
        refl: {
          title: "Beryllium reflector",
          body: "A jacket of nickel-plated beryllium blocks around the target and moderators. Fast neutrons that would otherwise escape uselessly get bounced back for another chance at entering a moderator — a free flux multiplier, cooled by heavy water.",
          stat: "13", label: "Be blocks, electron-beam welded (2021 rebuild)"
        },
        target: {
          title: "Tantalum-clad tungsten target",
          body: "Ten tungsten plates, each clad in tantalum so the cooling water never touches bare tungsten. Every 800 MeV proton that lands chips ~20 neutrons off the nuclei it hits. The whole target–reflector–moderator assembly was replaced new in the 2021 refurbishment.",
          stat: "~5×10¹⁴", label: "neutrons per pulse (~20 per proton)"
        },
        mods: {
          title: "Four moderators",
          body: "Small tanks hugging the target: two of room-temperature water (300 K), one of liquid methane (100 K), one of liquid hydrogen (20 K). Neutrons rattle around inside until they move no faster than the molecules — so each temperature serves a different wavelength menu to its beamlines.",
          stat: "300→20 K", label: "three temperatures, three menus"
        }
      };
      var DEFAULT_CARD = {
        title: "Pick a part of the hall",
        body: "Click any highlighted region — or press Tab and Enter — to see what it does. Click again or press Escape to step back out."
      };

      var svg = document.getElementById("ts1-svg");
      var info = document.getElementById("hall-info");
      if (!svg || !info) return;
      var active = null;

      function pulse() {
        info.classList.remove("panel-update");
        void info.offsetWidth;
        info.classList.add("panel-update");
      }

      function showDefault(quiet) {
        active = null;
        svg.classList.remove("has-active");
        svg.querySelectorAll(".hotspot").forEach(function (h) { h.classList.remove("active"); });
        info.textContent = "";
        var h3 = document.createElement("h3");
        h3.textContent = DEFAULT_CARD.title;
        var p = document.createElement("p");
        p.textContent = DEFAULT_CARD.body;
        info.append(h3, p);
        if (!quiet) pulse();
      }

      function select(key) {
        if (key === active) { showDefault(); return; }
        active = key;
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
        var close = document.createElement("button");
        close.type = "button";
        close.className = "btn ghost";
        close.textContent = "✕ close";
        close.style.marginTop = "var(--sp-2)";
        close.addEventListener("click", showDefault);
        info.append(h3, p, stat, close);
        pulse();
        info.scrollIntoView({ block: "nearest" });
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
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && active) showDefault();
      });

      showDefault(true);
    })();

    /* ================= S2: pulse timeline ================= */
    (function pulseTimeline() {
      var BEATS = [
        {
          title: "T − 0.6 µs — the kick",
          body: "Kicker magnets in the synchrotron snap on in about 100 nanoseconds and throw two short proton bunches into EPB1. At 84% of light speed, the 150 m to the target hall takes 0.6 µs — the animation above stretches that blink into most of a second.",
          stat: "0.6 µs", label: "synchrotron door to tungsten"
        },
        {
          title: "T = 0 — impact",
          body: "The bunches hit the face of the tantalum-clad tungsten plates. Each 800 MeV proton blows ~20 neutrons out of the nuclei it strikes — spallation, as in chipping flakes off a rock. The beam dumps up to 160 kW into a shoebox of metal; cooling water carries the heat away.",
          stat: "~20", label: "neutrons per proton"
        },
        {
          title: "T + tens of µs — moderation",
          body: "Newborn neutrons are absurdly fast (MeV energies). Each rattles through a water, methane or hydrogen tank, losing energy with every bounce, and exits thousands of times slower — at wavelengths that match atomic structure. The few microseconds this takes sets the width of the neutron pulse.",
          stat: "MeV→meV", label: "a billion-fold energy drop in microseconds"
        },
        {
          title: "T + 2–50 ms — the flight",
          body: "Out in the beamlines the pulse spreads out by speed: 252.78 µs per metre of flight per ångström of wavelength. Arrival time tells you the wavelength — that is the whole measuring trick. At HRPD’s 96 m, a 2 Å neutron clocks in ~49 ms after impact, two pulses behind the one that made it; choppers keep the generations from mixing.",
          stat: "252.78", label: "µs per metre per ångström"
        },
        {
          title: "T + 25 ms — again",
          body: "The next pulse is already arriving while the slowest neutrons from this one are still in flight. Every detector event is stamped against its own pulse — 40 times a second, for thousands of hours of beam time a year.",
          stat: "40 /s", label: "pulse rate, every second of every run"
        }
      ];

      var wrap = document.getElementById("pulse-timeline");
      var panel = document.getElementById("pulse-info");
      if (!wrap || !panel) return;
      var nodes = wrap.querySelectorAll(".timeline-node");

      function show(i) {
        nodes.forEach(function (n, j) { n.setAttribute("aria-pressed", String(i === j)); });
        var b = BEATS[i];
        panel.textContent = "";
        var h3 = document.createElement("h3");
        h3.textContent = b.title;
        var p = document.createElement("p");
        p.textContent = b.body;
        var stat = document.createElement("p");
        stat.className = "stat";
        var num = document.createElement("span");
        num.className = "num";
        num.textContent = b.stat;
        var lab = document.createElement("span");
        lab.className = "label";
        lab.textContent = b.label;
        stat.append(num, lab);
        panel.append(h3, p, stat);
        panel.classList.remove("panel-update");
        void panel.offsetWidth;
        panel.classList.add("panel-update");
      }

      nodes.forEach(function (n, i) {
        n.addEventListener("click", function () { show(i); });
      });
      show(0);
      panel.classList.remove("panel-update");
    })();

    /* ================= S1: the particle simulation ================= */
    (function sim() {
      var svg = document.getElementById("ts1-svg");
      var canvas = document.getElementById("ts1-canvas");
      if (!svg || !canvas || !canvas.getContext || !S) return;
      var ctx = canvas.getContext("2d");

      var VW = 1200, VH = 660;          // virtual units = SVG viewBox
      var TG = { x: 790, y: 330 };      // target centre
      var BEAM_Y = 330, BEAM_X0 = 20, IMPACT_X = 760, MUT_X = 320, BRANCH_X = 150;
      var CYCLE = 2.4;                  // seconds per pulse at 1× speed
      var PROTON = "#ff5d8f", MUON = "#b78aff", FASTN = "#cfeffb";

      /* ---- geometry read straight from the SVG (single source of truth) ---- */
      var ports = [];
      svg.querySelectorAll("[data-port]").forEach(function (g) {
        var l = g.querySelector("line");
        var box = g.querySelector("rect");
        var p = {
          name: g.getAttribute("data-port"),
          x0: +l.getAttribute("x1"), y0: +l.getAttribute("y1"),
          x1: +l.getAttribute("x2"), y1: +l.getAttribute("y2"),
          bx: +box.getAttribute("x") + (+box.getAttribute("width")) / 2,
          by: +box.getAttribute("y") + (+box.getAttribute("height")) / 2,
          ext: null
        };
        p.angle = Math.atan2(p.y0 - TG.y, p.x0 - TG.x);
        var ext = g.querySelector("[data-ext]");
        if (ext) p.ext = { x: +ext.getAttribute("x2"), y: +ext.getAttribute("y2") };
        ports.push(p);
      });

      var mods = [];
      svg.querySelectorAll("[data-mod]").forEach(function (g) {
        var r = g.querySelector("rect");
        var cx = +r.getAttribute("x") + (+r.getAttribute("width")) / 2;
        var cy = +r.getAttribute("y") + (+r.getAttribute("height")) / 2;
        mods.push({
          cx: cx, cy: cy,
          T: +g.getAttribute("data-mod"),
          color: g.getAttribute("data-color"),
          angle: Math.atan2(cy - TG.y, cx - TG.x)
        });
      });

      function pathSampler(sel) {
        var el = svg.querySelector(sel);
        if (!el) return null;
        var L = el.getTotalLength();
        return function (t) { return el.getPointAtLength(Math.max(0, Math.min(1, t)) * L); };
      }
      var muPathN = pathSampler('[data-mupath="n"]');
      var muPathS = pathSampler('[data-mupath="s"]');
      var ts2Path = pathSampler('[data-mupath="ts2"]');
      var muEnds = { n: [], s: [] };
      svg.querySelectorAll("[data-muend]").forEach(function (r) {
        muEnds[r.getAttribute("data-muend")].push({
          x: +r.getAttribute("x") + (+r.getAttribute("width")) / 2,
          y: +r.getAttribute("y") + (+r.getAttribute("height")) / 2
        });
      });

      /* ---- wavelength sampling from the real moderator spectra ---- */
      function makeSampler(T) {
        var spec = S.moderatorSpectrum(T, 160);
        var cdf = [], acc = 0, i;
        for (i = 0; i < spec.y.length; i++) { acc += spec.y[i]; cdf.push(acc); }
        return function () {
          var r = Math.random() * acc;
          for (var j = 0; j < cdf.length; j++) if (cdf[j] >= r) return spec.x[j];
          return spec.x[spec.x.length - 1];
        };
      }
      var SAMPLERS = { 300: makeSampler(300), 100: makeSampler(100), 20: makeSampler(20) };

      /* screen speed honest in ratio: px/s ∝ real speed = VL/λ */
      function slowSpeed(lambda) {
        return Math.max(36, Math.min(380, (S.C.VL / lambda) * 0.09));
      }

      function portsNear(angle) {
        var sorted = ports.slice().sort(function (a, b) {
          return Math.abs(angDiff(a.angle, angle)) - Math.abs(angDiff(b.angle, angle));
        });
        return sorted.slice(0, 4);
      }
      function angDiff(a, b) {
        var d = a - b;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        return d;
      }

      /* ---- state ---- */
      /* spawned particles buffer until the end of the frame — pushing into
         `parts` mid-sweep would let the survivor rebuild drop newborns */
      var parts = [], born = [], glows = [], flash = null;
      var pulseNo = 0, ts1No = 0, ts2No = 0;
      var cycleT = 0, speed = 1;
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
      var playing = !reduce.matches;
      var stepping = false, visible = true, raf = null, last = 0;

      var hud = {
        pulse: document.getElementById("hud-pulse"),
        ts1: document.getElementById("hud-ts1"),
        ts2: document.getElementById("hud-ts2"),
        n: document.getElementById("hud-n"),
        state: document.getElementById("hud-state")
      };
      var SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
      function sup(n) {
        return String(n).split("").map(function (c) { return SUP[c] || c; }).join("");
      }
      function neutronTotal() {
        if (!ts1No) return "0";
        var v = ts1No * 5;                       // ×10¹⁴ neutrons
        var e = Math.floor(Math.log(v) / Math.LN10);
        var m = (v / Math.pow(10, e)).toFixed(1);
        return m + "×10" + sup(14 + e);
      }
      function updateHud() {
        if (!hud.pulse) return;
        hud.pulse.textContent = String(pulseNo);
        hud.ts1.textContent = String(ts1No);
        hud.ts2.textContent = String(ts2No);
        hud.n.textContent = neutronTotal();
      }
      function setState() {
        if (!hud.state) return;
        hud.state.textContent = playing ? "RUNNING" :
          (pulseNo === 0 ? "STANDBY — PRESS ▶" : "PAUSED");
      }

      /* ---- spawning ---- */
      function firePulse() {
        pulseNo++;
        var toTS2 = pulseNo % 5 === 0;
        if (toTS2) ts2No++; else ts1No++;
        born.push({
          kind: "train", x: BEAM_X0, toTS2: toTS2,
          branched: false, t: 0, sparked: false
        });
        updateHud();
      }

      function spawnMuons() {
        var i, side, ends, f, n = 7;
        for (i = 0; i < n; i++) {
          side = i < 4 ? "n" : "s";
          ends = muEnds[side];
          f = side === "n" ? muPathN : muPathS;
          if (!f || !ends.length) continue;
          born.push({
            kind: "mu", f: f, t: -0.06 * (i % 4), dur: 0.8 + Math.random() * 0.35,
            end: ends[Math.floor(Math.random() * ends.length)],
            junction: f(1), phase: 0, px: MUT_X, py: BEAM_Y
          });
        }
      }

      function spawnNeutrons() {
        var i, p, block, tx, ty, ang, sp;
        for (i = 0; i < 32; i++) {
          var aimed = i < 16 ? mods[i % 4] : null;
          if (aimed) {
            tx = aimed.cx + Math.random() * 14 - 7;
            ty = aimed.cy + Math.random() * 10 - 5;
            ang = Math.atan2(ty - TG.y, tx - TG.x);
            sp = 240 + Math.random() * 90;
          } else {
            ang = Math.random() * 2 * Math.PI;
            sp = 280 + Math.random() * 130;
          }
          p = {
            kind: "fast", x: TG.x, y: TG.y, px: TG.x, py: TG.y,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            aimed: aimed, sp: sp,
            willReflect: !aimed && Math.random() < 0.45,
            reflectR: 82 + Math.random() * 50, reflected: false
          };
          born.push(p);
        }
      }

      function toModn(p, block) {
        p.kind = "modn";
        p.block = block;
        p.timer = 0.14 + Math.random() * 0.12;
        p.seed = Math.random() * 7;
        p.color = block.color;
        p.T = block.T;
      }

      function toSlown(p) {
        var lambda = SAMPLERS[p.T]();
        var near = portsNear(p.block.angle);
        var port = near[Math.floor(Math.random() * near.length)];
        var legs = [
          { fx: p.x, fy: p.y, tx: port.x0, ty: port.y0 },
          { fx: port.x0, fy: port.y0, tx: port.x1, ty: port.y1 }
        ];
        if (port.ext) legs.push({ fx: port.x1, fy: port.y1, tx: port.ext.x, ty: port.ext.y });
        legs.forEach(function (l) {
          l.len = Math.sqrt((l.tx - l.fx) * (l.tx - l.fx) + (l.ty - l.fy) * (l.ty - l.fy));
        });
        p.kind = "slown";
        p.legs = legs;
        p.leg = 0;
        p.prog = 0;
        p.v = slowSpeed(lambda);
        p.port = port;
      }

      /* ---- per-frame update ---- */
      function step(dt) {
        cycleT += dt;
        if (cycleT >= CYCLE) {
          if (stepping) {
            stepping = false;
            playing = false;
            cycleT = CYCLE;
            setToggle();
            setState();
          } else {
            cycleT -= CYCLE;
            firePulse();
          }
        }

        if (flash) {
          flash.age += dt;
          if (flash.age > 0.32) flash = null;
        }
        var gKeep = [];
        glows.forEach(function (g) {
          g.age += dt;
          if (g.age < 0.45) gKeep.push(g);
        });
        glows = gKeep;

        var keep = [];
        parts.forEach(function (p) {
          if (update(p, dt)) keep.push(p);
        });
        parts = keep.concat(born);
        born = [];
        if (parts.length > 420) parts.splice(0, parts.length - 420);
      }

      function update(p, dt) {
        var r;
        if (p.kind === "train") {
          if (p.toTS2 && p.branched) {
            p.t += dt / 0.6;
            return p.t < 1.15 || (glows.push({ x: ts2Path(1).x, y: ts2Path(1).y, color: PROTON, age: 0 }), false);
          }
          p.x += 960 * dt;
          if (p.toTS2 && p.x >= BRANCH_X && ts2Path) { p.branched = true; p.t = 0; return true; }
          if (!p.toTS2 && !p.sparked && p.x >= MUT_X) { p.sparked = true; spawnMuons(); }
          if (!p.toTS2 && p.x >= IMPACT_X) {
            flash = { age: 0 };
            spawnNeutrons();
            return false;
          }
          return true;
        }

        if (p.kind === "mu") {
          p.px = p.x; p.py = p.y;
          if (p.phase === 0) {
            p.t += dt / p.dur;
            if (p.t < 0) { var s0 = p.f(0); p.x = s0.x; p.y = s0.y; return true; }
            var pt = p.f(p.t);
            p.x = pt.x; p.y = pt.y;
            if (p.t >= 1) { p.phase = 1; p.t = 0; }
          } else if (p.phase === 1) {
            p.t += dt / 0.3;
            p.x = p.junction.x + (p.end.x - p.junction.x) * p.t;
            p.y = p.junction.y + (p.end.y - p.junction.y) * p.t;
            if (p.t >= 1) { p.phase = 2; p.t = 0; }
          } else {
            p.t += dt / 0.3;            // decay pop at the instrument
            if (p.t >= 1) return false;
          }
          return true;
        }

        if (p.kind === "fast") {
          p.px = p.x; p.py = p.y;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          r = Math.sqrt((p.x - TG.x) * (p.x - TG.x) + (p.y - TG.y) * (p.y - TG.y));
          if (p.aimed && Math.abs(p.x - p.aimed.cx) < 15 && Math.abs(p.y - p.aimed.cy) < 11) {
            toModn(p, p.aimed);
            return true;
          }
          if (!p.aimed && p.willReflect && !p.reflected && r >= p.reflectR) {
            p.reflected = true;
            if (Math.random() < 0.6) {
              var block = mods[Math.floor(Math.random() * mods.length)];
              var ang = Math.atan2(block.cy - p.y, block.cx - p.x);
              p.aimed = block;
              p.vx = Math.cos(ang) * p.sp * 0.65;
              p.vy = Math.sin(ang) * p.sp * 0.65;
            } else {
              p.vx = -p.vx * 0.7;
              p.vy = -p.vy * 0.7;
            }
            return true;
          }
          return r < 158;
        }

        if (p.kind === "modn") {
          p.timer -= dt;
          p.seed += dt * 22;
          p.px = p.x; p.py = p.y;
          p.x = p.block.cx + Math.sin(p.seed) * 5;
          p.y = p.block.cy + Math.cos(p.seed * 1.3) * 4;
          if (p.timer <= 0) toSlown(p);
          return true;
        }

        if (p.kind === "slown") {
          p.px = p.x; p.py = p.y;
          p.prog += p.v * dt;
          while (p.leg < p.legs.length && p.prog >= p.legs[p.leg].len) {
            p.prog -= p.legs[p.leg].len;
            p.leg++;
          }
          if (p.leg >= p.legs.length) {
            glows.push({ x: p.port.bx, y: p.port.by, color: p.color, age: 0 });
            return false;
          }
          var l = p.legs[p.leg], f = p.prog / l.len;
          p.x = l.fx + (l.tx - l.fx) * f;
          p.y = l.fy + (l.ty - l.fy) * f;
          return true;
        }

        return false;
      }

      /* ---- drawing ---- */
      function dot(x, y, px, py, r, color, alpha) {
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = color;
        ctx.lineWidth = r;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
      }

      function draw() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var k = canvas.width / VW;
        ctx.setTransform(k, 0, 0, k, 0, 0);
        ctx.globalCompositeOperation = "lighter";

        glows.forEach(function (g) {
          var a = 0.55 * (1 - g.age / 0.45);
          ctx.globalAlpha = a;
          ctx.strokeStyle = g.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(g.x, g.y, 5 + g.age * 38, 0, 2 * Math.PI);
          ctx.stroke();
        });

        if (flash) {
          var fa = 1 - flash.age / 0.32;
          ctx.globalAlpha = 0.8 * fa;
          ctx.strokeStyle = "#ffd9a0";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(TG.x, TG.y, 8 + flash.age * 240, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.globalAlpha = 0.5 * fa;
          ctx.fillStyle = "#ffd9a0";
          ctx.fillRect(756, 312, 66, 36);
        }

        parts.forEach(function (p) {
          if (p.kind === "train") {
            var b, i, px, alpha;
            for (b = 0; b < 2; b++) {
              for (i = 0; i < 6; i++) {
                if (p.toTS2 && p.branched) {
                  var ti = p.t - (b * 0.12 + i * 0.018);
                  if (ti < 0 || ti > 1) continue;
                  var pt = ts2Path(ti);
                  dot(pt.x, pt.y, pt.x, pt.y, 2.4, PROTON, 0.75 * (1 - p.t * 0.4));
                } else {
                  px = p.x - (b * 34 + i * 5.5);
                  if (px < BEAM_X0) continue;
                  alpha = p.sparked ? 0.8 : 0.92;
                  dot(px, BEAM_Y + Math.sin(px * 0.32 + b * 2) * 1.4,
                    px - 7, BEAM_Y + Math.sin(px * 0.32 + b * 2) * 1.4,
                    2.6, PROTON, alpha);
                }
              }
            }
          } else if (p.kind === "mu") {
            if (p.phase === 2) {
              ctx.globalAlpha = 0.6 * (1 - p.t);
              ctx.strokeStyle = MUON;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(p.end.x, p.end.y, 3 + p.t * 11, 0, 2 * Math.PI);
              ctx.stroke();
            } else if (p.t >= 0) {
              dot(p.x, p.y, p.px, p.py, 2.2, MUON, 0.9);
            }
          } else if (p.kind === "fast") {
            var r = Math.sqrt((p.x - TG.x) * (p.x - TG.x) + (p.y - TG.y) * (p.y - TG.y));
            var a = Math.max(0, Math.min(1, 1 - (r - 100) / 58));
            dot(p.x, p.y, p.px, p.py, 1.8, FASTN, 0.85 * (p.aimed ? 1 : a));
          } else if (p.kind === "modn") {
            dot(p.x, p.y, p.px, p.py, 2, p.color, 0.9);
          } else if (p.kind === "slown") {
            dot(p.x, p.y, p.px, p.py, 2.2, p.color, 0.95);
          }
        });

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      /* ---- sizing ---- */
      var stage = canvas.parentElement;
      function resize() {
        var w = stage.clientWidth, h = stage.clientHeight;
        var dpr = window.devicePixelRatio || 1;
        var cw = Math.round(w * dpr), chh = Math.round(h * dpr);
        if (canvas.width !== cw || canvas.height !== chh) {
          canvas.width = cw;
          canvas.height = chh;
          draw();
        }
      }
      if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
      else window.addEventListener("resize", resize);
      resize();

      /* ---- loop control: run only while playing and on screen ---- */
      function frame(ts) {
        raf = null;
        var dt = Math.min((ts - last) / 1000, 0.05);
        last = ts;
        if (visible && playing) {
          step(dt * speed);
          draw();
          raf = requestAnimationFrame(frame);
        } else {
          draw();
        }
      }
      function kick() {
        if (!raf && visible && playing) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      }

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
          if (visible) kick();
        }, { rootMargin: "100px" }).observe(stage);
      }

      /* ---- controls ---- */
      var toggleBtn = document.getElementById("sim-toggle");
      var stepBtn = document.getElementById("sim-step");
      function setToggle() {
        if (toggleBtn) toggleBtn.textContent = playing ? "⏸ PAUSE" : "▶ RUN";
      }
      if (toggleBtn) toggleBtn.addEventListener("click", function () {
        playing = !playing;
        stepping = false;
        if (playing && pulseNo === 0) { firePulse(); cycleT = 0; }
        setToggle();
        setState();
        kick();
      });
      if (stepBtn) stepBtn.addEventListener("click", function () {
        if (playing && !stepping) return;       // already free-running
        firePulse();
        cycleT = 0;
        stepping = true;
        playing = true;
        setToggle();
        setState();
        kick();
      });
      document.querySelectorAll("[data-speed]").forEach(function (b) {
        b.addEventListener("click", function () {
          document.querySelectorAll("[data-speed]").forEach(function (o) {
            o.setAttribute("aria-pressed", String(o === b));
          });
          speed = parseFloat(b.dataset.speed);
        });
      });

      reduce.addEventListener("change", function () {
        if (reduce.matches) { playing = false; setToggle(); setState(); }
      });

      /* ---- start ---- */
      if (playing) { firePulse(); cycleT = 0; }
      setToggle();
      setState();
      kick();
      draw();
    })();

    /* ================= quiz ================= */
    window.MEQuiz.render(document.getElementById("quiz-box"), [
      {
        q: "How much of the synchrotron’s output does TS1 receive?",
        choices: ["Every pulse — TS2 has its own accelerator", "4 of every 5 pulses, 40 per second", "1 of every 5 pulses", "Half, alternating with TS2"],
        answer: 1,
        why: "The 50 Hz synchrotron feeds both target stations from one beam: four consecutive pulses go down EPB1 to TS1, then the fifth is switched into a second beamline for TS2."
      },
      {
        q: "What is the thin graphite slice in the proton beamline for?",
        choices: ["It filters stray neutrons out of the beam", "It slows the protons before they hit tungsten", "Collisions in it make pions, which decay into the muons used by the muon instruments", "It measures the beam current"],
        answer: 2,
        why: "Fewer than 5% of protons interact in the 10 mm of graphite, making short-lived pions that decay to muons within tens of nanoseconds. The barely-depleted beam carries on to the tungsten target — two probes from one accelerator."
      },
      {
        q: "Why is the tungsten target surrounded by tanks of water, methane and hydrogen?",
        choices: ["To cool the tungsten plates", "To absorb dangerous radiation", "They are moderators: neutrons bounce around inside and come out slow enough — long enough in wavelength — to be useful", "To reflect neutrons back into the target"],
        answer: 2,
        why: "Fresh spallation neutrons are far too fast to probe atomic structure. Each moderator tank slows them to the speed of its own molecules, so its temperature — 300 K water down to 20 K liquid hydrogen — sets the wavelength menu its beamlines receive. (Cooling water and the beryllium reflector are separate jobs.)"
      },
      {
        q: "HRPD sits 96 m from the target — most TS1 instruments are 10–40 m out. What does the extra distance buy?",
        choices: ["A quieter, lower-radiation building", "More neutrons reach the sample", "A longer flight spreads arrival times apart, giving much finer wavelength resolution", "It avoids the muon beamlines"],
        answer: 2,
        why: "Time-of-flight resolution improves with flight path: the same wavelength difference is many more microseconds apart after 96 m than after 10 m. HRPD trades intensity for record resolution — and its choppers stop neutrons from different pulses overtaking each other."
      }
    ]);
  });
})();
