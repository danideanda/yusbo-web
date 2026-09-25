import { api } from '/js/config.js?v=3';

function formatDate(ts) {
    try {
        return new Date(ts * 1000).toLocaleString('es-MX', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

export async function initMessagesPage() {
    const listEl = document.getElementById('msg-list');
    const form = document.getElementById('contact-form');
    const statusEl = document.getElementById('contact-status');

    async function loadMessages() {
        try {
            const data = await api('/api/messages', { method: 'GET' });
            if (!listEl) return;
            listEl.innerHTML = '';
            if (!data.messages || data.messages.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'msg-empty';
                empty.textContent = 'No tienes mensajes todavía.';
                listEl.appendChild(empty);
                return;
            }
            data.messages.forEach((msg) => {
                const item = document.createElement('div');
                item.className = 'msg-item';
                const text = document.createElement('p');
                text.textContent = msg.text;
                const time = document.createElement('time');
                time.textContent = formatDate(msg.created_at);
                item.appendChild(text);
                item.appendChild(time);
                listEl.appendChild(item);
            });
        } catch {
            // Sin mensajes, no hacemos nada
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const subject = document.getElementById('contact-subject').value.trim();
            const message = document.getElementById('contact-message').value.trim();
            statusEl.className = 'posts-status';
            statusEl.textContent = '';
            if (!subject || message.length < 10) {
                statusEl.className = 'posts-status error';
                statusEl.textContent = 'Completa el asunto y escribe al menos 10 caracteres.';
                return;
            }
            try {
                const data = await api('/api/contact', {
                    method: 'POST',
                    body: JSON.stringify({ subject, message }),
                });
                statusEl.className = 'posts-status success';
                statusEl.textContent = data.message || 'Mensaje enviado.';
                form.reset();
            } catch (err) {
                statusEl.className = 'posts-status error';
                statusEl.textContent = err.message || 'No se pudo enviar el mensaje.';
            }
        });
    }

    await loadMessages();
}