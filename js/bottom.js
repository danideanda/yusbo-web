const ICONS = {
    config:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34 1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87 1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>',
    home:
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3 4 10v10a1 1 0 0 0 1 1h5v-6h4v6h5a1 1 0 0 0 1-1V10z"/></svg>',
    messages:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    publicar:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
    dm:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
};

const ITEMS = [
    { id: 'publicar', label: 'Publicar', href: '/publicar', icon: 'publicar' },
    { id: 'config', label: 'Configuración', href: '/configuracion', icon: 'config' },
    { id: 'home', label: 'Publicaciones', href: '/publicaciones', icon: 'home', central: true },
    { id: 'messages', label: 'Mensajes', href: '/mensajes', icon: 'messages' },
    { id: 'dm', label: 'Directos', href: '/dm', icon: 'dm' },
];

let rendered = false;
let currentNav = null;

export function initBottomNav(show = true) {
    if (rendered) {
        if (currentNav) {
            currentNav.style.display = show ? 'flex' : 'none';
            document.body.classList.toggle('has-bottom-nav', show);
        }
        return;
    }
    rendered = true;

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label', 'Navegación principal');
    nav.innerHTML = ITEMS.map((item) => {
        const active = window.location.pathname === item.href;
        return (
            `<a href="${item.href}" class="bn-item${item.central ? ' bn-central' : ''}${active ? ' active' : ''}" aria-label="${item.label}" title="${item.label}">` +
            `<span class="bn-icon">${ICONS[item.icon]}</span>` +
            `<span class="bn-label">${item.label}</span>` +
            `</a>`
        );
    }).join('');
    document.body.appendChild(nav);
    currentNav = nav;
    nav.style.display = show ? 'flex' : 'none';
    document.body.classList.toggle('has-bottom-nav', show);
}

export function showBottomNav(show) {
    if (!currentNav) return;
    currentNav.style.display = show ? 'flex' : 'none';
    document.body.classList.toggle('has-bottom-nav', show);
}