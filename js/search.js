/**
 * MATH-CS COMPASS: Search Functionality
 * @author Yusuke Yokota
 * @version 2.1.0
 *
 * Uses curriculum.json as the single source of truth for all page data.
 * Works from any directory level by using absolute paths from site root.
 *
 * v2.1.0 changes:
 *  - SECURITY/RENDERING: all user input and page-derived text is HTML-escaped
 *    before insertion; <mark> highlighting is applied on escaped text.
 *  - PERFORMANCE: deep content search now uses a bounded worker pool
 *    (concurrency 8, at most 80 pages fetched per query) and stops early
 *    once enough results are found. Previously ALL unmatched pages
 *    (~220 at current site size) were fetched simultaneously.
 *  - CORRECTNESS: a search-generation token discards results of stale
 *    (superseded) searches; duplicate click-handler registration removed
 *    (search used to fire 2-4x per click).
 *  - UX: instant title/keyword search while typing (debounced, no network);
 *    Enter or the search button additionally runs the deep content search.
 *  - Results within each match class are ranked (exact matches first,
 *    then by number of matching keywords).
 *  - Section badge colors are read from curriculum.json (sectionColors)
 *    instead of a hardcoded duplicate.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing search with curriculum.json');

    // Find search elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    if (!searchInput) {
        console.warn('Search input not found');
        return;
    }

    // Create popup
    const popupHTML = `
        <div id="search-popup" class="search-popup">
            <div class="search-popup-header">
                <div class="search-popup-title">Search Results</div>
                <button class="search-popup-close">&times;</button>
            </div>
            <div class="search-popup-content"></div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', popupHTML);

    const searchPopup = document.getElementById('search-popup');
    const popupContent = document.querySelector('.search-popup-content');
    const closeButton = document.querySelector('.search-popup-close');

    // Close button
    closeButton.addEventListener('click', function() {
        searchPopup.classList.remove('active');
    });

    // Content cache
    const contentCache = {};
    let pages = []; // Will be populated from curriculum.json
    let curriculumData = null;

    // Deep-search tuning (site is ~226 pages; never fetch it wholesale)
    const DEEP_CONCURRENCY = 8;   // parallel fetches
    const DEEP_FETCH_MAX = 80;    // max pages fetched per query
    const RESULTS_TARGET = 15;    // stop deep search once this many results
    const QUICK_DEBOUNCE_MS = 200;

    // Generation token: results from a superseded search are discarded
    let searchGeneration = 0;

    /**
     * Escape text for safe insertion into innerHTML.
     */
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /**
     * Get the site root path (handles both local dev and production)
     * Uses absolute path from site root for consistency
     */
    function getSiteRoot() {
        // Check if we're on a known domain or localhost
        const hostname = window.location.hostname;

        // For GitHub Pages or custom domain
        if (hostname.includes('github.io') || hostname.includes('math-cs-compass')) {
            return '/';
        }

        // For local development, try to detect the root
        // Look for common indicators in the path
        const path = window.location.pathname;

        // If path contains 'Mathematics/', we're in a subdirectory
        const mathIndex = path.indexOf('/Mathematics/');
        if (mathIndex !== -1) {
            return path.substring(0, mathIndex + 1);
        }

        // Default to root
        return '/';
    }

    /**
     * Load curriculum data and build pages array
     */
    async function loadCurriculumData() {
        if (curriculumData && pages.length > 0) {
            return pages;
        }

        try {
            const siteRoot = getSiteRoot();
            const curriculumPath = `${siteRoot}data/curriculum.json`;

            console.log('Loading curriculum from:', curriculumPath);

            const response = await fetch(curriculumPath);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            curriculumData = await response.json();

            // Build pages array from curriculum data
            pages = buildPagesFromCurriculum(curriculumData);

            console.log(`Loaded ${pages.length} pages from curriculum.json`);
            return pages;

        } catch (error) {
            console.error('Error loading curriculum.json:', error);
            // Return fallback pages
            return getFallbackPages();
        }
    }

    /**
     * Build a flat pages array from curriculum.json structure
     */
    function buildPagesFromCurriculum(data) {
        const pages = [];

        // Add home page
        if (data.homeNode) {
            pages.push({
                path: data.homeNode.url || '/index.html',
                title: 'MATH-CS COMPASS - Home',
                keywords: ['home', 'mathematics', 'computer science', 'compass'],
                section: 'HOME'
            });
        }

        // Add all section index pages and their parts
        if (data.sections) {
            Object.entries(data.sections).forEach(([sectionId, section]) => {
                // Add section index page
                pages.push({
                    path: '/' + section.indexUrl,
                    title: section.title,
                    keywords: [],  // Section index pages don't need keyword search
                    section: sectionId,
                    isIndex: true
                });

                // Add all parts in the section
                if (section.parts) {
                    section.parts.forEach(part => {
                        pages.push({
                            path: '/' + section.baseUrl + part.url,
                            title: part.title,
                            keywords: part.keywords || [],
                            section: sectionId,
                            badges: part.badges || []
                        });
                    });
                }
            });
        }

        return pages;
    }

    /**
     * Fallback pages if curriculum.json fails to load
     */
    function getFallbackPages() {
        return [
            { path: '/index.html', title: 'MATH-CS COMPASS - Home', keywords: [] },
            { path: '/Mathematics/Linear_algebra/linear_algebra.html', title: 'Linear Algebra', keywords: [] },
            { path: '/Mathematics/Calculus/calculus.html', title: 'Calculus & Optimization', keywords: [] },
            { path: '/Mathematics/Probability/probability.html', title: 'Probability & Statistics', keywords: [] },
            { path: '/Mathematics/Discrete/discrete_math.html', title: 'Discrete Mathematics', keywords: [] },
            { path: '/Mathematics/Machine_learning/ml.html', title: 'Machine Learning', keywords: [] }
        ];
    }

    /**
     * Fetch page content for deep search
     */
    async function fetchPageContent(page) {
        if (contentCache[page.path]) {
            return contentCache[page.path];
        }

        try {
            const siteRoot = getSiteRoot();
            const fullPath = siteRoot + (page.path.startsWith('/') ? page.path.substring(1) : page.path);

            const response = await fetch(fullPath);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Remove navigation elements before extracting content
            const elementsToRemove = doc.querySelectorAll('.quick-jump-container, .quick-jump-menu, nav, .navigation, script, style');
            elementsToRemove.forEach(el => el.remove());

            // Extract content
            let content = '';
            const main = doc.querySelector('main, .container, article');
            if (main) {
                content = main.textContent;
            } else {
                content = doc.body ? doc.body.textContent : '';
            }

            content = content.replace(/\s+/g, ' ').trim();

            // Get meta description
            const metaDesc = doc.querySelector('meta[name="description"]');
            const description = metaDesc ? metaDesc.getAttribute('content') : '';

            // Extract headings
            const headings = Array.from(doc.querySelectorAll('h1, h2, h3'))
                .map(h => h.textContent.trim())
                .filter(h => h.length > 0);

            const result = { content, description, headings };
            contentCache[page.path] = result;
            return result;

        } catch (error) {
            console.error(`Error fetching ${page.path}:`, error);
            return { content: '', description: '', headings: [] };
        }
    }

    /**
     * First pass: title + curriculum keywords. Synchronous, no network.
     * Within each class, results carry a rank (higher = better) used as a
     * tiebreaker: exact matches first, then number of matching keywords.
     */
    function quickSearch(searchTerm) {
        const results = [];

        for (const page of pages) {
            const titleLower = page.title.toLowerCase();

            // Check title
            if (titleLower.includes(searchTerm)) {
                results.push({
                    ...page,
                    matchType: 'title',
                    matchContext: page.title,
                    priority: 1,
                    rank: (titleLower === searchTerm ? 2 : 0) +
                          (titleLower.startsWith(searchTerm) ? 1 : 0)
                });
                continue;
            }

            // Check keywords from curriculum.json (searches ALL keywords, not just displayed ones)
            if (page.keywords && page.keywords.length > 0) {
                const matchingKeywords = page.keywords.filter(kw =>
                    kw.toLowerCase().includes(searchTerm)
                );

                if (matchingKeywords.length > 0) {
                    const exact = matchingKeywords.some(kw => kw.toLowerCase() === searchTerm);

                    // Show all matching keywords (up to 3)
                    const displayKeywords = matchingKeywords.slice(0, 3);
                    const moreCount = matchingKeywords.length - 3;
                    let matchContext = displayKeywords.join(', ');
                    if (moreCount > 0) {
                        matchContext += ` (+${moreCount} more)`;
                    }

                    results.push({
                        ...page,
                        matchType: 'keyword',
                        matchContext: matchContext,
                        priority: 2,
                        rank: (exact ? 10 : 0) + Math.min(matchingKeywords.length, 5)
                    });
                }
            }
        }

        return results;
    }

    /**
     * Second pass: fetch page HTML and search description / headings / body.
     * Bounded: at most DEEP_FETCH_MAX pages, DEEP_CONCURRENCY at a time,
     * stopping once RESULTS_TARGET results exist or the search is superseded.
     */
    async function deepSearch(searchTerm, results, generation) {
        const matchedPaths = new Set(results.map(r => r.path));
        const queue = pages.filter(p => !matchedPaths.has(p.path));
        let queueIndex = 0;
        let fetched = 0;

        async function worker() {
            while (true) {
                if (generation !== searchGeneration) return;        // superseded
                if (results.length >= RESULTS_TARGET) return;       // enough results
                if (fetched >= DEEP_FETCH_MAX) return;              // fetch budget spent
                if (queueIndex >= queue.length) return;             // queue exhausted

                const page = queue[queueIndex++];
                fetched++;

                const content = await fetchPageContent(page);
                if (generation !== searchGeneration) return;

                // Check description
                if (content.description && content.description.toLowerCase().includes(searchTerm)) {
                    results.push({
                        ...page,
                        matchType: 'description',
                        matchContext: content.description,
                        priority: 3,
                        rank: 0
                    });
                    continue;
                }

                // Check headings
                const matchingHeading = content.headings.find(h =>
                    h.toLowerCase().includes(searchTerm)
                );

                if (matchingHeading) {
                    results.push({
                        ...page,
                        matchType: 'heading',
                        matchContext: matchingHeading,
                        priority: 4,
                        rank: 0
                    });
                    continue;
                }

                // Check content
                if (content.content && content.content.toLowerCase().includes(searchTerm)) {
                    const contentLower = content.content.toLowerCase();
                    const matchIndex = contentLower.indexOf(searchTerm);
                    const start = Math.max(0, matchIndex - 50);
                    const end = Math.min(content.content.length, matchIndex + searchTerm.length + 50);
                    let matchContext = content.content.substring(start, end);

                    if (start > 0) matchContext = '...' + matchContext;
                    if (end < content.content.length) matchContext = matchContext + '...';

                    results.push({
                        ...page,
                        matchType: 'content',
                        matchContext: matchContext,
                        priority: 5,
                        rank: 0
                    });
                }
            }
        }

        const workers = [];
        for (let i = 0; i < DEEP_CONCURRENCY; i++) {
            workers.push(worker());
        }
        await Promise.all(workers);

        return { exhausted: queueIndex >= queue.length, fetched };
    }

    /**
     * Main search function.
     * @param {boolean} deep - also run the content search (Enter / button).
     */
    async function performSearch(deep = true) {
        const searchTerm = searchInput.value.toLowerCase().trim();

        if (searchTerm === '') {
            searchPopup.classList.remove('active');
            return;
        }

        const generation = ++searchGeneration;
        console.log('Performing search for:', searchTerm, deep ? '(deep)' : '(quick)');

        // Ensure pages are loaded
        if (pages.length === 0) {
            pages = await loadCurriculumData();
            if (generation !== searchGeneration) return;
        }

        searchPopup.classList.add('active');

        try {
            // First pass: titles and keywords (fast, no fetching needed)
            const results = quickSearch(searchTerm);

            if (!deep) {
                displayResults(results, searchTerm, {
                    hint: results.length < RESULTS_TARGET
                        ? 'Press Enter to also search page contents'
                        : ''
                });
                return;
            }

            // Second pass: deep content search, only if quick results are few
            if (results.length < 5) {
                // Show quick results immediately while deep search runs
                popupContent.innerHTML = '<div class="search-loading"></div>';

                const info = await deepSearch(searchTerm, results, generation);
                if (generation !== searchGeneration) return;

                results.sort((a, b) => (a.priority - b.priority) || (b.rank - a.rank));
                displayResults(results, searchTerm, {
                    hint: info.exhausted ? '' : 'Content search was limited to the most relevant pages'
                });
                return;
            }

            results.sort((a, b) => (a.priority - b.priority) || (b.rank - a.rank));
            console.log(`Found ${results.length} results`);
            displayResults(results, searchTerm, {});

        } catch (error) {
            console.error('Error during search:', error);
            popupContent.innerHTML = `
                <div class="no-results">
                    <p>An error occurred while searching</p>
                    <p class="search-suggestion">Please try again</p>
                </div>
            `;
        }
    }

    /**
     * Display search results.
     * All dynamic strings are escaped; <mark> highlighting is applied on
     * the escaped text using the escaped search term.
     */
    function displayResults(results, searchTerm, opts) {
        opts = opts || {};

        if (results.length > 0) {
            const siteRoot = getSiteRoot();
            const safeTerm = escapeHtml(searchTerm);
            const markRegex = new RegExp(
                safeTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
                'gi'
            );

            let resultsHtml = `
                <div class="search-summary">
                    Found ${results.length} result${results.length === 1 ? '' : 's'} for "${safeTerm}"
                </div>
                <div class="results-list">
            `;

            results.forEach(result => {
                // Escape, then highlight match in context
                let highlightedContext = escapeHtml(result.matchContext || '');
                if (highlightedContext) {
                    highlightedContext = highlightedContext.replace(
                        markRegex,
                        match => `<mark>${match}</mark>`
                    );
                }

                // Build the correct path
                const pagePath = result.path.startsWith('/') ? result.path.substring(1) : result.path;
                const fullPath = siteRoot + pagePath;

                // Section badge color from curriculum.json (single source of truth)
                const sectionColors = (curriculumData && curriculumData.sectionColors) || {};
                const badgeColor = sectionColors[result.section] || '';
                const badgeStyle = badgeColor ? ` style="background-color:${escapeHtml(badgeColor)}"` : '';
                const sectionBadge = result.section && result.section !== 'HOME'
                    ? `<span class="result-section"${badgeStyle}>Section ${escapeHtml(result.section)}</span>`
                    : '';

                // Add match type indicator
                const matchTypeLabel = getMatchTypeLabel(result.matchType);

                resultsHtml += `
                    <div class="popup-result-item">
                        <h3>
                            <a href="${escapeHtml(fullPath)}">${escapeHtml(result.title)}</a>
                            ${sectionBadge}
                        </h3>
                        <p class="result-context">${highlightedContext}</p>
                        <span class="result-match-type">${matchTypeLabel}</span>
                    </div>
                `;
            });

            resultsHtml += '</div>';

            if (opts.hint) {
                resultsHtml += `<p class="search-suggestion">${escapeHtml(opts.hint)}</p>`;
            }

            popupContent.innerHTML = resultsHtml;

        } else {
            const enterHint = opts.hint
                ? `<p class="search-suggestion">${escapeHtml(opts.hint)}</p>`
                : '';
            popupContent.innerHTML = `
                <div class="no-results">
                    <p>No results found for "${escapeHtml(searchTerm)}"</p>
                    <p class="search-suggestion">Try different keywords or check your spelling</p>
                    ${enterHint}
                </div>
            `;
        }
    }

    /**
     * Get human-readable match type label
     */
    function getMatchTypeLabel(matchType) {
        const labels = {
            'title': 'Title match',
            'keyword': 'Keyword match',
            'description': 'Description match',
            'heading': 'Heading match',
            'content': 'Content match'
        };
        return labels[matchType] || '';
    }

    // Initialize: Load curriculum data
    loadCurriculumData().then(loadedPages => {
        console.log(`Initialized with ${loadedPages.length} pages from curriculum.json`);
    });

    // Event handler for full (deep) search
    function triggerSearch(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        performSearch(true);
        return false;
    }

    // Add event listeners (registered ONCE; the icon click bubbles to the button)
    if (searchButton) {
        searchButton.addEventListener('click', triggerSearch);
    }

    // Enter key in search input runs the full search
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            performSearch(true);
        }
    });

    // Instant quick search while typing (title + keywords only, no network)
    let quickTimer = null;
    searchInput.addEventListener('input', function() {
        clearTimeout(quickTimer);
        const term = searchInput.value.trim();
        if (term === '') {
            searchGeneration++; // invalidate any in-flight search
            searchPopup.classList.remove('active');
            return;
        }
        quickTimer = setTimeout(() => performSearch(false), QUICK_DEBOUNCE_MS);
    });

    // Close popup when clicking outside
    document.addEventListener('click', function(event) {
        if (searchPopup.classList.contains('active') &&
            !searchPopup.contains(event.target) &&
            event.target !== searchInput &&
            !(searchButton && searchButton.contains(event.target))) {
            searchPopup.classList.remove('active');
        }
    });

    // Escape key closes popup
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && searchPopup.classList.contains('active')) {
            searchPopup.classList.remove('active');
        }
    });

    // Test function for debugging
    window.testSearch = function(term) {
        searchInput.value = term || 'eigenvalue';
        performSearch(true);
        return 'Test search executed';
    };

    // Make search function available globally
    window.doSearch = performSearch;

    console.log('Search initialization complete - using curriculum.json');
});