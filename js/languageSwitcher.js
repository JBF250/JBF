document.addEventListener('DOMContentLoaded', function() {
    const switcher = document.getElementById('language-switcher');
    if (switcher) {
        switcher.addEventListener('click', function() {
            console.log('Language switcher clicked');
        });
    }
});