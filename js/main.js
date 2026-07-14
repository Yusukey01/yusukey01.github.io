// main.js - Main website functionality
// v2.1: single menu-toggle listener (accidental scroll-tap fix),
//       throw-proof anchor scrolling, passive scroll listener.
// v2.2: removed the legacy body.dark-mode block — no page contains
//       #dark-mode-toggle; theming is handled by theme-switcher.js
//       via html[data-theme].
// v2.3: menu-toggle now keeps its aria-expanded attribute in sync
//       (header.html declares it but it was never updated).

document.addEventListener('DOMContentLoaded', function() {
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        // Single click listener. (v2.1: the previous onclick/ontouchend pair
        // is replaced — touchend fires even when a scroll gesture ends on the
        // button, toggling the menu by accident, and modern mobile browsers
        // deliver a normal click with no delay, so one listener suffices.)
        function syncMenuAria() {
            menuToggle.setAttribute('aria-expanded',
                navLinks.classList.contains('active') ? 'true' : 'false');
        }

        menuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.classList.toggle('active');
            syncMenuAria();
        });
        
        // Close menu when clicking on links 
        const mobileNavLinks = document.querySelectorAll('.nav-links a');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 992) {
                    navLinks.classList.remove('active');
                    syncMenuAria();
                }
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideNav = navLinks.contains(event.target);
            const isClickOnToggle = menuToggle.contains(event.target);
            
            if (!isClickInsideNav && !isClickOnToggle && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                syncMenuAria();
            }
        });
    }
    
    // Smooth scrolling for anchor links
    // NOTE: .ref-link is excluded — those are handled by ref-preview.js,
    // which shows a preview box instead of scrolling. Without this exclusion,
    // both handlers fire and the page scrolls to the in-page anchor while
    // the preview box opens.
    document.querySelectorAll('a[href^="#"]:not(.ref-link)').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            // getElementById never throws, unlike querySelector on ids that
            // are not valid CSS selectors
            const target = href && href.length > 1 ? document.getElementById(href.slice(1)) : null;
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add active class to current page in navigation
    const currentLocation = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-links a');
    
    navItems.forEach(item => {
        const itemPath = item.getAttribute('href');
        if (currentLocation.includes(itemPath) && itemPath !== 'index.html') {
            item.classList.add('active');
        } else if (currentLocation.endsWith('/') || currentLocation.endsWith('index.html')) {
            // Add active class to Home
            if (item.getAttribute('href') === 'index.html') {
                item.classList.add('active');
            }
        }
    });
    
    // Handle card hover effects
    const cards = document.querySelectorAll('.card:not(.card-disabled)');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.classList.add('card-hover');
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('card-hover');
        });
    });
    
    // Initialize animations for elements as they come into view
    const observeElements = document.querySelectorAll('.card, .homepage-introduction p');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        
        observeElements.forEach(element => {
            observer.observe(element);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        observeElements.forEach(element => {
            element.classList.add('fade-in');
        });
    }
    
    // Quick Jump Navigation
    const quickJumpToggle = document.getElementById('quick-jump-toggle');
    const quickJumpMenu = document.getElementById('quick-jump-menu');
    
    if (quickJumpToggle && quickJumpMenu) {
        // Toggle the quick jump menu when clicked
        quickJumpToggle.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            quickJumpMenu.classList.toggle('active');
            return false;
        };
        
        // Close the menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideMenu = quickJumpMenu.contains(event.target);
            const isClickOnToggle = quickJumpToggle.contains(event.target);
            
            if (!isClickInsideMenu && !isClickOnToggle && quickJumpMenu.classList.contains('active')) {
                quickJumpMenu.classList.remove('active');
            }
        });
    }
    
    // Go To Top Button
    const goTopButton = document.getElementById('go-to-top-btn');
    
    if (goTopButton) {
        // When the user scrolls down 300px from the top of the document, show the button
        window.addEventListener('scroll', function() {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                goTopButton.style.display = 'block';
            } else {
                goTopButton.style.display = 'none';
            }
        }, { passive: true });
        
        // When the user clicks on the button, scroll to the top of the document
        goTopButton.addEventListener('click', function() {
            // Check if smooth scrolling is supported
            if ('scrollBehavior' in document.documentElement.style) {
                // For modern browsers with smooth scrolling support
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            } else {
                // For older browsers that don't support smooth scrolling
                let isScrolling = false;
                
                function scrollToTop() {
                    if (isScrolling) return; // Prevent multiple instances
                    
                    isScrolling = true;
                    const currentPosition = document.body.scrollTop || document.documentElement.scrollTop;
                    
                    if (currentPosition > 0) {
                        const newPosition = currentPosition - Math.max(currentPosition / 8, 10);
                        window.scrollTo(0, newPosition);
                        
                        // Continue scrolling if we haven't reached the top
                        if (newPosition > 5) { // Small threshold to avoid infinite loop
                            window.requestAnimationFrame(scrollToTop);
                        } else {
                            // Ensure we're at the very top and stop scrolling
                            window.scrollTo(0, 0);
                            isScrolling = false;
                        }
                    } else {
                        isScrolling = false;
                    }
                }
                
                scrollToTop();
            }
        });
    }
    
});