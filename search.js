// search.js - Implements keyword search functionality

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    const resultsContainer = document.getElementById('results-container');
    
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
    
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            searchResults.style.display = 'none';
            return;
        }
        
        // Clear previous results
        resultsContainer.innerHTML = '';
        
        // Perform search
        const results = pages.filter(page => {
            // Check if search term is in title or keywords
            if (page.title.toLowerCase().includes(searchTerm)) return true;
            return page.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm));
        });
        
        // Display results
        if (results.length > 0) {
            results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.innerHTML = `
                    <h3><a href="${result.path}">${result.title}</a></h3>
                    <p>Keywords: ${result.keywords.join(', ')}</p>
                `;
                resultsContainer.appendChild(resultItem);
            });
            searchResults.style.display = 'block';
        } else {
            resultsContainer.innerHTML = '<p>No results found. Try different keywords.</p>';
            searchResults.style.display = 'block';
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
            event.target !== searchButton) {
            searchResults.style.display = 'none';
        }
    });
    
    // For future: Add functionality to get keywords from the actual page content
    // This would require loading each page content with fetch or AJAX
});