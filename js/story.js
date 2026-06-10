/* Story-page driver for index.html.
   - Builds the scene-6 detector arc + histogram SVG content.
   - Arms reveal animations (body.js-anim) and toggles .in-view via
     IntersectionObserver — unless the user prefers reduced motion.
   - If native CSS scroll-driven animations are unsupported (e.g. Firefox),
     drives the scrub effects ([data-fx]) from a scroll listener instead. */
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
    var histo = document.getElementById("det-histo");
    if (histo) {
      var heights = [4, 7, 12, 22, 38, 30, 18, 26, 40, 24, 14, 9, 6, 4, 3];
      heights.forEach(function (h, k) {
        var b = document.createElementNS(NS, "rect");
        b.setAttribute("x", 120 + k * 13);
        b.setAttribute("y", 218 - h);
        b.setAttribute("width", 10);
        b.setAttribute("height", h);
        b.setAttribute("fill", "#ffb84d");
        b.style.setProperty("--i", k);
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

    /* ---- scrub fallback (no native scroll-driven animations) ---- */
    var native = window.CSS && CSS.supports &&
      CSS.supports("(animation-timeline: view()) and (animation-range: entry)");
    if (native) return;

    /* progress p in [0,1] over the section's "cover" range */
    function coverProgress(sec) {
      var rect = sec.getBoundingClientRect();
      var vh = window.innerHeight;
      return Math.min(1, Math.max(0, (vh - rect.top) / (rect.height + vh)));
    }
    function within(p, a, b) {
      return Math.min(1, Math.max(0, (p - a) / (b - a)));
    }

    var effects = {
      ring: function (sec, p) {
        var el = sec.querySelector('[data-fx="ring"]');
        el.style.transform = "rotate(" + (within(p, 0.05, 0.95) * 900) + "deg)";
      },
      probes: function (sec, p) {
        sec.querySelector('[data-fx="proton"]').style.transform =
          "translateX(" + (within(p, 0.10, 0.70) * 320) + "px)";
        var m = within(p, 0.30, 0.80);
        var mu = sec.querySelector('[data-fx="muons"]');
        mu.style.transform = "translateY(" + (-90 * m) + "px)";
        mu.style.opacity = Math.min(1, m * 5);
        var b = within(p, 0.60, 0.95);
        var burst = sec.querySelector('[data-fx="burst"]');
        burst.style.transform = "scale(" + b + ")";
        burst.style.opacity = Math.min(1, b * 3.3);
      },
      race: function (sec, p) {
        [["race1", 0.55], ["race2", 0.75], ["race3", 0.95]].forEach(function (cfg) {
          sec.querySelector('[data-fx="' + cfg[0] + '"]').style.transform =
            "translateX(" + (within(p, 0.15, cfg[1]) * 640) + "px)";
        });
      }
    };

    var sections = Array.prototype.slice.call(document.querySelectorAll("[data-scrub]"));
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        sections.forEach(function (sec) {
          effects[sec.dataset.scrub](sec, coverProgress(sec));
        });
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  });
})();
