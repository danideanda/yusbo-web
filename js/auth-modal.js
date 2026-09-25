import { api, setCsrf, pageUrl } from '/js/config.js?v=3';

export function createAuthModal() {
    const modalHtml = `
        <div id="auth-modal" class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" hidden>
            <div class="auth-modal-overlay"></div>
            <div class="auth-modal-content">
                <button class="auth-modal-close" aria-label="Cerrar">&times;</button>
                <h2 id="auth-modal-title">Iniciar sesión requerido</h2>
                <p id="auth-modal-message">Para acceder a esta función necesitas iniciar sesión.</p>
                <div class="auth-modal-actions">
                    <a href="${pageUrl('/login')}" class="btn btn-primary" id="auth-modal-login">Iniciar sesión</a>
                    <button class="btn btn-outline auth-modal-cancel">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    return document.getElementById('auth-modal');
}

export function showAuthModal(message = 'Para acceder a esta función necesitas iniciar sesión.') {
    let modal = document.getElementById('auth-modal');
    if (!modal) {
        modal = createAuthModal();
    }
    document.getElementById('auth-modal-message').textContent = message;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('.auth-modal-close').focus();
    return new Promise((resolve) => {
        modal.dataset.resolve = 'pending';
        modal.addEventListener('auth-modal-result', (e) => {
            resolve(e.detail);
        }, { once: true });
    });
}

export function hideAuthModal(result = false) {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.hidden = true;
        document.body.style.overflow = '';
        const event = new CustomEvent('auth-modal-result', { detail: result });
        modal.dispatchEvent(event);
    }
}

export function initAuthModal() {
    const modal = createAuthModal();
    modal.querySelector('.auth-modal-close').addEventListener('click', () => hideAuthModal(false));
    modal.querySelector('.auth-modal-cancel').addEventListener('click', () => hideAuthModal(false));
    modal.querySelector('.auth-modal-overlay').addEventListener('click', () => hideAuthModal(false));
    modal.querySelector('#auth-modal-login').addEventListener('click', () => hideAuthModal(true));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) {
            hideAuthModal(false);
        }
    });
}

export async function requireAuth(actionCallback, message) {
    const data = await api('/api/session', { method: 'GET' });
    if (data && data.csrf_token) setCsrf(data.csrf_token);
    if (data.authenticated) {
        return actionCallback();
    }
    const confirmed = await showAuthModal(message);
    if (confirmed) {
        window.location.href = pageUrl('/login');
    }
    return false;
}

export function protectLinks(selector, message) {
    document.querySelectorAll(selector).forEach(link => {
        link.addEventListener('click', async (e) => {
            const data = await api('/api/session', { method: 'GET' });
            if (data && data.csrf_token) setCsrf(data.csrf_token);
            if (!data.authenticated) {
                e.preventDefault();
                const confirmed = await showAuthModal(message || 'Para acceder a esta función necesitas iniciar sesión.');
                if (confirmed) {
                    window.location.href = pageUrl('/login');
                }
            }
        });
    });
}