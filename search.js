// search.js - Special focus on button click fix

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing search with button fix');
    
    // Find search elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchIcon = searchButton ? searchButton.querySelector('i') : null;
    
    console.log('Search elements:', { 
        searchInput: !!searchInput, 
        searchButton: !!searchButton,
        searchIcon: !!searchIcon
    });
    
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
    
    // Define pages to search
    const pages = [
        { path: 'index.html', title: 'Math-CS Compass - Home' },
        { path: 'Mathematics/Linear_algebra/linear_algebra.html', title: 'Linear Algebra' },
        { path: 'Mathematics/Calculus/calculus.html', title: 'Calculus & Optimization' },
        { path: 'Mathematics/Probability/probability.html', title: 'Probability & Statistics' },
        { path: 'Mathematics/Discrete/discrete_math.html', title: 'Discrete Mathematics' }
    ];
    
    // Content cache
    const contentCache = {};
    
    // Fetch page content
    async function fetchPageContent(page) {
        if (contentCache[page.path]) return contentCache[page.path];
        
        try {
            const response = await fetch(page.path);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract content
            let content = '';
            const main = doc.querySelector('main');
            if (main) {
                content = main.textContent;
            } else {
                content = doc.body.textContent;
            }
            
            content = content.replace(/\\s+/g, ' ').trim();
            
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
    
    // Perform search function
    async function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log('Performing search for:', searchTerm);
        
        if (searchTerm === '') {
            searchPopup.classList.remove('active');
            return;
        }
        
        // Show loading state
        popupContent.innerHTML = '<div class="search-loading"></div>';
        searchPopup.classList.add('active');
        
        try {
            // Search all pages
            const contentPromises = pages.map(page => fetchPageContent(page));
            const pagesContent = await Promise.all(contentPromises);
            
            // Find matches
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
                    continue;
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
                    // Find context
                    const contentLower = content.content.toLowerCase();
                    const matchIndex = contentLower.indexOf(searchTerm);
                    const start = Math.max(0, matchIndex - 40);
                    const end = Math.min(content.content.length, matchIndex + searchTerm.length + 40);
                    let matchContext = content.content.substring(start, end);
                    
                    if (start > 0) matchContext = '...' + matchContext;
                    if (end < content.content.length) matchContext = matchContext + '...';
                    
                    results.push({
                        ...page,
                        matchType: 'content',
                        matchContext: matchContext
                    });
                }
            }
            
            console.log(`Found ${results.length} results`);
            
            // Display results
            if (results.length > 0) {
                let resultsHtml = `
                    <div class="search-summary">
                        Found ${results.length} result${results.length === 1 ? '' : 's'} for "${searchTerm}"
                    </div>
                    <div class="results-list">
                `;
                
                results.forEach(result => {
                    // Highlight match
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
    
    // ===== FIX FOR BUTTON CLICK =====
    
    // Function to ensure search is triggered regardless of what is clicked
    function triggerSearch(e) {
        console.log('Search triggered by:', e.target.tagName);
        e.preventDefault();
        e.stopPropagation();
        performSearch();
        return false; // Ensure no default actions occur
    }
    
    // Add event listeners to all possible elements
    if (searchButton) {
        // Multiple approaches to ensure button click works
        searchButton.onclick = triggerSearch;
        searchButton.addEventListener('click', triggerSearch);
        searchButton.addEventListener('mousedown', triggerSearch);
    }
    
    // Also add to the icon inside if it exists
    if (searchIcon) {
        searchIcon.onclick = triggerSearch;
        searchIcon.addEventListener('click', triggerSearch);
        searchIcon.addEventListener('mousedown', triggerSearch);
    }
    
    // Enter key in search input
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            console.log('Enter key pressed');
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
    
    // Test function
    window.testSearch = function(term) {
        searchInput.value = term || 'linear algebra';
        performSearch();
        return 'Test search executed';
    };
    
    // Add a helper button for testing (will be hidden in production)
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Search';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '10px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '9999';
    testButton.style.padding = '5px 10px';
    testButton.style.backgroundColor = '#3498db';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '4px';
    testButton.style.cursor = 'pointer';
    
    testButton.onclick = function() {
        searchInput.value = 'linear algebra';
        performSearch();
    };
    
    // Uncomment this line to add the test button (for debugging only)
    // document.body.appendChild(testButton);
    
    console.log('Search initialization complete with button fix');
});