// pop-up search.js

document.addEventListener('DOMContentLoaded', function() {
    console.log('Search script loaded - simplified pop-up version');
    
    // Get DOM elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    // Create popup container and add it to the page
    const popupHtml = `
        <div id="search-popup" class="search-popup">
            <div class="search-popup-content"></div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);
    
    const searchPopup = document.getElementById('search-popup');
    const popupContent = document.querySelector('.search-popup-content');
    
    // Define pages to search through
    const pages = [
        { 
            path: 'index.html', 
            title: 'Math-CS Compass - Home',
            keywords: ['mathematics', 'computer science', 'bridge', 'introduction', 'AI', 'overview']
        },
        { 
            path: 'Mathematics/Linear_algebra/linear_algebra.html', 
            title: 'Linear Algebra',
            keywords: ['linear algebra', 'vectors', 'matrices', 'transformations', 'eigenvectors', 'eigenvalues']
        },
        { 
            path: 'Mathematics/Calculus/calculus.html', 
            title: 'Calculus & Optimization',
            keywords: ['calculus', 'derivatives', 'integrals', 'optimization', 'gradient descent']
        },
        { 
            path: 'Mathematics/Probability/probability.html', 
            title: 'Probability & Statistics',
            keywords: ['probability', 'statistics', 'random variables', 'distributions', 'expected value']
        },
        { 
            path: 'Mathematics/Discrete/discrete_math.html', 
            title: 'Discrete Mathematics',
            keywords: ['discrete', 'set theory', 'graph theory', 'combinatorics', 'logic', 'proofs']
        }
    ];
    
    // Position the popup below the search box
    function positionPopup() {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer) return;
        
        const rect = searchContainer.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        
        searchPopup.style.top = (rect.bottom + scrollTop) + 'px';
        searchPopup.style.left = rect.left + 'px';
        searchPopup.style.width = rect.width + 'px';
    }
    
    // Perform search
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            searchPopup.classList.remove('active');
            return;
        }
        
        // Show loading indicator
        popupContent.innerHTML = '<div class="search-loading"></div>';
        searchPopup.classList.add('active');
        
        // Position the popup
        positionPopup();
        
        // Filter pages based on search term
        const results = pages.filter(page => {
            if (page.title.toLowerCase().includes(searchTerm)) return true;
            return page.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm));
        });
        
        // Display results after a short delay
        setTimeout(() => {
            if (results.length > 0) {
                let resultsHtml = `
                    <div class="search-summary">
                        Found ${results.length} result${results.length === 1 ? '' : 's'} for "${searchTerm}"
                    </div>
                    <div class="results-list">
                `;
                
                results.forEach(result => {
                    resultsHtml += `
                        <div class="popup-result-item">
                            <h3><a href="${result.path}">${result.title}</a></h3>
                            <p>${result.keywords.join(', ')}</p>
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
        }, 300);
    }
    
    // Event listeners
    searchButton.addEventListener('click', performSearch);
    
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
    
    // Close popup when clicking outside
    document.addEventListener('click', function(event) {
        if (!searchPopup.contains(event.target) && 
            event.target !== searchInput && 
            event.target !== searchButton) {
            searchPopup.classList.remove('active');
        }
    });
    
    // Reposition popup on window resize
    window.addEventListener('resize', function() {
        if (searchPopup.classList.contains('active')) {
            positionPopup();
        }
    });
    
    // Make search function available for testing
    window.testSearch = function(term) {
        searchInput.value = term || 'linear algebra';
        performSearch();
    };
});