/* ts2.html page logic: hall explorer hotspots, the particle simulation
   (canvas overlay on the static SVG plan), pulse timeline, quiz.
   Choreography only lives here — wavelength physics comes from MESynth.
   Facts: ISIS Practical Guide + EPAC'04/'08 papers (see how.html sources). */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var S = window.MESynth;

    /* ================= hall explorer (same grammar as the TS1 page) ================= */
    (function explorer() {
      var SPOTS = {
        epb1: {
          title: "EPB1 — the through line",
          body: "All 50 pulses a second leave the synchrotron down this line. Four in five ride straight past this junction to the muon target and TS1; TS2's share is switched out here. Think of a tap off a main.",
          stat: "40 /s", label: "pulses that pass by to TS1"
        },
        kick: {
          title: "The 1-in-5 switch",
          body: "Two 'slow kicker' magnets (K1, K2) and a septum magnet are energised before every fifth synchrotron pulse, deflecting it out of EPB1 and into EPB2. No moving parts — just magnets timed to the machine's 50 Hz heartbeat.",
          stat: "1 in 5", label: "pulses diverted — 10 every second"
        },
        epb2: {
          title: "EPB2 — the 143 m detour",
          body: "A 143 m beamline with 57 steering and focusing magnets carries the diverted pulses to the TS2 building, south of the main facility — dropping 1.5 m and bending 30° left through the hall of NIMROD, the 1960s accelerator ISIS inherited its buildings from. It lands a beam spot stable to better than a millimetre.",
          stat: "143 m", label: "from the junction to the target"
        },
        window: {
          title: "The proton beam window",
          body: "A 0.5 mm aluminium-alloy membrane separates the beamline vacuum from the target vessel. TS2's gentler beam deposits only ~10 W of heat in it, so unlike TS1's window it needs no cooling — and it lasted a decade before its first replacement in 2018.",
          stat: "0.5 mm", label: "of aluminium in the beam's path"
        },
        monolith: {
          title: "The shielding monolith",
          body: "Metres of steel wrapped in about a metre of concrete surround the target, so the only neutrons that escape are the ones aimed down a beamline. Everything else is absorbed.",
          stat: "~1 m", label: "of concrete over metres of steel"
        },
        target: {
          title: "Tantalum-clad tungsten cylinder",
          body: "Unlike TS1's stack of plates, the TS2 target is one solid tungsten cylinder — 68 mm across, ~300 mm long, about the size of a house brick — clad in tantalum and water-cooled on its face and curved surface. At a fifth of TS1's beam power, compact is enough, and it lets both moderators sit hard against the target.",
          stat: "~4×10¹⁴", label: "neutrons per pulse, at ~15 per proton (facility-wide yield)"
        },
        mods: {
          title: "Two deep-frozen moderators",
          body: "Liquid hydrogen at 20 K — 'coupled', with an open view of the reflector, serving more neutrons in a slightly blurrier pulse — and solid methane at 47 K, 'decoupled' behind an absorbing liner for crisper timing. The coldest moderators at ISIS: cold molecules mean slow neutrons, and slow means long wavelengths.",
          stat: "20 K", label: "liquid hydrogen — about minus 253 Celsius"
        },
        refl: {
          title: "Beryllium reflector",
          body: "Nickel-plated beryllium blocks pack every space around the target that isn't moderator (TS1 uses beryllium rods in steel instead). Fast neutrons that would escape uselessly get bounced back for another chance at a moderator — a free flux multiplier.",
          stat: "Be", label: "nickel-plated blocks around the core"
        },
        ports: {
          title: "Eleven beamlines",
          body: "Seven instruments opened the station in 2009, and four more were funded in 2011, ChipIr first. Each views the moderator whose wavelength menu suits its science — the hydrogen face for the longest wavelengths, the methane face for sharper timing.",
          stat: "7 + 4", label: "phase one + phase two instruments"
        }
      };
      var DEFAULT_CARD = {
        title: "Pick a part of the hall",
        body: "Click any highlighted region — or press Tab and Enter — to see what it does. Click again or press Escape to step back out."
      };

      var svg = document.getElementById("ts2-svg");
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

      /* clicking anywhere outside the simulation figure (or its info card)
         steps back out, same as Escape */
      var frame = svg.closest(".figure-frame");
      document.addEventListener("click", function (ev) {
        if (!active) return;
        if ((frame && frame.contains(ev.target)) || info.contains(ev.target)) return;
        showDefault();
      });

      showDefault(true);
    })();

    /* ================= S2: pulse timeline ================= */
    (function pulseTimeline() {
      var BEATS = [
        {
          title: "T − 0.6 µs — the switch",
          body: "The slow kickers and septum, armed since before the pulse left the synchrotron, nudge it sideways out of EPB1 into EPB2 — 143 m of beamline that drops 1.5 m, bends 30° left, and threads through the old NIMROD hall. At 84% of light speed the whole detour takes well under a microsecond.",
          stat: "0.6 µs", label: "from the kicker to the tungsten, door to door"
        },
        {
          title: "T = 0 — impact",
          body: "About 2.8×10¹³ protons land on the face of the tantalum-clad tungsten cylinder. Spallation chips ~15–20 neutrons off each struck nucleus's neighbourhood — the same trick as TS1, at a fifth of the pulse rate and roughly a fifth of the power, which is why one compact, water-cooled cylinder is enough.",
          stat: "2.8×10¹³", label: "protons per pulse"
        },
        {
          title: "T + tens of µs — the deep freeze",
          body: "Newborn neutrons rattle into one of two cryogenic moderators: liquid hydrogen at 20 K or solid methane at 47 K. The hydrogen is 'coupled' — open to the reflector, more neutrons, slightly blurrier pulse; the methane is 'decoupled' behind an absorbing liner, trading flux for crisper timing. Cold molecules → slow neutrons → long wavelengths.",
          stat: "20 K", label: "the coldest moderator on site"
        },
        {
          title: "T + 2–100 ms — the slow flight",
          body: "A 10 Å neutron ambles down a beamline at roughly 400 m/s — slower than a rifle bullet — so it needs tens of milliseconds to reach a detector. That is exactly what 10 Hz buys: 100 ms of clock between pulses, a five-times-wider wavelength window than a 50 Hz station allows on the same flight path, before the next pulse's neutrons fold in.",
          stat: "100 ms", label: "between pulses — room for the long wavelengths"
        },
        {
          title: "T + 100 ms — again",
          body: "The kickers arm, the next fifth pulse turns off the main line, and another 100 ms frame opens. Ten times a second, every detector event time-stamped against its own pulse.",
          stat: "10 /s", label: "pulse rate, every second of every run"
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
      var svg = document.getElementById("ts2-svg");
      var canvas = document.getElementById("ts2-canvas");
      if (!svg || !canvas || !canvas.getContext || !S) return;
      var ctx = canvas.getContext("2d");

      var VW = 1200, VH = 660;          // virtual units = SVG viewBox
      var TG = { x: 790, y: 375 };      // target centre
      var BEAM_Y = 70, BEAM_X0 = 20, BEAM_X1 = 1180, KICK_X = 262;
      var CYCLE = 1.0;                  // seconds per synchrotron pulse at 1×
      var PATH_DUR = 0.95;              // seconds the diverted pulse spends on EPB2
      var PROTON = "#ff5d8f", FASTN = "#cfeffb";

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
          by: +box.getAttribute("y") + (+box.getAttribute("height")) / 2
        };
        p.angle = Math.atan2(p.y0 - TG.y, p.x0 - TG.x);
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

      var epb2El = svg.querySelector('[data-ppath="epb2"]');
      var epb2Len = epb2El ? epb2El.getTotalLength() : 0;
      function epb2At(t) {
        return epb2El.getPointAtLength(Math.max(0, Math.min(1, t)) * epb2Len);
      }

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
      var SAMPLERS = { 20: makeSampler(20), 47: makeSampler(47) };

      /* screen speed honest in ratio: px/s ∝ real speed = VL/λ.
         TS2's cold spectra make these visibly slower than TS1's. */
      function slowSpeed(lambda) {
        return Math.max(30, Math.min(380, (S.C.VL / lambda) * 0.09));
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
        if (!ts2No) return "0";
        var v = ts2No * 4;                       // ×10¹⁴ neutrons (≈2.8e13 p × ~15 n/p)
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
        born.push({ kind: "train", x: BEAM_X0, toTS2: toTS2, branched: false, t: 0 });
        updateHud();
      }

      function spawnNeutrons() {
        var i, p, tx, ty, ang, sp;
        for (i = 0; i < 30; i++) {
          var aimed = i < 14 ? mods[i % 2] : null;
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
            willReflect: !aimed && Math.random() < 0.5,
            reflectR: 82 + Math.random() * 50, reflected: false
          };
          born.push(p);
        }
      }

      function toModn(p, block) {
        p.kind = "modn";
        p.block = block;
        p.timer = 0.16 + Math.random() * 0.14;
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
          if (p.branched) {
            p.t += dt / PATH_DUR;
            if (p.t >= 1) {
              flash = { age: 0 };
              spawnNeutrons();
              return false;
            }
            return true;
          }
          p.x += 1300 * dt;
          if (p.toTS2 && p.x >= KICK_X && epb2El) {
            p.branched = true;
            p.t = 0;
            glows.push({ x: KICK_X - 8, y: BEAM_Y, color: PROTON, age: 0 });
            return true;
          }
          return p.x < BEAM_X1 + 60;     // pass-by pulses exit toward TS1
        }

        if (p.kind === "fast") {
          p.px = p.x; p.py = p.y;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          r = Math.sqrt((p.x - TG.x) * (p.x - TG.x) + (p.y - TG.y) * (p.y - TG.y));
          if (p.aimed && Math.abs(p.x - p.aimed.cx) < 16 && Math.abs(p.y - p.aimed.cy) < 11) {
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
          ctx.fillRect(760, 360, 60, 30);
        }

        parts.forEach(function (p) {
          if (p.kind === "train") {
            var b, i;
            for (b = 0; b < 2; b++) {
              for (i = 0; i < 6; i++) {
                if (p.branched) {
                  var ti = p.t - (b * 0.06 + i * 0.012);
                  if (ti < 0 || ti > 1) continue;
                  var pt = epb2At(ti);
                  dot(pt.x, pt.y, pt.x, pt.y, 2.4, PROTON, 0.85);
                } else {
                  var px = p.x - (b * 34 + i * 5.5);
                  if (px < BEAM_X0) continue;
                  dot(px, BEAM_Y + Math.sin(px * 0.32 + b * 2) * 1.4,
                    px - 7, BEAM_Y + Math.sin(px * 0.32 + b * 2) * 1.4,
                    2.6, PROTON, p.toTS2 ? 0.92 : 0.55);
                }
              }
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
      /* always fires a fresh pulse, then auto-pauses at the end of its cycle
         — most pulses pass by toward TS1; every fifth is the show */
      if (stepBtn) stepBtn.addEventListener("click", function () {
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
        q: "How much of the synchrotron’s output does TS2 receive?",
        choices: ["Every pulse, alternating with TS1", "1 of every 5 pulses — 10 per second", "4 of every 5 pulses", "Only night shifts"],
        answer: 1,
        why: "Slow kicker magnets, energised before every fifth pulse, switch it out of EPB1 into a second beamline. The lower 10 Hz rate is deliberate: it gives slow, long-wavelength neutrons a 100 ms frame to reach the detectors before the next pulse."
      },
      {
        q: "What was TS2 built for?",
        choices: ["Higher beam power than TS1", "Producing muons", "Cold, long-wavelength neutrons for big, soft structures — polymers, proteins, membranes", "Replacing TS1 when it retires"],
        answer: 2,
        why: "TS2 trades raw pulse rate for an optimized cold spectrum. Long wavelengths are long rulers — exactly what soft matter, biology and advanced-materials science need. (Muons stay on the TS1 side: their thin graphite target sits in EPB1.)"
      },
      {
        q: "Which moderator pair does TS2 run?",
        choices: ["Two water tanks at 300 K", "Liquid hydrogen and solid methane", "Liquid helium and graphite", "It needs no moderators"],
        answer: 1,
        why: "TS2’s pair is liquid hydrogen at 20 K (coupled — more neutrons, broader pulses) plus solid methane at 47 K (decoupled — sharper timing). Colder than TS1’s menu, which is what shifts the spectrum toward long wavelengths."
      },
      {
        q: "TS1’s target is a stack of tungsten plates. What is TS2’s?",
        choices: ["The same stack of plates", "A single solid tungsten cylinder, clad in tantalum — about house-brick-sized", "A tank of liquid mercury", "A graphite block"],
        answer: 1,
        why: "At roughly a fifth of TS1’s beam power, one compact water-cooled cylinder (68 mm across, ~300 mm long) is enough — and its small size lets both cryogenic moderators sit hard against it, which buys real flux."
      }
    ]);
  });
})();
