/**
 * link-confirm.js
 * ---------------
 * Click confirmation for in-body internal page links in MATH-CS COMPASS.
 *
 * Problem: a user reading dense math content may accidentally tap a link
 * (especially on mobile) and lose their place. ref-preview.js solves this
 * for cross-references to theorems/definitions, but ordinary page links
 * inside body text have no such guard.
 *
 * Behavior: when the user clicks a non-ref-link <a> inside .section-content,
 * we intercept the click and show a small confirmation box with the
 * destination's Section name and Title (sourced from curriculum.json).
 * The user must click "Go to page →" to actually navigate.
 *
 * Scope (intercepted):
 *   - <a href="..."> inside .section-content
 *   - href is a same-site link (relative path, or absolute matching window.location.host)
 *   - href is NOT just "#..." (in-page anchors are handled by main.js / ref-preview.js)
 *   - the <a> does NOT have class "ref-link" (those are handled by ref-preview.js)
 *   - the <a> does NOT have class "no-confirm" (escape hatch)
 *
 * Dependencies: none (vanilla ES6).
 * Data source:  /data/curriculum.json (single source of truth for page metadata)
 *
 * Visual style: reuses .ref-preview-container classes from ref-preview.css
 * for visual consistency with the cross-reference preview system.
 */
(function () {
    'use strict';

    /* ── Constants ──────────────────────────────────────────── */

    const BREAKPOINT      = 1024;          // px: above = desktop, at-or-below = mobile
    const DATA_URL        = '/data/curriculum.json';
    const ANIM_DURATION   = 280;           // ms — matches CSS transition

    /* ── State ─────────────────────────────────────────────── */

    let urlIndex     = null;               // map: filename → {section, sectionRoman, title}
    let fetchFailed  = false;
    let activeBox    = null;               // currently visible confirmation box

    /* ── Utility ───────────────────────────────────────────── */

    function isDesktop() {
        return window.innerWidth > BREAKPOINT;
    }

    /**
     * Normalize a URL to a lookup key.
     * We index by the trailing filename (e.g. "lie_groups.html") because
     * curriculum.json stores `url` relative to each section's baseUrl.
     * Returns null if the URL can't be reduced to a known key.
     */
    function urlToKey(href) {
        if (!href) return null;
        // Strip query string and fragment
        const clean = href.split('#')[0].split('?')[0];
        if (!clean) return null;
        // Take the last path segment
        const parts = clean.split('/').filter(Boolean);
        if (parts.length === 0) return null;
        const last = parts[parts.length - 1];
        // Must look like an .html file
        if (!/\.html?$/i.test(last)) return null;
        return last.toLowerCase();
    }

    /**
     * Decide whether this <a> should be intercepted.
     */
    function shouldIntercept(link) {
        // Must have href
        const href = link.getAttribute('href');
        if (!href) return false;
        // Skip ref-links (handled by ref-preview.js)
        if (link.classList.contains('ref-link')) return false;
        // Skip explicit opt-out
        if (link.classList.contains('no-confirm')) return false;
        // Skip the "Go to page" button inside our own confirm box
        if (link.classList.contains('link-confirm-go')) return false;
        // Skip any link inside an existing confirm box (defense in depth)
        if (link.closest('.link-confirm-box')) return false;
        // Skip pure in-page anchors
        if (href.charAt(0) === '#') return false;
        // Skip non-http schemes (mailto:, tel:, javascript:, etc.)
        if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) return false;
        // Skip external links: absolute URLs whose host differs from current
        if (/^https?:\/\//i.test(href)) {
            try {
                const u = new URL(href);
                if (u.host !== window.location.host) return false;
            } catch (_) {
                return false;
            }
        }
        // Skip links with target="_blank" (intentional new-window navigation)
        if (link.getAttribute('target') === '_blank') return false;
        // Must be inside .section-content
        if (!link.closest('.section-content')) return false;
        return true;
    }

    /* ── Curriculum index ──────────────────────────────────── */

    function buildIndex(curriculum) {
        const idx = {};
        const sections = curriculum.sections || {};
        Object.keys(sections).forEach(function (roman) {
            const sec = sections[roman];
            const sectionTitle = sec.shortTitle || sec.title || ('Section ' + roman);
            const parts = sec.parts || [];
            parts.forEach(function (p) {
                const key = (p.url || '').toLowerCase();
                if (!key) return;
                idx[key] = {
                    section: sectionTitle,
                    sectionRoman: roman,
                    title: p.title || key
                };
            });
        });
        return idx;
    }

    function ensureData() {
        if (urlIndex !== null || fetchFailed) {
            return Promise.resolve(urlIndex);
        }
        return fetch(DATA_URL)
            .then(function (res) {
                if (!res.ok) throw new Error('Failed to load ' + DATA_URL);
                return res.json();
            })
            .then(function (data) {
                urlIndex = buildIndex(data);
                return urlIndex;
            })
            .catch(function (err) {
                console.warn('link-confirm: could not load curriculum data.', err);
                fetchFailed = true;
                return null;
            });
    }

    /* ── Box construction ──────────────────────────────────── */

    /**
     * Build the confirmation box DOM.
     * Reuses .ref-preview-container styling for visual consistency.
     *
     * @param {object|null} info  – {section, sectionRoman, title} or null if unknown
     * @param {string}      href  – original href to navigate to
     * @param {string}      mode  – 'sidenote' | 'inline'
     */
    function buildBox(info, href, mode) {
        const container = document.createElement('div');
        container.className = `ref-preview-container ref-preview-${mode} link-confirm-box`;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'ref-preview-close';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '&times;';
        container.appendChild(closeBtn);

        // Content
        const content = document.createElement('div');
        content.className = 'ref-preview-content';
        if (info) {
            const sectionLabel = info.sectionRoman
                ? `Section ${info.sectionRoman} · ${info.section}`
                : info.section;
            content.innerHTML =
                '<div class="link-confirm-section" style="font-size:0.85em;opacity:0.75;margin-bottom:0.35em;">' +
                escapeHtml(sectionLabel) +
                '</div>' +
                '<div class="link-confirm-title" style="font-weight:600;font-size:1.05em;">' +
                escapeHtml(info.title) +
                '</div>';
        } else {
            // Unknown destination — show the URL itself
            content.innerHTML =
                '<div class="link-confirm-section" style="font-size:0.85em;opacity:0.75;margin-bottom:0.35em;">' +
                'Navigate to' +
                '</div>' +
                '<div class="link-confirm-title" style="font-weight:600;font-size:1.05em;word-break:break-all;">' +
                escapeHtml(href) +
                '</div>';
        }
        container.appendChild(content);

        // Footer with Go button
        const footer = document.createElement('div');
        footer.className = 'ref-preview-footer';
        const goLink = document.createElement('a');
        goLink.href = href;
        goLink.textContent = 'Go to page →';
        goLink.className = 'link-confirm-go';
        // Normal navigation on click — no preventDefault.
        // The "link-confirm-go" class is checked in shouldIntercept()
        // to prevent the delegate handler from re-intercepting this link.
        footer.appendChild(goLink);
        container.appendChild(footer);

        // Close handler
        closeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            removeBox(container);
        });

        return container;
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ── Display ───────────────────────────────────────────── */

    function showBox(link, info, href) {
        // If a box is already visible, close it first (single-box policy)
        if (activeBox) {
            removeBox(activeBox, true);
        }

        const desktop = isDesktop();
        const mode = desktop ? 'sidenote' : 'inline';
        const el = buildBox(info, href, mode);

        if (desktop) {
            // Sidenote: position next to the link in the right margin
            document.body.appendChild(el);
            const containerEl = document.querySelector('.container');
            const containerRect = containerEl
                ? containerEl.getBoundingClientRect()
                : null;
            const linkRect = link.getBoundingClientRect();
            const scrollY  = window.scrollY || document.documentElement.scrollTop;

            el.style.position = 'absolute';
            el.style.top  = (linkRect.top + scrollY) + 'px';

            if (containerRect && (window.innerWidth - containerRect.right) >= 280) {
                el.style.left = (containerRect.right + 20) + 'px';
                el.style.width = '260px';
            } else {
                // Fall back to inline if no room
                el.remove();
                showInlineBox(link, info, href);
                return;
            }

            requestAnimationFrame(() => el.classList.add('visible'));
        } else {
            showInlineBox(link, info, href, el);
            return;
        }

        activeBox = el;
    }

    function showInlineBox(link, info, href, prebuilt) {
        const el = prebuilt || buildBox(info, href, 'inline');
        const parentP = link.closest('p, li, .theorem, .proof, .insight-box') || link.parentElement;
        parentP.insertAdjacentElement('afterend', el);

        el.style.maxHeight = '0px';
        el.style.overflow  = 'hidden';

        activeBox = el;

        requestAnimationFrame(() => {
            el.classList.add('expanded');
            el.style.maxHeight = el.scrollHeight + 'px';
            setTimeout(() => {
                if (el.classList.contains('expanded')) {
                    el.style.maxHeight = 'none';
                    el.style.overflow  = 'visible';
                }
            }, ANIM_DURATION + 50);
        });
    }

    function removeBox(el, immediate) {
        if (!el) return;
        if (el.classList.contains('ref-preview-sidenote')) {
            // Sidenote dismissal
            if (immediate) {
                el.remove();
                if (activeBox === el) activeBox = null;
                return;
            }
            el.classList.remove('visible');
            el.classList.add('closing');
            setTimeout(() => {
                el.remove();
                if (activeBox === el) activeBox = null;
            }, ANIM_DURATION);
        } else {
            // Inline dismissal
            if (immediate) {
                el.remove();
                if (activeBox === el) activeBox = null;
                return;
            }
            el.style.maxHeight = el.scrollHeight + 'px';
            el.style.overflow  = 'hidden';
            requestAnimationFrame(() => {
                el.classList.remove('expanded');
                el.style.maxHeight = '0px';
                setTimeout(() => {
                    el.remove();
                    if (activeBox === el) activeBox = null;
                }, ANIM_DURATION);
            });
        }
    }

    /* ── Click handling ────────────────────────────────────── */

    function handleClick(e) {
        const link = e.currentTarget;
        if (!shouldIntercept(link)) return;

        e.preventDefault();
        e.stopPropagation();

        const href = link.getAttribute('href');
        const key  = urlToKey(href);

        // If we have curriculum data, look up the destination's metadata.
        // If not (or destination unknown), still show a box with the raw URL —
        // the confirmation is the point, regardless of whether we can label it nicely.
        ensureData().then(function (idx) {
            const info = (idx && key && idx[key]) ? idx[key] : null;
            showBox(link, info, href);
        });
    }

    function dismissOnOutsideClick(e) {
        if (!activeBox) return;
        const target = e.target;
        if (target.closest('.link-confirm-box') ||
            target.closest('.section-content a')) {
            return;
        }
        removeBox(activeBox);
    }

    function dismissOnEscape(e) {
        if (e.key === 'Escape' && activeBox) {
            removeBox(activeBox);
        }
    }

    /* ── Initialization ────────────────────────────────────── */

    function init() {
        const sectionContents = document.querySelectorAll('.section-content');
        if (sectionContents.length === 0) return;

        // Use event delegation: attach one listener per .section-content
        // rather than per link. This handles dynamically-inserted links too.
        sectionContents.forEach(function (sc) {
            sc.addEventListener('click', function (e) {
                // Defense in depth: if the click originated inside our own
                // confirm box (which on mobile is inserted as a sibling
                // inside .section-content), do not re-intercept.
                if (e.target.closest('.link-confirm-box')) return;

                const link = e.target.closest('a');
                if (!link || !sc.contains(link)) return;
                if (!shouldIntercept(link)) return;

                e.preventDefault();
                e.stopPropagation();

                const href = link.getAttribute('href');
                const key  = urlToKey(href);

                ensureData().then(function (idx) {
                    const info = (idx && key && idx[key]) ? idx[key] : null;
                    showBox(link, info, href);
                });
            });
        });

        document.addEventListener('click', dismissOnOutsideClick);
        document.addEventListener('keydown', dismissOnEscape);

        // Prefetch curriculum on first hover (non-blocking)
        let prefetched = false;
        document.body.addEventListener('mouseover', function (e) {
            if (prefetched) return;
            const link = e.target.closest('.section-content a');
            if (link && shouldIntercept(link)) {
                prefetched = true;
                ensureData();
            }
        }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();