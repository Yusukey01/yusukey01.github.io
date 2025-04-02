// search.js - Automatically extracts content from pages for search

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing automatic search functionality');
    
    // Get DOM elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    const resultsContainer = document.getElementById('results-container');
    
    // Check if all elements exist
    if (!searchInput || !searchButton || !searchResults || !resultsContainer) {
        console.error('Search elements not found');
        return; // Stop execution if elements are missing
    }
    
    // Define pages to search with minimal info - no need for keywords
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
        // Add more pages as needed with just path and title
    ];
    
    // Cache for page content to avoid repeated fetches
    const pageCache = {};
    
    // Fetch and extract content from a page
    async function fetchPageContent(page) {
        // Check cache first
        if (pageCache[page.path]) {
            return pageCache[page.path];
        }
        
        try {
            const response = await fetch(page.path);
            const html = await response.text();
            
            // Create a temporary element to parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract main content and remove script tags
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            
            // Extract text from main content areas
            let content = '';
            
            // First try to get content from main tag
            const main = doc.querySelector('main');
            if (main) {
                content = main.textContent;
            } else {
                // Fallback to body content
                content = doc.body.textContent;
            }
            
            // Clean up the content
            content = content.replace(/\s+/g, ' ').trim();
            
            // Extract meta description if available
            const metaDescription = doc.querySelector('meta[name="description"]');
            const description = metaDescription ? metaDescription.getAttribute('content') : '';
            
            // Extract headings for better search context
            const headings = Array.from(doc.querySelectorAll('h1, h2, h3'))
                .map(h => h.textContent.trim())
                .filter(h => h.length > 0);
            
            // Store the processed content in cache
            const pageData = {
                content: content,
                description: description,
                headings: headings
            };
            
            pageCache[page.path] = pageData;
            return pageData;
            
        } catch (error) {
            console.error(`Error fetching ${page.path}:`, error);
            return { content: '', description: '', headings: [] };
        }
    }
    
    // Create a loading indicator
    function createLoadingIndicator() {
        const loader = document.createElement('span');
        loader.className = 'search-loading';
        return loader;
    }
    
    // Perform search with content extraction
    async function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            searchResults.style.display = 'none';
            return;
        }
        
        // Show loading state
        searchButton.classList.add('active');
        const loader = createLoadingIndicator();
        searchButton.appendChild(loader);
        
        // Clear previous results
        resultsContainer.innerHTML = '';
        searchResults.style.display = 'block';
        resultsContainer.innerHTML = '<p>Searching...</p>';
        
        // Fetch content for all pages (will use cache for already fetched pages)
        const pagePromises = pages.map(async page => {
            const pageData = await fetchPageContent(page);
            return {
                ...page,
                ...pageData
            };
        });
        
        // Wait for all page content to be fetched
        const pagesWithContent = await Promise.all(pagePromises);
        
        // Filter pages based on search term
        const results = pagesWithContent.filter(page => {
            // Check title
            if (page.title.toLowerCase().includes(searchTerm)) return true;
            
            // Check description
            if (page.description && page.description.toLowerCase().includes(searchTerm)) return true;
            
            // Check headings
            if (page.headings.some(heading => heading.toLowerCase().includes(searchTerm))) return true;
            
            // Check content
            if (page.content && page.content.toLowerCase().includes(searchTerm)) return true;
            
            return false;
        });
        
        // Remove loading indicator
        searchButton.classList.remove('active');
        if (searchButton.contains(loader)) {
            searchButton.removeChild(loader);
        }
        
        // Display results
        resultsContainer.innerHTML = '';
        
        if (results.length > 0) {
            // Add search summary
            const searchSummary = document.createElement('div');
            searchSummary.className = 'search-summary';
            searchSummary.innerHTML = `<p>Found ${results.length} result${results.length === 1 ? '' : 's'} for "${searchTerm}"</p>`;
            resultsContainer.appendChild(searchSummary);
            
            // Add results
            results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                
                // Highlight matching text in title
                let titleHtml = result.title;
                if (result.title.toLowerCase().includes(searchTerm)) {
                    const regex = new RegExp(`(${searchTerm})`, 'gi');
                    titleHtml = result.title.replace(regex, '<mark>$1</mark>');
                }
                
                // Extract snippet showing search term in context
                let snippet = '';
                if (result.content) {
                    const contentLower = result.content.toLowerCase();
                    const index = contentLower.indexOf(searchTerm);
                    if (index !== -1) {
                        // Get text around the match
                        const start = Math.max(0, index - 50);
                        const end = Math.min(result.content.length, index + searchTerm.length + 50);
                        snippet = result.content.substring(start, end);
                        
                        // Add ellipsis if needed
                        if (start > 0) snippet = '...' + snippet;
                        if (end < result.content.length) snippet = snippet + '...';
                        
                        // Highlight the search term
                        const regex = new RegExp(`(${searchTerm})`, 'gi');
                        snippet = snippet.replace(regex, '<mark>$1</mark>');
                    }
                }
                
                // Build result HTML
                resultItem.innerHTML = `
                    <h3><a href="${result.path}">${titleHtml}</a></h3>
                    <p>${result.description || ''}</p>
                    ${snippet ? `<p class="snippet">${snippet}</p>` : ''}
                `;
                
                resultsContainer.appendChild(resultItem);
            });
        } else {
            resultsContainer.innerHTML = `
                <p>No results found for "${searchTerm}". Try different keywords.</p>
                <p>Suggestions: Try shorter keywords or check spelling.</p>
            `;
        }
    }
    
    // Event listeners
    searchButton.addEventListener('click', performSearch);
    
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', function(event) {
        if (!searchResults.contains(event.target) && 
            event.target !== searchInput && 
            event.target !== searchButton &&
            !searchButton.contains(event.target)) {
            searchResults.style.display = 'none';
        }
    });
    
    // Log that search is ready
    console.log('Automatic search functionality initialized');
    
    // For testing
    window.testSearch = function(term) {
        searchInput.value = term || 'linear algebra';
        performSearch();
        return 'Search test executed';
    };
});