import { buildCard } from '/js/posts.js';
import { api } from '/js/config.js?v=3';

export async function loadRecommendations() {
    const container = document.getElementById('rec-posts');
    const loadingEl = document.getElementById('rec-loading');
    const emptyEl = document.getElementById('rec-empty');
    const errorEl = document.getElementById('rec-error');
    if (!container) return;

    const loading = (show) => {
        if (loadingEl) loadingEl.style.display = show ? 'block' : 'none';
    };
    loading(true);

    try {
        const data = await api('/api/recomendaciones', { method: 'GET' });
        loading(false);
        const posts = data.posts || [];

        if (data.total_posts === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }
        if (!posts.length) {
            if (emptyEl) {
                emptyEl.style.display = 'block';
                const p = emptyEl.querySelector('p');
                if (p) p.textContent = 'No hay publicaciones para recomendar justo ahora. ¡Publica tu anuncio y sé parte de YUSBO!';
            }
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        container.textContent = '';
        posts.forEach((post) => container.append(buildCard(post, { likeable: true })));
    } catch (err) {
        loading(false);
        if (errorEl) {
            errorEl.style.display = 'block';
            const msg = document.getElementById('rec-error-msg');
            if (msg) msg.textContent = err.message;
        }
    }
}