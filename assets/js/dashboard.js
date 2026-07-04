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

    renderBreakdown(data, "commodity_domain", "breakdown-domain");
    renderBreakdown(data, "demand_model", "breakdown-model");
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

  // ---- Boot ---------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
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
