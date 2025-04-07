// Enhanced collapsible.js - Handle both code collapsibles and introduction
document.addEventListener('DOMContentLoaded', function() {
    // Original code for regular collapsible buttons
    const collapsibleBtns = document.querySelectorAll('.collapsible-btn');
    
    collapsibleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const content = this.nextElementSibling; // The <div> with the code
            if (content.style.display === 'block') {
                content.style.display = 'none'; // Hide the content
            } else {
                content.style.display = 'block'; // Show the content
            }
        });
    });
    
    // New code for introduction toggle
    const introToggleBtn = document.getElementById('intro-toggle-btn');
    
    if (introToggleBtn) {
        const collapsibleContent = document.querySelector('.collapsible-content');
        
        // Make sure content starts collapsed
        if (collapsibleContent) {
            collapsibleContent.style.display = 'none';
            
            // Add toggle functionality
            introToggleBtn.addEventListener('click', function() {
                // Check if content is currently collapsed
                const isCollapsed = !this.classList.contains('expanded');
                
                // Toggle visibility of the collapsible content
                collapsibleContent.style.display = isCollapsed ? 'block' : 'none';
                
                // Update button text and icon
                if (isCollapsed) {
                    this.innerHTML = 'Show Less <i class="fas fa-chevron-up"></i>';
                    this.classList.add('expanded');
                } else {
                    this.innerHTML = 'Read More <i class="fas fa-chevron-down"></i>';
                    this.classList.remove('expanded');
                }
            });
        }
    }
});