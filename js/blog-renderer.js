import { loadLocales } from './i18n.js';
import { loadBlogData } from './data-loader.js';
import { currentLang } from './i18n.js';

async function init() {
    await loadLocales();
    const blogData = await loadBlogData();
    renderBlog(blogData);
}

function getLocalized(data, key) {
    if (!data || !key) return '';
    return data[key]?.[currentLang] || data[key] || '';
}

function renderBlog(data) {
    const mainContainer = document.getElementById('blog-main');
    const recentContainer = document.getElementById('recent-posts');
    if (!data || !mainContainer || !recentContainer) return;

    let html = '';
    let recentHtml = '';

    data.posts.forEach(post => {
        const title = getLocalized(post, 'title');
        const category = getLocalized(post, 'category');
        const excerpt = getLocalized(post, 'excerpt');
        const content = post.content?.[currentLang] || [];

        recentHtml += `<li><a href="#${post.id}">${title}</a></li>`;

        if (post.empty) {
            html += `
                <article class="blog-post card empty-post">
                    <div class="post-placeholder">
                        <span class="post-icon">📝</span>
                        <h2 class="post-title">${title}</h2>
                        <p>${excerpt}</p>
                    </div>
                </article>
            `;
        } else {
            html += `
                <article id="${post.id}" class="blog-post card">
                    <div class="post-header">
                        <span class="tag tag-primary">${category}</span>
                    </div>
                    <h2 class="post-title">${title}</h2>
                    <div class="post-meta">
                        <span class="meta-item">📅 ${post.date}</span>
                        <span class="meta-item">⏱️ ${post.readTime}</span>
                    </div>
                    <p class="post-excerpt">${excerpt}</p>
                    <div class="post-content">
                        ${renderContent(content)}
                    </div>
                    <div class="post-footer">
                        <span class="mono">#${post.tags.join(' #')}</span>
                    </div>
                </article>
            `;
        }
    });

    mainContainer.innerHTML = html;
    recentContainer.innerHTML = recentHtml;
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

init();