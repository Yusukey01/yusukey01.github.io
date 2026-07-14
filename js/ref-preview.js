/**
 * ref-preview.js
 * ---------------
 * Non-intrusive Context Preview for MATH-CS COMPASS.
 *
 * Shows theorem/definition previews inline (mobile) or as
 * margin sidenotes (desktop) when a user clicks a .ref-link.
 *
 * Dependencies: none (vanilla ES6).
 * Data source:  /data/previews.json (built by build_previews.js).
 *
 * v1.1:
 *  - Links INSIDE preview boxes are now resolved against the preview's
 *    SOURCE page (previously they kept hrefs relative to the source and
 *    broke when the preview was viewed from a different directory);
 *    ref-links inside previews also open nested previews.
 *  - Ctrl/Cmd/Shift/Alt+click on a ref-link bypasses the preview and
 *    lets the browser do its native open-in-new-tab behavior.
 *  - If previews.json fails to load, same-page ref-links degrade to a
 *    smooth scroll instead of a dead click.
 *  - Sidenote stacking sorts by vertical position; sidenotes are
 *    dismissed on window resize (their anchor positions go stale).
 */
(function () {
    'use strict';

    /* ── Constants ──────────────────────────────────────────── */

    const BREAKPOINT     = 1024;          // px: above = desktop, at-or-below = mobile
    const DATA_URL       = '/data/previews.json';
    const ANIM_DURATION  = 280;           // ms — matches CSS transition
    const SIDENOTE_GAP   = 12;            // px gap between stacked sidenotes

    /* ── State ─────────────────────────────────────────────── */

    let cache       = null;               // previews.json contents (id → {html, source})
    let fetchFailed = false;              // true if JSON fetch errored
    let sidenotes   = [];                 // active desktop sidenote elements
    let activeInline = null;              // active mobile inline element

    /* ── Utility ───────────────────────────────────────────── */

    function isDesktop() {
        return window.innerWidth > BREAKPOINT;
    }

    /**
     * Extract the fragment id and source path from a ref-link's href.
     * e.g. "../Calculus/lp_spaces.html#holder" → { id: "holder", page: "../Calculus/lp_spaces.html" }
     */
    function parseHref(href) {
        const hashIdx = href.indexOf('#');
        if (hashIdx === -1) return null;
        return {
            page: href.slice(0, hashIdx),
            id:   href.slice(hashIdx + 1)
        };
    }

    /**
     * Build the preview DOM element.
     * @param {string} id        – the fragment id
     * @param {string} html      – innerHTML from previews.json
     * @param {string} source    – relative page path for "View full context"
     * @param {string} origHref  – the original link href for the footer link
     * @param {string} mode      – 'sidenote' | 'inline'
     */
    function buildPreview(id, html, source, origHref, mode) {
        const container = document.createElement('div');
        container.className = `ref-preview-container ref-preview-${mode}`;
        container.dataset.previewId = id;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'ref-preview-close';
        closeBtn.setAttribute('aria-label', 'Close preview');
        closeBtn.innerHTML = '&times;';
        container.appendChild(closeBtn);

        // Content
        const content = document.createElement('div');
        content.className = 'ref-preview-content';
        content.innerHTML = html;
        resolveInnerLinks(content, source);
        container.appendChild(content);

        // Footer with source link
        const footer = document.createElement('div');
        footer.className = 'ref-preview-footer';
        const link = document.createElement('a');
        link.href = origHref;
        // Same-page references show a different label since "context"
        // is the current page itself. Clicking still scrolls to the
        // anchor — but only when the user explicitly opts in.
        const isSamePageRef = origHref.charAt(0) === '#';
        link.textContent = isSamePageRef
            ? 'Jump to definition →'
            : 'View full context →';
        // This link navigates normally (no preventDefault)
        footer.appendChild(link);
        container.appendChild(footer);

        // Close handler
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (mode === 'sidenote') {
                removeSidenote(container);
            } else {
                collapseInline(container);
            }
        });

        return container;
    }

    /**
     * Preview HTML is captured verbatim from its SOURCE page, so any
     * relative hrefs inside it are relative to the source page's
     * directory — not to the page the preview is being viewed on.
     * Rewrite them against the source path (site pages live under
     * /Mathematics/<Section>/), and give inner ref-links the preview
     * behavior so they open nested previews.
     */
    function resolveInnerLinks(content, source) {
        const anchors = content.querySelectorAll('a[href]');
        if (anchors.length === 0) return;
        const base = source
            ? window.location.origin + '/Mathematics/' + source
            : null;
        anchors.forEach(function (a) {
            const href = a.getAttribute('href');
            const isAbsolute = /^(https?:)?\/\//.test(href) || href.charAt(0) === '/';
            if (base && !isAbsolute) {
                try {
                    const u = new URL(href, base);
                    a.setAttribute('href', u.pathname + u.search + u.hash);
                } catch (err) { /* leave href as-is */ }
            }
            if (a.classList.contains('ref-link')) {
                a.addEventListener('click', handleRefClick);
            }
        });
    }

    /* ── Desktop: Sidenotes ────────────────────────────────── */

    /**
     * Get the right-edge x position for the sidenote.
     * We place it in the margin to the right of .container.
     */
    function getSidenoteLeft() {
        const containerEl = document.querySelector('.container');
        if (!containerEl) return null;
        const rect = containerEl.getBoundingClientRect();
        // Position just beyond the container's right edge
        return rect.right + 20;
    }

    /**
     * Check if enough room exists for a sidenote on the right.
     * Falls back to inline mode if not.
     */
    function hasRoomForSidenote() {
        const left = getSidenoteLeft();
        if (left === null) return false;
        // Need at least 280px for the sidenote
        return (window.innerWidth - left) >= 280;
    }

    function showSidenote(link, id, html, source, origHref) {
        // If this id is already showing, toggle it off
        const existing = sidenotes.find(s => s.dataset.previewId === id);
        if (existing) {
            removeSidenote(existing);
            return;
        }

        const el = buildPreview(id, html, source, origHref, 'sidenote');
        document.body.appendChild(el);

        // Position: aligned with the clicked link vertically
        const linkRect = link.getBoundingClientRect();
        const scrollY  = window.scrollY || document.documentElement.scrollTop;
        let topPos     = linkRect.top + scrollY;

        // Avoid overlapping existing sidenotes (sorted by vertical
        // position so the single pass is correct for 3+ notes)
        const ordered = [...sidenotes].sort(function (a, b) {
            return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
        });
        for (const sn of ordered) {
            const snRect = sn.getBoundingClientRect();
            const snTop  = snRect.top + scrollY;
            const snBottom = snTop + snRect.height;
            if (topPos >= snTop && topPos < snBottom + SIDENOTE_GAP) {
                topPos = snBottom + SIDENOTE_GAP;
            }
        }

        el.style.position = 'absolute';
        el.style.top  = topPos + 'px';
        el.style.left = getSidenoteLeft() + 'px';

        // If sidenote would extend below viewport, adjust
        requestAnimationFrame(() => {
            const elRect = el.getBoundingClientRect();
            if (elRect.right > window.innerWidth - 10) {
                el.style.left = (window.innerWidth - elRect.width - 16) + 'px';
            }
        });

        // Animate in
        requestAnimationFrame(() => {
            el.classList.add('visible');
        });

        sidenotes.push(el);

        // Re-trigger MathJax if available
        triggerMathJax(el);
    }

    function removeSidenote(el) {
        el.classList.remove('visible');
        el.classList.add('closing');
        setTimeout(() => {
            el.remove();
            sidenotes = sidenotes.filter(s => s !== el);
        }, ANIM_DURATION);
    }

    function removeAllSidenotes() {
        [...sidenotes].forEach(removeSidenote);
    }

    /* ── Mobile: Inline expansion ──────────────────────────── */

    function showInline(link, id, html, source, origHref) {
        // If same preview is open, collapse it
        if (activeInline && activeInline.dataset.previewId === id) {
            collapseInline(activeInline);
            return;
        }

        // Determine the insertion point BEFORE closing the current
        // preview: if the clicked ref-link lives INSIDE the open preview
        // (a nested reference), its own ancestors are about to be removed
        // from the document, so we reuse the open preview's slot instead.
        let anchorEl = link.closest('p') || link.parentElement;
        if (activeInline && activeInline.contains(link)) {
            anchorEl = activeInline.previousElementSibling || anchorEl;
        }

        // Close any other open inline preview first
        if (activeInline) {
            collapseInline(activeInline, true);  // immediate
        }

        const el = buildPreview(id, html, source, origHref, 'inline');

        // Insert after the containing <p> (or after link's parentElement if no <p>)
        anchorEl.insertAdjacentElement('afterend', el);

        // Set initial collapsed state
        el.style.maxHeight = '0px';
        el.style.overflow  = 'hidden';

        activeInline = el;

        // Expand on next frame
        requestAnimationFrame(() => {
            el.classList.add('expanded');
            el.style.maxHeight = el.scrollHeight + 'px';
            // After transition, allow natural height for dynamic content (MathJax)
            setTimeout(() => {
                if (el.classList.contains('expanded')) {
                    el.style.maxHeight = 'none';
                    el.style.overflow  = 'visible';
                }
            }, ANIM_DURATION + 50);
        });

        // Re-trigger MathJax
        triggerMathJax(el);
    }

    function collapseInline(el, immediate) {
        if (!el) return;

        if (immediate) {
            el.remove();
            if (activeInline === el) activeInline = null;
            return;
        }

        // Re-fix maxHeight to current height so transition works
        el.style.maxHeight = el.scrollHeight + 'px';
        el.style.overflow  = 'hidden';

        requestAnimationFrame(() => {
            el.classList.remove('expanded');
            el.style.maxHeight = '0px';
            setTimeout(() => {
                el.remove();
                if (activeInline === el) activeInline = null;
            }, ANIM_DURATION);
        });
    }

    /* ── MathJax re-render ─────────────────────────────────── */

    function triggerMathJax(el) {
        if (window.MathJax) {
            if (typeof MathJax.typesetPromise === 'function') {
                // MathJax v3
                MathJax.typesetPromise([el]).catch(function () {});
            } else if (MathJax.Hub && typeof MathJax.Hub.Queue === 'function') {
                // MathJax v2
                MathJax.Hub.Queue(['Typeset', MathJax.Hub, el]);
            }
        }
    }

    /* ── Data fetching ─────────────────────────────────────── */

    function ensureData() {
        if (cache !== null || fetchFailed) {
            return Promise.resolve(cache);
        }
        return fetch(DATA_URL)
            .then(function (res) {
                if (!res.ok) throw new Error('Failed to load ' + DATA_URL);
                return res.json();
            })
            .then(function (data) {
                cache = data;
                return cache;
            })
            .catch(function (err) {
                console.warn('ref-preview: could not load preview data.', err);
                fetchFailed = true;
                return null;
            });
    }

    /* ── Click handler ─────────────────────────────────────── */

    function handleRefClick(e) {
        // Modified clicks (new tab / new window) keep their native
        // browser behavior — never intercept them.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) {
            return;
        }

        const link = e.currentTarget;
        e.preventDefault();
        e.stopPropagation();

        const rawHref = link.getAttribute('href');
        const parsed  = parseHref(rawHref);
        if (!parsed) {
            // Malformed href — fall back to normal navigation
            window.location.href = rawHref;
            return;
        }

        // Detect same-page references: href like "#T-foo" (no page part)
        // or pointing to the current document. For these, we never want
        // the browser to perform an in-page scroll-to-anchor — the BOX
        // is the entire interaction.
        const isSamePage = (parsed.page === '');

        ensureData().then(function (data) {
            if (!data) {
                // previews.json could not be loaded at all — degrade to
                // native behavior instead of a dead click.
                if (isSamePage) {
                    const target = document.getElementById(parsed.id);
                    if (target) target.scrollIntoView({ behavior: 'smooth' });
                } else {
                    window.location.href = rawHref;
                }
                return;
            }
            if (!data[parsed.id]) {
                // No preview available.
                if (isSamePage) {
                    // Same-page target without preview data: do nothing
                    // rather than scrolling. This prevents the screen
                    // from sliding to the in-page anchor.
                    console.warn('ref-preview: no preview data for #' + parsed.id +
                                 ' (same-page link suppressed).');
                    return;
                }
                // Cross-page link — navigate normally.
                window.location.href = rawHref;
                return;
            }

            const entry    = data[parsed.id];
            const html     = entry.html;
            const source   = entry.source;
            const origHref = rawHref;

            if (isDesktop() && hasRoomForSidenote()) {
                showSidenote(link, parsed.id, html, source, origHref);
            } else {
                showInline(link, parsed.id, html, source, origHref);
            }
        });
    }

    /* ── Global listeners ──────────────────────────────────── */

    function dismissOnOutsideClick(e) {
        // Only relevant for desktop sidenotes
        if (sidenotes.length === 0) return;

        const target = e.target;
        // Don't dismiss if clicking inside a sidenote or on a ref-link
        if (target.closest('.ref-preview-sidenote') || target.closest('.ref-link')) {
            return;
        }
        removeAllSidenotes();
    }

    function dismissOnEscape(e) {
        if (e.key === 'Escape') {
            removeAllSidenotes();
            if (activeInline) collapseInline(activeInline);
        }
    }

    /* ── Initialization ────────────────────────────────────── */

    function init() {
        const links = document.querySelectorAll('a.ref-link');
        if (links.length === 0) return;  // No ref-links on this page — do nothing

        // Attach click handlers
        links.forEach(function (link) {
            link.addEventListener('click', handleRefClick);
        });

        // Global listeners
        document.addEventListener('click', dismissOnOutsideClick);
        document.addEventListener('keydown', dismissOnEscape);

        // Sidenote positions are computed against the container's edge,
        // which moves on resize — dismiss rather than float wrongly.
        let resizeTimer = null;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                if (sidenotes.length) removeAllSidenotes();
            }, 150);
        });

        // Prefetch data on first hover of any ref-link (eager but non-blocking)
        let prefetched = false;
        links.forEach(function (link) {
            const prefetch = function () {
                if (!prefetched) {
                    prefetched = true;
                    ensureData();
                }
            };
            link.addEventListener('mouseenter', prefetch, { once: true });
            link.addEventListener('touchstart', prefetch, { once: true, passive: true });
        });
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();