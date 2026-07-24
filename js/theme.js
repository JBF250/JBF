document.addEventListener('DOMContentLoaded', function() {
    const switcher = document.getElementById('theme-switcher');
    const body = document.body;
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
    }
    
    if (switcher) {
        switcher.addEventListener('click', function() {
            body.classList.toggle('light-mode');
            const isLight = body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        });
    }
});