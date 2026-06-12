/* BTBScenes — the eleven BE THE BEAM environments, plus everything the ride
   engine needs to know about each chapter (durations, HUD numbers, captions,
   timed events). Geometry is deliberately schematic neon — unlit materials +
   fog, in the site palette. Physics numbers are real ISIS figures; speeds are
   derived in js/bethebeam.js from the energies below via MESynth kinematics.
   Requires THREE (vendor/three.min.js) and MESynth. Exposes one global. */
(function () {
  "use strict";

  var PINK = 0xff5d8f, CYAN = 0x4fd8eb, MUON = 0xb78aff, COPPER = 0xffb84d,
      GREEN = 0x5fe8a0, LINE = 0x233055, BRIGHT = 0x3a4d85, WHITE = 0xeef2ff;
  var TINT_H = "rgba(79,216,235,0.55)";   // H⁻ / neutron cyan
  var TINT_P = "rgba(255,93,143,0.55)";   // proton pink

  /* ---------- shared builders (THREE is passed in as T) ---------- */

  function basicMat(T, color, opacity, additive) {
    return new T.MeshBasicMaterial({
      color: color,
      transparent: opacity !== undefined && opacity < 1,
      opacity: opacity === undefined ? 1 : opacity,
      blending: additive ? T.AdditiveBlending : T.NormalBlending,
      depthWrite: !additive,
      side: T.DoubleSide
    });
  }

  var texCache = {};
  var dotTexture = null;
  function dotTex(T) {
    if (dotTexture) return dotTexture;
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.7)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    dotTexture = new T.CanvasTexture(c);
    dotTexture.userData.shared = true;   // cached across scenes — engine must not dispose
    return dotTexture;
  }

  function neonFrameTex(T, cssColor) {
    if (texCache[cssColor]) return texCache[cssColor];
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var g = c.getContext("2d");
    g.shadowColor = cssColor;
    g.shadowBlur = 14;
    g.strokeStyle = cssColor;
    g.lineWidth = 7;
    g.strokeRect(12, 12, 104, 104);
    var tex = new T.CanvasTexture(c);
    tex.userData.shared = true;          // cached across scenes — engine must not dispose
    texCache[cssColor] = tex;
    return tex;
  }

  /* labels stacked down the axis read as duplicates from afar (sprites always
     face the camera) — fade each one in only near its own landmark */
  function fadeLabels(labels, camPos, near, range) {
    for (var i = 0; i < labels.length; i++) {
      var d = labels[i].position.distanceTo(camPos);
      var o = 1 - Math.min(1, Math.max(0, (d - near) / range));
      labels[i].material.opacity = o;
      labels[i].visible = o > 0.02;
    }
  }

  /* a neon rectangular arch (textured plane) facing along the path */
  function addFrame(T, scene, cssColor, size, pos, toward) {
    var m = new T.Mesh(
      new T.PlaneGeometry(size, size),
      new T.MeshBasicMaterial({
        map: neonFrameTex(T, cssColor),
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide
      })
    );
    m.position.copy(pos);
    if (toward) m.lookAt(toward);
    scene.add(m);
    return m;
  }

  function labelSprite(T, scene, text, cssColor, pos, scale) {
    var c = document.createElement("canvas");
    c.width = 512; c.height = 96;
    var g = c.getContext("2d");
    g.font = "600 44px 'IBM Plex Mono', monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = cssColor;
    g.shadowBlur = 18;
    g.fillStyle = cssColor;
    g.fillText(text, 256, 50);
    var sp = new T.Sprite(new T.SpriteMaterial({
      map: new T.CanvasTexture(c),
      transparent: true,
      depthWrite: false
    }));
    sp.position.copy(pos);
    sp.scale.set(scale * 5.33, scale, 1);
    scene.add(sp);
    return sp;
  }

  function addRing(T, scene, color, r, tube, z, opacity, additive) {
    var m = new T.Mesh(new T.TorusGeometry(r, tube, 10, 48), basicMat(T, color, opacity, additive));
    m.position.set(0, 0, z);
    scene.add(m);
    return m;
  }

  /* longitudinal blueprint rails around the pipe */
  function addRails(T, scene, opts) {
    var pts = [];
    var n = opts.n || 8;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + (opts.a0 || 0);
      var x = Math.cos(a) * opts.r, y = Math.sin(a) * opts.r;
      pts.push(new T.Vector3(x, y, opts.z0), new T.Vector3(x, y, opts.z1));
    }
    var geo = new T.BufferGeometry().setFromPoints(pts);
    var lines = new T.LineSegments(geo, new T.LineBasicMaterial({
      color: opts.color, transparent: true, opacity: opts.opacity || 0.5
    }));
    scene.add(lines);
    return lines;
  }

  function addPoints(T, scene, count, color, size, fill) {
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var p = fill(i);
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    var pts = new T.Points(geo, new T.PointsMaterial({
      color: color, size: size, transparent: true, opacity: 0.9,
      map: dotTex(T), blending: T.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true
    }));
    scene.add(pts);
    return pts;
  }

  /* the bunch you travel in — points that ride along with the camera */
  function companions(T, scene, color, count) {
    var rng = window.MESynth.mulberry32(42);
    var grp = new T.Group();
    scene.add(grp);
    var pts = addPoints(T, grp, count || 120, color, 0.06, function () {
      var a = rng() * Math.PI * 2, r = 0.25 + rng() * 0.8;
      return [Math.cos(a) * r, Math.sin(a) * r * 0.8, (rng() - 0.5) * 7];
    });
    pts.material.opacity = 0.7;
    return {
      update: function (cam, time) {
        grp.position.copy(cam);
        grp.position.z -= 1.5;
        grp.rotation.z = Math.sin(time * 0.4) * 0.08;
      }
    };
  }

  function straightPath(T, length, kinks) {
    var pts = [new T.Vector3(0, 0, 0)];
    var n = 8;
    for (var i = 1; i <= n; i++) pts.push(new T.Vector3(0, 0, -length * i / n));
    if (kinks) kinks(pts);
    return new T.CatmullRomCurve3(pts);
  }

  function fogged(T, bgHex, fogHex, density) {
    var scene = new T.Scene();
    scene.background = new T.Color(bgHex);
    scene.fog = new T.FogExp2(fogHex, density);
    return scene;
  }

  /* ====================== CHAPTERS ====================== */

  var CHAPTERS = [

    /* ---- 01 ION SOURCE ---- */
    {
      loc: "01 · ION SOURCE", you: "H⁻", mass: "p", tint: TINT_H,
      duration: 16, intensity: 0.22,
      energy: { from: 1e-6, to: 0.035 }, clock: { from: 0, to: 0.2 },
      captions: [[0.08, "you are one proton, holding two borrowed electrons"],
                 [0.45, "the field outside the aperture is pulling"],
                 [0.8, "extracted at 35 kV — the first push"]],
      events: [{ t: 0.31, flash: 0.5 }],   // the moment you become the ion
      build: function (T) {
        var scene = fogged(T, 0x070312, 0x12041c, 0.055);
        var rng = window.MESynth.mulberry32(7);
        var plasma = addPoints(T, scene, 700, PINK, 0.09, function () {
          var a = rng() * Math.PI * 2, r = Math.pow(rng(), 0.5) * 5;
          return [Math.cos(a) * r, (rng() - 0.5) * 6, -6 - rng() * 22];
        });
        var haze = addPoints(T, scene, 220, MUON, 0.16, function () {
          var a = rng() * Math.PI * 2, r = Math.pow(rng(), 0.5) * 6;
          return [Math.cos(a) * r, (rng() - 0.5) * 7, -4 - rng() * 26];
        });
        haze.material.opacity = 0.35;
        addRing(T, scene, LINE, 5.5, 0.25, -32);
        addRing(T, scene, BRIGHT, 4.2, 0.18, -34.5);
        var ap = addRing(T, scene, WHITE, 1.9, 0.1, -38, 1, true);
        addRing(T, scene, CYAN, 1.2, 0.05, -38.2, 0.9, true);
        labelSprite(T, scene, "PENNING H⁻ SOURCE", "#8a96c2", new T.Vector3(0, 4.6, -30), 1.4);
        // the prologue: the ion you're about to become floats ahead — one
        // proton, two borrowed electrons — and the camera dives in until
        // you ARE it (the flash at t≈0.31)
        var ion = new T.Group();
        scene.add(ion);
        function ionGlow(color, s) {
          var sp = new T.Sprite(new T.SpriteMaterial({
            map: dotTex(T), color: color, transparent: true, depthWrite: false
          }));
          sp.scale.set(s, s, 1);
          ion.add(sp);
          return sp;
        }
        var pCore = ionGlow(PINK, 0.6);
        var eOrb = [ionGlow(CYAN, 0.24), ionGlow(CYAN, 0.24)];
        var ionPos = new T.Vector3(0, 0, 0);
        var aperture = new T.Vector3(0, 0, -38);
        return {
          scene: scene,
          path: straightPath(T, 50, function (pts) {
            // start outside the ion and dive in: you reach it at t≈0.31
            for (var i = 0; i < pts.length; i++) pts[i].z += 14;
          }),
          gaze: function (t) {
            if (t < 0.3) return ionPos;          // eyes on the ion you'll become
            if (t < 0.55) {
              var a = (t - 0.3) * 12.6;          // then the look around the chamber
              return new T.Vector3(Math.cos(a) * 4, Math.sin(a * 0.7) * 2.5, -12 - t * 20);
            }
            return aperture;
          },
          update: function (t, dt, st) {
            plasma.rotation.z += dt * 0.25;
            haze.rotation.z -= dt * 0.12;
            // prologue: electrons circle the proton until you merge with it
            var become = Math.min(1, Math.max(0, (t - 0.3) / 0.06));
            ion.visible = become < 1;
            if (ion.visible) {
              var op = 1 - become;
              pCore.material.opacity = op * (0.85 + Math.sin(st.time * 5) * 0.15);
              for (var ei = 0; ei < 2; ei++) {
                var ea = st.time * 2.6 + ei * Math.PI;
                eOrb[ei].position.set(Math.cos(ea) * 0.8, Math.sin(ea * 1.4) * 0.3, Math.sin(ea) * 0.8);
                eOrb[ei].material.opacity = op;
              }
            }
            // extraction: the plasma parts around you as the field wins
            var p = Math.min(1, Math.max(0, (-st.camPos.z - 22) / 11));
            plasma.scale.set(1 + p * 0.7, 1 + p * 0.7, 1);
            haze.scale.set(1 + p * 0.9, 1 + p * 0.9, 1);
            plasma.material.opacity = 0.9 - p * 0.4;
            ap.material.opacity = 0.55 + p * 0.45 + Math.sin(st.time * 6) * 0.2;
          }
        };
      }
    },

    /* ---- 02 RFQ ---- */
    {
      loc: "02 · RFQ", you: "H⁻", mass: "p", tint: TINT_H,
      duration: 12, intensity: 0.38,
      energy: { from: 0.035, to: 0.665 }, clock: { from: 0.2, to: 0.6 },
      captions: [[0.15, "202.5 MHz — snap to the radio beat"],
                 [0.5, "665 keV by the end of these vanes"],
                 [0.78, "from here on, you always travel in bunches"]],
      events: [],
      build: function (T) {
        var scene = fogged(T, 0x040611, 0x081024, 0.05);
        var L = 60;
        // four scalloped vane rails, rotated 45° off the axes
        var fin = new T.BoxGeometry(0.16, 0.9, 0.7);
        [45, 135, 225, 315].forEach(function (deg) {
          var a = deg * Math.PI / 180;
          var count = 48;
          var mesh = new T.InstancedMesh(fin, basicMat(T, BRIGHT, 0.95), count);
          var m4 = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3();
          q.setFromAxisAngle(new T.Vector3(0, 0, 1), a + Math.PI / 2);
          for (var i = 0; i < count; i++) {
            var z = -2 - i * 1.25;
            var sc = 0.7 + 0.4 * Math.sin(z * 0.85);
            p.set(Math.cos(a) * 1.6, Math.sin(a) * 1.6, z);
            s.set(1, sc, 1);
            m4.compose(p, q, s);
            mesh.setMatrixAt(i, m4);
          }
          scene.add(mesh);
        });
        addRails(T, scene, { n: 4, r: 2.6, z0: 0, z1: -L, color: LINE, opacity: 0.6, a0: 0 });
        labelSprite(T, scene, "RADIO-FREQUENCY QUADRUPOLE", "#8a96c2", new T.Vector3(0, 3.2, -16), 1.1);
        // the stream bunching up: each dot drifts toward its nearest bunch slot
        var rng = window.MESynth.mulberry32(11);
        var N = 420, z0 = new Float32Array(N);
        var stream = addPoints(T, scene, N, CYAN, 0.07, function (i) {
          var a = rng() * Math.PI * 2, r = rng() * 0.45;
          z0[i] = -rng() * L;
          return [Math.cos(a) * r, Math.sin(a) * r, z0[i]];
        });
        var co = companions(T, scene, CYAN);
        return {
          scene: scene,
          path: straightPath(T, L - 6),
          gaze: function (t) {
            // release while the vane is still well ahead — a late handoff
            // drops the lookTarget beside the advancing camera
            if (t > 0.24 && t < 0.38) return new T.Vector3(1.6, -1.6, -22);
            return null;
          },
          update: function (t, dt, st) {
            var pos = stream.geometry.attributes.position;
            var k = t * t;                       // bunching tightens as you go
            for (var i = 0; i < N; i++) {
              var target = Math.round(z0[i] / 6) * 6;
              pos.array[i * 3 + 2] = z0[i] + (target - z0[i]) * k;
            }
            pos.needsUpdate = true;
            co.update(st.camPos, st.time);
          }
        };
      }
    },

    /* ---- 03 LINAC ---- */
    {
      loc: "03 · LINAC", you: "H⁻", mass: "p", tint: TINT_H,
      duration: 16, intensity: 0.5, fov: { from: 60, to: 66 },
      energy: { from: 0.665, to: 70 }, clock: { from: 0.6, to: 1.3 },
      captions: [[0.12, "inside a drift tube, the field can't touch you"],
                 [0.5, "the tubes grow longer — you cover more ground per beat"],
                 [0.85, "a third of light speed and climbing"]],
      events: [],
      build: function (T) {
        var scene = fogged(T, 0x050408, 0x0d0a06, 0.03);
        var L = 120;
        // drift tubes lengthen with speed (L ≈ βλ): place sequentially
        var z = -4, gaps = [], tubes = [];
        while (z > -L + 8) {
          var len = 1.2 + (Math.abs(z) / L) * 3.2;
          var tubeMat = basicMat(T, COPPER, 0.3);
          tubeMat.wireframe = true;
          var tube = new T.Mesh(
            new T.CylinderGeometry(1.7, 1.7, len, 14, 1, true),
            tubeMat
          );
          tube.rotation.x = Math.PI / 2;
          tube.position.set(0, 0, z - len / 2);
          scene.add(tube);
          tubes.push(tube);
          z -= len + 0.9;
          gaps.push(z + 0.45);
        }
        var gapFlash = gaps.map(function (gz) {
          return addRing(T, scene, CYAN, 1.4, 0.08, gz, 0.0, true);
        });
        addRails(T, scene, { n: 6, r: 2.4, z0: 0, z1: -L, color: LINE, opacity: 0.5 });
        var tankLabels = [];
        for (var k = 0; k < 4; k++) {
          tankLabels.push(labelSprite(T, scene, "TANK " + (k + 1) + " OF 4", "#ffb84d",
            new T.Vector3(k % 2 ? -2.6 : 2.6, 2.4, -8 - k * (L - 16) / 4), 0.9));
        }
        var co = companions(T, scene, CYAN);
        return {
          scene: scene,
          path: straightPath(T, L - 10),
          fovBoost: function (t, st) {
            // each accelerating gap gives a felt kick as you cross it
            var b = 0;
            for (var i = 0; i < gapFlash.length; i++) {
              var d = Math.abs(st.camPos.z - gapFlash[i].position.z);
              if (d < 2.2) b = Math.max(b, (1 - d / 2.2) * 5);
            }
            return b;
          },
          update: function (t, dt, st) {
            for (var i = 0; i < gapFlash.length; i++) {
              var d = Math.abs(st.camPos.z - gapFlash[i].position.z);
              gapFlash[i].material.opacity = Math.max(0, 1.1 - d * 0.45);
            }
            fadeLabels(tankLabels, st.camPos, 8, 18);
            co.update(st.camPos, st.time);
          }
        };
      }
    },

    /* ---- 04 STRIPPING FOIL ---- */
    {
      loc: "04 · INJECTION — STRIPPING FOIL", you: "H⁻", mass: "p", tint: TINT_H,
      duration: 14, intensity: 0.55,
      energy: { from: 70, to: 70 }, clock: { from: 1.3, to: 200 },
      captions: [[0.15, "the merge trick: arrive negative, get bent INTO the ring"],
                 [0.42, "0.3 µm of foil ahead — it will change what you are"],
                 [0.72, "two electrons stay behind. you are now a proton."]],
      events: [{ t: 0.62, flash: 0.85, thud: true, you: "p⁺", tint: TINT_P }],
      build: function (T) {
        var scene = fogged(T, 0x050511, 0x0a0a1f, 0.045);
        var path = new T.CatmullRomCurve3([
          new T.Vector3(0, 0, 0), new T.Vector3(0, 0, -14), new T.Vector3(0, 0, -26),
          new T.Vector3(0.6, 0, -34), new T.Vector3(2.4, 0, -44), new T.Vector3(6.5, 0, -52)
        ]);
        addRails(T, scene, { n: 6, r: 2.6, z0: 4, z1: -30, color: LINE, opacity: 0.5 });
        addFrame(T, scene, "#ff5d8f", 7, new T.Vector3(0, 0, -20), new T.Vector3(0, 0, 0));
        addFrame(T, scene, "#ff5d8f", 7, new T.Vector3(0.4, 0, -28), new T.Vector3(0, 0, -18));
        // the foil — a third of a micrometre, drawn a million times too thick
        var foil = new T.Mesh(new T.PlaneGeometry(3.4, 3.4), basicMat(T, 0xbfeaff, 0.5, true));
        foil.position.set(1, 0, -38);
        foil.lookAt(0.4, 0, -30);
        scene.add(foil);
        addFrame(T, scene, "#4fd8eb", 4.6, foil.position.clone(), new T.Vector3(0.4, 0, -30));
        labelSprite(T, scene, "Al₂O₃ FOIL · 0.3 µm", "#4fd8eb", new T.Vector3(1, 2.9, -37.6), 1);
        // ring traffic you're about to join
        var rng = window.MESynth.mulberry32(23);
        var ring = addPoints(T, scene, 240, PINK, 0.09, function () {
          var a = rng() * 0.9 + 1.4, R = 26;
          return [10 + Math.cos(a) * R - 8, (rng() - 0.5) * 0.4, -52 + Math.sin(a) * R - 18];
        });
        // the two electrons you lose — they spiral off behind you, trailing light
        var eGrp = new T.Group();
        scene.add(eGrp);
        var ePts = addPoints(T, eGrp, 2, CYAN, 0.55, function (i) { return [1, i * 0.4 - 0.2, -38]; });
        var TRAIL = 24;
        var trails = [];
        for (var ti = 0; ti < 2; ti++) {
          var tg = new T.BufferGeometry();
          tg.setAttribute("position", new T.BufferAttribute(new Float32Array(TRAIL * 3), 3));
          var ln = new T.Line(tg, new T.LineBasicMaterial({
            color: CYAN, transparent: true, opacity: 0.8,
            blending: T.AdditiveBlending, depthWrite: false
          }));
          ln.visible = false;
          eGrp.add(ln);
          trails.push(ln);
        }
        var eLabel = labelSprite(T, scene, "e⁻ ×2 — left behind", "#4fd8eb", new T.Vector3(1, 1.8, -37), 0.85);
        eLabel.material.opacity = 0;
        eGrp.visible = false;
        var eMid = new T.Vector3(1, 0, -38);
        var eInit = false;
        var co = companions(T, scene, CYAN);
        var foilPos = foil.position.clone();
        return {
          scene: scene, path: path,
          gaze: function (t) {
            if (t >= 0.2 && t < 0.64) return foilPos;
            if (t >= 0.64 && t < 0.88) return eMid.clone();
            return null;
          },
          update: function (t, dt, st) {
            ring.rotation.y += dt * 0.05;
            if (t >= 0.62) {
              // punctured: the foil dims so the departing electrons read clearly
              foil.material.opacity = Math.max(0.12, 0.5 - (t - 0.62) * 2);
              eGrp.visible = true;
              var age = (t - 0.62) * 14;            // seconds since the strip
              var pos = ePts.geometry.attributes.position;
              for (var ei = 0; ei < 2; ei++) {
                var ph = ei * Math.PI;
                var r = 0.25 + age * 0.9;           // electrons curl in the field
                var ex = 1 + Math.cos(age * 5 + ph) * r * 0.5;
                var ey = Math.sin(age * 5 + ph) * r * 0.45;
                var ez = -38 + age * 4.5;           // and fall behind you
                pos.array[ei * 3] = ex;
                pos.array[ei * 3 + 1] = ey;
                pos.array[ei * 3 + 2] = ez;
                var tp = trails[ei].geometry.attributes.position;
                if (!eInit) {
                  for (var s0 = 0; s0 < TRAIL; s0++) {
                    tp.array[s0 * 3] = ex; tp.array[s0 * 3 + 1] = ey; tp.array[s0 * 3 + 2] = ez;
                  }
                } else {
                  for (var s = TRAIL - 1; s > 0; s--) {
                    tp.array[s * 3] = tp.array[(s - 1) * 3];
                    tp.array[s * 3 + 1] = tp.array[(s - 1) * 3 + 1];
                    tp.array[s * 3 + 2] = tp.array[(s - 1) * 3 + 2];
                  }
                  tp.array[0] = ex; tp.array[1] = ey; tp.array[2] = ez;
                }
                tp.needsUpdate = true;
                trails[ei].visible = age > 0.06;
              }
              eInit = true;
              pos.needsUpdate = true;
              eMid.set(1, 0, -38 + age * 4.5);
              var fade = age < 2.6 ? 1 : Math.max(0, 1 - (age - 2.6) / 1.6);
              ePts.material.opacity = fade;
              trails[0].material.opacity = trails[1].material.opacity = 0.8 * fade;
              eLabel.material.opacity = Math.min(1, age * 2) * fade;
              eLabel.position.set(1, 1.7, -38 + age * 4.5);
            }
            co.update(st.camPos, st.time);
          }
        };
      }
    },

    /* ---- 05 SYNCHROTRON ---- */
    {
      loc: "05 · SYNCHROTRON", you: "p⁺", mass: "p", tint: TINT_P,
      duration: 18, intensity: 0.78, fov: { from: 60, to: 76 },
      energy: { from: 70, to: 800 }, clock: { from: 200, to: 10200 },
      /* revolution period: 163 m at 37% c → 1.47 µs/lap, at 84% c → 0.65 µs/lap;
         integrating it over the 10 ms ramp lands within ~1% of the ~10,000 laps */
      extra: { label: "LAP", period: { from: 1.47, to: 0.65 } },
      captions: [[0.1, "every lap, the RF cavities kick a little harder"],
                 [0.45, "10 dipoles bend you; you answer with momentum"],
                 [0.8, "showing you 2 laps of ~10,000 — even neon has limits"]],
      events: [],
      build: function (T) {
        var scene = fogged(T, 0x08020c, 0x140218, 0.028);
        var R = 40, turns = 2.2, segs = 64;
        var pts = [];
        for (var i = 0; i <= segs; i++) {
          var a = (i / segs) * turns * Math.PI * 2;
          pts.push(new T.Vector3(Math.cos(a) * R - R, Math.sin(a) * 0.0, -Math.sin(a) * R));
        }
        var path = new T.CatmullRomCurve3(pts);
        // dipole + quadrupole arches around one lap, reused visually each lap
        for (var j = 0; j < 30; j++) {           // every 3rd is a dipole: 10 per lap, the real count
          var aa = (j / 30) * Math.PI * 2;
          var p = new T.Vector3(Math.cos(aa) * R - R, 0, -Math.sin(aa) * R);
          var ahead = new T.Vector3(Math.cos(aa + 0.06) * R - R, 0, -Math.sin(aa + 0.06) * R);
          addFrame(T, scene, j % 3 === 0 ? "#ff5d8f" : "#4fd8eb", j % 3 === 0 ? 8.5 : 6.5, p, ahead);
        }
        // RF cavity: a stack of golden rings at one azimuth
        var rf = [];
        for (var k = 0; k < 5; k++) {
          var ra = 0.9 + k * 0.045;
          var rp = new T.Vector3(Math.cos(ra) * R - R, 0, -Math.sin(ra) * R);
          var ring = addRing(T, scene, COPPER, 3.2, 0.12, 0, 0.8);
          ring.position.copy(rp);
          ring.lookAt(new T.Vector3(Math.cos(ra + 0.05) * R - R, 0, -Math.sin(ra + 0.05) * R));
          rf.push(ring);
        }
        labelSprite(T, scene, "RF CAVITIES", "#ffb84d",
          new T.Vector3(Math.cos(1.0) * R - R, 4.4, -Math.sin(1.0) * R), 1.1);
        // wall streaks for speed
        var rng = window.MESynth.mulberry32(31);
        addPoints(T, scene, 900, PINK, 0.05, function () {
          var aa = rng() * Math.PI * 2 * turns;
          var rr = R + (rng() - 0.5) * 7;
          return [Math.cos(aa) * rr - R, (rng() - 0.5) * 6, -Math.sin(aa) * rr];
        });
        var co = companions(T, scene, PINK);
        return {
          scene: scene, path: path,
          update: function (t, dt, st) {
            var beat = Math.sin(st.time * 9);
            for (var i = 0; i < rf.length; i++) rf[i].material.opacity = 0.55 + beat * 0.4;
            co.update(st.camPos, st.time);
          }
        };
      }
    },

    /* ---- 06 EXTRACTION / EPB1 ---- */
    {
      loc: "06 · EXTRACTION → EPB1", you: "p⁺", mass: "p", tint: TINT_P,
      duration: 12, intensity: 0.7, fov: { from: 72, to: 64 },
      energy: { from: 800, to: 800 }, clock: { from: 10200, to: 10200.45 },
      captions: [[0.16, "single-turn extraction: everyone leaves at once"],
                 [0.6, "EPB1 — 150 m, 68 magnets, four of five pulses"]],
      events: [{ t: 0.1, flash: 0.5, thud: true }],
      build: function (T) {
        var scene = fogged(T, 0x03040c, 0x060916, 0.035);
        /* the kick deflects you OUTWARD — to the right of the counterclockwise
           orbit (ring centre on your left), matching the minimap's right turn */
        var path = new T.CatmullRomCurve3([
          new T.Vector3(0, 0, 0), new T.Vector3(1.5, 0, -10), new T.Vector3(2, 0, -22),
          new T.Vector3(2, 0, -50), new T.Vector3(2, 0, -85), new T.Vector3(2, 0, -110)
        ]);
        // kicker frames at the exit of the ring
        var kick1 = addFrame(T, scene, "#eef2ff", 7, new T.Vector3(0.6, 0, -6), new T.Vector3(0, 0, 4));
        var kick2 = addFrame(T, scene, "#eef2ff", 7, new T.Vector3(1.4, 0, -9), new T.Vector3(0.4, 0, -2));
        kick1.material.opacity = kick2.material.opacity = 0.35;
        labelSprite(T, scene, "KICKERS · <100 ns", "#eef2ff", new T.Vector3(1, 3.4, -7.5), 1);
        var markers = [];
        for (var i = 0; i < 14; i++) {
          var z = -18 - i * 6.6;
          addFrame(T, scene, i % 2 ? "#ff5d8f" : "#4fd8eb", 5.5,
            new T.Vector3(2, 0, z), new T.Vector3(2, 0, z + 5));
          if (i % 4 === 1) {
            markers.push(labelSprite(T, scene, (25 * ((i - 1) / 4 + 1)) + " m", "#8a96c2",
              new T.Vector3(((i - 1) / 4) % 2 ? 4.8 : -0.8, 2.2, z), 0.7));
          }
        }
        addRails(T, scene, { n: 4, r: 2.4, z0: -14, z1: -115, color: LINE, opacity: 0.55 });
        var co = companions(T, scene, PINK);
        return {
          scene: scene, path: path,
          update: function (t, dt, st) {
            // the kick: both frames blaze for an instant as you're punted out
            var kp = Math.max(0, 1 - Math.abs(t - 0.11) * 14);
            kick1.material.opacity = Math.min(1, 0.35 + kp);
            kick2.material.opacity = Math.min(1, 0.35 + kp * 0.9);
            fadeLabels(markers, st.camPos, 9, 18);
            co.update(st.camPos, st.time);
          }
        };
      }
    },

    /* ---- 07 MUON TARGET ---- */
    {
      loc: "07 · MUON TARGET", you: "p⁺", mass: "p", tint: TINT_P,
      duration: 12, intensity: 0.65,
      energy: { from: 800, to: 800 }, clock: { from: 10200.45, to: 10200.55 },
      captions: [[0.2, "10 mm of graphite, parked in the beam on purpose"],
                 [0.72, "born as pions — decaying to muons in flight"],
                 [0.85, "muons peel away: two facilities, one beam"]],
      events: [{ t: 0.7, flash: 0.3, shake: 0.25, thud: true }],
      build: function (T) {
        var scene = fogged(T, 0x05030c, 0x0a0618, 0.04);
        var L = 80;
        addRails(T, scene, { n: 4, r: 2.4, z0: 0, z1: -L, color: LINE, opacity: 0.55 });
        // the wafer, edge on
        var wafer = new T.Mesh(new T.BoxGeometry(2.6, 2.6, 0.18), basicMat(T, 0x1a2238, 0.95));
        wafer.position.set(0, 0, -56);
        scene.add(wafer);
        addFrame(T, scene, "#b78aff", 3.8, new T.Vector3(0, 0, -56), new T.Vector3(0, 0, -50));
        labelSprite(T, scene, "GRAPHITE · 10 mm · <5% INTERACT", "#b78aff", new T.Vector3(0, 3, -55.4), 1);
        // muon exit ports, both sides
        var portL = addFrame(T, scene, "#b78aff", 5, new T.Vector3(-9, 0, -62), new T.Vector3(0, 0, -62));
        var portR = addFrame(T, scene, "#b78aff", 5, new T.Vector3(9, 0, -62), new T.Vector3(0, 0, -62));
        portL.material.opacity = portR.material.opacity = 0.6;
        labelSprite(T, scene, "µSR ←", "#b78aff", new T.Vector3(-7.5, 2.6, -62), 0.8);
        labelSprite(T, scene, "→ RIKEN-RAL", "#b78aff", new T.Vector3(7.5, 2.6, -62), 0.8);
        var rng = window.MESynth.mulberry32(57);
        var NM = 120, vel = [];
        var sparks = addPoints(T, scene, NM, MUON, 0.12, function (i) {
          vel.push([(rng() > 0.5 ? 1 : -1) * (2 + rng() * 7), (rng() - 0.5) * 2.4, -(1 + rng() * 4)]);
          return [0, 0, -56];
        });
        sparks.visible = false;
        var waferPos = wafer.position.clone();
        var co = companions(T, scene, PINK);
        return {
          scene: scene, path: straightPath(T, L - 8),
          gaze: function (t) {
            if (t >= 0.3 && t < 0.72) return waferPos;
            if (t >= 0.72 && t < 0.9) return new T.Vector3(7, 0.5, -62);
            return null;
          },
          update: function (t, dt, st) {
            if (t >= 0.7) {
              sparks.visible = true;
              var pos = sparks.geometry.attributes.position;
              for (var i = 0; i < NM; i++) {
                pos.array[i * 3] += vel[i][0] * dt;
                pos.array[i * 3 + 1] += vel[i][1] * dt;
                pos.array[i * 3 + 2] += vel[i][2] * dt;
              }
              pos.needsUpdate = true;
              // pion → muon decay, painted: orange fades to violet in flight
              var decay = Math.min(1, (t - 0.7) * 12 / 0.6);
              sparks.material.color.set(COPPER).lerp(new T.Color(MUON), decay);
            }
            co.update(st.camPos, st.time);
          }
        };
      }
    },

    /* ---- 08 THE TARGET — SPALLATION ---- */
    {
      loc: "08 · TUNGSTEN TARGET", you: "p⁺", mass: "p", tint: TINT_P,
      duration: 13, intensity: 0.9, fov: { from: 62, to: 72 },
      energy: { from: 800, to: 800 }, clock: { from: 10200.55, to: 10200.6 },
      impact: { t: 0.78, you: "n⁰", mass: "n", energy: 2, tint: TINT_H },
      captions: [[0.2, "tantalum-clad tungsten. no exit for protons."],
                 [0.55, "brace"],
                 [0.8, "…you are one of ~20 neutrons. direction: nobody's choice."]],
      events: [{ t: 0.78, flash: 1, shake: 0.7, boom: true, you: "n⁰", tint: TINT_H }],
      build: function (T) {
        var scene = fogged(T, 0x070307, 0x0d0508, 0.03);
        var path = new T.CatmullRomCurve3([
          new T.Vector3(0, 0, 0), new T.Vector3(0, 0, -20), new T.Vector3(0, 0, -38),
          new T.Vector3(0, 0, -50),                       // impact ≈ here (t≈0.78)
          new T.Vector3(2.6, 1.4, -55), new T.Vector3(5.5, 3, -59)
        ]);
        addRails(T, scene, { n: 4, r: 2.4, z0: 0, z1: -46, color: LINE, opacity: 0.5 });
        // shielding face + the glowing shoebox
        var wall = new T.Mesh(new T.PlaneGeometry(60, 30), basicMat(T, 0x0c1226, 1));
        wall.position.set(0, 0, -52.5);
        scene.add(wall);
        var core = new T.Mesh(new T.BoxGeometry(3.4, 2.2, 2.2), basicMat(T, COPPER, 0.95));
        core.position.set(0, 0, -51);
        scene.add(core);
        for (var i = 0; i < 9; i++) {  // tantalum-clad plate seams
          var seam = new T.Mesh(new T.PlaneGeometry(0.06, 2.3), basicMat(T, 0x070b16, 1));
          seam.position.set(-1.5 + i * 0.38, 0, -49.8);
          scene.add(seam);
        }
        addFrame(T, scene, "#ffb84d", 5, new T.Vector3(0, 0, -49.6), new T.Vector3(0, 0, -44));
        labelSprite(T, scene, "TUNGSTEN · Ta-CLAD", "#ffb84d", new T.Vector3(0, 2.6, -48.8), 1);
        var rng = window.MESynth.mulberry32(99);
        var NB = 480, bv = [];
        var burst = addPoints(T, scene, NB, CYAN, 0.1, function () {
          var th = Math.acos(2 * rng() - 1), ph = rng() * Math.PI * 2;
          bv.push([Math.sin(th) * Math.cos(ph) * 9, Math.sin(th) * Math.sin(ph) * 9, Math.cos(th) * 9]);
          return [0, 0, -50];
        });
        burst.visible = false;
        // ~20 neutrons per proton: twenty bright, distinct tracks
        var TRK = 20, trkDirs = [];
        for (var d2 = 0; d2 < TRK; d2++) {
          var th2 = Math.acos(2 * rng() - 1), ph2 = rng() * Math.PI * 2;
          trkDirs.push([Math.sin(th2) * Math.cos(ph2), Math.sin(th2) * Math.sin(ph2), Math.cos(th2)]);
        }
        var trkGeo = new T.BufferGeometry();
        trkGeo.setAttribute("position", new T.BufferAttribute(new Float32Array(TRK * 6), 3));
        var tracks = new T.LineSegments(trkGeo, new T.LineBasicMaterial({
          color: CYAN, transparent: true, opacity: 0.9,
          blending: T.AdditiveBlending, depthWrite: false
        }));
        tracks.visible = false;
        scene.add(tracks);
        var corePos = core.position.clone();
        var co = companions(T, scene, PINK);
        return {
          scene: scene, path: path,
          gaze: function (t) { return t < 0.86 ? corePos : null; },
          update: function (t, dt, st) {
            // the nucleus "boils": pulse grows faster and harder as you close in
            var approach = Math.min(1, Math.max(0, (t - 0.35) / 0.4));
            core.material.opacity = 0.8 + Math.sin(st.time * (8 + approach * 10)) * 0.2;
            core.scale.setScalar(1 + Math.sin(st.time * (8 + approach * 10)) * 0.04 * (1 + 4 * approach));
            if (t >= 0.78) {
              burst.visible = true;
              tracks.visible = true;
              var pos = burst.geometry.attributes.position;
              for (var i = 0; i < NB; i++) {
                pos.array[i * 3] += bv[i][0] * dt;
                pos.array[i * 3 + 1] += bv[i][1] * dt;
                pos.array[i * 3 + 2] += bv[i][2] * dt;
              }
              pos.needsUpdate = true;
              var age = (t - 0.78) * 13;
              var head = age * 14, tail = Math.max(0, head - 2.2);
              var tp = tracks.geometry.attributes.position;
              for (var k2 = 0; k2 < TRK; k2++) {
                tp.array[k2 * 6] = trkDirs[k2][0] * tail;
                tp.array[k2 * 6 + 1] = trkDirs[k2][1] * tail;
                tp.array[k2 * 6 + 2] = -50 + trkDirs[k2][2] * tail;
                tp.array[k2 * 6 + 3] = trkDirs[k2][0] * head;
                tp.array[k2 * 6 + 4] = trkDirs[k2][1] * head;
                tp.array[k2 * 6 + 5] = -50 + trkDirs[k2][2] * head;
              }
              tp.needsUpdate = true;
              tracks.material.opacity = Math.max(0, 0.9 - Math.max(0, age - 1.2) * 0.5);
              scene.fog.density = Math.min(0.09, scene.fog.density + dt * 0.04);
            }
            if (t < 0.78) co.update(st.camPos, st.time);
          }
        };
      }
    },

    /* ---- 09 MODERATOR ---- */
    {
      loc: "09 · WATER MODERATOR · 300 K", you: "n⁰", mass: "n", tint: TINT_H,
      duration: 16, intensity: 0.34, fov: { from: 70, to: 58 },
      energy: { from: 2, to: 0.000000025 }, clock: { from: 10200.6, to: 10235 },
      captions: [[0.18, "every bounce sheds energy to a water molecule"],
                 [0.55, "you can't measure atoms while outrunning them"],
                 [0.86, "thermal: you now move at the speed of the room"]],
      events: [
        { t: 0.16, thud: true, shake: 0.18, flash: 0.1 },
        { t: 0.32, thud: true, shake: 0.16, flash: 0.09 },
        { t: 0.48, thud: true, shake: 0.14, flash: 0.08 },
        { t: 0.63, thud: true, shake: 0.12, flash: 0.07 },
        { t: 0.77, thud: true, shake: 0.1, flash: 0.06 },
        { t: 0.9, thud: true, shake: 0.08, flash: 0.05 }
      ],
      build: function (T) {
        var scene = fogged(T, 0x02101c, 0x06283d, 0.055);
        var rng = window.MESynth.mulberry32(13);
        // a cramped random walk — sharp-ish corners at every collision
        var pts = [new T.Vector3(0, 0, 0)], dir = new T.Vector3(0, 0, -1), cur = pts[0].clone();
        var corners = [];
        for (var i = 0; i < 8; i++) {
          cur = cur.clone().addScaledVector(dir, 7);
          pts.push(cur.clone());
          pts.push(cur.clone().addScaledVector(dir, 0.01));   // doubled point sharpens the corner
          corners.push(cur.clone());
          dir = new T.Vector3(rng() * 2 - 1, rng() * 2 - 1, -(0.3 + rng())).normalize();
        }
        pts.push(cur.clone().addScaledVector(dir, 6));
        var path = new T.CatmullRomCurve3(pts);
        // a recoil splash of water molecules at every collision corner
        var splashes = corners.map(function (cpos) {
          var dirs = [];
          var sp = addPoints(T, scene, 16, 0x9fdcec, 0.18, function () {
            var th = Math.acos(2 * rng() - 1), ph = rng() * Math.PI * 2;
            dirs.push([Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]);
            return [cpos.x, cpos.y, cpos.z];
          });
          sp.visible = false;
          return { pts: sp, dirs: dirs, pos: cpos, started: -1 };
        });
        var mol = addPoints(T, scene, 2200, 0x5fb0d8, 0.22, function () {
          return [(rng() - 0.5) * 36, (rng() - 0.5) * 28, -rng() * 52 + 6];
        });
        mol.material.opacity = 0.8;
        labelSprite(T, scene, "H₂O · 300 K", "#4fd8eb", new T.Vector3(0, 6, -20), 1.2);
        var base = mol.geometry.attributes.position.array.slice(0);
        return {
          scene: scene, path: path,
          update: function (t, dt, st) {
            var pos = mol.geometry.attributes.position;
            for (var i = 0; i < 2200; i++) {
              var j = i * 3, ph = i * 0.7;
              pos.array[j] = base[j] + Math.sin(st.time * 2.1 + ph) * 0.25;
              pos.array[j + 1] = base[j + 1] + Math.cos(st.time * 1.7 + ph) * 0.25;
            }
            pos.needsUpdate = true;
            for (var si = 0; si < splashes.length; si++) {
              var sp = splashes[si];
              if (sp.started < 0 && st.camPos.distanceTo(sp.pos) < 1.8) sp.started = st.time;
              if (sp.started >= 0) {
                var age = st.time - sp.started;
                if (age < 0.9) {
                  sp.pts.visible = true;
                  var spp = sp.pts.geometry.attributes.position;
                  for (var pi = 0; pi < 16; pi++) {
                    spp.array[pi * 3] = sp.pos.x + sp.dirs[pi][0] * age * 3.5;
                    spp.array[pi * 3 + 1] = sp.pos.y + sp.dirs[pi][1] * age * 3.5;
                    spp.array[pi * 3 + 2] = sp.pos.z + sp.dirs[pi][2] * age * 3.5;
                  }
                  spp.needsUpdate = true;
                  sp.pts.material.opacity = 1 - age / 0.9;
                } else {
                  sp.pts.visible = false;
                }
              }
            }
          }
        };
      }
    },

    /* ---- 10 BEAMLINE ---- */
    {
      loc: "10 · BEAM PORT N5 → INSTRUMENT", you: "n⁰", mass: "n", tint: TINT_H,
      duration: 12, intensity: 0.3,
      energy: { from: 0.000000025, to: 0.000000025 }, clock: { from: 10235, to: 19400 },
      captions: [[0.2, "slow neutrons arrive late, fast ones early —"],
                 [0.36, "your arrival time IS your wavelength"],
                 [0.78, "time-of-flight: structured logging, at 2.2 km/s"]],
      events: [],
      build: function (T) {
        var scene = fogged(T, 0x020409, 0x040812, 0.03);
        var L = 90;
        // leaving the monolith: a bright square doorway behind you
        var door = new T.Mesh(new T.PlaneGeometry(4, 4), basicMat(T, 0x9fdcec, 0.9, true));
        door.position.set(0, 0, 6);
        scene.add(door);
        addFrame(T, scene, "#4fd8eb", 5, new T.Vector3(0, 0, 5.9), new T.Vector3(0, 0, -2));
        // rectangular guide: four corner rails + sparse ribs
        addRails(T, scene, { n: 4, r: 1.9, z0: 2, z1: -L, color: BRIGHT, opacity: 0.65, a0: Math.PI / 4 });
        for (var i = 0; i < 12; i++) {
          addFrame(T, scene, "#233055", 3.9, new T.Vector3(0, 0, -6 - i * 7), new T.Vector3(0, 0, -6 - i * 7 + 4));
        }
        // the instrument, far ahead
        var inst = new T.Mesh(new T.PlaneGeometry(10, 7), basicMat(T, 0x123146, 0.9, true));
        inst.position.set(0, 0, -L - 4);
        scene.add(inst);
        labelSprite(T, scene, "INSTRUMENT AHEAD", "#5fe8a0", new T.Vector3(0, 3.2, -L + 4), 1);
        var rng = window.MESynth.mulberry32(77);
        // fellow thermal neutrons — each with its own speed, so the bunch
        // visibly strings out along the guide: time-of-flight, animated
        var NF = 260, fz = new Float32Array(NF), fv = new Float32Array(NF);
        var fellows = addPoints(T, scene, NF, CYAN, 0.08, function (i) {
          fz[i] = -rng() * L;
          fv[i] = (rng() - 0.5) * 2.4;            // faster ones pull ahead
          return [(rng() - 0.5) * 2.6, (rng() - 0.5) * 2.6, fz[i]];
        });
        return {
          scene: scene, path: straightPath(T, L - 6),
          update: function (t, dt, st) {
            door.material.opacity = Math.max(0.12, 0.9 - t * 1.4);
            var pos = fellows.geometry.attributes.position;
            for (var i = 0; i < NF; i++) {
              pos.array[i * 3 + 2] = fz[i] + fv[i] * t * 12;
            }
            pos.needsUpdate = true;
          }
        };
      }
    },

    /* ---- 11 DETECTION ---- */
    {
      loc: "11 · SAMPLE → DETECTOR", you: "n⁰", mass: "n", tint: TINT_H,
      duration: 14, intensity: 0.5,
      energy: { from: 0.000000025, to: 0.000000025 }, clock: { from: 19400, to: 20000 },
      captions: [[0.2, "the crystal's planes act like a diffraction grating"],
                 [0.6, "your deflection angle encodes the atomic spacing"],
                 [0.85, "detector wall. timestamp ready."]],
      events: [
        { t: 0.55, thud: true, shake: 0.12, flash: 0.15 },
        { t: 0.96, flash: 0.9, thud: true }
      ],
      build: function (T) {
        var scene = fogged(T, 0x020705, 0x04100a, 0.035);
        var path = new T.CatmullRomCurve3([
          new T.Vector3(0, 0, 0), new T.Vector3(0, 0, -12), new T.Vector3(0, 0, -24),
          new T.Vector3(0, 0, -30),                          // sample ≈ t 0.55
          new T.Vector3(-6, 0.4, -38), new T.Vector3(-14, 0.8, -46)
        ]);
        // sample tank
        addRails(T, scene, { n: 10, r: 16, z0: -16, z1: -52, color: LINE, opacity: 0.35 });
        // the crystal: a 3×3×3 lattice
        var lat = new T.InstancedMesh(new T.SphereGeometry(0.16, 10, 10), basicMat(T, CYAN, 0.95), 27);
        var m4 = new T.Matrix4(), n = 0;
        for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
          m4.makeTranslation(x * 0.8, y * 0.8, z * 0.8);
          lat.setMatrixAt(n++, m4);
        }
        lat.position.set(0, 0, -30.5);
        scene.add(lat);
        addFrame(T, scene, "#5fe8a0", 3.4, new T.Vector3(0, 0, -30.5), new T.Vector3(0, 0, -24));
        labelSprite(T, scene, "SAMPLE", "#5fe8a0", new T.Vector3(0, 2.2, -30), 0.9);
        // detector wall: a bank of tubes
        var tubes = new T.InstancedMesh(
          new T.CylinderGeometry(0.32, 0.32, 9, 10, 1, true), basicMat(T, GREEN, 0.5), 16);
        for (var i = 0; i < 16; i++) {
          var px = -10 - Math.cos(i / 15 * 0.9) * 8, pz = -40 - Math.sin(i / 15 * 0.9) * 9;
          m4.makeTranslation(px, 0, pz);
          tubes.setMatrixAt(i, m4);
        }
        scene.add(tubes);
        labelSprite(T, scene, "³He TUBES", "#5fe8a0", new T.Vector3(-12, 5.4, -42), 1);
        var samplePos = new T.Vector3(0, 0, -30.5);
        // Bragg "ping": a ring that blooms out of the lattice at the scatter
        var ping = addRing(T, scene, GREEN, 0.5, 0.045, -30.5, 0, true);
        return {
          scene: scene, path: path,
          gaze: function (t) {
            if (t < 0.5) return samplePos;
            if (t >= 0.55 && t < 0.7) return samplePos;     // glance back as you peel away
            return null;
          },
          update: function (t, dt, st) {
            lat.rotation.y += dt * 0.15;
            if (t >= 0.55) {
              var age = (t - 0.55) * 14;
              ping.scale.setScalar(1 + age * 5);
              ping.material.opacity = Math.max(0, 0.9 - age * 0.55);
              lat.scale.setScalar(1 + Math.max(0, 0.3 - age * 0.6));   // the lattice pops
            }
            // capture: the detector bank flares as you arrive
            tubes.material.opacity = t > 0.94 ? Math.min(1, 0.5 + (t - 0.94) * 9) : 0.5;
          }
        };
      }
    }
  ];

  window.BTBScenes = { CHAPTERS: CHAPTERS };
})();
