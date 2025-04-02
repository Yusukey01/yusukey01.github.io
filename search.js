// search.js - Automatic content extraction with no manual keywords needed

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auto-content search script loaded');
    
    // Get DOM elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    // Create popup HTML
    const popupHTML = `
        <div id="search-popup" class="search-popup">
            <div class="search-popup-header">
                <div class="search-popup-title">Search Results</div>
                <button class="search-popup-close">&times;</button>
            </div>
            <div class="search-popup-content"></div>
        </div>
    `;
    
    // Insert popup HTML directly into body
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    
    const searchPopup = document.getElementById('search-popup');
    const popupContent = document.querySelector('.search-popup-content');
    const closeButton = document.querySelector('.search-popup-close');
    
    // Close button functionality
    closeButton.addEventListener('click', function() {
        searchPopup.classList.remove('active');
    });
    
    // Define pages to search - NO KEYWORDS NEEDED
    const pages = [
        { 
            path: 'index.html', 
            title: 'Math-CS Compass - Home'
        },
        { 
            path: 'Mathematics/Linear_algebra/linear_algebra.html', 
            title: 'Linear Algebra'
        },
        { 
            path: 'Mathematics/Calculus/calculus.html', 
            title: 'Calculus & Optimization'
        },
        { 
            path: 'Mathematics/Probability/probability.html', 
            title: 'Probability & Statistics'
        },
        { 
            path: 'Mathematics/Discrete/discrete_math.html', 
            title: 'Discrete Mathematics'
        }
    ];
    
    // Cache for page content
    const contentCache = {};
    
    // Fetch page content
    async function fetchPageContent(page) {
        // Check cache first
        if (contentCache[page.path]) {
            return contentCache[page.path];
        }
        
        try {
            const response = await fetch(page.path);
            const html = await response.text();
            
            // Create DOM parser
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract text from main content
            let contentText = '';
            
            // Try to get main content
            const main = doc.querySelector('main');
            if (main) {
                contentText = main.textContent;
            } else {
                // Fallback to body
                contentText = doc.body.textContent;
            }
            
            // Clean up text
            contentText = contentText.replace(/\\s+/g, ' ').trim();
            
            // Get meta description if available
            const metaDesc = doc.querySelector('meta[name="description"]');
            const description = metaDesc ? metaDesc.getAttribute('content') : '';
            
            // Extract headings for better context
            const headings = Array.from(doc.querySelectorAll('h1, h2, h3'))
                .map(heading => heading.textContent.trim())
                .filter(text => text.length > 0);
            
            // Store in cache
            const extractedContent = {
                content: contentText,
                description: description,
                headings: headings
            };
            
            contentCache[page.path] = extractedContent;
            return extractedContent;
        } catch (error) {
            console.error(`Error fetching ${page.path}:`, error);
            return { content: '', description: '', headings: [] };
        }
    }
    
    // Perform search
    async function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            searchPopup.classList.remove('active');
            return;
        }
        
        // Show loading state
        popupContent.innerHTML = '<div class="search-loading"></div>';
        searchPopup.classList.add('active');
        
        // Fetch content for all pages if not cached
        const contentPromises = pages.map(page => fetchPageContent(page));
        const pagesContent = await Promise.all(contentPromises);
        
        // Match results
        const results = [];
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const content = pagesContent[i];
            
            // Check title
            if (page.title.toLowerCase().includes(searchTerm)) {
                results.push({
                    ...page,
                    matchType: 'title',
                    matchContext: page.title
                });
                continue; // Skip further checks for this page
            }
            
            // Check description
            if (content.description && content.description.toLowerCase().includes(searchTerm)) {
                results.push({
                    ...page,
                    matchType: 'description',
                    matchContext: content.description
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
                    matchContext: matchingHeading
                });
                continue;
            }
            
            // Check content
            if (content.content && content.content.toLowerCase().includes(searchTerm)) {
                // Find context around match
                const contentLower = content.content.toLowerCase();
                const matchIndex = contentLower.indexOf(searchTerm);
                const start = Math.max(0, matchIndex - 40);
                const end = Math.min(content.content.length, matchIndex + searchTerm.length + 40);
                let matchContext = content.content.substring(start, end);
                
                // Add ellipsis if needed
                if (start > 0) matchContext = '...' + matchContext;
                if (end < content.content.length) matchContext = matchContext + '...';
                
                results.push({
                    ...page,
                    matchType: 'content',
                    matchContext: matchContext
                });
            }
        }
        
        // Display results
        if (results.length > 0) {
            let resultsHtml = `
                <div class="search-summary">
                    Found ${results.length} result${results.length === 1 ? '' : 's'} for "${searchTerm}"
                </div>
                <div class="results-list">
            `;
            
            results.forEach(result => {
                // Highlight match in context
                let highlightedContext = result.matchContext;
                if (highlightedContext) {
                    const regex = new RegExp(searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
                    highlightedContext = highlightedContext.replace(regex, match => `<mark>${match}</mark>`);
                }
                
                resultsHtml += `
                    <div class="popup-result-item">
                        <h3><a href="${result.path}">${result.title}</a></h3>
                        <p class="result-context">${highlightedContext || ''}</p>
                    </div>
                `;
            });
            
            resultsHtml += '</div>';
            popupContent.innerHTML = resultsHtml;
        } else {
            popupContent.innerHTML = `
                <div class="no-results">
                    <p>No results found for "${searchTerm}"</p>
                    <p class="search-suggestion">Try different keywords</p>
                </div>
            `;
        }
    }
    
    // Event listeners
    searchButton.addEventListener('click', function(e) {
        e.preventDefault();
        performSearch();
    });
    
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
            event.target !== searchButton) {
            searchPopup.classList.remove('active');
        }
    });
    
    // Make search function available for testing
    window.testSearch = function(term) {
        searchInput.value = term || 'linear algebra';
        performSearch();
    };
});