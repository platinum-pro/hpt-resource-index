// HPT Resource Index — client-side dashboard logic.
// No build step, no external dependencies: reads a static JSON file and
// renders stats / a filterable table entirely in the browser.

(function () {
  "use strict";

  var FILTER_FIELDS = [
    { key: "commodity_domain", label: "Commodity Domain" },
    { key: "study_design", label: "Study Design" },
    { key: "demand_model", label: "Demand Model" },
    { key: "pub_type", label: "Pub Type" },
    { key: "open_access", label: "Open Access" },
    { key: "region", label: "Region" }
  ];

  var SEARCH_FIELDS = ["study_id", "journal", "commodity", "population", "country", "notes"];

  var TABLE_COLUMNS = [
    { key: "study_id", label: "Study ID" },
    { key: "year", label: "Year" },
    { key: "journal", label: "Journal" },
    { key: "commodity", label: "Commodity" },
    { key: "commodity_domain", label: "Domain" },
    { key: "study_design", label: "Design" },
    { key: "demand_model", label: "Demand Model" },
    { key: "sample_size", label: "N" },
    { key: "country", label: "Country" },
    { key: "pub_type", label: "Pub Type" },
    { key: "open_access", label: "OA" }
  ];

  function isSampleMode() {
    return /(?:\?|&)sample=1\b/.test(window.location.search);
  }

  function dataUrl() {
    var base = document.body.getAttribute("data-baseurl") || "";
    return base + (isSampleMode() ? "/data/sample_data.json" : "/data/data.json");
  }

  function fetchData() {
    return fetch(dataUrl()).then(function (res) {
      if (!res.ok) throw new Error("Failed to load data: " + res.status);
      return res.json();
    });
  }

  function uniqueSorted(data, key) {
    var seen = {};
    data.forEach(function (row) {
      var v = row[key];
      if (v !== null && v !== undefined && v !== "") seen[v] = true;
    });
    return Object.keys(seen).sort();
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  // ---- Stats (index page) ----------------------------------------------

  function renderStats(data) {
    var mount = document.getElementById("stat-grid");
    var emptyState = document.getElementById("empty-state");
    if (!mount) return;

    if (data.length === 0) {
      mount.style.display = "none";
      if (emptyState) emptyState.style.display = "block";
      return;
    }
    if (emptyState) emptyState.style.display = "none";
    mount.style.display = "grid";

    var years = data.map(function (d) { return d.year; }).filter(Boolean);
    var stats = [
      { label: "Studies indexed", value: data.length },
      { label: "Commodities", value: uniqueSorted(data, "commodity").length },
      { label: "Demand models", value: uniqueSorted(data, "demand_model").length },
      { label: "Year range", value: years.length ? Math.min.apply(null, years) + "–" + Math.max.apply(null, years) : "—" }
    ];

    mount.innerHTML = "";
    stats.forEach(function (s) {
      mount.appendChild(el("div", { class: "stat-card" }, [
        el("div", { class: "value", text: s.value }),
        el("div", { class: "label", text: s.label })
      ]));
    });

    renderYearTrend(data, "trend-year");
    renderBreakdown(data, "commodity_domain", "breakdown-domain");
    renderBreakdown(data, "demand_model", "breakdown-model");
  }

  // First published HPT study (Jacobs & Bickel, 1999) — always anchor the
  // trend here even if the earliest coded study is more recent, so the
  // chart reads as "since the method existed," not "since we started coding."
  var HPT_ORIGIN_YEAR = 1999;

  function renderYearTrend(data, mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;

    var counts = {};
    data.forEach(function (row) {
      if (row.year) counts[row.year] = (counts[row.year] || 0) + 1;
    });
    var years = Object.keys(counts).map(Number);
    if (years.length === 0) {
      mount.innerHTML = "";
      return;
    }

    var minYear = Math.min(HPT_ORIGIN_YEAR, Math.min.apply(null, years));
    var maxYear = Math.max.apply(null, years);
    var series = [];
    for (var y = minYear; y <= maxYear; y++) {
      series.push([y, counts[y] || 0]);
    }
    var maxCount = series.reduce(function (m, p) { return Math.max(m, p[1]); }, 1);

    var w = 760, h = 220, padL = 24, padR = 12, padT = 12, padB = 26;
    var innerW = w - padL - padR, innerH = h - padT - padB;
    var stepX = series.length > 1 ? innerW / (series.length - 1) : 0;

    function px(i) { return padL + i * stepX; }
    function py(v) { return padT + innerH - (v / maxCount) * innerH; }

    var linePoints = series.map(function (p, i) { return px(i) + "," + py(p[1]); }).join(" ");
    var areaPoints = linePoints +
      " " + px(series.length - 1) + "," + (padT + innerH) +
      " " + px(0) + "," + (padT + innerH);

    var tickEvery = Math.max(1, Math.ceil(series.length / 10));
    var ticks = series
      .map(function (p, i) { return { i: i, year: p[0] }; })
      .filter(function (t) { return t.i % tickEvery === 0 || t.i === series.length - 1; });

    var dots = series.map(function (p, i) {
      return '<circle cx="' + px(i) + '" cy="' + py(p[1]) + '" r="2.5" class="trend-dot">' +
        "<title>" + p[0] + ": " + p[1] + " " + (p[1] === 1 ? "study" : "studies") + "</title></circle>";
    }).join("");

    var tickLabels = ticks.map(function (t) {
      return '<text x="' + px(t.i) + '" y="' + (h - 6) + '" class="trend-tick" text-anchor="middle">' + t.year + "</text>";
    }).join("");

    mount.innerHTML =
      '<svg viewBox="0 0 ' + w + " " + h + '" class="trend-chart" preserveAspectRatio="none">' +
      '<polygon points="' + areaPoints + '" class="trend-area"></polygon>' +
      '<polyline points="' + linePoints + '" class="trend-line"></polyline>' +
      dots + tickLabels +
      "</svg>";
  }

  function renderBreakdown(data, key, mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    var counts = {};
    data.forEach(function (row) {
      var v = row[key] || "Unspecified";
      counts[v] = (counts[v] || 0) + 1;
    });
    var entries = Object.keys(counts).map(function (k) { return [k, counts[k]]; });
    entries.sort(function (a, b) { return b[1] - a[1]; });
    var max = entries.reduce(function (m, e) { return Math.max(m, e[1]); }, 1);

    mount.innerHTML = "";
    entries.forEach(function (e) {
      var pct = Math.round((e[1] / max) * 100);
      var row = el("div", { class: "bar-row" });
      row.appendChild(el("div", { class: "bar-label", text: e[0] + " (" + e[1] + ")" }));
      var track = el("div", { class: "bar-track" });
      track.appendChild(el("div", { class: "bar-fill", style: "width:" + pct + "%" }));
      row.appendChild(track);
      mount.appendChild(row);
    });
  }

  // ---- Explore table ----------------------------------------------------

  function initExplore(data) {
    var root = document.getElementById("explore-root");
    if (!root) return;

    var state = { search: "", filters: {}, sortKey: "year", sortDir: "desc" };

    if (data.length === 0) {
      document.getElementById("empty-state").style.display = "block";
      document.getElementById("explore-controls").style.display = "none";
      return;
    }

    buildFilterControls(data, state, applyAndRender);
    document.getElementById("search-box").addEventListener("input", function (e) {
      state.search = e.target.value.trim().toLowerCase();
      applyAndRender();
    });
    buildTableHead(state, applyAndRender);

    function applyAndRender() {
      var filtered = data.filter(function (row) {
        for (var key in state.filters) {
          if (state.filters[key] && String(row[key]) !== state.filters[key]) return false;
        }
        if (state.search) {
          var hay = SEARCH_FIELDS.map(function (f) { return String(row[f] || "").toLowerCase(); }).join(" ");
          if (hay.indexOf(state.search) === -1) return false;
        }
        return true;
      });

      filtered.sort(function (a, b) {
        var av = a[state.sortKey], bv = b[state.sortKey];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        var cmp = av > bv ? 1 : -1;
        return state.sortDir === "asc" ? cmp : -cmp;
      });

      renderTableBody(filtered);
      document.getElementById("result-count").textContent =
        filtered.length + " of " + data.length + " studies";
    }

    applyAndRender();
  }

  function buildFilterControls(data, state, onChange) {
    var mount = document.getElementById("filter-controls");
    mount.innerHTML = "";
    FILTER_FIELDS.forEach(function (f) {
      var options = uniqueSorted(data, f.key);
      if (options.length === 0) return;
      var select = el("select", { "data-key": f.key });
      select.appendChild(el("option", { value: "", text: "All " + f.label }));
      options.forEach(function (opt) {
        select.appendChild(el("option", { value: opt, text: opt }));
      });
      select.addEventListener("change", function (e) {
        state.filters[f.key] = e.target.value;
        onChange();
      });
      mount.appendChild(select);
    });
  }

  function buildTableHead(state, onChange) {
    var thead = document.getElementById("table-head");
    thead.innerHTML = "";
    var tr = el("tr");
    TABLE_COLUMNS.forEach(function (col) {
      var th = el("th", { text: col.label, "data-key": col.key });
      th.addEventListener("click", function () {
        if (state.sortKey === col.key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = col.key;
          state.sortDir = "asc";
        }
        onChange();
      });
      tr.appendChild(th);
    });
    thead.appendChild(tr);
  }

  function renderTableBody(rows) {
    var tbody = document.getElementById("table-body");
    tbody.innerHTML = "";
    rows.forEach(function (row) {
      var tr = el("tr");
      TABLE_COLUMNS.forEach(function (col) {
        var val = row[col.key];
        tr.appendChild(el("td", { text: val === null || val === undefined ? "" : val }));
      });
      tbody.appendChild(tr);
    });
  }

  // ---- Citation page -------------------------------------------------------

  function initCitation() {
    var dateSpan = document.getElementById("cite-date");
    var copyBtn = document.getElementById("copy-citation");
    var feedback = document.getElementById("copy-feedback");
    if (!dateSpan || !copyBtn) return;

    var today = new Date();
    var formatted = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    dateSpan.textContent = formatted;

    copyBtn.addEventListener("click", function () {
      var citationEl = document.getElementById("citation-text");
      var text = citationEl.textContent.replace(/\s+/g, " ").trim();

      function showFeedback(message) {
        if (!feedback) return;
        feedback.textContent = message;
        setTimeout(function () { feedback.textContent = ""; }, 2500);
      }

      function selectFallback() {
        var range = document.createRange();
        range.selectNodeContents(citationEl);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        showFeedback("Couldn't auto-copy — text selected, press Ctrl/Cmd+C");
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showFeedback("Copied!");
        }).catch(selectFallback);
      } else {
        selectFallback();
      }
    });
  }

  // ---- Nav toggle (mobile hamburger) --------------------------------------

  function initNavToggle() {
    var toggle = document.getElementById("nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ---- Boot ---------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    initNavToggle();
    initCitation();

    var sampleBanner = document.getElementById("sample-banner");
    if (sampleBanner) sampleBanner.style.display = isSampleMode() ? "block" : "none";

    fetchData()
      .then(function (data) {
        renderStats(data);
        initExplore(data);
      })
      .catch(function (err) {
        console.error(err);
      });
  });
})();
