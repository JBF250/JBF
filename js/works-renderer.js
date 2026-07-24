import { loadLocales } from './i18n.js';
import { loadWorksData } from './data-loader.js';
import { currentLang } from './i18n.js';

async function init() {
    await loadLocales();
    const worksData = await loadWorksData();
    renderWorks(worksData);
    initFilter();
}

function getLocalized(data, key) {
    if (!data || !key) return '';
    return data[key]?.[currentLang] || data[key] || '';
}

function renderWorks(data) {
    const container = document.getElementById('works-content');
    if (!data || !container) return;

    let html = '';

    data.categories.forEach(category => {
        const categoryName = getLocalized(category, 'name');
        const categoryDesc = getLocalized(category, 'description');
        
        html += `
            <div class="category-section" data-category="${category.id}">
                <div class="section-header">
                    <h2 class="section-title">
                        <span class="section-icon">${category.icon}</span>
                        ${categoryName}
                    </h2>
                    <p class="section-subtitle">${categoryDesc}</p>
                </div>
                <div class="works-grid">
        `;

        category.projects.forEach(project => {
            const title = getLocalized(project, 'title');
            const description = getLocalized(project, 'description');
            
            if (project.empty) {
                html += `
                    <div class="work-card card empty-card">
                        <div class="work-image">
                            <div class="work-placeholder">
                                <span class="work-icon">${project.icon}</span>
                            </div>
                        </div>
                        <div class="work-info">
                            <span class="tag tag-dark">即将推出</span>
                            <h3>${title}</h3>
                            <p>${description}</p>
                            <div class="work-tech">
                                ${project.tech.map(t => `<span class="mono">${t}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="work-card card">
                        <div class="work-image">
                            <div class="work-placeholder">
                                <span class="work-icon">${project.icon}</span>
                            </div>
                            <div class="work-overlay">
                                <a href="#" class="btn btn-primary btn-sm">查看详情</a>
                            </div>
                        </div>
                        <div class="work-info">
                            <span class="tag ${category.id === 'game' ? 'tag-cyan' : 'tag-primary'}">${categoryName}</span>
                            <h3>${title}</h3>
                            <p>${description}</p>
                            <div class="work-tech">
                                ${project.tech.map(t => `<span class="mono">${t}</span>`).join('')}
                            </div>
                            <div class="work-stats">
                                ${project.stats.map(s => `<span class="stat">${s}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function initFilter() {
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
}

init();