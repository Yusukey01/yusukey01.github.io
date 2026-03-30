/* ══════════════════════════════════════════════════════════
 * collapsible.js — Unified collapsible system
 *
 * Mode A  (legacy):  .collapsible-btn  → toggles next sibling display
 * Mode B  (fade):    [data-collapsible="fade"] → max-height + fade overlay
 *
 * Mode B usage:
 *   <section data-collapsible="fade"
 *            data-collapsed-height="130"
 *            data-collapsed-height-mobile="100">
 *     ...long content...
 *   </section>
 *
 *   - Starts collapsed by default.
 *   - Dynamically injects fade overlay + toggle button.
 *   - Respects prefers-reduced-motion.
 * ══════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        initLegacyCollapsible();
        initFadeCollapsible();
    });

    /* ── Mode A: Legacy .collapsible-btn toggle ── */
    function initLegacyCollapsible() {
        var btns = document.querySelectorAll('.collapsible-btn');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var content = this.nextElementSibling;
                if (!content) return;
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
            });
        });
    }

    /* ── Mode B: Fade collapsible ── */
    function initFadeCollapsible() {
        var sections = document.querySelectorAll('[data-collapsible="fade"]');

        sections.forEach(function (section) {
            if (section.classList.contains('collapsible-init')) return;
            section.classList.add('collapsible-init');

            var desktopHeight = parseInt(section.dataset.collapsedHeight, 10) || 130;
            var mobileHeight  = parseInt(section.dataset.collapsedHeightMobile, 10) || 100;
            var collapsedPx   = getCollapsedHeight(desktopHeight, mobileHeight);

            // Add required classes
            section.classList.add('collapsible-intro', 'collapsed');

            // Create fade overlay
            var fade = document.createElement('div');
            fade.className = 'intro-fade';
            section.appendChild(fade);

            // Create toggle button
            var btn = document.createElement('button');
            btn.className = 'intro-toggle collapsed';
            btn.setAttribute('aria-expanded', 'false');
            btn.innerHTML = '<i class="fas fa-chevron-down"></i> <span>Read More</span>';
            section.parentNode.insertBefore(btn, section.nextSibling);

            // Set initial collapsed height after layout settles
            requestAnimationFrame(function () {
                section.style.maxHeight = collapsedPx + 'px';
            });

            // Click handler
            btn.addEventListener('click', function () {
                var isCollapsed = section.classList.contains('collapsed');

                section.classList.toggle('collapsed');
                btn.classList.toggle('collapsed');
                btn.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');

                if (isCollapsed) {
                    // Expand
                    section.style.maxHeight = section.scrollHeight + 'px';
                    btn.innerHTML = '<i class="fas fa-chevron-up"></i> <span>Show Less</span>';
                } else {
                    // Collapse
                    section.style.maxHeight = collapsedPx + 'px';
                    btn.innerHTML = '<i class="fas fa-chevron-down"></i> <span>Read More</span>';
                }
            });

            // Update collapsed height on resize (desktop ↔ mobile)
            var resizeTimer;
            window.addEventListener('resize', function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function () {
                    collapsedPx = getCollapsedHeight(desktopHeight, mobileHeight);
                    if (section.classList.contains('collapsed')) {
                        section.style.maxHeight = collapsedPx + 'px';
                    }
                }, 150);
            });
        });
    }

    function getCollapsedHeight(desktop, mobile) {
        return window.innerWidth <= 768 ? mobile : desktop;
    }
})();