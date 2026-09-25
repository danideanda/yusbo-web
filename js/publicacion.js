import { api, apiUrl, pageUrl, mediaUrl } from '/js/config.js?v=3';

const CATEGORY_LABELS = {
    ganado: 'Ganado',
    maiz: 'Maíz y cultivos',
    herramientas: 'Herramientas',
    otros: 'Otros',
};

const postId = (window.__POST_ID__) || decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');

function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function formatDate(ts) {
    if (!ts) return '';
    try {
        return new Date(ts * 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return '';
    }
}

function fmtPrice(price) {
    if (price === null || price === undefined || price === '') return '';
    return `$${Number(price).toLocaleString('es-MX')}`;
}

const page = document.getElementById('post-detail');

function render(post) {
    document.title = `${post.title} — YUSBO`;

    const head = el('header', 'detail-head');
    const cat = el('span', 'post-cat');
    cat.textContent = CATEGORY_LABELS[post.category] || 'Otros';
    const date = el('span', 'post-date');
    date.textContent = formatDate(post.created_at);
    head.append(cat, date);

    const title = el('h1', 'detail-title');
    title.textContent = post.title;

    const meta = el('div', 'post-meta');
    if (post.price !== null && post.price !== undefined && post.price !== '') {
        const price = el('span', 'detail-price');
        price.textContent = fmtPrice(post.price);
        meta.append(price);
    }
    if (post.location) {
        const loc = el('span');
        loc.textContent = `📍 ${post.location}`;
        meta.append(loc);
    }
    if (!meta.children.length) meta.style.display = 'none';

    const gallery = el('div', 'detail-media');
    const mediaList = Array.isArray(post.media) ? post.media : [];
    if (mediaList.length) {
        mediaList.forEach((item) => {
            if (item.type === 'video') {
                const video = el('video');
                video.src = mediaUrl(item.url);
                video.controls = true;
                video.muted = true;
                video.preload = 'metadata';
                gallery.appendChild(video);
            } else {
                const img = el('img');
                img.src = mediaUrl(item.url);
                img.alt = post.title || '';
                img.loading = 'lazy';
                gallery.appendChild(img);
            }
        });
    } else {
        gallery.style.display = 'none';
    }

    const desc = el('div', 'detail-desc');
    desc.innerHTML = `<p>${escapeHtml(post.description)}</p>`;

    const footer = el('div', 'detail-actions');
    const like = el('button', 'btn btn-like' + (post.liked_by_me ? ' liked' : ''));
    like.type = 'button';
    like.textContent = `${post.liked_by_me ? 'Me gusta' : 'Me gusta'} · ${post.likes || 0}`;
    like.addEventListener('click', async () => {
        const liked = await toggleLike();
        if (liked !== null) {
            like.textContent = `${liked ? 'Me gusta' : 'Me gusta'} · ${post.likes}`;
            like.classList.toggle('liked', liked);
        }
    });
    footer.append(like);

    const stats = el('span', 'post-stats');
    stats.textContent = `👁 ${post.views || 0} visualizaciones`;
    footer.append(stats);

    page.append(head, title, meta, gallery, desc, footer);
}

async function toggleLike() {
    if (!postId) return null;
    try {
        const json = await api(`/api/posts/${postId}/like`, {
            method: 'POST',
            body: '{}',
        });
        return !!json.liked;
    } catch (err) {
        alert(err.message);
        return null;
    }
}

let dwellTimer = null;
let lastFlush = 0;

function sendView(seconds) {
    if (!postId || seconds < 1) return;
    try {
        navigator.sendBeacon(apiUrl(`/api/posts/${postId}/view`), JSON.stringify({ seconds }));
    } catch {
        // Sin conexión o no soportado; se ignora
    }
}

function flushDwell() {
    if (!lastFlush) return;
    const now = Date.now();
    const dt = (now - lastFlush) / 1000;
    lastFlush = now;
    if (dt >= 1) dataSegment(dt);
}

let pendingSeconds = 0;
function dataSegment(dt) {
    pendingSeconds += dt;
    const chunk = Math.floor(pendingSeconds);
    if (chunk < 1) return;
    pendingSeconds -= chunk;
    sendView(chunk);
}

function startDwell() {
    if (dwellTimer) return;
    lastFlush = Date.now();
    dwellTimer = setInterval(() => flushDwell(), 5000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushDwell();
    });
    window.addEventListener('pagehide', () => flushDwell());
}

(async () => {
    if (!postId) {
        page.innerHTML = '<p class="empty-state">Publicación no encontrada.</p>';
        return;
    }
    try {
        const json = await api(`/api/posts/${postId}`, { method: 'GET' });
        render(json.post);
        startDwell();
    } catch (err) {
        if (err.status === 404) {
            page.innerHTML = `<div class="empty-state"><h3>Publicación no encontrada</h3><p>${escapeHtml(err.message)}</p><a href="${pageUrl('/publicaciones')}" class="btn btn-outline">Volver al muro</a></div>`;
        } else {
            page.innerHTML = '<div class="empty-state"><h3>Error de conexión</h3><a href="' + pageUrl('/publicaciones') + '" class="btn btn-outline">Volver al muro</a></div>';
        }
    }
})();