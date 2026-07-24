document.addEventListener('DOMContentLoaded', async () => {
    await renderGames();
    await renderSoftware();
    await renderBlog();
});

function getLang() {
    return localStorage.getItem('language') || 'zh';
}

async function renderGames() {
    try {
        const response = await fetch('data/works.json');
        const data = await response.json();
        const container = document.getElementById('games-grid');
        
        if (!container) return;
        
        data.games.forEach(game => {
            const card = createGameCard(game);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Failed to render games:', error);
    }
}

function createGameCard(game) {
    const lang = getLang();
    const card = document.createElement('div');
    card.className = 'game-card';
    card.addEventListener('click', () => {
        window.location.href = `pages/game-detail.html?id=${game.id}`;
    });
    
    card.innerHTML = `
        <div class="card-image">
                ${game.thumbnail ? `<img src="${game.thumbnail}" alt="${game.title[lang]}">` : '<div class="image-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h12"/></svg></div>'}
            </div>
        <div class="card-content">
            <h3 class="card-title">${game.title[lang]}</h3>
            <p class="card-description">${game.description[lang]}</p>
            <div class="card-meta">
                <div class="card-tech">
                    ${game.tech.map(t => `<span>${t}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
    
    window.addEventListener('languageChange', (e) => {
        const newLang = e.detail;
        card.querySelector('.card-title').textContent = game.title[newLang];
        card.querySelector('.card-description').textContent = game.description[newLang];
        const img = card.querySelector('.card-image img');
        if (img) img.alt = game.title[newLang];
    });
    
    return card;
}

async function renderSoftware() {
    try {
        const response = await fetch('data/works.json');
        const data = await response.json();
        const container = document.getElementById('software-grid');
        
        if (!container) return;
        
        data.software.forEach(software => {
            const card = createSoftwareCard(software);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Failed to render software:', error);
    }
}

function createSoftwareCard(software) {
    const lang = getLang();
    const card = document.createElement('div');
    card.className = 'software-card';
    card.addEventListener('click', () => {
        window.location.href = `pages/software-detail.html?id=${software.id}`;
    });
    
    card.innerHTML = `
        <div class="card-image">
                ${software.thumbnail ? `<img src="${software.thumbnail}" alt="${software.title[lang]}">` : '<div class="image-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg></div>'}
            </div>
        <div class="card-content">
            <h3 class="card-title">${software.title[lang]}</h3>
            <p class="card-description">${software.description[lang]}</p>
            <div class="card-meta">
                <div class="card-tech">
                    ${software.tech.map(t => `<span>${t}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
    
    window.addEventListener('languageChange', (e) => {
        const newLang = e.detail;
        card.querySelector('.card-title').textContent = software.title[newLang];
        card.querySelector('.card-description').textContent = software.description[newLang];
        const img = card.querySelector('.card-image img');
        if (img) img.alt = software.title[newLang];
    });
    
    return card;
}

async function renderBlog() {
    try {
        const response = await fetch('data/blog.json');
        const data = await response.json();
        const container = document.getElementById('blog-grid');
        
        if (!container) return;
        
        const posts = data.posts.slice(0, 3);
        posts.forEach(post => {
            const card = createBlogCard(post);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Failed to render blog:', error);
    }
}

function createBlogCard(post) {
    const lang = getLang();
    const card = document.createElement('div');
    card.className = 'blog-card';
    card.addEventListener('click', () => {
        window.location.href = `pages/blog-detail.html?id=${post.id}`;
    });
    
    card.innerHTML = `
        <div class="card-content">
            <span class="tag tag-dark">${post.category}</span>
            <h3 class="card-title">${post.title[lang]}</h3>
            <p class="card-description">${post.excerpt[lang]}</p>
            <div class="card-meta">
                <span class="card-date">${post.date}</span>
                <span class="card-readtime">${post.readTime}</span>
            </div>
        </div>
    `;
    
    window.addEventListener('languageChange', (e) => {
        const newLang = e.detail;
        card.querySelector('.card-title').textContent = post.title[newLang];
        card.querySelector('.card-description').textContent = post.excerpt[newLang];
    });
    
    return card;
}
