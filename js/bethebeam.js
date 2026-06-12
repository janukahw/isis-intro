/* bethebeam.html page logic — the ride engine. One continuous first-person
   flight: the camera rides each chapter's spline with a directed gaze (the
   viewer never steers), chapters hand off automatically behind a quick dark
   dip, and facts pass by as timed HUD captions — the in-page storyboard is
   the reading layer. The HUD stays honest: energies come from the chapter
   data in BTBScenes, speeds from MESynth relativistic kinematics. Falls back
   to the storyboard when WebGL is missing or the OS asks for reduced motion. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var T = window.THREE, S = window.MESynth, A = window.BTBAudio;
    var SC = window.BTBScenes;

    var startBtn = document.getElementById("btb-start");
    var quietBtn = document.getElementById("btb-start-quiet");
    var note = document.getElementById("btb-hero-note");
    var overlay = document.getElementById("btb-overlay");
    if (!startBtn || !overlay) return;

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    function webglOK() {
      try {
        var c = document.createElement("canvas");
        return !!(window.WebGLRenderingContext &&
          (c.getContext("webgl") || c.getContext("experimental-webgl")));
      } catch (e) { return false; }
    }

    var rideable = !!(T && S && SC) && webglOK();
    if (reduced.matches || !rideable) {
      // The start button keeps its href and simply jumps to the storyboard.
      note.textContent = reduced.matches
        ? "Your system asks for reduced motion, so the ride stays parked — the button jumps to the storyboard, which is the whole journey in reading order."
        : "This browser can't run the 3D ride (WebGL unavailable) — the button jumps to the storyboard, which is the whole journey in reading order.";
      return;
    }

    /* ---------- elements ---------- */
    var canvas = document.getElementById("btb-canvas");
    var flashEl = document.getElementById("btb-flash");
    var vignette = document.getElementById("btb-vignette");
    var locEl = document.getElementById("btb-loc");
    var subEl = document.getElementById("btb-sub");
    var roYou = document.getElementById("ro-you");
    var roEnergy = document.getElementById("ro-energy");
    var roSpeed = document.getElementById("ro-speed");
    var roFill = document.getElementById("ro-speedfill");
    var roClock = document.getElementById("ro-clock");
    var roExtraWrap = document.getElementById("ro-extra-wrap");
    var roExtra = document.getElementById("ro-extra");
    var rail = document.getElementById("btb-rail");
    var endEl = document.getElementById("btb-end");
    var termEvent = document.getElementById("btb-term-event");
    var againBtn = document.getElementById("btb-again");
    var endExitBtn = document.getElementById("btb-end-exit");
    var muteBtn = document.getElementById("btb-mute");
    var exitBtn = document.getElementById("btb-exit");
    var mapDot = document.getElementById("bm-dot");
    var mapHalo = document.getElementById("bm-halo");

    var CH = SC.CHAPTERS;

    /* minimap route — SVG coords per chapter, k 0..1; endpoints chain so the
       dot never jumps across a dissolve */
    var RING = { cx: 104, cy: 70, r: 26 };
    function ringPt(deg) {
      var a = deg * Math.PI / 180;
      return [RING.cx + RING.r * Math.cos(a), RING.cy + RING.r * Math.sin(a)];
    }
    function seg(x0, y0, x1, y1) {
      return function (k) { return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]; };
    }
    var MAP = [
      seg(8, 118, 16, 118),                              // 01 ion source
      seg(16, 118, 36, 118),                             // 02 RFQ
      seg(36, 118, 78, 118),                             // 03 linac
      seg(78, 118, 85.6, 88.4),                          // 04 up to the stripping foil
      function (k) { return ringPt(135 - k * 1215); },   // 05 ring: 3 laps, out at 0°
      seg(130, 70, 158, 70),                             // 06 extraction → EPB1
      seg(158, 70, 172, 70),                             // 07 past the muon target
      seg(172, 70, 193, 70),                             // 08 into the tungsten
      function (k, time) {                               // 09 rattling inside TS1
        var r = 2.6 * (1 - k * 0.75);
        // amplitude eases in from ch8's endpoint and out again, so the
        // endpoints chain exactly: (193,70) → rattle → (193,72)
        var e = Math.min(1, k * 8, (1 - k) * 8);
        return [193 + Math.sin(time * 3.1) * r * e,
                70 + 2 * Math.min(1, k * 8) + Math.cos(time * 2.4) * r * e];
      },
      seg(193, 72, 208, 93),                             // 10 beamline (stops short of the sample)
      function (k) {                                     // 11 to the sample, then the Bragg kink
        if (k < 0.57) {                                  // approach — scatter event lands at k≈0.57
          var a = k / 0.57;
          return [208 + 5 * a, 93 + 7 * a];
        }
        // 45° left off the beam axis to the detector, arriving at the flash (k≈0.98)
        var m = Math.min(1, (k - 0.57) / 0.41);
        return [213 + 4.5 * m, 100 + 0.8 * m];
      }
    ];

    /* ---------- engine state ---------- */
    var renderer = null, camera = null;
    var ctx = null;            // current scene context from build()
    var chapter = null, idx = 0;
    var mode = "idle";         // idle | fly | paused | end
    var t = 0, sceneTime = 0, lastNow = 0, rafId = 0;
    /* chapter handoff: a film dissolve — both scenes render to targets and a
       fullscreen quad blends them while the outgoing camera keeps flying */
    var TRANS_S = 2.5;
    var trans = null;          // { ctx, t, tangent, speed, look }
    var outCam = null;
    var rtA = null, rtB = null, blendScene = null, blendCam = null, blendMat = null;
    var fired = [];
    var shakeAmt = 0;
    var lookTarget = null, lookInit = false;
    var soundOn = false, audioStarted = false;
    var typeTimer = 0;
    var dots = [], railCount = null;

    /* ---------- formatting ---------- */
    function fmtE(mev) {
      if (mev >= 1) return (mev >= 100 ? Math.round(mev) : +mev.toPrecision(3)) + " MeV";
      if (mev >= 1e-3) return +(mev * 1e3).toPrecision(3) + " keV";
      if (mev >= 1e-6) return +(mev * 1e6).toPrecision(3) + " eV";
      return +(mev * 1e9).toPrecision(2) + " meV";
    }
    function fmtV(beta) {
      if (beta >= 0.01) return (beta * 100).toFixed(1) + "% c";
      var v = beta * S.C.C_KMS;
      return (v >= 100 ? Math.round(v) : +v.toFixed(1)) + " km/s";
    }
    function fmtClock(us) {
      if (us < 1) return us.toFixed(2) + " µs";
      if (us < 100) return us.toFixed(1) + " µs";
      if (us < 1000) return Math.round(us) + " µs";
      var ms = us / 1000;
      return (ms < 100 ? ms.toFixed(2) : ms.toFixed(1)) + " ms";
    }
    function logLerp(a, b, k) {
      if (a === b) return a;
      if (a <= 0) return a + (b - a) * k;
      return a * Math.pow(b / a, k);
    }
    function smooth(x) { return x * x * (3 - 2 * x); }
    /* camera easing with a non-zero slope at both ends, so the proton never
       quite stops at a chapter boundary — the dissolve carries the motion */
    function glide(x) { return 0.35 * x + 0.65 * smooth(x); }

    /* ---------- HUD helpers ---------- */
    function setYou(s) {
      roYou.textContent = s;
      var c = s === "p⁺" ? "var(--proton)" : "var(--neutron)";
      mapDot.style.fill = c;
      mapHalo.style.fill = c;
    }
    function setTint(c) { vignette.style.setProperty("--btb-tint", c); }
    function flash(strength) {
      flashEl.classList.add("now");
      flashEl.style.opacity = String(strength);
      void flashEl.offsetWidth;
      flashEl.classList.remove("now");
      flashEl.style.opacity = "0";
    }

    /* ---------- audio helpers ---------- */
    function audioBegin() {
      if (!A || !A.supported) return;
      A.start();
      audioStarted = true;
      A.setMuted(!soundOn);
      if (chapter) A.setIntensity(chapter.intensity);
    }
    function syncMuteBtn() {
      // fixed accessible name + aria-pressed = engaged (same pattern as probes.js PAUSE)
      muteBtn.setAttribute("aria-pressed", String(!soundOn));
    }
    function toggleSound() {
      soundOn = !soundOn;
      if (soundOn && !audioStarted) audioBegin();
      else if (A && A.supported) A.setMuted(!soundOn);
      syncMuteBtn();
    }

    /* ---------- rail ---------- */
    function buildRail() {
      rail.textContent = "";
      dots = [];
      var prev = document.createElement("button");
      prev.type = "button";
      prev.className = "btb-rail-step";
      prev.textContent = "‹";
      prev.setAttribute("aria-label", "Previous stop");
      prev.addEventListener("click", function () { jump(Math.max(0, idx - 1)); });
      rail.appendChild(prev);
      CH.forEach(function (ch, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "btb-dot";
        b.title = ch.loc;
        b.setAttribute("aria-label", "Jump to stop " + (i + 1) + " of 11: " + ch.loc);
        b.addEventListener("click", function () { jump(i); });
        rail.appendChild(b);
        dots.push(b);
      });
      railCount = document.createElement("span");
      railCount.className = "btb-rail-count";
      rail.appendChild(railCount);
      var next = document.createElement("button");
      next.type = "button";
      next.className = "btb-rail-step";
      next.textContent = "›";
      next.setAttribute("aria-label", "Next stop");
      next.addEventListener("click", function () { jump(Math.min(CH.length - 1, idx + 1)); });
      rail.appendChild(next);
    }
    function syncRail() {
      dots.forEach(function (d, i) {
        d.classList.toggle("done", i < idx);
        if (i === idx) d.setAttribute("aria-current", "step");
        else d.removeAttribute("aria-current");
      });
      railCount.textContent = (idx + 1) + " / " + CH.length;
    }

    /* ---------- scene lifecycle ---------- */
    function disposeScene(c) {
      if (!c) return;
      c.scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          var mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(function (m) {
            // shared cached textures (dot sprite, neon frames) outlive scenes
            if (m.map && !(m.map.userData && m.map.userData.shared)) m.map.dispose();
            m.dispose();
          });
        }
      });
    }
    function killTransition() {
      if (!trans) return;
      disposeScene(trans.ctx);
      trans = null;
    }

    function loadChapter(i) {
      disposeScene(ctx);
      ctx = null;
      idx = i;
      chapter = CH[i];
      ctx = chapter.build(T);
      t = 0;
      // sceneTime deliberately keeps running — an outgoing scene mid-dissolve
      // must not see its clock jump backwards
      fired = chapter.events.map(function () { return false; });
      shakeAmt = 0;
      lookInit = false;
      locEl.textContent = "STOP " + (i + 1) + "/11 — " + chapter.loc;
      setYou(chapter.you);
      setTint(chapter.tint);
      roExtraWrap.hidden = !chapter.extra;
      if (chapter.extra) {
        roExtraWrap.firstChild.textContent = chapter.extra.label + " ";
      }
      subEl.classList.remove("show");
      camera.fov = chapter.fov ? chapter.fov.from : 60;
      camera.updateProjectionMatrix();
      if (audioStarted) { A.setIntensity(chapter.intensity); A.duck(false); }
      endEl.hidden = true;
      mode = "fly";
      syncRail();
    }

    function jump(i) {
      if (mode === "end") endEl.hidden = true;
      killTransition();
      loadChapter(i);
      overlay.focus();   // keep Space = pause, not re-activate the last button
    }

    /* ---------- chapter handoff: film dissolve, motion never stops ---------- */
    function beginTransition() {
      var len = ctx.path.getLength();
      trans = {
        ctx: ctx,
        t: 0,
        tangent: ctx.path.getTangentAt(1).normalize(),
        speed: 0.35 * len / chapter.duration,   // glide()'s end slope is 0.35
        look: lookTarget.clone()
      };
      outCam.position.copy(camera.position);
      outCam.fov = camera.fov;
      outCam.aspect = camera.aspect;
      outCam.updateProjectionMatrix();
      ctx = null;                                // keep the outgoing scene alive
      loadChapter(idx + 1);
    }

    /* ---------- end terminal ---------- */
    function showEnd() {
      mode = "end";
      endEl.hidden = false;
      if (audioStarted) { A.setIntensity(0.45); A.duck(false); }
      // TOF counts from moderation (ride clock 10,235 µs) to detection (20,000 µs)
      var line = "EVENT  det=4823  tof=9765 µs  λ=1.80 Å  status=COUNTED";
      termEvent.textContent = "";
      clearInterval(typeTimer);
      var n = 0;
      typeTimer = setInterval(function () {
        n++;
        termEvent.textContent = line.slice(0, n);
        if (n >= line.length) clearInterval(typeTimer);
      }, 26);
      againBtn.focus();
    }

    /* ---------- the frame loop ---------- */
    function frame(now) {
      rafId = requestAnimationFrame(frame);
      var dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;
      if (!ctx) return;

      if (mode === "fly") {
        t += dt / chapter.duration;
        if (t >= 1) t = 1;
      }
      var ambientDt = (mode === "paused") ? dt * 0.15 : dt;
      sceneTime += ambientDt;

      var k = glide(t);
      var camPos = ctx.path.getPointAt(k);

      // events
      for (var e = 0; e < chapter.events.length; e++) {
        var ev = chapter.events[e];
        if (!fired[e] && t >= ev.t) {
          fired[e] = true;
          if (ev.flash) flash(ev.flash);
          if (ev.shake) shakeAmt = Math.max(shakeAmt, ev.shake);
          if (audioStarted && soundOn) {
            if (ev.boom) A.boom();
            else if (ev.thud) A.thud();
          }
          if (ev.you) setYou(ev.you);
          if (ev.tint) setTint(ev.tint);
        }
      }

      // captions
      var activeCap = null;
      for (var c = 0; c < chapter.captions.length; c++) {
        var cap = chapter.captions[c];
        if (t >= cap[0] && t < cap[0] + 4.2 / chapter.duration) activeCap = cap[1];
      }
      if (activeCap) {
        if (subEl.textContent !== activeCap) subEl.textContent = activeCap;
        subEl.classList.add("show");
      } else {
        subEl.classList.remove("show");
      }

      // HUD numbers — energy is chapter data, speed is physics (MESynth)
      var imp = chapter.impact;
      var postImpact = imp && t >= imp.t;
      var eMeV = postImpact ? imp.energy : logLerp(chapter.energy.from, chapter.energy.to, k);
      var mass = postImpact ? imp.mass : chapter.mass;
      var beta = mass === "p" ? S.protonBeta(eMeV) : S.neutronBeta(eMeV);
      roEnergy.textContent = fmtE(eMeV);
      roSpeed.textContent = fmtV(beta);
      roFill.style.inlineSize = Math.max(0.5, beta * 100) + "%";
      var clockNow = logLerp(Math.max(chapter.clock.from, 0.01), chapter.clock.to, k);
      roClock.textContent = fmtClock(clockNow);
      if (chapter.extra) {
        // LAP follows the CLOCK through the revolution period (µs/lap), which
        // shrinks as the beam speeds up — so the two readouts always agree
        var per = chapter.extra.period;
        var x = (clockNow - chapter.clock.from) / (chapter.clock.to - chapter.clock.from);
        var laps = (chapter.clock.to - chapter.clock.from) / (per.to - per.from) *
          Math.log((per.from + (per.to - per.from) * x) / per.from);
        roExtra.textContent = String(Math.max(1, Math.round(laps)));
      }

      // minimap dot
      var mp = MAP[idx](k, sceneTime);
      mapDot.setAttribute("cx", mp[0]);
      mapDot.setAttribute("cy", mp[1]);
      mapHalo.setAttribute("cx", mp[0]);
      mapHalo.setAttribute("cy", mp[1]);

      // camera: position on the spline, gaze directed by the scene
      var target = (ctx.gaze && ctx.gaze(t)) ||
        ctx.path.getPointAt(Math.min(1, k + 0.03));
      if (!lookInit) { lookTarget = target.clone(); lookInit = true; }
      lookTarget.lerp(target, 1 - Math.exp(-3.2 * dt));
      shakeAmt *= Math.exp(-3.5 * dt);
      camera.position.set(
        camPos.x + Math.sin(sceneTime * 53) * shakeAmt * 0.25,
        camPos.y + Math.cos(sceneTime * 47) * shakeAmt * 0.25,
        camPos.z
      );
      camera.lookAt(lookTarget);
      var baseFov = chapter.fov
        ? chapter.fov.from + (chapter.fov.to - chapter.fov.from) * k
        : 60;
      var fov = baseFov + (ctx.fovBoost ? ctx.fovBoost(t, { camPos: camPos, time: sceneTime }) : 0);
      if (fov !== camera.fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }

      if (ctx.update) ctx.update(t, ambientDt, { camPos: camPos, time: sceneTime });

      if (trans) {
        // outgoing scene: camera keeps flying along its last heading
        if (mode !== "paused") {
          trans.t += dt / TRANS_S;
          outCam.position.addScaledVector(trans.tangent, trans.speed * dt);
          trans.look.addScaledVector(trans.tangent, trans.speed * dt);
          outCam.lookAt(trans.look);
        }
        if (trans.ctx.update) {
          trans.ctx.update(1, ambientDt, { camPos: outCam.position, time: sceneTime });
        }
        renderer.setRenderTarget(rtA);
        renderer.render(trans.ctx.scene, outCam);
        renderer.setRenderTarget(rtB);
        renderer.render(ctx.scene, camera);
        renderer.setRenderTarget(null);
        blendMat.uniforms.uMix.value = smooth(Math.min(1, trans.t));
        renderer.render(blendScene, blendCam);
        if (trans.t >= 1) killTransition();
      } else {
        renderer.render(ctx.scene, camera);
      }

      if (mode === "fly" && t >= 1 && !trans) {
        if (idx < CH.length - 1) beginTransition();
        else showEnd();
      }
    }

    /* ---------- enter / exit ---------- */
    var lastFocus = null;

    function resize() {
      if (!renderer) return;
      var w = overlay.clientWidth, h = overlay.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      outCam.aspect = w / h;
      outCam.updateProjectionMatrix();
      var pr = renderer.getPixelRatio();
      rtA.setSize(w * pr, h * pr);
      rtB.setSize(w * pr, h * pr);
    }

    function enter(withSound) {
      lastFocus = document.activeElement;
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
      if (!renderer) {
        renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        camera = new T.PerspectiveCamera(60, 1, 0.05, 400);
        outCam = new T.PerspectiveCamera(60, 1, 0.05, 400);
        rtA = new T.WebGLRenderTarget(2, 2);
        rtB = new T.WebGLRenderTarget(2, 2);
        blendMat = new T.ShaderMaterial({
          uniforms: { tA: { value: rtA.texture }, tB: { value: rtB.texture }, uMix: { value: 0 } },
          vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
          fragmentShader: "uniform sampler2D tA; uniform sampler2D tB; uniform float uMix; varying vec2 vUv;" +
            " void main() { gl_FragColor = mix(texture2D(tA, vUv), texture2D(tB, vUv), uMix); }",
          depthTest: false,
          depthWrite: false
        });
        blendCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        blendScene = new T.Scene();
        blendScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), blendMat));
        buildRail();
        window.addEventListener("resize", resize);
      }
      resize();
      soundOn = !!withSound && A && A.supported;
      if (soundOn) audioBegin();
      syncMuteBtn();
      loadChapter(0);
      lastNow = performance.now();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(frame);
      overlay.focus();   // non-destructive focus target: Space pauses, as the HUD promises
    }

    function exit() {
      cancelAnimationFrame(rafId);
      clearInterval(typeTimer);
      killTransition();
      mode = "idle";
      disposeScene(ctx);
      ctx = null;
      if (audioStarted) { A.stop(); audioStarted = false; }
      overlay.hidden = true;
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }

    /* ---------- wiring ---------- */
    quietBtn.hidden = false;
    startBtn.setAttribute("role", "button");   // only when the ride (and its Space handler) is live
    startBtn.addEventListener("click", function (e) {
      e.preventDefault();
      enter(true);
    });
    startBtn.addEventListener("keydown", function (e) {
      if (e.key === " ") { e.preventDefault(); enter(true); }   // role="button" promises Space
    });
    quietBtn.addEventListener("click", function () { enter(false); });
    muteBtn.addEventListener("click", toggleSound);
    exitBtn.addEventListener("click", exit);
    endExitBtn.addEventListener("click", exit);
    againBtn.addEventListener("click", function () {
      endEl.hidden = true;
      loadChapter(0);
    });

    document.addEventListener("keydown", function (e) {
      if (overlay.hidden) return;
      if (e.key === "Escape") { exit(); return; }
      if (e.key === "Tab") {
        // keep keyboard focus inside the modal overlay
        setTimeout(function () {
          if (!overlay.contains(document.activeElement)) overlay.focus();
        }, 0);
        return;
      }
      // let focused buttons keep their own activation keys, but only those
      var onButton = e.target && (e.target.tagName === "BUTTON" || e.target.tagName === "A");
      if (onButton && (e.key === " " || e.key === "Enter")) return;
      if (e.key === " ") {
        e.preventDefault();
        if (mode === "fly") {
          mode = "paused";
          if (audioStarted) A.duck(true);   // muffle the soundtrack while held
        } else if (mode === "paused") {
          mode = "fly";
          if (audioStarted) A.duck(false);
        }
      } else if (e.key === "ArrowRight") {
        jump(Math.min(CH.length - 1, idx + 1));
      } else if (e.key === "ArrowLeft") {
        jump(Math.max(0, idx - 1));
      } else if (e.key === "m" || e.key === "M") {
        toggleSound();
      }
    });

    // If the OS flips to reduced motion mid-session, park the ride.
    if (reduced.addEventListener) {
      reduced.addEventListener("change", function (ev) {
        if (ev.matches && !overlay.hidden) exit();
      });
    }
  });
})();
