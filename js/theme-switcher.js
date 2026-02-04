/* ========================================================================
   MATH-CS COMPASS: THEME SWITCHER
   ========================================================================
   Swaps between styles-light.css and styles-dark.css
   Persists user preference in localStorage
   
   Usage:
   1. Include styles-base.css (always loaded)
   2. Include ONE theme file with id="theme-stylesheet"
   3. Add a toggle button with id="theme-toggle"
   4. Include this script
   ======================================================================== */

(function() {
    'use strict';

    const THEME_KEY = 'math-cs-compass-theme';
    const DARK = 'dark';
    const LIGHT = 'light';

    // Get the theme stylesheet element
    function getThemeStylesheet() {
        return document.getElementById('theme-stylesheet');
    }

    // Get saved theme or detect system preference
    function getSavedTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === LIGHT || saved === DARK) {
            return saved;
        }
        // Check system preference as fallback
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return LIGHT;
        }
        return DARK; // Default to dark
    }

    // Get CSS path based on current stylesheet location
    function getThemePath(theme) {
        const stylesheet = getThemeStylesheet();
        if (!stylesheet) return null;
        
        const currentHref = stylesheet.getAttribute('href');
        // Replace the theme filename while keeping the path
        return currentHref.replace(/styles-(light|dark)\.css/, `styles-${theme}.css`);
    }

    // Apply theme
    function applyTheme(theme) {
        const stylesheet = getThemeStylesheet();
        if (stylesheet) {
            const newPath = getThemePath(theme);
            if (newPath) {
                stylesheet.setAttribute('href', newPath);
            }
        }
        
        // Also set data attribute on html for potential CSS hooks
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        updateToggleButton(theme);
    }

    // Update toggle button appearance
    function updateToggleButton(theme) {
        const toggleBtn = document.getElementById('theme-toggle');
        if (!toggleBtn) return;

        const icon = toggleBtn.querySelector('i');
        const text = toggleBtn.querySelector('.theme-text');

        if (icon) {
            // Sun icon for dark mode (click to get light), Moon for light mode
            icon.className = theme === DARK ? 'fas fa-sun' : 'fas fa-moon';
        }
        if (text) {
            text.textContent = theme === DARK ? 'Light' : 'Dark';
        }
        
        toggleBtn.setAttribute('aria-label', `Switch to ${theme === DARK ? 'light' : 'dark'} mode`);
        toggleBtn.setAttribute('title', `Switch to ${theme === DARK ? 'light' : 'dark'} mode`);
    }

    // Toggle between themes
    function toggleTheme() {
        const current = localStorage.getItem(THEME_KEY) || DARK;
        const newTheme = current === DARK ? LIGHT : DARK;
        applyTheme(newTheme);
    }

    // Initialize
    function init() {
        const theme = getSavedTheme();
        applyTheme(theme);

        // Set up toggle button click handler
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }

        // Listen for system theme changes (only if user hasn't set preference)
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem(THEME_KEY)) {
                    applyTheme(e.matches ? DARK : LIGHT);
                }
            });
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose globally
    window.toggleTheme = toggleTheme;
    window.setTheme = applyTheme;
})();