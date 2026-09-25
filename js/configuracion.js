import { api, pageUrl } from '/js/config.js?v=3';

export async function initConfigPage(session) {
    const nameEl = document.getElementById('cfg-name');
    const emailEl = document.getElementById('cfg-email');
    const verifiedEl = document.getElementById('cfg-verified');
    const sendVerifyEl = document.getElementById('cfg-send-verify');
    const statusEl = document.getElementById('cfg-status');

    const form = document.getElementById('settings-form');
    const settingsStatus = document.getElementById('settings-status');

    if (nameEl) nameEl.textContent = session.user.name;
    if (emailEl) emailEl.textContent = session.user.email;

    if (verifiedEl) {
        verifiedEl.textContent = session.user.email_verified ? 'Sí' : 'No';
        verifiedEl.className = 'settings-value' + (session.user.email_verified ? ' cfg-ok' : ' cfg-pending');
    }

    if (sendVerifyEl) {
        sendVerifyEl.style.display = session.user.email_verified ? 'none' : 'inline-block';
        sendVerifyEl.addEventListener('click', async (e) => {
            e.preventDefault();
            sendVerifyEl.textContent = 'Enviando...';
            try {
                await api('/api/verify/resend', {
                    method: 'POST',
                    body: JSON.stringify({}),
                });
                if (statusEl) {
                    statusEl.textContent = 'Te enviamos un nuevo código a tu correo.';
                    statusEl.className = 'posts-status success';
                }
                window.location.href = pageUrl('/verify');
                return;
            } catch (err) {
                if (statusEl) {
                    statusEl.textContent = err.message || 'Error de conexión. Intenta de nuevo.';
                    statusEl.className = 'posts-status error';
                }
            }
            sendVerifyEl.textContent = 'Reenviar código de verificación';
        });
    }

    if (!form) return;

    const fields = ['s-guest-limit', 's-allow-guest', 's-require-verify', 's-dm', 's-login-redirect'];

    async function loadSettings() {
        try {
            const data = await api('/api/settings', { method: 'GET' });
            if (!data.settings) return;
            const s = data.settings;
            document.getElementById('s-guest-limit').value = s.guest_post_limit;
            document.getElementById('s-allow-guest').checked = !!s.allow_guest_posts;
            document.getElementById('s-require-verify').checked = !!s.require_email_verify_to_post;
            document.getElementById('s-login-redirect').value = s.login_redirect || '/publicaciones';
        } catch {
            // Sin ajustes, dejamos los valores por defecto
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        settingsStatus.className = 'posts-status';
        settingsStatus.textContent = '';
        const payload = {
            guest_post_limit: parseInt(document.getElementById('s-guest-limit').value, 10) || 10,
            allow_guest_posts: document.getElementById('s-allow-guest').checked,
            require_email_verify_to_post: document.getElementById('s-require-verify').checked,
            login_redirect: document.getElementById('s-login-redirect').value,
        };
        try {
            const data = await api('/api/settings', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            settingsStatus.className = 'posts-status success';
            settingsStatus.textContent = 'Ajustes guardados.';
        } catch (err) {
            settingsStatus.className = 'posts-status error';
            settingsStatus.textContent = err.message || 'No se pudieron guardar los ajustes.';
        }
    });

    await loadSettings();

    const deleteBtn = document.getElementById('cfg-delete-account');
    const deleteStatus = document.getElementById('cfg-delete-status');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const first = 'eliminar mi cuenta';
            const second = 'CONFIRMO';
            const a = prompt(
                `Para eliminar tu cuenta escribe "${first}". Esta acción es irreversible y borra tus publicaciones y mensajes.`,
            );
            if (!a) return;
            if (a.trim().toLowerCase() !== first) {
                if (deleteStatus) {
                    deleteStatus.className = 'posts-status error';
                    deleteStatus.textContent = 'Texto incorrecto. No se eliminó la cuenta.';
                }
                return;
            }
            const b = prompt(`Última confirmación: escribe "${second}"`);
            if (!b) return;
            if (b.trim().toUpperCase() !== second) {
                if (deleteStatus) {
                    deleteStatus.className = 'posts-status error';
                    deleteStatus.textContent = 'Cancelado por seguridad.';
                }
                return;
            }
            deleteBtn.disabled = true;
            if (deleteStatus) {
                deleteStatus.className = 'posts-status';
                deleteStatus.textContent = 'Eliminando cuenta…';
            }
            try {
                await api('/api/account/delete', {
                    method: 'POST',
                    body: JSON.stringify({}),
                });
                window.location.href = '/';
                return;
            } catch (err) {
                if (deleteStatus) {
                    deleteStatus.className = 'posts-status error';
                    deleteStatus.textContent = err.message || 'No se pudo eliminar la cuenta.';
                }
                deleteBtn.disabled = false;
            }
        });
    }
}