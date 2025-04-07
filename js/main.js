// main.js - Main website functionality

document.addEventListener('DOMContentLoaded', function() {
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        // Replace addEventListener with direct property assignment
        menuToggle.onclick = function(e) {
            e.preventDefault();
            // Explicit toggle instead of using classList.toggle
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            } else {
                navLinks.classList.add('active');
            }
            return false; // Prevent event bubbling
        };
        
        // Add direct touch handler for mobile devices
        menuToggle.ontouchend = function(e) {
            e.preventDefault();
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            } else {
                navLinks.classList.add('active');
            }
            return false;
        };
        
        // Close menu when clicking on links 
        const mobileNavLinks = document.querySelectorAll('.nav-links a');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 992) {
                    navLinks.classList.remove('active');
                }
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideNav = navLinks.contains(event.target);
            const isClickOnToggle = menuToggle.contains(event.target);
            
            if (!isClickInsideNav && !isClickOnToggle && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }
        });
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && document.querySelector(href)) {
                e.preventDefault();
                document.querySelector(href).scrollIntoView({
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
    
    // Implement dark mode toggle if present
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            
            // Save preference to localStorage
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
        });
        
        // Check for saved user preference
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode === 'true') {
            document.body.classList.add('dark-mode');
        }
    }
    
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
    
    // Quick Jump Navigation - FIXED VERSION
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
        });
        
        // When the user clicks on the button, scroll to the top of the document
        goTopButton.addEventListener('click', function() {
            // For most modern browsers
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            // For older browsers that don't support smooth scrolling
            function scrollToTop() {
                const currentPosition = document.body.scrollTop || document.documentElement.scrollTop;
                if (currentPosition > 0) {
                    window.requestAnimationFrame(scrollToTop);
                    window.scrollTo(0, currentPosition - currentPosition / 8);
                }
            }
            
            // Check if smooth scrolling is supported
            if (typeof window.scrollTo !== 'function' || typeof window.scrollTo.behavior !== 'string') {
                scrollToTop();
            }
        });
    }
    
    // Collapsible introduction functionality
    document.addEventListener('DOMContentLoaded', function() {
        // Find the toggle button
        const toggleButton = document.getElementById('intro-toggle-btn');
        
        if (toggleButton) {
        // Find all collapsible content paragraphs
        const collapsibleContent = document.querySelectorAll('.collapsible-content');
        
        // Add toggle functionality
        toggleButton.addEventListener('click', function() {
            // Check if content is currently collapsed
            const isCollapsed = !this.classList.contains('expanded');
            
            // Toggle visibility of all collapsible paragraphs
            collapsibleContent.forEach(paragraph => {
            paragraph.style.display = isCollapsed ? 'block' : 'none';
            });
            
            // Update button text and icon
            if (isCollapsed) {
            this.innerHTML = 'Show Less <i class="fas fa-chevron-up"></i>';
            this.classList.add('expanded');
            } else {
            this.innerHTML = 'Read More <i class="fas fa-chevron-down"></i>';
            this.classList.remove('expanded');
            }
        });
        
        // For desktop: If we decide to show content by default but keep the button
        // Check if we're on a larger screen where content is already visible
        const isLargeScreen = window.matchMedia('(min-width: 992px)').matches;
        if (isLargeScreen) {
            toggleButton.innerHTML = 'Show Less <i class="fas fa-chevron-up"></i>';
            toggleButton.classList.add('expanded');
        }
        }
    });
  
});