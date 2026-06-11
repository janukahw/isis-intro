/* MESynth — every piece of synthetic-data physics on the site lives here.
   Pure functions, no DOM. Simplified models, labeled as such in the UI.

   Constants (real):
     VL    = 3956 m·Å/s   — neutron speed × wavelength (h/m_n)
     TOFC  = 252.78 µs/(m·Å) — time of flight per metre per ångström (1e6/VL)
     LAM2K = 949 Å²·K     — h²/(2 m_n k_B); λ_T = sqrt(949/T) is the wavelength
                            at E = k_B·T (1.80 Å at 293.6 K, the textbook thermal
                            neutron). The flux-vs-λ Maxwellian peaks lower, at
                            sqrt(0.4·949/T).
     GAMMA_MU = 851.6 Mrad/(s·T) (135.5 MHz/T) — muon gyromagnetic ratio
     TAU_MU = 2.2 µs      — muon lifetime
     MP_MEV = 938.272 MeV — proton rest mass (CODATA)
     MN_MEV = 939.565 MeV — neutron rest mass (CODATA)
     C_KMS = 299792.458 km/s — speed of light
*/
(function () {
  "use strict";

  var C = {
    VL: 3956,
    TOFC: 252.78,
    LAM2K: 949,
    GAMMA_MU_MHZ_PER_T: 135.5,
    TAU_MU: 2.2,
    MP_MEV: 938.272,
    MN_MEV: 939.565,
    C_KMS: 299792.458
  };

  /* Synthetic powder instrument shared by data.html (inspector + playground). */
  var INSTRUMENT = {
    L: 11,                       // total flight path, m (10 m in + 1 m out)
    banks: [
      { name: "Bank 1 (2θ=30°)", twoTheta: 30, color: "#ff8a5c" },
      { name: "Bank 2 (2θ=90°)", twoTheta: 90, color: "#4fd8eb" },
      { name: "Bank 3 (2θ=150°)", twoTheta: 150, color: "#b78aff" }
    ],
    // silicon-like reflections
    dSpacings: [3.1355, 1.9201, 1.6375, 1.2459, 1.1086],
    intensities: [1.0, 0.62, 0.38, 0.20, 0.26],
    modT: 300                    // moderator temperature for incident spectrum
  };

  /* ---------- utilities ---------- */

  function linspace(a, b, n) {
    var out = new Array(n);
    for (var i = 0; i < n; i++) out[i] = a + (b - a) * i / (n - 1);
    return out;
  }

  /* Deterministic PRNG so the synthetic "measurement" is reproducible. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussPair(rng) {
    var u = Math.max(rng(), 1e-12), v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ---------- moderator spectrum ---------- */

  /* Maxwellian flux vs wavelength: λ⁻⁵·exp(−λ_T²/λ²) with λ_T² = 949/T
     (same form as Mantid's CalculateEfficiencyCorrection docs). Peaks at
     λ² = 0.4·λ_T². Unnormalized. */
  function maxwell(lambda, T) {
    var lt2 = C.LAM2K / T;                     // λ_T²
    return Math.pow(lambda, -5) * Math.exp(-lt2 / (lambda * lambda));
  }

  function moderatorSpectrum(T, n) {
    n = n || 240;
    var x = linspace(0.3, 12, n);
    var y = x.map(function (l) { return maxwell(l, T); });
    var m = Math.max.apply(null, y);
    return { x: x, y: y.map(function (v) { return v / m; }), peak: Math.sqrt(0.4 * C.LAM2K / T) };
  }

  /* ---------- relativistic kinematics (bethebeam HUD) ---------- */

  /* Speed as a fraction of c for kinetic energy T (MeV) and rest mass m (MeV):
     γ = 1 + T/m, β = √(1 − 1/γ²). Exact at all energies — 35 keV ion-source
     protons (β≈0.0086) through 800 MeV synchrotron protons (β≈0.84). */
  function beta(tMeV, mMeV) {
    var g = 1 + tMeV / mMeV;
    return Math.sqrt(Math.max(0, 1 - 1 / (g * g)));
  }
  function protonBeta(tMeV) { return beta(tMeV, C.MP_MEV); }
  function neutronBeta(tMeV) { return beta(tMeV, C.MN_MEV); }

  /* ---------- powder diffraction (synthetic instrument) ---------- */

  function difc(bankIdx) {
    var th = INSTRUMENT.banks[bankIdx].twoTheta / 2 * Math.PI / 180;
    return C.TOFC * INSTRUMENT.L * 2 * Math.sin(th);   // µs per Å
  }

  /* Smooth (noise-free) powder spectrum in TOF for one bank. */
  function powderTofSmooth(bankIdx, x) {
    var D = difc(bankIdx);
    return x.map(function (t) {
      var lam = t / (C.TOFC * INSTRUMENT.L);
      var inc = lam > 0.05 ? maxwell(lam, INSTRUMENT.modT) : 0;
      var y = 0;
      for (var i = 0; i < INSTRUMENT.dSpacings.length; i++) {
        var tc = D * INSTRUMENT.dSpacings[i];
        var sig = 8 + 0.004 * tc;              // µs, broadens with TOF
        var dt = (t - tc) / sig;
        y += INSTRUMENT.intensities[i] * Math.exp(-0.5 * dt * dt);
      }
      return inc * (40 + 900 * y) + 0.4;       // peaks ride on the source spectrum
    });
  }

  /* Noisy "measured" spectrum: smooth model + Poisson-ish noise, scaled to counts. */
  function powderTofMeasured(bankIdx, nPts, seed) {
    var x = linspace(1000, 19800, nPts || 470);
    var smooth = powderTofSmooth(bankIdx, x);
    var m = Math.max.apply(null, smooth);
    var rng = mulberry32((seed || 7) * 1000 + bankIdx);
    var y = smooth.map(function (v) {
      var counts = v / m * 4200 + 6;
      var noisy = counts + Math.sqrt(counts) * gaussPair(rng);
      return Math.max(0, Math.round(noisy));
    });
    return { x: x, y: y };
  }

  /* Incident-spectrum envelope vs TOF (for the Normalize step). Max-normalized
     with a floor so dividing never explodes. */
  function incidentEnvelopeTof(x) {
    var env = x.map(function (t) {
      var lam = t / (C.TOFC * INSTRUMENT.L);
      return maxwell(lam, INSTRUMENT.modT) * 40 + 0.4;
    });
    var m = Math.max.apply(null, env);
    return env.map(function (v) { return Math.max(v / m, 0.02); });
  }

  /* Linear rebin of (xOld edges implicit: points treated as centers with equal
     spacing) onto new centers — simple lossy redistribution, good enough to
     SHOW what rebinning does. */
  function rebinTo(xOld, yOld, xNew) {
    var yNew = new Array(xNew.length).fill(0);
    var cnt = new Array(xNew.length).fill(0);
    var lo = xNew[0], hi = xNew[xNew.length - 1];
    var stepN = (hi - lo) / (xNew.length - 1);
    for (var i = 0; i < xOld.length; i++) {
      if (xOld[i] < lo || xOld[i] > hi) continue;
      var k = Math.round((xOld[i] - lo) / stepN);
      if (k < 0) k = 0;
      if (k >= xNew.length) k = xNew.length - 1;
      yNew[k] += yOld[i];
      cnt[k]++;
    }
    for (var j = 0; j < yNew.length; j++) {
      if (cnt[j] > 0) yNew[j] /= cnt[j];      // average → preserves height, not area
      else if (j > 0) yNew[j] = yNew[j - 1];  // fill empty bins for display
    }
    return yNew;
  }

  /* Rejection-sample n TOF event times from bank 2's spectrum (for the
     event-mode demo). */
  function sampleTofEvents(n, seed) {
    var rng = mulberry32(seed || 42);
    var x = linspace(1000, 19800, 600);
    var pdf = powderTofSmooth(1, x);
    var m = Math.max.apply(null, pdf);
    var out = [];
    while (out.length < n) {
      var t = 1000 + rng() * 18800;
      var k = Math.min(599, Math.max(0, Math.round((t - 1000) / 18800 * 599)));
      if (rng() * m < pdf[k]) out.push(t);
    }
    return out;
  }

  function histogram(events, lo, hi, width) {
    var nb = Math.max(1, Math.ceil((hi - lo) / width));
    var y = new Array(nb).fill(0);
    var x = new Array(nb);
    for (var i = 0; i < nb; i++) x[i] = lo + (i + 0.5) * width;
    events.forEach(function (t) {
      var k = Math.floor((t - lo) / width);
      if (k >= 0 && k < nb) y[k]++;
    });
    return { x: x, y: y };
  }

  /* ---------- fitting (Gauss–Newton, Gaussian + flat background) ---------- */

  /* Fit y ≈ A·exp(−(x−c)²/(2σ²)) + b on the given arrays.
     Moment-based init, ≤12 clamped iterations, falls back to the moment
     estimate if χ² worsens. Returns {A, c, sigma, b, fwhm, area, ok}. */
  function fitGaussian(x, y) {
    var n = x.length;
    if (n < 5) return null;
    var b = Math.min.apply(null, y);
    var sw = 0, swx = 0;
    for (var i = 0; i < n; i++) { var w = Math.max(y[i] - b, 0); sw += w; swx += w * x[i]; }
    if (sw <= 0) return null;
    var c = swx / sw;
    var swxx = 0;
    for (var j = 0; j < n; j++) {
      var w2 = Math.max(y[j] - b, 0);
      swxx += w2 * (x[j] - c) * (x[j] - c);
    }
    var sigma = Math.sqrt(Math.max(swxx / sw, 1e-9));
    var A = Math.max.apply(null, y) - b;

    function chi2(p) {
      var s = 0;
      for (var i2 = 0; i2 < n; i2++) {
        var d = (x[i2] - p[1]) / p[2];
        var r = y[i2] - (p[0] * Math.exp(-0.5 * d * d) + p[3]);
        s += r * r;
      }
      return s;
    }

    var p = [A, c, sigma, b];
    var init = p.slice();
    var best = chi2(p);

    for (var it = 0; it < 12; it++) {
      // Build normal equations J'J dp = J'r
      var JTJ = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
      var JTr = [0, 0, 0, 0];
      for (var k = 0; k < n; k++) {
        var z = (x[k] - p[1]) / p[2];
        var e = Math.exp(-0.5 * z * z);
        var f = p[0] * e + p[3];
        var r2 = y[k] - f;
        var g = [e, p[0] * e * z / p[2], p[0] * e * z * z / p[2], 1];
        for (var a = 0; a < 4; a++) {
          JTr[a] += g[a] * r2;
          for (var bb = 0; bb < 4; bb++) JTJ[a][bb] += g[a] * g[bb];
        }
      }
      for (var d2 = 0; d2 < 4; d2++) JTJ[d2][d2] *= 1.001;  // mild damping
      var dp = solve4(JTJ, JTr);
      if (!dp) break;
      var q = [
        Math.max(p[0] + dp[0], 1e-6),
        p[1] + dp[1],
        Math.min(Math.max(p[2] + dp[2], (x[1] - x[0]) * 0.5), (x[n - 1] - x[0])),
        p[3] + dp[3]
      ];
      var cq = chi2(q);
      if (cq < best) { p = q; best = cq; } else break;
    }
    if (chi2(p) > chi2(init)) p = init;
    return {
      A: p[0], c: p[1], sigma: p[2], b: p[3],
      fwhm: 2.3548 * p[2],
      area: p[0] * p[2] * Math.sqrt(2 * Math.PI),
      ok: true
    };
  }

  function solve4(M, v) {
    var a = M.map(function (row) { return row.slice(); });
    var b = v.slice();
    for (var col = 0; col < 4; col++) {
      var piv = col;
      for (var r = col + 1; r < 4; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
      if (Math.abs(a[piv][col]) < 1e-12) return null;
      var tmp = a[col]; a[col] = a[piv]; a[piv] = tmp;
      var tb = b[col]; b[col] = b[piv]; b[piv] = tb;
      for (var r2 = 0; r2 < 4; r2++) {
        if (r2 === col) continue;
        var f = a[r2][col] / a[col][col];
        for (var c2 = col; c2 < 4; c2++) a[r2][c2] -= f * a[col][c2];
        b[r2] -= f * b[col];
      }
    }
    return b.map(function (bi, i) { return bi / a[i][i]; });
  }

  /* ---------- technique models ---------- */

  /* SANS: sphere form factor, I(Q) = [3(sin QR − QR cos QR)/(QR)³]² + bkg */
  function sphereIQ(R, n) {
    n = n || 260;
    var x = [], y = [];
    for (var i = 0; i < n; i++) {
      var Q = Math.pow(10, -3 + 2.3 * i / (n - 1));   // 1e-3 … 0.2 Å⁻¹
      var qr = Q * R;
      var F = qr < 1e-4 ? 1 : 3 * (Math.sin(qr) - qr * Math.cos(qr)) / (qr * qr * qr);
      x.push(Q);
      y.push(F * F + 1e-4);
    }
    return { x: x, y: y };
  }

  /* Reflectometry (schematic): critical edge, Q⁻⁴ decay, Kiessig fringes
     with spacing ΔQ = 2π/thickness. */
  function reflectivity(thickness, n) {
    n = n || 320;
    var Qc = 0.022, Qd = 0.18;
    var x = [], y = [];
    for (var i = 0; i < n; i++) {
      var Q = 0.005 + (0.25 - 0.005) * i / (n - 1);
      var R;
      if (Q <= Qc) R = 1;
      else {
        var decay = Math.pow(Qc / Q, 4);
        var fringe = 1 + 0.85 * Math.exp(-Q / Qd) * Math.cos(Q * thickness);
        R = Math.min(1, decay * fringe);
      }
      x.push(Q);
      y.push(Math.max(R, 1e-8));
    }
    return { x: x, y: y };
  }

  /* Muon spin rotation: A(t) = A0 cos(γ_µ B t) e^(−λt); B in gauss, t in µs. */
  function muonAsym(Bgauss, lambdaRelax, n, withNoise, seed) {
    n = n || 200;
    var omega = 2 * Math.PI * C.GAMMA_MU_MHZ_PER_T * (Bgauss * 1e-4); // rad/µs
    var rng = mulberry32(seed || 5);
    var x = [], y = [];
    for (var i = 0; i < n; i++) {
      var t = 16 * i / (n - 1);
      var a = 0.25 * Math.cos(omega * t) * Math.exp(-lambdaRelax * t);
      if (withNoise) a += 0.018 * gaussPair(rng) * Math.exp(t / 14);  // stats worsen as muons decay
      x.push(t);
      y.push(a);
    }
    return { x: x, y: y };
  }

  /* Powder Bragg pattern vs d for a cubic lattice (techniques card). */
  function cubicPowder(a, n) {
    n = n || 300;
    var hkl = [[1,1,1],[2,0,0],[2,2,0],[3,1,1],[2,2,2]];
    var amps = [1, 0.55, 0.75, 0.6, 0.3];
    var x = linspace(0.8, 4.2, n);
    var y = x.map(function (d) {
      var v = 0.02;
      for (var i = 0; i < hkl.length; i++) {
        var h = hkl[i];
        var dh = a / Math.sqrt(h[0]*h[0] + h[1]*h[1] + h[2]*h[2]);
        if (dh < 0.8 || dh > 4.2) continue;
        var z = (d - dh) / 0.022;
        v += amps[i] * Math.exp(-0.5 * z * z);
      }
      return v;
    });
    return { x: x, y: y };
  }

  /* Single-crystal Bragg spots on a flat 2D detector (schematic).
     Returns spot {x, y, on, intensity} positions in a [-1,1]² detector space
     as the crystal rotates by phi degrees. A reflection lights up when its
     orientation satisfies a (loosened) Bragg condition. */
  function crystalSpots(phiDeg) {
    var phi = phiDeg * Math.PI / 180;
    var spots = [];
    var refs = [
      // pseudo-reflections: ring radius r, azimuth offset a0, condition center c, intensity
      { r: 0.30, a0: 0.4, c: 10, w: 22, i: 1.0 },
      { r: 0.30, a0: 2.6, c: 55, w: 20, i: 0.8 },
      { r: 0.52, a0: 1.1, c: 30, w: 18, i: 0.9 },
      { r: 0.52, a0: 4.0, c: 75, w: 24, i: 0.7 },
      { r: 0.52, a0: 5.3, c: 120, w: 20, i: 0.6 },
      { r: 0.74, a0: 0.2, c: 95, w: 16, i: 0.75 },
      { r: 0.74, a0: 2.0, c: 140, w: 18, i: 0.65 },
      { r: 0.74, a0: 3.4, c: 160, w: 22, i: 0.55 },
      { r: 0.90, a0: 1.6, c: 45, w: 14, i: 0.5 },
      { r: 0.90, a0: 4.8, c: 110, w: 16, i: 0.45 }
    ];
    refs.forEach(function (s) {
      // Bragg condition met when rotation is near c (mod 180), width w
      var dd = Math.abs(((phiDeg - s.c) % 180 + 270) % 180 - 90);
      var on = Math.exp(-0.5 * Math.pow((90 - dd) / (s.w / 2.355), 2));
      var az = s.a0 + phi * 0.35;     // spots drift as crystal turns
      spots.push({
        x: s.r * Math.cos(az),
        y: s.r * Math.sin(az),
        on: on,
        ring: s.r,
        intensity: s.i
      });
    });
    return spots;
  }

  window.MESynth = {
    C: C,
    INSTRUMENT: INSTRUMENT,
    linspace: linspace,
    mulberry32: mulberry32,
    protonBeta: protonBeta,
    neutronBeta: neutronBeta,
    maxwell: maxwell,
    moderatorSpectrum: moderatorSpectrum,
    difc: difc,
    powderTofSmooth: powderTofSmooth,
    powderTofMeasured: powderTofMeasured,
    incidentEnvelopeTof: incidentEnvelopeTof,
    rebinTo: rebinTo,
    sampleTofEvents: sampleTofEvents,
    histogram: histogram,
    fitGaussian: fitGaussian,
    sphereIQ: sphereIQ,
    reflectivity: reflectivity,
    muonAsym: muonAsym,
    cubicPowder: cubicPowder,
    crystalSpots: crystalSpots
  };
})();
