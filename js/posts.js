import { api, mediaUrl } from '/js/config.js?v=3';

const CATEGORY_LABELS = {
    ganado: 'Ganado',
    maiz: 'Maíz y cultivos',
    herramientas: 'Herramientas',
    otros: 'Otros',
};

function formatDate(ts) {
    if (!ts) return '';
    try {
        return new Date(ts * 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
}

function fmtPrice(price) {
    if (price === null || price === undefined || price === '') return '';
    return `$${Number(price).toLocaleString('es-MX')}`;
}

export function buildCard(post, { mine = false, likeable = false } = {}) {
    const card = document.createElement('article');
    card.className = 'post-card';

    // El backend arma `url` con su propia base (yusbo-backend-us.vercel.app),
    // donde no existe la ruta /publicaciones: ese enlace daria 404. Se usa
    // siempre la ruta del frontend.
    const detailUrl = `/publicaciones/${post.id}`;

    const top = document.createElement('div');
    top.className = 'post-top';

    const cat = document.createElement('span');
    cat.className = 'post-cat';
    cat.textContent = CATEGORY_LABELS[post.category] || post.category_label || 'Otros';

    const date = document.createElement('span');
    date.className = 'post-date';
    date.textContent = formatDate(post.created_at);

    top.append(cat, date);

    const title = document.createElement('h3');
    const titleLink = document.createElement('a');
    titleLink.href = detailUrl;
    titleLink.textContent = post.title;
    title.appendChild(titleLink);

    const desc = document.createElement('p');
    desc.className = 'post-desc';
    // /api/recomendaciones no manda `description`; sin esto la tarjeta
    // pintaba el texto literal "undefined".
    desc.textContent = post.description || post.razon || '';

    const pieces = [top, title, desc];

    const media = post.media && post.media.length ? post.media[0] : (post.image ? { url: post.image, type: 'image' } : null);
    if (media && media.url) {
        const cover = document.createElement('a');
        cover.className = 'post-cover';
        cover.href = detailUrl;
        if (media.type === 'video') {
            const video = document.createElement('video');
            video.src = mediaUrl(media.url);
            video.muted = true;
            video.preload = 'metadata';
            cover.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = mediaUrl(media.url);
            img.alt = post.title || '';
            img.loading = 'lazy';
            cover.appendChild(img);
        }
        pieces.splice(2, 0, cover);
    }

    const meta = document.createElement('div');
    meta.className = 'post-meta';
    if (post.price !== null && post.price !== undefined && post.price !== '') {
        const price = document.createElement('span');
        price.textContent = `${fmtPrice(post.price)}`;
        meta.append(price);
    }
    if (post.location) {
        const loc = document.createElement('span');
        loc.textContent = `📍 ${post.location}`;
        meta.append(loc);
    }
    if (!meta.children.length) {
        meta.style.display = 'none';
    }
    pieces.push(meta);

    const footer = document.createElement('div');
    footer.className = 'post-footer';

    const stats = document.createElement('span');
    stats.className = 'post-stats';
    const likes = parseInt(post.likes || 0, 10);
    const views = parseInt(post.views || 0, 10);
    stats.textContent = `♥ ${likes} · 👁 ${views}`;
    footer.append(stats);

    if (likeable) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-like' + (post.liked_by_me ? ' liked' : '');
        btn.textContent = post.liked_by_me ? 'Me gusta' : 'Me gusta';
        btn.dataset.postId = post.id;
        btn.addEventListener('click', () => {
            likePost(post.id, btn).then((result) => {
                if (!result) return;
                const total = typeof result.likes === 'number'
                    ? result.likes
                    : likes + (result.liked ? 1 : -1);
                const statLabel = btn.closest('.post-card').querySelector('.post-stats');
                if (statLabel) statLabel.textContent = `♥ ${total} · 👁 ${views}`;
            });
        });
        footer.append(btn);
    } else {
        const author = document.createElement('span');
        author.className = 'post-author';
        author.innerHTML = 'Publicado por <strong>' + escapeHtml(post.user_name) + '</strong>';
        footer.append(author);
    }

    if (post.razon) {
        const why = document.createElement('span');
        why.className = 'rec-razon';
        why.textContent = `💡 ${post.razon}`;
        footer.appendChild(why);
    }

    if (mine) {
        const actions = document.createElement('div');
        actions.className = 'post-actions';
        const del = document.createElement('button');
        del.className = 'btn btn-mini btn-outline';
        del.textContent = 'Eliminar';
        del.addEventListener('click', () => deletePost(post.id));
        actions.append(del);
        footer.append(actions);
    }

    pieces.push(footer);
    card.append(...pieces);
    return card;
}

export async function likePost(postId, btn) {
    if (!btn) return null;
    try {
        const res = await api(`/api/posts/${postId}/like`, { method: 'POST', body: '{}' });
        btn.classList.toggle('liked', !!res.liked);
        return { liked: !!res.liked, likes: res.likes };
    } catch (err) {
        alert(err.message);
        return null;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

export async function loadFeed() {
    const container = document.getElementById('feed-posts');
    const statusEl = document.getElementById('feed-status');
    if (!container) return;
    container.textContent = '';
    try {
        const data = await api('/api/posts');
        if (statusEl) statusEl.style.display = 'none';
        if (!data.posts || !data.posts.length) {
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.innerHTML = '<h3>Todavía no hay publicaciones</h3><p>Sé el primero: publica tu anuncio gratis como invitado o <a href="/login">inicia sesión</a>.</p>';
            }
            return;
        }
        data.posts.forEach((post) => container.append(buildCard(post)));
    } catch (err) {
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.innerHTML = `<h3>No se pudieron cargar las publicaciones</h3><p>${escapeHtml(err.message)}</p>`;
        }
    }
}

export async function deletePost(postId) {
    if (!confirm('¿Seguro que quieres eliminar esta publicación?')) return;
    try {
        await api(`/api/posts/${postId}`, { method: 'DELETE' });
        window.dispatchEvent(new CustomEvent('yusbo:post-deleted', { detail: { postId } }));
    } catch (err) {
        alert(err.message);
    }
}