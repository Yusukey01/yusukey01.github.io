// search.js - Pop-up search results functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('Search script loaded - pop-up version');
    
    // Get DOM elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    // Create pop-up results container if it doesn't exist
    let searchPopup = document.getElementById('search-popup');
    
    if (!searchPopup) {
        searchPopup = document.createElement('div');
        searchPopup.id = 'search-popup';
        searchPopup.className = 'search-popup';
        searchPopup.innerHTML = '<div class="search-popup-content"></div>';
        
        // Insert after the navbar
        const navbar = document.querySelector('.navbar');
        if (navbar && navbar.parentNode) {
            navbar.parentNode.insertBefore(searchPopup, navbar.nextSibling);
        } else {
            // Fallback to body if navbar not found
            document.body.appendChild(searchPopup);
        }
    }
    
    const popupContent = searchPopup.querySelector('.search-popup-content');
    
    // Check if all elements exist
    if (!searchInput || !searchButton || !searchPopup || !popupContent) {
        console.error('Search elements not found');
        return; // Stop execution if elements are missing
    }
    
    // Array of pages to search through
    const pages = [
        { 
            path: 'index.html', 
            title: 'Math-CS Compass - Home',
            keywords: ['mathematics', 'computer science', 'bridge', 'introduction', 'AI', 'overview']
        },
        { 
            path: 'Mathematics/Linear_algebra/linear_algebra.html', 
            title: 'Linear Algebra',
            keywords: ['linear algebra', 'vectors', 'matrices', 'transformations', 'eigenvectors', 'eigenvalues', 'linear systems']
        },
        { 
            path: 'Mathematics/Calculus/calculus.html', 
            title: 'Calculus & Optimization',
            keywords: ['calculus', 'derivatives', 'integrals', 'optimization', 'gradient descent', 'partial derivatives', 'multivariate']
        },
        { 
            path: 'Mathematics/Probability/probability.html', 
            title: 'Probability & Statistics',
            keywords: ['probability', 'statistics', 'random variables', 'distributions', 'expected value', 'variance', 'hypothesis testing']
        },
        { 
            path: 'Mathematics/Discrete/discrete_math.html', 
            title: 'Discrete Mathematics',
            keywords: ['discrete', 'set theory', 'graph theory', 'combinatorics', 'logic', 'proofs', 'algorithms', 'complexity']
        }
        // Add more pages as they are created
    ];
    
    // Create a loading indicator
    function createLoadingIndicator() {
        const loader = document.createElement('div');
        loader.className = 'search-loading';
        return loader;
    }
    
    // Calculate position for popup
    function positionPopup() {
        const searchContainer = document.querySelector('.search-container');
        
        if (searchContainer) {
            const rect = searchContainer.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            searchPopup.style.position = 'absolute';
            searchPopup.style.top = (rect.bottom + scrollTop) + 'px';
            searchPopup.style.left = rect.left + 'px';
            searchPopup.style.width = rect.width + 'px';
            searchPopup.style.maxWidth = '500px'; // Limit maximum width
        }
    }
    
    // Perform search with pop-up results
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            searchPopup.style.display = 'none';
            return;
        }
        
        // Position popup before showing
        positionPopup();
        
        // Show loading state
        searchButton.classList.add('active');
        popupContent.innerHTML = '';
        const loader = createLoadingIndicator();
        popupContent.appendChild(loader);
        searchPopup.style.display = 'block';
        
        // Use setTimeout to allow UI to update before search
        setTimeout(() => {
            // Perform search
            const results = pages.filter(page => {
                // Check title
                if (page.title.toLowerCase().includes(searchTerm)) return true;
                
                // Check keywords - both exact match and partial match
                return page.keywords.some(keyword => 
                    keyword.toLowerCase().includes(searchTerm) || 
                    searchTerm.includes(keyword.toLowerCase())
                );
            });
            
            // Remove loading indicator
            searchButton.classList.remove('active');
            popupContent.innerHTML = '';
            
            // Display results
            if (results.length > 0) {
                // Add search summary
                const searchSummary = document.createElement('div');
                searchSummary.className = 'search-summary';
                searchSummary.innerHTML = `<p>Found ${results.length} result${results.length === 1 ? '' : 's'} for "${searchTerm}"</p>`;
                popupContent.appendChild(searchSummary);
                
                // Add results
                const resultsList = document.createElement('div');
                resultsList.className = 'search-results-list';
                popupContent.appendChild(resultsList);
                
                results.forEach(result => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'popup-result-item';
                    
                    // Highlight matching text in title
                    let titleHtml = result.title;
                    if (result.title.toLowerCase().includes(searchTerm)) {
                        titleHtml = result.title.replace(
                            new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'), 
                            '<mark>$1</mark>'
                        );
                    }
                    
                    // Show relevant keywords
                    const matchingKeywords = result.keywords.filter(keyword => 
                        keyword.toLowerCase().includes(searchTerm) || 
                        searchTerm.includes(keyword.toLowerCase())
                    );
                    
                    resultItem.innerHTML = `
                        <h3><a href="${result.path}">${titleHtml}</a></h3>
                        ${matchingKeywords.length > 0 ? 
                          `<p class="result-keywords">${matchingKeywords.join(', ')}</p>` : ''}
                    `;
                    
                    resultsList.appendChild(resultItem);
                });
            } else {
                popupContent.innerHTML = `
                    <div class="no-results">
                        <p>No results found for "${searchTerm}"</p>
                        <p class="search-suggestion">Try different keywords or check spelling</p>
                    </div>
                `;
            }
        }, 300); // Small delay for UI update and to show loading indicator
    }
    
    // Event listeners
    searchButton.addEventListener('click', performSearch);
    
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        } else if (searchInput.value.trim() !== '') {
            // Auto-search as you type (optional)
            // performSearch();
        } else {
            searchPopup.style.display = 'none';
        }
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', function(event) {
        if (!searchPopup.contains(event.target) && 
            event.target !== searchInput && 
            event.target !== searchButton &&
            !searchButton.contains(event.target)) {
            searchPopup.style.display = 'none';
        }
    });
    
    // Reposition popup on window resize
    window.addEventListener('resize', function() {
        if (searchPopup.style.display === 'block') {
            positionPopup();
        }
    });
    
    // For testing
    window.testSearch = function(term) {
        searchInput.value = term || 'linear algebra';
        performSearch();
        return 'Search test executed';
    };
});