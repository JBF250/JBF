document.addEventListener('DOMContentLoaded', () => {
    const categoryTabs = document.querySelectorAll('.category-tab');
    const categorySections = document.querySelectorAll('.category-section');

    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;

            categoryTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            categorySections.forEach(section => {
                const sectionCategory = section.dataset.category;
                
                if (category === 'all') {
                    section.style.display = 'block';
                } else if (sectionCategory === category) {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }
            });
        });
    });
});