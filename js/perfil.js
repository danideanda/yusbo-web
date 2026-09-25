import { buildCard, deletePost } from '/js/posts.js';
import { api, mediaUrl } from '/js/config.js?v=3';

function renderAvatar(avatarEl, photo, name, size = 'large') {
    if (!avatarEl) return;
    avatarEl.innerHTML = '';
    avatarEl.className = 'profile-avatar profile-avatar-' + size;
    const initial = (name || 'U').trim().charAt(0).toUpperCase();
    if (photo) {
        const img = document.createElement('img');
        img.src = mediaUrl(photo);
        img.alt = `Foto de ${name}`;
        img.referrerPolicy = 'no-referrer';
        img.addEventListener('error', () => {
            avatarEl.innerHTML = '';
            avatarEl.textContent = initial;
        });
        avatarEl.appendChild(img);
    } else {
        avatarEl.textContent = initial;
    }
}

function formatMemberSince(ts) {
    if (!ts) return '';
    try {
        return `Desde ${new Date(ts * 1000).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`;
    } catch {
        return '';
    }
}

export async function initPerfilPage() {
    const avatarEl = document.getElementById('profile-avatar');
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const bioEl = document.getElementById('profile-bio');
    const metaEl = document.getElementById('profile-meta');
    const toggleEl = document.getElementById('profile-edit-toggle');
    const formEl = document.getElementById('profile-form');
    const statusEl = document.getElementById('profile-status');
    const photoInput = document.getElementById('profile-photo');
    const bioInput = document.getElementById('profile-bio-input');
    const postsEl = document.getElementById('profile-posts');
    const emptyEl = document.getElementById('profile-posts-empty');

    function renderProfile(p, posts) {
        renderAvatar(avatarEl, p.photo, p.name);
        if (nameEl) nameEl.textContent = p.name;
        if (emailEl) emailEl.textContent = p.email;
        if (bioEl) bioEl.textContent = p.bio || 'Sin biografía todavía.';
        if (metaEl) {
            metaEl.textContent = [formatMemberSince(p.created_at), `${p.post_count} publicación(es)`].filter(Boolean).join(' · ');
        }
        if (photoInput) photoInput.value = p.photo || '';
        if (bioInput) bioInput.value = p.bio || '';

        if (postsEl) {
            postsEl.textContent = '';
            if (!posts || !posts.length) {
                if (emptyEl) emptyEl.style.display = 'block';
            } else {
                if (emptyEl) emptyEl.style.display = 'none';
                posts.forEach((post) => {
                    const card = buildCard(post, { mine: true });
                    postsEl.appendChild(card);
                });
            }
        }
    }

    async function reload() {
        try {
            const result = await api('/api/perfil');
            renderProfile(result.profile || {}, result.posts || []);
        } catch (err) {
            if (statusEl) {
                statusEl.textContent = err.message;
                statusEl.className = 'posts-status error';
            }
        }
    }

    try {
        const result = await api('/api/perfil');
        renderProfile(result.profile || {}, result.posts || []);
    } catch (err) {
        if (statusEl) {
            statusEl.textContent = err.message;
            statusEl.className = 'posts-status error';
        }
    }

    if (toggleEl) {
        toggleEl.addEventListener('click', () => {
            const open = formEl.style.display === 'block';
            formEl.style.display = open ? 'none' : 'block';
            toggleEl.textContent = open ? 'Editar perfil' : 'Cancelar';
        });
    }

    if (formEl) {
        formEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (statusEl) {
                statusEl.textContent = 'Guardando…';
                statusEl.className = 'posts-status success';
            }
            try {
                await api('/api/perfil', {
                    method: 'POST',
                    body: JSON.stringify({
                        bio: bioInput.value,
                        photo: photoInput.value,
                    }),
                });
                formEl.style.display = 'none';
                toggleEl.textContent = 'Editar perfil';
                if (statusEl) {
                    statusEl.textContent = 'Perfil guardado.';
                    statusEl.className = 'posts-status success';
                }
                const session = await api('/api/session');
                const { updateLoginButton } = await import('/js/session.js');
                updateLoginButton(session.authenticated, session.user?.name || '', session.user?.photo || '');
                await reload();
            } catch (err) {
                if (statusEl) {
                    statusEl.textContent = err.message;
                    statusEl.className = 'posts-status error';
                }
            }
        });
    }

    window.addEventListener('yusbo:post-deleted', reload);
}