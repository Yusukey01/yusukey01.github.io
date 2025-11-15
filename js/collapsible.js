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



