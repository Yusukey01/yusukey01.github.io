const collapsibleBtns = document.querySelectorAll('.collapsible-btn');

collapsibleBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const content = this.nextElementSibling;
        content.classList.toggle('active');
    });
});