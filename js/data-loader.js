export async function loadWorksData() {
    try {
        const response = await fetch('data/works.json');
        return await response.json();
    } catch (error) {
        console.error('Failed to load works data:', error);
        return { games: [], software: [] };
    }
}

export async function loadBlogData() {
    try {
        const response = await fetch('data/blog.json');
        return await response.json();
    } catch (error) {
        console.error('Failed to load blog data:', error);
        return { posts: [] };
    }
}