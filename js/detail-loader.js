document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (!id) return;
    
    if (window.location.pathname.includes('game-detail')) {
        loadGameDetail(id);
    } else if (window.location.pathname.includes('software-detail')) {
        loadSoftwareDetail(id);
    } else if (window.location.pathname.includes('blog-detail')) {
        loadBlogDetail(id);
    }
});

function getCurrentLang() {
    return localStorage.getItem('language') || 'zh';
}

function getImagePath(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    return '../' + path;
}

function renderDescription(text) {
    if (!text) return '';
    var paragraphs = text.split(/\n\n+/);
    return paragraphs.map(function(p) {
        var escaped = escapeHtml(p.trim());
        escaped = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" class="desc-link">$1</a>');
        return '<p>' + escaped + '</p>';
    }).join('');
}

async function loadGameDetail(id) {
    try {
        const response = await fetch('../data/works.json');
        const data = await response.json();
        const game = data.games.find(g => g.id === id);
        
        if (game) {
            const titleEl = document.getElementById('game-title');
            const descEl = document.getElementById('game-description');
            const fullDescEl = document.getElementById('game-full-description');
            const previewImg = document.getElementById('game-preview');
            const techContainer = document.getElementById('game-tech');
            const lang = getCurrentLang();
            
            if (titleEl) titleEl.textContent = game.title[lang];
            if (descEl) descEl.textContent = game.description[lang];
            if (fullDescEl) fullDescEl.innerHTML = (game.fullDescription && game.fullDescription[lang]) ? renderDescription(game.fullDescription[lang]) : game.description[lang];
            
            if (previewImg && game.thumbnail) {
                previewImg.src = getImagePath(game.thumbnail);
                previewImg.alt = game.title[lang];
            }
            
            if (techContainer && game.tech) {
                techContainer.innerHTML = game.tech.map(tech => 
                    `<span class="tag tag-primary">${tech}</span>`
                ).join('');
            }
            
            window.addEventListener('languageChange', (e) => {
                const newLang = e.detail;
                if (titleEl) titleEl.textContent = game.title[newLang];
                if (descEl) descEl.textContent = game.description[newLang];
                if (fullDescEl) fullDescEl.innerHTML = (game.fullDescription && game.fullDescription[newLang]) ? renderDescription(game.fullDescription[newLang]) : game.description[newLang];
                if (previewImg) previewImg.alt = game.title[newLang];
            });
        }
    } catch (error) {
        console.error('Failed to load game detail:', error);
    }
}

async function loadSoftwareDetail(id) {
    try {
        const response = await fetch('../data/works.json');
        const data = await response.json();
        const software = data.software.find(s => s.id === id);
        
        if (software) {
            const titleEl = document.getElementById('software-title');
            const descEl = document.getElementById('software-description');
            const fullDescEl = document.getElementById('software-full-description');
            const previewContainer = document.getElementById('software-preview');
            const techContainer = document.getElementById('software-tech');
            const lang = getCurrentLang();
            
            if (titleEl) titleEl.textContent = software.title[lang];
            if (descEl) descEl.textContent = software.description[lang];
            if (fullDescEl) fullDescEl.innerHTML = (software.fullDescription && software.fullDescription[lang]) ? renderDescription(software.fullDescription[lang]) : software.description[lang];
            
            if (previewContainer && software.thumbnail) {
                previewContainer.outerHTML = `<img id="software-preview" src="${getImagePath(software.thumbnail)}" alt="${software.title[lang]}" style="width: 100%; height: auto; display: block; object-fit: cover;">`;
            }
            
            if (techContainer && software.tech) {
                techContainer.innerHTML = software.tech.map(tech => 
                    `<span class="tag tag-cyan">${tech}</span>`
                ).join('');
            }
            
            window.addEventListener('languageChange', (e) => {
                const newLang = e.detail;
                if (titleEl) titleEl.textContent = software.title[newLang];
                if (descEl) descEl.textContent = software.description[newLang];
                if (fullDescEl) fullDescEl.innerHTML = (software.fullDescription && software.fullDescription[newLang]) ? renderDescription(software.fullDescription[newLang]) : software.description[newLang];
            });
        }
    } catch (error) {
        console.error('Failed to load software detail:', error);
    }
}

async function loadBlogDetail(id) {
    try {
        const response = await fetch('../data/blog.json');
        const data = await response.json();
        const post = data.posts.find(p => p.id === id);
        
        if (post) {
            const titleEl = document.getElementById('blog-title');
            const dateEl = document.getElementById('blog-date');
            const readTimeEl = document.getElementById('blog-readtime');
            const contentEl = document.getElementById('blog-content');
            const lang = getCurrentLang();
            
            if (titleEl) titleEl.textContent = post.title[lang];
            if (dateEl) dateEl.textContent = post.date;
            if (readTimeEl) readTimeEl.textContent = post.readTime;
            
            if (contentEl && post.content && post.content[lang]) {
                contentEl.innerHTML = renderContent(post.content[lang]);
            }
            
            window.addEventListener('languageChange', (e) => {
                const newLang = e.detail;
                if (titleEl) titleEl.textContent = post.title[newLang];
                if (contentEl && post.content && post.content[newLang]) {
                    contentEl.innerHTML = renderContent(post.content[newLang]);
                }
            });
        }
    } catch (error) {
        console.error('Failed to load blog detail:', error);
    }
}

function renderContent(content) {
    if (!content || !Array.isArray(content)) return '';
    
    return content.map(item => {
        switch (item.type) {
            case 'heading':
                return `<h3>${item.text}</h3>`;
            case 'paragraph':
                return `<p>${item.text}</p>`;
            case 'code':
                return `<pre><code>${escapeHtml(item.text)}</code></pre>`;
            default:
                return '';
        }
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
