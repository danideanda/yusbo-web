import { api, setCsrf, mediaUrl } from '/js/config.js?v=3';

const CACHE_KEY = 'yusbo_session_cache';
const RETRY_DELAY_MS = 400;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ultimo estado de sesion conocido en esta pestaña. Solo guarda datos de
// display (nombre, foto, id): el cookie de sesion sigue siendo la fuente de
// verdad y el CSRF nunca se cachea.
function cacheSession(data) {
    try {
        if (!data || data.pending || !data.authenticated) {
            sessionStorage.removeItem(CACHE_KEY);
            return;
        }
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            authenticated: true,
            user: data.user || null,
        }));
    } catch { /* almacenamiento no disponible */ }
}

function readCachedSession() {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data && data.authenticated ? data : null;
    } catch {
        return null;
    }
}

export async function checkSession() {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const data = await api('/api/session', { method: 'GET' });
            if (data) setCsrf(data.csrf_token);
            cacheSession(data);
            return data;
        } catch (err) {
            // api() solo lanza ante fallo de red o respuesta 5xx: un servidor
            // caido o un error transitorio no significa que la sesion termino.
            // Antes cualquier fallo devolvia authenticated:false y las paginas
            // redirigian a /login, dando la sensacion de "cerrar sesion" al
            // cambiar de panel.
            if (err && err.status && err.status < 500) {
                const closed = { authenticated: false };
                cacheSession(closed);
                return closed;
            }
            if (attempt === 0) await delay(RETRY_DELAY_MS);
        }
    }
    // Sin respuesta utilizable: se conserva el ultimo estado conocido para no
    // expulsar a alguien cuya cookie sigue vigente.
    return readCachedSession() || { authenticated: false, unavailable: true };
}

export function updateLoginButton(authenticated, userName = '', photo = '') {
    const loginBtn = document.getElementById('nav-login-btn');
    const userGreeting = document.getElementById('nav-user-greeting');
    const logoutForm = document.getElementById('nav-logout-form');
    const profileBtn = document.getElementById('nav-profile-btn');
    // Declarado en varias paginas con display:none fijo y sin ningun JS que
    // lo mostrara: el enlace "Mi panel" quedaba invisible siempre.
    const userBtn = document.getElementById('nav-user-btn');

    if (loginBtn) {
        loginBtn.style.display = authenticated ? 'none' : 'inline-block';
    }
    if (userGreeting) {
        userGreeting.textContent = authenticated ? `Hola, ${userName}` : '';
        userGreeting.style.display = authenticated ? 'inline-block' : 'none';
    }
    if (userBtn) {
        userBtn.style.display = authenticated ? 'inline-block' : 'none';
    }
    if (logoutForm) {
        logoutForm.style.display = authenticated ? 'inline-block' : 'none';
    }
    if (profileBtn) {
        profileBtn.style.display = authenticated ? 'grid' : 'none';
        profileBtn.textContent = '';
        profileBtn.innerHTML = '';
        const initial = (userName || 'U').trim().charAt(0).toUpperCase();
        if (authenticated && photo) {
            const img = document.createElement('img');
            img.src = mediaUrl(photo);
            img.alt = `Foto de ${userName}`;
            img.referrerPolicy = 'no-referrer';
            img.addEventListener('error', () => {
                img.remove();
                profileBtn.textContent = initial;
            });
            profileBtn.appendChild(img);
        } else if (authenticated) {
            profileBtn.textContent = initial;
        }
    }
}

export async function initSessionCheck() {
    const session = await checkSession();
    updateLoginButton(session.authenticated, session.user?.name || '', session.user?.photo || '');
    return session;
}

export function initMobileNav() {
    const burger = document.getElementById('nav-burger');
    if (!burger) return;
    const nav = burger.closest('.nav');
    if (!nav) return;

    const setOpen = (open) => {
        nav.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    burger.addEventListener('click', () => setOpen(!nav.classList.contains('open')));

    nav.querySelectorAll('.nav-links a').forEach((link) => {
        link.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('open')) {
            setOpen(false);
            burger.focus();
        }
    });
}

initMobileNav();