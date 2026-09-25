import { api, pageUrl } from '/js/config.js?v=3';

export async function initVerifyPage(session) {
    const form = document.getElementById('verify-form');
    const statusEl = document.getElementById('verify-status');
    const emailEl = document.getElementById('verify-email');
    const resendEl = document.getElementById('verify-resend');
    const codeInput = document.getElementById('verify-code');

    if (!session.authenticated) {
        window.location.href = pageUrl('/login');
        return;
    }

    if (emailEl) {
        emailEl.textContent = session.user.email;
    }

    function showStatus(el, message, isError = true) {
        el.textContent = message;
        el.className = 'auth-status' + (isError ? ' error' : ' success');
    }

    async function post(url, body) {
        try {
            const data = await api(url, {
                method: 'POST',
                body: JSON.stringify(body || {}),
            });
            return { ok: true, data };
        } catch (err) {
            return { ok: false, error: err.message || 'Error en la solicitud' };
        }
    }

    async function loadFallbackCode() {
        try {
            const data = await api('/api/verify/fallback', { method: 'GET' });
            if (data && data.code && codeInput && !codeInput.value) {
                codeInput.value = data.code;
            }
            if (data && data.mail_available === false && data.code) {
                const noticeEl = document.getElementById('verify-mail-notice');
                if (noticeEl) {
                    noticeEl.className = 'mail-notice warn';
                    noticeEl.innerHTML = 'No pudimos enviar el correo (¿GMAIL_USER/GMAIL_APP_PASSWORD configurados?). Tu código es: <strong>' + data.code + '</strong>';
                }
            }
        } catch {
        }
    }
    loadFallbackCode();

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = codeInput.value.trim();
            if (!/^\d{6}$/.test(code)) {
                showStatus(statusEl, 'El código debe tener 6 dígitos');
                return;
            }
            statusEl.className = 'auth-status';
            statusEl.textContent = '';
            const result = await post('/api/verify', { code });
            if (result.ok && result.data.verified) {
                showStatus(statusEl, '¡Correo verificado! Redirigiendo...', false);
                setTimeout(() => window.location.href = pageUrl(result.data.redirect || '/user'), 1200);
            } else if (result.error) {
                showStatus(statusEl, result.error);
            }
        });
    }

    if (resendEl) {
        resendEl.addEventListener('click', async (e) => {
            e.preventDefault();
            resendEl.textContent = 'Enviando...';
            const result = await post('/api/verify/resend');
            if (result.ok) {
                if (result.data && result.data.sent === false && result.data.code) {
                    codeInput.value = result.data.code;
                    showStatus(statusEl, 'No pudimos enviar el correo. Tu código es: ' + result.data.code, true);
                } else {
                    showStatus(statusEl, 'Te enviamos un nuevo código.', false);
                    codeInput.value = '';
                }
            } else {
                showStatus(statusEl, result.error);
            }
            resendEl.textContent = 'Reenviar código';
        });
    }
}