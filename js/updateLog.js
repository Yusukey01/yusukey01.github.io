/**
 * updateLog.js — Update Log with section/type filters, monthly timeline, and progressive loading
 * 
 * Dependencies: none (vanilla JS)
 * Expected DOM: <div id="update-log"></div> inside <div class="update-notice">
 * Expected data: updates.json with fields: date, content, url?, section, type
 */
document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    /* ── Constants ── */
    var INITIAL_COUNT = 5;
    var LOAD_MORE_COUNT = 10;
    var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    var SECTION_META = {
        I:       { color: "#1565c0", light: "#42a5f5" },
        II:      { color: "#2e7d32", light: "#66bb6a" },
        III:     { color: "#00838f", light: "#26c6da" },
        IV:      { color: "#6a1b9a", light: "#ab47bc" },
        V:       { color: "#ef6c00", light: "#ffa726" },
        general: { color: "#546e7a", light: "#90a4ae" }
    };

    var TYPE_META = {
        "new":          { icon: "✦", label: "New" },
        "update":       { icon: "↻", label: "Updated" },
        "announcement": { icon: "◈", label: "Announce" }
    };

    var SECTION_KEYS = ["all", "I", "II", "III", "IV", "V", "general"];
    var TYPE_KEYS = ["all", "new", "update", "announcement"];

    /* ── State ── */
    var allUpdates = [];
    var activeSection = "all";
    var activeType = "all";
    var visibleCount = INITIAL_COUNT;

    /* ── DOM reference ── */
    var root = document.getElementById("update-log");
    if (!root) return;

    /* ── Helpers ── */
    function parseDate(str) {
        var parts = str.split("/");
        return new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    }

    function monthKey(dateStr) {
        var parts = dateStr.split("/");
        return MONTHS[parseInt(parts[0], 10) - 1] + " " + parts[2];
    }

    function relativeTime(dateStr) {
        var date = parseDate(dateStr);
        var now = new Date();
        now.setHours(0,0,0,0);
        date.setHours(0,0,0,0);
        var diff = Math.floor((now - date) / 86400000);
        if (diff <= 0)  return "Today";
        if (diff === 1) return "Yesterday";
        if (diff < 7)   return diff + "d ago";
        if (diff < 30)  return Math.floor(diff / 7) + "w ago";
        if (diff < 365) return Math.floor(diff / 30) + "mo ago";
        return Math.floor(diff / 365) + "y ago";
    }

    function el(tag, cls, attrs) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (attrs) {
            for (var k in attrs) {
                if (attrs.hasOwnProperty(k)) {
                    if (k === "textContent") node.textContent = attrs[k];
                    else if (k === "innerHTML") node.innerHTML = attrs[k];
                    else node.setAttribute(k, attrs[k]);
                }
            }
        }
        return node;
    }

    function setStyles(node, styles) {
        for (var k in styles) {
            if (styles.hasOwnProperty(k)) node.style[k] = styles[k];
        }
    }

    /* ── Filter logic ── */
    function getFiltered() {
        return allUpdates.filter(function (u) {
            if (activeSection !== "all" && u.section !== activeSection) return false;
            if (activeType !== "all" && u.type !== activeType) return false;
            return true;
        });
    }

    function groupByMonth(items) {
        var groups = [];
        var map = {};
        items.forEach(function (u) {
            var key = monthKey(u.date);
            if (!map[key]) {
                map[key] = { key: key, items: [], total: 0 };
                groups.push(map[key]);
            }
            map[key].total++;
            map[key].items.push(u);
        });
        return groups;
    }

    /* ── Render ── */
    function render() {
        root.innerHTML = "";

        var filtered = getFiltered();
        var groups = groupByMonth(filtered);

        /* — Filter bar — */
        var filterBar = el("div", "ul-filter-row");

        var sLabel = el("span", "ul-filter-label", { textContent: "Section" });
        filterBar.appendChild(sLabel);

        SECTION_KEYS.forEach(function (key) {
            var btn = el("button", "ul-fbtn" + (activeSection === key ? " on" : ""));
            var meta = SECTION_META[key];

            if (key === "all") {
                btn.textContent = "All";
            } else if (key === "general") {
                btn.textContent = "General";
            } else {
                /* Dot + roman numeral */
                var dot = el("span", "ul-fdot");
                dot.style.background = meta.color;
                btn.appendChild(dot);
                btn.appendChild(document.createTextNode(key));
            }

            /* Active state coloring */
            if (activeSection === key && meta) {
                setStyles(btn, {
                    borderColor: meta.color + "88",
                    background: hexToRgba(meta.color, 0.2),
                    color: meta.light
                });
            }

            btn.addEventListener("click", function () {
                activeSection = key;
                visibleCount = INITIAL_COUNT;
                render();
            });
            filterBar.appendChild(btn);
        });

        /* Separator */
        var sep = el("span", "ul-sep");
        filterBar.appendChild(sep);

        /* Type filters */
        TYPE_KEYS.forEach(function (key) {
            var btn = el("button", "ul-fbtn" + (activeType === key ? " on" : ""));
            if (key === "all") {
                btn.textContent = "All types";
            } else {
                btn.textContent = TYPE_META[key].icon + " " + TYPE_META[key].label;
            }
            btn.addEventListener("click", function () {
                activeType = key;
                visibleCount = INITIAL_COUNT;
                render();
            });
            filterBar.appendChild(btn);
        });

        root.appendChild(filterBar);

        /* — Timeline — */
        var timeline = el("div", "ul-timeline");
        var totalRendered = 0;

        if (filtered.length === 0) {
            var empty = el("div", "ul-empty", { textContent: "No updates match the current filters." });
            timeline.appendChild(empty);
        } else {
            groups.forEach(function (group) {
                if (totalRendered >= visibleCount) return;

                var monthDiv = el("div", "ul-month");

                /* Month header */
                var head = el("div", "ul-month-head");
                head.appendChild(document.createTextNode(group.key));
                var badge = el("span", "ul-month-n", { textContent: String(group.total) });
                head.appendChild(badge);
                monthDiv.appendChild(head);

                /* Entries in grid */
                var grid = el("div", "ul-grid");
                var remaining = visibleCount - totalRendered;
                var toShow = group.items.slice(0, remaining);

                toShow.forEach(function (item) {
                    var sec = SECTION_META[item.section] || SECTION_META.general;
                    var typ = TYPE_META[item.type] || TYPE_META["new"];

                    var entry;
                    if (item.url) {
                        entry = el("a", "ul-entry", { href: item.url });
                    } else {
                        entry = el("div", "ul-entry");
                    }

                    /* Icon */
                    var ico = el("span", "ul-ico", { textContent: typ.icon });
                    setStyles(ico, {
                        background: hexToRgba(sec.color, 0.2),
                        color: sec.light,
                        border: "1px solid " + sec.color + "40"
                    });
                    entry.appendChild(ico);

                    /* Body */
                    var body = el("div", "ul-body");

                    var text = el("span", "ul-text", { textContent: item.content });
                    body.appendChild(text);

                    var meta = el("div", "ul-meta");

                    /* Section badge */
                    var secBadge = el("span", "ul-badge");
                    secBadge.textContent = item.section === "general" ? "General" : "§" + item.section;
                    setStyles(secBadge, {
                        background: sec.color + "1a",
                        color: sec.light,
                        border: "1px solid " + sec.color + "30"
                    });
                    meta.appendChild(secBadge);

                    meta.appendChild(el("span", "ul-type-label", { textContent: typ.label }));
                    meta.appendChild(el("span", "ul-date", { textContent: relativeTime(item.date) }));

                    body.appendChild(meta);
                    entry.appendChild(body);

                    /* Arrow for links */
                    if (item.url) {
                        entry.appendChild(el("span", "ul-arrow", { textContent: "→" }));
                    }

                    grid.appendChild(entry);
                    totalRendered++;
                });

                monthDiv.appendChild(grid);
                timeline.appendChild(monthDiv);
            });
        }

        root.appendChild(timeline);

        /* — Footer buttons: Show more / Collapse — */
        var footerWrap = el("div", "ul-more");
        var hasMore = totalRendered < filtered.length;
        var isExpanded = visibleCount > INITIAL_COUNT;

        if (hasMore) {
            var remaining = filtered.length - totalRendered;
            var moreBtn = el("button", "ul-more-btn", {
                textContent: "Show more (" + remaining + " remaining)"
            });
            moreBtn.addEventListener("click", function () {
                visibleCount += LOAD_MORE_COUNT;
                render();
            });
            footerWrap.appendChild(moreBtn);
        }

        if (isExpanded) {
            var collapseBtn = el("button", "ul-more-btn ul-collapse-btn", {
                textContent: "▲ Collapse"
            });
            collapseBtn.addEventListener("click", function () {
                visibleCount = INITIAL_COUNT;
                render();
                /* Scroll the update-notice container back into view */
                var notice = root.closest(".update-notice");
                if (notice) notice.scrollIntoView({ behavior: "smooth", block: "start" });
            });
            footerWrap.appendChild(collapseBtn);
        }

        if (hasMore || isExpanded) {
            root.appendChild(footerWrap);
        }
    }

    /* ── Utility: hex color to rgba string ── */
    function hexToRgba(hex, alpha) {
        hex = hex.replace("#", "");
        if (hex.length === 3) {
            hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        }
        var r = parseInt(hex.substring(0,2), 16);
        var g = parseInt(hex.substring(2,4), 16);
        var b = parseInt(hex.substring(4,6), 16);
        return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
    }

    /* ── Init: fetch and render ── */
    fetch('/data/updates.json')
        .then(function (response) {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
        })
        .then(function (data) {
            /* Sort descending by date */
            allUpdates = data.sort(function (a, b) {
                return parseDate(b.date) - parseDate(a.date);
            });
            render();
        })
        .catch(function (error) {
            console.error("Error loading updates:", error);
            root.innerHTML = '<p style="color: rgba(255,255,255,0.4); padding: 1rem;">Failed to load updates.</p>';
        });
});