/**
 * MATH-CS COMPASS: Search Functionality
 * @author Yusuke Yokota
 * @version 2.0.0
 * 
 * Uses curriculum.json as the single source of truth for all page data.
 * Works from any directory level by using absolute paths from site root.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing search with curriculum.json');
    
    // Find search elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchIcon = searchButton ? searchButton.querySelector('i') : null;
    
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
                        const keywords = part.keywords || [];
                        pages.push({
                            path: '/' + section.baseUrl + part.url,
                            title: part.title,
                            keywords: keywords,
                            section: sectionId,
                            partNumber: part.part,
                            badges: part.badges || []
                        });
                        // Debug: Log pages with many keywords
                        if (keywords.length > 4) {
                            console.log(`Part "${part.title}" has ${keywords.length} keywords (including hidden ones)`);
                        }
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
     * Main search function
     */
    async function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log('Performing search for:', searchTerm);
        
        if (searchTerm === '') {
            searchPopup.classList.remove('active');
            return;
        }
        
        // Ensure pages are loaded
        if (pages.length === 0) {
            pages = await loadCurriculumData();
        }
        
        // Show loading state
        popupContent.innerHTML = '<div class="search-loading"></div>';
        searchPopup.classList.add('active');
        
        try {
            const results = [];
            
            // First pass: Search titles and keywords (fast, no fetching needed)
            for (const page of pages) {
                // Check title
                if (page.title.toLowerCase().includes(searchTerm)) {
                    results.push({
                        ...page,
                        matchType: 'title',
                        matchContext: page.title,
                        priority: 1
                    });
                    continue;
                }
                
                // Check keywords from curriculum.json (searches ALL keywords, not just displayed ones)
                if (page.keywords && page.keywords.length > 0) {
                    const matchingKeywords = page.keywords.filter(kw => 
                        kw.toLowerCase().includes(searchTerm)
                    );
                    
                    if (matchingKeywords.length > 0) {
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
                            priority: 2
                        });
                        continue;
                    }
                }
            }
            
            // Second pass: Deep content search for pages not yet matched
            // Only if we have few results from keywords
            if (results.length < 5) {
                const unmatchedPages = pages.filter(p => 
                    !results.some(r => r.path === p.path)
                );
                
                // Fetch content for unmatched pages
                const contentPromises = unmatchedPages.map(page => 
                    fetchPageContent(page).then(content => ({ page, content }))
                );
                
                const pagesWithContent = await Promise.all(contentPromises);
                
                for (const { page, content } of pagesWithContent) {
                    // Check description
                    if (content.description && content.description.toLowerCase().includes(searchTerm)) {
                        results.push({
                            ...page,
                            matchType: 'description',
                            matchContext: content.description,
                            priority: 3
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
                            priority: 4
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
                            priority: 5
                        });
                    }
                }
            }
            
            // Sort results by priority
            results.sort((a, b) => a.priority - b.priority);
            
            console.log(`Found ${results.length} results`);
            
            // Display results
            displayResults(results, searchTerm);
            
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
     * Display search results
     */
    function displayResults(results, searchTerm) {
        if (results.length > 0) {
            const siteRoot = getSiteRoot();
            
            let resultsHtml = `
                <div class="search-summary">
                    Found ${results.length} result${results.length === 1 ? '' : 's'} for "${searchTerm}"
                </div>
                <div class="results-list">
            `;
            
            results.forEach(result => {
                // Highlight match in context
                let highlightedContext = result.matchContext || '';
                if (highlightedContext) {
                    const regex = new RegExp(
                        searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 
                        'gi'
                    );
                    highlightedContext = highlightedContext.replace(
                        regex, 
                        match => `<mark>${match}</mark>`
                    );
                }
                
                // Build the correct path
                const pagePath = result.path.startsWith('/') ? result.path.substring(1) : result.path;
                const fullPath = siteRoot + pagePath;
                
                // Add section badge
                const sectionBadge = result.section && result.section !== 'HOME' 
                    ? `<span class="result-section">Section ${result.section}</span>` 
                    : '';
                
                // Add match type indicator
                const matchTypeLabel = getMatchTypeLabel(result.matchType);
                
                resultsHtml += `
                    <div class="popup-result-item">
                        <h3>
                            <a href="${fullPath}">${result.title}</a>
                            ${sectionBadge}
                        </h3>
                        <p class="result-context">${highlightedContext}</p>
                        <span class="result-match-type">${matchTypeLabel}</span>
                    </div>
                `;
            });
            
            resultsHtml += '</div>';
            popupContent.innerHTML = resultsHtml;
            
        } else {
            popupContent.innerHTML = `
                <div class="no-results">
                    <p>No results found for "${searchTerm}"</p>
                    <p class="search-suggestion">Try different keywords or check your spelling</p>
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
    
    // Event handler for search
    function triggerSearch(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        performSearch();
        return false;
    }
    
    // Add event listeners
    if (searchButton) {
        searchButton.onclick = triggerSearch;
        searchButton.addEventListener('click', triggerSearch);
    }
    
    if (searchIcon) {
        searchIcon.onclick = triggerSearch;
        searchIcon.addEventListener('click', triggerSearch);
    }
    
    // Enter key in search input
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
    
    // Close popup when clicking outside
    document.addEventListener('click', function(event) {
        if (searchPopup.classList.contains('active') &&
            !searchPopup.contains(event.target) && 
            event.target !== searchInput && 
            event.target !== searchButton &&
            event.target !== searchIcon) {
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
        performSearch();
        return 'Test search executed';
    };
    
    // Make search function available globally
    window.doSearch = performSearch;
    
    console.log('Search initialization complete - using curriculum.json');
});