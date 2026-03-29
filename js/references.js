/* ══════════════════════════════════════════════════════════
 * references.js — Renders the References section from JSON
 * Depends on: data/references.json
 * Container:  <div id="references-content"></div>
 * ══════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const CONTAINER = document.getElementById('references-content');
    if (!CONTAINER) return;

    /* ── Fetch & boot ── */
    fetch('/data/references.json')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(data => render(data))
        .catch(err => {
            CONTAINER.innerHTML = '<p style="opacity:.5">Failed to load references.</p>';
            console.error('references.js:', err);
        });

    /* ── Render ── */
    function render(data) {
        const { sectionColors, sectionNames, books, courses } = data;

        /* Build controls */
        const controls = el('div', 'ref-controls');

        /* View toggle */
        const toggle = el('div', 'ref-view-toggle');
        toggle.appendChild(viewBtn('alpha', '<i class="fas fa-sort-alpha-down"></i> A–Z', true));
        toggle.appendChild(viewBtn('section', '<i class="fas fa-layer-group"></i> By Section', false));
        controls.appendChild(toggle);

        /* Filter row */
        const filterRow = el('div', 'ref-filter-row');
        filterRow.appendChild(Object.assign(el('span', 'ref-filter-label'), { textContent: 'Filter' }));
        filterRow.appendChild(filterBtn('all', 'All', null, true));
        Object.keys(sectionColors).forEach(s => {
            filterRow.appendChild(filterBtn(s, s, sectionColors[s], false));
        });
        controls.appendChild(filterRow);

        /* List container */
        const refList = el('div', 'ref-list');
        refList.id = 'ref-list';

        /* Render items */
        const bookEls  = books.map(b => bookItem(b, sectionColors, sectionNames));
        const courseEls = courses.map(c => courseItem(c, sectionColors, sectionNames));
        const bookHeading   = groupHeading('<i class="fas fa-book"></i> Books');
        const courseHeading  = groupHeading('<i class="fas fa-graduation-cap"></i> Online Courses');

        refList.appendChild(bookHeading);
        bookEls.forEach(e => refList.appendChild(e));
        refList.appendChild(courseHeading);
        courseEls.forEach(e => refList.appendChild(e));

        CONTAINER.appendChild(controls);
        CONTAINER.appendChild(refList);

        /* ── State ── */
        const allItems   = bookEls.concat(courseEls);
        const alphaOrder = Array.from(refList.children);

        /* ── Filter logic ── */
        function applyFilter(f) {
            allItems.forEach(item => {
                if (f === 'all') {
                    item.classList.remove('ref-hidden');
                } else {
                    const secs = item.dataset.sections.split(',');
                    item.classList.toggle('ref-hidden', !secs.includes(f));
                }
            });
            /* Hide headings whose items are all hidden */
            refList.querySelectorAll('.ref-group-heading').forEach(h => {
                let next = h.nextElementSibling;
                let any  = false;
                while (next && !next.classList.contains('ref-group-heading')) {
                    if (next.classList.contains('ref-item') && !next.classList.contains('ref-hidden')) any = true;
                    next = next.nextElementSibling;
                }
                h.classList.toggle('ref-hidden', !any);
            });
        }

        function activeFilter() {
            const btn = CONTAINER.querySelector('.ref-fbtn.on');
            return btn ? btn.dataset.filter : 'all';
        }

        CONTAINER.querySelectorAll('.ref-fbtn').forEach(btn => {
            btn.addEventListener('click', () => {
                CONTAINER.querySelectorAll('.ref-fbtn').forEach(b => b.classList.remove('on'));
                btn.classList.add('on');
                applyFilter(btn.dataset.filter);
            });
        });

        /* ── View toggle logic ── */
        CONTAINER.querySelectorAll('.ref-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                CONTAINER.querySelectorAll('.ref-view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                /* Remove dynamic section headings */
                refList.querySelectorAll('.ref-section-heading').forEach(e => e.remove());

                if (btn.dataset.view === 'alpha') {
                    alphaOrder.forEach(e => refList.appendChild(e));
                } else {
                    while (refList.firstChild) refList.removeChild(refList.firstChild);

                    Object.keys(sectionColors).forEach(s => {
                        const matching = allItems.filter(item => item.dataset.sections.split(',').includes(s));
                        if (!matching.length) return;

                        const h = document.createElement('h3');
                        h.className = 'ref-group-heading ref-section-heading';
                        h.innerHTML = '<span class="ref-section-dot" style="background:' +
                            sectionColors[s] + '"></span> Section ' + s + ' — ' + sectionNames[s];
                        refList.appendChild(h);
                        matching.forEach(item => refList.appendChild(item));
                    });
                }

                applyFilter(activeFilter());
            });
        });
    }

    /* ── DOM helpers ── */
    function el(tag, cls) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        return e;
    }

    function viewBtn(view, html, active) {
        const b = el('button', 'ref-view-btn' + (active ? ' active' : ''));
        b.dataset.view = view;
        b.title = view === 'alpha' ? 'Alphabetical order' : 'Group by section';
        b.innerHTML = html;
        return b;
    }

    function filterBtn(filter, label, color, active) {
        const b = el('button', 'ref-fbtn' + (active ? ' on' : ''));
        b.dataset.filter = filter;
        if (color) {
            const dot = el('span', 'ref-fdot');
            dot.style.background = color;
            b.appendChild(dot);
        }
        b.appendChild(document.createTextNode(label));
        return b;
    }

    function groupHeading(html) {
        const h = document.createElement('h3');
        h.className = 'ref-group-heading';
        h.innerHTML = html;
        return h;
    }

    function pills(sections, colors, names) {
        const container = el('div', 'ref-tags');
        sections.forEach(s => {
            const pill = el('span', 'ref-pill');
            pill.textContent = s;
            pill.title = names[s] || '';
            pill.style.setProperty('--pill-color', colors[s] || '#888');
            container.appendChild(pill);
        });
        return container;
    }

    function bookItem(b, colors, names) {
        const row = el('div', 'ref-item');
        row.dataset.sections = b.sections.join(',');

        const text = el('div', 'ref-text');
        if (b.url) {
            text.innerHTML = '<a href="' + b.url + '">' + b.author + ' <em>' + b.title + '.</em></a> ' + b.detail + '.';
        } else {
            text.innerHTML = b.author + ' <em>' + b.title + '.</em> ' + b.detail + '.';
        }

        row.appendChild(text);
        row.appendChild(pills(b.sections, colors, names));
        return row;
    }

    function courseItem(c, colors, names) {
        const row = el('div', 'ref-item');
        row.dataset.sections = c.sections.join(',');

        const text = el('div', 'ref-text');
        text.innerHTML = '<a href="' + c.url + '">' + c.name + '</a> — ' + c.institution;

        row.appendChild(text);
        row.appendChild(pills(c.sections, colors, names));
        return row;
    }
})();