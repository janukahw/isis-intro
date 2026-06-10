/* Header/footer fallback injection plus the mobile nav toggle.
   Pages carry a static header/footer so navigation works without JS;
   this script only fills in whichever is missing, then enhances.
   Plain script (no modules/fetch) so everything works from file://. */
(function () {
  "use strict";

  var PAGES = [
    ["index.html", "STORY"],
    ["probes.html", "PROBES"],
    ["facility.html", "FACILITY"],
    ["techniques.html", "TECHNIQUES"],
    ["data.html", "DATA"],
    ["experiment.html", "EXPERIMENT"]
  ];

  if (!document.querySelector(".site-header")) {
    var current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (current === "") current = "index.html";

    var links = PAGES.map(function (p) {
      var isCurrent = p[0] === current;
      return '<a href="' + p[0] + '"' + (isCurrent ? ' aria-current="page"' : "") + ">" + p[1] + "</a>";
    }).join("");

    var header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML =
      '<div class="bar">' +
      '<a class="site-title" href="index.html"><span class="pip" aria-hidden="true"></span>ISIS&nbsp;EXPLAINED</a>' +
      '<nav class="site-nav" id="site-nav" aria-label="Site">' + links + "</nav>" +
      "</div>";
    document.body.prepend(header);
  }

  if (!document.querySelector(".site-footer")) {
    var footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="bar">' +
      "<span>An unofficial, simplified guide for ISIS staff who didn’t study physics.</span>" +
      '<span><a href="https://www.isis.stfc.ac.uk/" rel="external">isis.stfc.ac.uk</a> · ' +
      '<a href="https://docs.mantidproject.org/nightly/" rel="external">Mantid docs</a></span>' +
      "</div>";
    document.body.append(footer);
  }

  /* Mobile: collapse the six nav pills behind a MENU button. Only when JS
     runs (body.has-navjs) — without JS the nav stays visible and wraps. */
  var nav = document.querySelector(".site-nav");
  var bar = document.querySelector(".site-header .bar");
  if (nav && bar) {
    document.body.classList.add("has-navjs");
    if (!nav.id) nav.id = "site-nav";
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nav-toggle";
    toggle.textContent = "MENU";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", nav.id);
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    bar.insertBefore(toggle, nav);
  }
})();
