/* MEPlot — the site's single tiny canvas plotter.
   Usage:
     var p = MEPlot(canvas, { xlabel: "TOF (µs)", ylabel: "counts", ylog: false });
     p.setSeries([{ x: [...], y: [...], color: "#4fd8eb", type: "line" }]);
     p.draw();
     p.animateTo(newSeries, 500);   // same point counts per series
   Series types: "line" | "bars" | "points". Extras per series:
     width (line px), size (point px), alpha.
   Plain script, exposes window.MEPlot. */
(function () {
  "use strict";

  var FONT = '11px "IBM Plex Mono", Consolas, monospace';
  var AXIS = "#3a4d85";
  var GRID = "rgba(58,77,133,0.28)";
  var TEXT = "#8a96c2";
  var PAD = { l: 52, r: 14, t: 12, b: 34 };

  function niceTicks(min, max, n) {
    if (!(max > min)) max = min + 1;
    var span = max - min;
    var step = Math.pow(10, Math.floor(Math.log10(span / n)));
    var err = (span / n) / step;
    if (err >= 7.5) step *= 10;
    else if (err >= 3.5) step *= 5;
    else if (err >= 1.5) step *= 2;
    var ticks = [];
    for (var v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
      ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    }
    return ticks;
  }

  function fmt(v) {
    var a = Math.abs(v);
    if (a >= 10000) return v.toExponential(1).replace("e+", "e");
    if (a >= 100) return String(Math.round(v));
    if (a >= 1) return String(Math.round(v * 10) / 10);
    if (a === 0) return "0";
    if (a >= 0.01) return String(Math.round(v * 100) / 100);
    return v.toExponential(0).replace("e+", "e").replace("e-", "e-");
  }

  function MEPlot(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var series = [];
    var anim = null;

    function sizeCanvas() {
      var dpr = window.devicePixelRatio || 1;
      var rect = canvas.getBoundingClientRect();
      var w = Math.max(80, rect.width), h = Math.max(60, rect.height);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: w, h: h };
    }

    function extent() {
      var xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
      series.forEach(function (s) {
        for (var i = 0; i < s.x.length; i++) {
          var yv = s.y[i];
          if (opts.ylog && yv <= 0) continue;
          if (s.x[i] < xmin) xmin = s.x[i];
          if (s.x[i] > xmax) xmax = s.x[i];
          if (yv < ymin) ymin = yv;
          if (yv > ymax) ymax = yv;
        }
      });
      if (!isFinite(xmin)) { xmin = 0; xmax = 1; ymin = 0; ymax = 1; }
      if (opts.xmin != null) xmin = opts.xmin;
      if (opts.xmax != null) xmax = opts.xmax;
      if (opts.ymin != null) ymin = opts.ymin;
      if (opts.ymax != null) ymax = opts.ymax;
      if (!opts.ylog && ymin > 0 && opts.ymin == null) ymin = 0;
      if (ymax === ymin) ymax = ymin + 1;
      return { xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };
    }

    var lastView = null;

    function draw() {
      var dim = sizeCanvas();
      var w = dim.w, h = dim.h;
      var e = extent();
      var pw = w - PAD.l - PAD.r, ph = h - PAD.t - PAD.b;
      lastView = { e: e, pw: pw, ph: ph };

      function X(v) { return PAD.l + (v - e.xmin) / (e.xmax - e.xmin) * pw; }
      function Y(v) {
        if (opts.ylog) {
          var lmin = Math.log10(Math.max(e.ymin, 1e-12));
          var lmax = Math.log10(Math.max(e.ymax, 1e-11));
          return PAD.t + ph - (Math.log10(Math.max(v, 1e-12)) - lmin) / (lmax - lmin) * ph;
        }
        return PAD.t + ph - (v - e.ymin) / (e.ymax - e.ymin) * ph;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.font = FONT;

      // grid + ticks
      ctx.lineWidth = 1;
      var xt = niceTicks(e.xmin, e.xmax, 6);
      xt.forEach(function (t) {
        var x = X(t);
        ctx.strokeStyle = GRID;
        ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, PAD.t + ph); ctx.stroke();
        ctx.fillStyle = TEXT;
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(fmt(t), x, PAD.t + ph + 6);
      });
      var yt;
      if (opts.ylog) {
        yt = [];
        var lo = Math.floor(Math.log10(Math.max(e.ymin, 1e-12)));
        var hi = Math.ceil(Math.log10(Math.max(e.ymax, 1e-11)));
        for (var d = lo; d <= hi; d++) yt.push(Math.pow(10, d));
      } else {
        yt = niceTicks(e.ymin, e.ymax, 5);
      }
      yt.forEach(function (t) {
        var y = Y(t);
        if (y < PAD.t - 1 || y > PAD.t + ph + 1) return;
        ctx.strokeStyle = GRID;
        ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + pw, y); ctx.stroke();
        ctx.fillStyle = TEXT;
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(fmt(t), PAD.l - 7, y);
      });

      // axes
      ctx.strokeStyle = AXIS;
      ctx.strokeRect(PAD.l, PAD.t, pw, ph);

      // labels
      ctx.fillStyle = TEXT;
      if (opts.xlabel) {
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(opts.xlabel, PAD.l + pw / 2, h - 2);
      }
      if (opts.ylabel) {
        ctx.save();
        ctx.translate(11, PAD.t + ph / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(opts.ylabel, 0, 0);
        ctx.restore();
      }

      // clip to plot area for data
      ctx.save();
      ctx.beginPath(); ctx.rect(PAD.l, PAD.t, pw, ph); ctx.clip();

      series.forEach(function (s) {
        ctx.globalAlpha = s.alpha != null ? s.alpha : 1;
        if (s.type === "bars") {
          var bw = s.x.length > 1 ? Math.max(1, (X(s.x[1]) - X(s.x[0])) * 0.9) : 6;
          ctx.fillStyle = s.color;
          for (var i = 0; i < s.x.length; i++) {
            var y = Y(s.y[i]);
            ctx.fillRect(X(s.x[i]) - bw / 2, y, bw, PAD.t + ph - y);
          }
        } else if (s.type === "points") {
          ctx.fillStyle = s.color;
          var r = s.size || 2;
          for (var j = 0; j < s.x.length; j++) {
            ctx.beginPath();
            ctx.arc(X(s.x[j]), Y(s.y[j]), r, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.width || 1.8;
          ctx.beginPath();
          var started = false;
          for (var k = 0; k < s.x.length; k++) {
            if (opts.ylog && s.y[k] <= 0) { started = false; continue; }
            var px = X(s.x[k]), py = Y(s.y[k]);
            if (!started) { ctx.moveTo(px, py); started = true; }
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
      ctx.restore();
    }

    function setSeries(s) {
      if (anim) { cancelAnimationFrame(anim); anim = null; }
      series = s.map(function (d) {
        return Object.assign({}, d, { x: d.x.slice(), y: d.y.slice() });
      });
    }

    /* Animate to a new series set. Series are matched by index; each pair
       must have the same point count (callers resample first). Series present
       only in the target fade in at their final values. */
    function animateTo(target, ms, done) {
      if (anim) { cancelAnimationFrame(anim); anim = null; }
      var reduce = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || !series.length) {
        setSeries(target);
        draw();
        if (done) done();
        return;
      }
      var from = series.map(function (d) {
        return { x: d.x.slice(), y: d.y.slice() };
      });
      var start = null;
      function frame(ts) {
        if (start == null) start = ts;
        var t = Math.min(1, (ts - start) / ms);
        var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        series = target.map(function (tgt, si) {
          var src = from[si];
          var out = Object.assign({}, tgt, { x: tgt.x.slice(), y: tgt.y.slice() });
          if (src && src.x.length === tgt.x.length) {
            for (var i = 0; i < tgt.x.length; i++) {
              out.x[i] = src.x[i] + (tgt.x[i] - src.x[i]) * ease;
              out.y[i] = src.y[i] + (tgt.y[i] - src.y[i]) * ease;
            }
          } else {
            out.alpha = (tgt.alpha != null ? tgt.alpha : 1) * ease;
          }
          return out;
        });
        draw();
        if (t < 1) anim = requestAnimationFrame(frame);
        else { anim = null; if (done) done(); }
      }
      anim = requestAnimationFrame(frame);
    }

    /* Map a mouse event's x position to a data x value (after at least one draw). */
    function eventToX(ev) {
      if (!lastView) return null;
      var rect = canvas.getBoundingClientRect();
      var px = ev.clientX - rect.left;
      return lastView.e.xmin + (px - PAD.l) / lastView.pw * (lastView.e.xmax - lastView.e.xmin);
    }

    var api = { draw: draw, setSeries: setSeries, animateTo: animateTo, eventToX: eventToX, opts: opts };

    if (window.ResizeObserver) {
      new ResizeObserver(function () { draw(); }).observe(canvas);
    }
    return api;
  }

  window.MEPlot = MEPlot;
})();
