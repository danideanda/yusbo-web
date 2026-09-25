import { api, pageUrl, mediaUrl } from '/js/config.js?v=3';

const CATEGORIES = ['ganado', 'maiz', 'herramientas', 'otros'];
const MAX_MEDIA = 10;
const MAX_SIZE = 15 * 1024 * 1024;

const media = [];

const statusEl = document.getElementById('post-status');
const fileInput = document.getElementById('media-files');
const previewGrid = document.getElementById('media-preview');
const form = document.getElementById('post-form');

function showStatus(message, isError = true) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'posts-status' + (isError ? ' error' : ' success');
}

function renderPreview(item) {
    const box = document.createElement('div');
    box.className = 'media-prev';
    if (item.type === 'video') {
        const video = document.createElement('video');
        video.src = mediaUrl(item.url);
        video.controls = true;
        video.muted = true;
        box.appendChild(video);
    } else {
        const img = document.createElement('img');
        img.src = mediaUrl(item.url);
        img.alt = 'Adjunto';
        box.appendChild(img);
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'media-remove';
    btn.textContent = '✕';
    btn.setAttribute('aria-label', 'Quitar archivo');
    btn.addEventListener('click', () => {
        const i = media.indexOf(item);
        if (i !== -1) media.splice(i, 1);
        box.remove();
        if (!media.length) fileInput.value = '';
    });
    box.appendChild(btn);
    previewGrid.appendChild(box);
}

let uploading = false;
fileInput.addEventListener('change', async () => {
    const files = [...(fileInput.files || [])];
    if (!files.length) return;

    const room = MAX_MEDIA - media.length;
    if (files.length > room) {
        showStatus(`Solo puedes subir ${MAX_MEDIA} archivos en total (te faltan ${room}).`);
        fileInput.value = '';
        return;
    }

    const allowedImg = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVid = ['video/mp4', 'video/quicktime', 'video/webm'];
    const invalid = files.find((f) => ![...allowedImg, ...allowedVid].includes(f.type));
    if (invalid) {
        showStatus('Formato no permitido: solo imágenes (JPG, PNG, GIF, WEBP) o videos (MP4, MOV, WEBM).');
        fileInput.value = '';
        return;
    }
    const tooBig = files.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
        showStatus('Un archivo supera los 15 MB.');
        fileInput.value = '';
        return;
    }

    uploading = true;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        showStatus(`Subiendo ${i + 1} de ${files.length}: ${file.name}...`);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const json = await api('/api/upload', {
                method: 'POST',
                body: fd,
            });
            media.push({ url: json.url, type: json.type });
            renderPreview(media[media.length - 1]);
        } catch (err) {
            showStatus(`No se pudo subir "${file.name}": ${err.message}`);
            uploading = false;
            fileInput.value = '';
            return;
        }
    }
    uploading = false;
    showStatus('Archivos listos. Completa el formulario y publica.', false);
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('post-title').value.trim();
    const description = document.getElementById('post-description').value.trim();
    const category = document.getElementById('post-category').value;

    if (title.length < 3) {
        showStatus('El título debe tener al menos 3 caracteres');
        return;
    }
    if (description.length < 10) {
        showStatus('La descripción debe tener al menos 10 caracteres');
        return;
    }
    if (!CATEGORIES.includes(category)) {
        showStatus('Elige una categoría válida');
        return;
    }

    const body = {
        title,
        category,
        description,
        price: document.getElementById('post-price').value.trim(),
        location: document.getElementById('post-location').value.trim(),
        media,
    };

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = uploading;
    showStatus('Publicando...');
    try {
        const json = await api('/api/posts', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        showStatus('¡Publicado! Redirigiendo a tu anuncio...', false);
        window.location.href = pageUrl(`/publicaciones/${json.post.id}`);
    } catch (err) {
        btn.disabled = false;
        showStatus(err.message);
    }
});