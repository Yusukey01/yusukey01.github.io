/* ========================================================================
   MATH-CS COMPASS: THEME SWITCHER
   ========================================================================
   Toggles between light and dark theme by enabling/disabling 
   dark-theme-enhancement.css

   - styles.css = base/light theme
   - styles.css + dark-theme-enhancement.css = dark theme
   ======================================================================== */

(function() {
    'use strict';

    const THEME_KEY = 'math-cs-compass-theme';
    const DARK = 'dark';
    const LIGHT = 'light';

    // Get the dark theme stylesheet
    function getDarkStylesheet() {
        return document.getElementById('dark-theme-stylesheet');
    }

    // Get saved theme or detect system preference
    function getSavedTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === LIGHT || saved === DARK) {
            return saved;
        }
        // Default to dark (your current default)
        // Or check system preference:
        // if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        //     return LIGHT;
        // }
        return DARK;
    }

    // Apply theme by enabling/disabling dark stylesheet
    function applyTheme(theme) {
        const darkStylesheet = getDarkStylesheet();
        
        if (darkStylesheet) {
            // disabled = true means the stylesheet is NOT applied (light theme)
            // disabled = false means the stylesheet IS applied (dark theme)
            darkStylesheet.disabled = (theme === LIGHT);
        }
        
        // Set data attribute on html for any additional CSS hooks
        document.documentElement.setAttribute('data-theme', theme);
        
        // Save preference
        localStorage.setItem(THEME_KEY, theme);
        
        // Update button
        updateToggleButton(theme);
    }

    // Update toggle button appearance
    function updateToggleButton(theme) {
        const toggleBtn = document.getElementById('theme-toggle');
        if (!toggleBtn) return;

        const icon = toggleBtn.querySelector('i');
        const text = toggleBtn.querySelector('.theme-text');

        if (icon) {
            // Show sun when in dark mode (click to get light)
            // Show moon when in light mode (click to get dark)
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
        const current = document.documentElement.getAttribute('data-theme') || 
                       localStorage.getItem(THEME_KEY) || DARK;
        const newTheme = current === DARK ? LIGHT : DARK;
        applyTheme(newTheme);
    }

    // Initialize
    function init() {
        const theme = getSavedTheme();
        applyTheme(theme);

        // Set up toggle button
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }

        // Listen for system theme changes (optional)
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only auto-switch if user hasn't set a manual preference
                if (!localStorage.getItem(THEME_KEY)) {
                    applyTheme(e.matches ? DARK : LIGHT);
                }
            });
        }
    }

    // Apply theme immediately to prevent flash
    // This runs before DOM is ready
    (function() {
        const theme = getSavedTheme();
        // We can't disable the stylesheet yet (DOM not ready), 
        // but we can set the data attribute
        document.documentElement.setAttribute('data-theme', theme);
    })();

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose functions globally
    window.toggleTheme = toggleTheme;
    window.setTheme = applyTheme;
})();