import { api } from '/js/config.js?v=3';

const COOKIE_NAME = 'yusbo_cookies_v1';

function hasConsent() {
    return document.cookie.split('; ').some((c) => c.split('=')[0] === COOKIE_NAME);
}

export function setCookieConsent() {
    document.cookie = COOKIE_NAME + '=1; path=/; max-age=31536000; samesite=lax';
    saveConsentServer();
}

async function saveConsentServer() {
    try {
        await api('/api/cookies/consent', { method: 'POST' });
    } catch {
        // Sin conexión: el consentimiento queda en la cookie del navegador
    }
}

async function hasServerConsent() {
    try {
        const data = await api('/api/cookies/consent', { method: 'GET' });
        return !!(data && data.consented);
    } catch {
        return false;
    }
}

export async function initCookieBanner() {
    if (hasConsent()) return;

    const consented = await hasServerConsent();
    if (consented) {
        setCookieConsent();
        return;
    }

    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Aviso de uso de cookies');

    const text = document.createElement('p');
    text.className = 'cookie-text';
    text.textContent =
        'Usamos cookies para recordar tu sesión y personalizar tu experiencia en YUSBO. Al aceptar, las autorizas.';

    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'btn btn-primary cookie-accept';
    accept.textContent = 'Aceptar';

    const info = document.createElement('a');
    info.className = 'cookie-more';
    info.href = '/terminos#cookies';
    info.textContent = 'Política de cookies';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'cookie-close';
    close.setAttribute('aria-label', 'Cerrar aviso de cookies');
    close.textContent = '✕';

    accept.addEventListener('click', () => {
        setCookieConsent();
        banner.remove();
    });

    close.addEventListener('click', () => {
        banner.remove();
    });

    banner.append(text, accept, info, close);
    document.body.appendChild(banner);
}

initCookieBanner();