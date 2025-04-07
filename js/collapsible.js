// Enhanced collapsible.js - Handle both collapsible content types
document.addEventListener('DOMContentLoaded', function() {
    // Handle standard collapsible elements (code blocks, etc.)
    const collapsibleBtns = document.querySelectorAll('.collapsible-btn');
    
    collapsibleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const content = this.nextElementSibling;
            if (content.style.display === 'block') {
                content.style.display = 'none';
                // If the button has an icon, rotate it back
                const icon = this.querySelector('i');
                if (icon) icon.style.transform = 'rotate(0deg)';
            } else {
                content.style.display = 'block';
                // If the button has an icon, rotate it
                const icon = this.querySelector('i');
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        });
    });
    
    // Handle introduction section collapsible
    const introToggleBtn = document.getElementById('intro-toggle-btn');
    
    if (introToggleBtn) {
        const collapsibleContent = document.querySelector('.intro-collapsible');
        
        if (collapsibleContent) {
            // Initial state - collapsed
            collapsibleContent.style.display = 'none';
            
            // Toggle functionality
            introToggleBtn.addEventListener('click', function() {
                const isCollapsed = collapsibleContent.style.display === 'none' || 
                                   !collapsibleContent.style.display;
                
                if (isCollapsed) {
                    // Expand content
                    collapsibleContent.style.display = 'block';
                    this.innerHTML = 'Show Less <i class="fas fa-chevron-up"></i>';
                    this.classList.add('active');
                } else {
                    // Collapse content
                    collapsibleContent.style.display = 'none';
                    this.innerHTML = 'Read More <i class="fas fa-chevron-down"></i>';
                    this.classList.remove('active');
                }
            });
        }
    }
});