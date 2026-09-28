// HPT Resource Index — client-side dashboard logic.
// No build step, no external dependencies: reads a static JSON file and
// renders stats / a filterable table entirely in the browser.

(function () {
  "use strict";

  var FILTER_FIELDS = [
    { key: "commodity_category", label: "Category" },
    { key: "commodity", label: "Commodity" },
    { key: "study_design", label: "Study Design" },
    { key: "demand_model", label: "Demand Model" },
    { key: "pub_type", label: "Pub Type" },
    { key: "open_access", label: "Open Access" },
    { key: "region", label: "Region" }
  ];

  var SEARCH_FIELDS = ["study_id", "journal", "commodity", "population", "country", "notes", "demand_model"];

  var TABLE_COLUMNS = [
    { key: "study_id", label: "Study ID" },
    { key: "year", label: "Year" },
    { key: "commodity", label: "Commodity" },
    { key: "commodity_category", label: "Category" },
    { key: "study_design", label: "Design" },
    { key: "sample_size", label: "N" },
    { key: "mean_age", label: "Mean Age" },
    { key: "num_prices", label: "# Prices" },
    { key: "country", label: "Country" },
    { key: "pub_type", label: "Pub Type" },
    { key: "open_access", label: "OA" }
  ];

  function isSampleMode() {
    return /(?:\?|&)sample=1\b/.test(window.location.search);
  }

  function assetUrl(path) {
    var base = document.body.getAttribute("data-baseurl") || "";
    return base + path;
  }

  function dataUrl() {
    return assetUrl(isSampleMode() ? "/data/sample_data.json" : "/data/data.json");
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
    var dashboardSection = document.getElementById("dashboard-section");
    if (!mount) return;

    if (data.length === 0) {
      mount.style.display = "none";
      if (dashboardSection) dashboardSection.style.display = "none";
      if (emptyState) emptyState.style.display = "block";
      renderBrowseChips([], "browse-chips");
      return;
    }
    if (emptyState) emptyState.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "block";
    mount.style.display = "grid";

    var years = data.map(function (d) { return d.year; }).filter(Boolean);
    var totalParticipants = data.reduce(function (sum, d) {
      return sum + (typeof d.sample_size === "number" ? d.sample_size : 0);
    }, 0);

    var stats = [
      { label: "Studies indexed", value: data.length },
      { label: "Commodities", value: uniqueSorted(data, "commodity").length },
      { label: "Total participants", value: totalParticipants.toLocaleString("en-US") },
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
    renderBreakdown(data, "commodity_category", "breakdown-domain");
    renderCountryMap(data, "country-map");
    renderBrowseChips(data, "browse-chips");
  }

  // Homepage "Browse by:" chips - the most common commodity domains,
  // linking straight into a pre-filtered Explore page. Derived from the
  // real data rather than a fixed taxonomy, since the coded commodities are
  // free text and vary in how many distinct values show up.
  function renderBrowseChips(data, mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    mount.innerHTML = "";
    if (data.length === 0) return;

    var counts = {};
    data.forEach(function (row) {
      var v = row.commodity;
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    var top = Object.keys(counts)
      .map(function (k) { return [k, counts[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, 5);
    if (top.length === 0) return;

    mount.appendChild(el("span", { class: "browse-label", text: "Browse by:" }));
    top.forEach(function (entry) {
      var link = el("a", {
        class: "browse-chip",
        href: assetUrl("/explore.html") + "?commodity=" + encodeURIComponent(entry[0]),
        text: entry[0]
      });
      mount.appendChild(link);
    });
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

    // Match the viewBox width to the mount's actual rendered width (falling
    // back to a sane default before layout/CSS has run) so x and y scale
    // uniformly. A mismatched viewBox + preserveAspectRatio="none" used to
    // stretch tick-label text non-uniformly whenever this chart rendered
    // somewhere narrower than its original full-width home (e.g. inside the
    // 3-up dashboard card), which is what made the year labels look smudged.
    var w = mount.clientWidth || 320, h = 160, padL = 24, padR = 12, padT = 12, padB = 26;
    var innerW = w - padL - padR, innerH = h - padT - padB;
    var stepX = series.length > 1 ? innerW / (series.length - 1) : 0;

    function px(i) { return padL + i * stepX; }
    function py(v) { return padT + innerH - (v / maxCount) * innerH; }

    var linePoints = series.map(function (p, i) { return px(i) + "," + py(p[1]); }).join(" ");
    var areaPoints = linePoints +
      " " + px(series.length - 1) + "," + (padT + innerH) +
      " " + px(0) + "," + (padT + innerH);

    // Roughly one tick per 60px of width so labels never crowd/overlap,
    // regardless of how narrow the container is.
    var maxTicks = Math.max(2, Math.floor(innerW / 60));
    var tickEvery = Math.max(1, Math.ceil(series.length / maxTicks));
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
      '<svg viewBox="0 0 ' + w + " " + h + '" class="trend-chart">' +
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

  // ---- Country map (index page) ------------------------------------------

  // Must match W/H in scripts/generate_world_map.py.
  var WORLD_MAP_W = 980, WORLD_MAP_H = 500;

  // Free-text variants RAs might type that don't match the generated
  // centroid table's country names exactly.
  var COUNTRY_ALIASES = {
    "usa": "United States",
    "us": "United States",
    "u.s.": "United States",
    "u.s.a.": "United States",
    "united states of america": "United States",
    "america": "United States",
    "uk": "United Kingdom",
    "u.k.": "United Kingdom",
    "great britain": "United Kingdom",
    "britain": "United Kingdom",
    "england": "United Kingdom",
    "scotland": "United Kingdom",
    "wales": "United Kingdom",
    "russia": "Russian Federation",
    "ivory coast": "Côte d'Ivoire",
    "czechia": "Czech Republic",
    "burma": "Myanmar",
    "democratic republic of congo": "Congo DRC",
    "democratic republic of the congo": "Congo DRC",
    "drc": "Congo DRC",
    "dr congo": "Congo DRC",
    "republic of the congo": "Congo",
    "republic of korea": "South Korea",
    "korea, south": "South Korea",
    "korea, north": "North Korea",
    "viet nam": "Vietnam",
    "swaziland": "Eswatini",
    "cape verde": "Cabo Verde"
  };

  // Resolves a raw country string to the exact key used in
  // HPT_COUNTRY_CENTROIDS (so alias/case variants of the same country -
  // "England" and "United Kingdom" - count as one location), or returns the
  // trimmed input unchanged if nothing matches.
  function canonicalCountryName(name) {
    var table = window.HPT_COUNTRY_CENTROIDS || {};
    var trimmed = String(name).trim();
    if (!trimmed) return null;
    if (table[trimmed]) return trimmed;
    var key = trimmed.toLowerCase();
    var alias = COUNTRY_ALIASES[key];
    if (alias && table[alias]) return alias;
    var matchKey = Object.keys(table).filter(function (k) { return k.toLowerCase() === key; })[0];
    return matchKey || trimmed;
  }

  function projectLonLat(lat, lon) {
    var x = (lon + 180) / 360 * WORLD_MAP_W;
    var y = (90 - lat) / 180 * WORLD_MAP_H;
    return [x, y];
  }

  function renderCountryMap(data, mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    var caption = mount.parentNode.querySelector(".map-caption");

    var counts = {};
    data.forEach(function (row) {
      if (!row.country) return;
      // A study can list multiple countries ("Canada; United States"); plot
      // one dot per listed country rather than treating the whole string as
      // a single (unmatched) location.
      String(row.country).split(";").forEach(function (part) {
        var c = canonicalCountryName(part);
        if (c) counts[c] = (counts[c] || 0) + 1;
      });
    });
    var countries = Object.keys(counts);
    if (countries.length === 0) {
      mount.innerHTML = "";
      if (caption) caption.style.display = "none";
      return;
    }

    fetch(assetUrl("/assets/img/world-outline.svg"))
      .then(function (res) { return res.text(); })
      .then(function (svgText) {
        mount.innerHTML = svgText;
        var svg = mount.querySelector("svg");
        if (!svg) return;

        var table = window.HPT_COUNTRY_CENTROIDS || {};
        var unmatched = [];

        countries.forEach(function (country) {
          var centroid = table[country];
          if (!centroid) {
            unmatched.push(country);
            return;
          }
          var xy = projectLonLat(centroid[0], centroid[1]);
          // Log scale off the absolute count (not the dataset max, so a
          // single study doesn't render at full size just because it's
          // early data) -- lets a big outlier like the US keep growing
          // instead of flatlining at a fixed cap, while still compressing
          // the visual difference between e.g. 50 and 300 studies.
          var r = Math.min(4 + Math.log(counts[country]) * 3, 40);
          var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", xy[0]);
          circle.setAttribute("cy", xy[1]);
          circle.setAttribute("r", r.toFixed(1));
          circle.setAttribute("class", "map-dot");
          var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
          title.textContent = country + ": " + counts[country] + (counts[country] === 1 ? " study" : " studies");
          circle.appendChild(title);
          svg.appendChild(circle);
        });

        if (caption) {
          if (unmatched.length) {
            caption.textContent = unmatched.length + (unmatched.length === 1 ? " country" : " countries") +
              " not shown on the map (name didn't match): " + unmatched.join(", ");
            caption.style.display = "block";
          } else {
            caption.textContent = "";
            caption.style.display = "none";
          }
        }
      })
      .catch(function (err) { console.error("Failed to load world map", err); });
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

    // Support deep links from the homepage: ?q=... prefills search,
    // ?<filter_key>=... preselects a filter (e.g. from a "Browse by" chip).
    var params = new URLSearchParams(window.location.search);
    var qParam = (params.get("q") || "").trim();
    if (qParam) {
      state.search = qParam.toLowerCase();
      var searchBox = document.getElementById("search-box");
      if (searchBox) searchBox.value = qParam;
    }
    FILTER_FIELDS.forEach(function (f) {
      var v = params.get(f.key);
      if (v) state.filters[f.key] = v;
    });

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
      renderFilterChips(state, applyAndRender);
    }

    applyAndRender();
  }

  function renderFilterChips(state, onChange) {
    var mount = document.getElementById("filter-chips");
    if (!mount) return;
    mount.innerHTML = "";

    var active = [];
    if (state.search) active.push({ label: "Search: " + state.search, clear: function () {
      state.search = "";
      var box = document.getElementById("search-box");
      if (box) box.value = "";
    } });
    FILTER_FIELDS.forEach(function (f) {
      var v = state.filters[f.key];
      if (v) active.push({ label: f.label + ": " + v, clear: function () {
        state.filters[f.key] = "";
        var select = document.querySelector('select[data-key="' + f.key + '"]');
        if (select) select.value = "";
      } });
    });

    if (active.length === 0) {
      mount.style.display = "none";
      return;
    }
    mount.style.display = "flex";

    active.forEach(function (item) {
      var chip = el("button", { class: "filter-chip", type: "button" });
      chip.appendChild(document.createTextNode(item.label + " "));
      chip.appendChild(el("span", { "aria-hidden": "true", text: "×" }));
      chip.addEventListener("click", function () {
        item.clear();
        onChange();
      });
      mount.appendChild(chip);
    });

    var clearAll = el("button", { class: "filter-chip filter-chip-clear-all", type: "button", text: "Clear all" });
    clearAll.addEventListener("click", function () {
      active.forEach(function (item) { item.clear(); });
      onChange();
    });
    mount.appendChild(clearAll);
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
      if (state.filters[f.key]) select.value = state.filters[f.key];
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

  function isUsableLink(v) {
    return !!v && v !== "NR" && v !== "N/A";
  }

  // Prefers the coded URL (usually a publisher landing page); falls back to
  // a DOI resolver link when only the DOI was coded.
  function studyUrl(row) {
    if (isUsableLink(row.url)) return row.url;
    if (isUsableLink(row.doi)) return "https://doi.org/" + row.doi;
    return null;
  }

  function renderTableBody(rows) {
    var tbody = document.getElementById("table-body");
    tbody.innerHTML = "";
    rows.forEach(function (row) {
      var tr = el("tr");
      TABLE_COLUMNS.forEach(function (col) {
        var val = row[col.key];
        var text = val === null || val === undefined ? "" : val;
        if (col.key === "study_id") {
          var link = studyUrl(row);
          var td = el("td");
          if (link) {
            td.appendChild(el("a", { class: "study-link", href: link, target: "_blank", rel: "noopener", text: text }));
          } else {
            td.textContent = text;
          }
          tr.appendChild(td);
        } else {
          tr.appendChild(el("td", { text: text }));
        }
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
