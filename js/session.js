import { api, setCsrf, mediaUrl } from '/js/config.js?v=3';

export async function checkSession() {
    try {
        const data = await api('/api/session', { method: 'GET' });
        if (data) setCsrf(data.csrf_token);
        return data;
    } catch {
        return { authenticated: false };
    }
}

export function updateLoginButton(authenticated, userName = '', photo = '') {
    const loginBtn = document.getElementById('nav-login-btn');
    const userGreeting = document.getElementById('nav-user-greeting');
    const logoutForm = document.getElementById('nav-logout-form');
    const profileBtn = document.getElementById('nav-profile-btn');

    if (loginBtn) {
        loginBtn.style.display = authenticated ? 'none' : 'inline-block';
    }
    if (userGreeting) {
        userGreeting.textContent = authenticated ? `Hola, ${userName}` : '';
        userGreeting.style.display = authenticated ? 'inline-block' : 'none';
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