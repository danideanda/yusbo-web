const DEFAULT_API = 'https://yusbo-backend-us.vercel.app';

export const API_BASE = (window.YUSBO_API_BASE || DEFAULT_API).replace(/\/+$/, '');

let csrfToken = '';

export function setCsrf(token) {
    if (token) csrfToken = token;
}

export function apiUrl(path) {
    return path && path.startsWith('/') ? API_BASE + path : path;
}

export function pageUrl(path) {
    return path && path.startsWith('/') ? path : (path || '/');
}

export function mediaUrl(url) {
    if (!url) return url;
    if (/^https?:/i.test(url) || url.startsWith('data:')) return url;
    return apiUrl(url);
}

export async function api(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const headers = { ...(options.headers || {}) };
    if (isMutation && csrfToken && !(options.body instanceof FormData)) headers['X-CSRF-Token'] = csrfToken;
    if (typeof options.body === 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(apiUrl(path), {
        ...options,
        credentials: 'include',
        headers,
    });
    let data = null;
    try {
        data = await res.json();
    } catch {
        data = {};
    }
    if (!res.ok) {
        const err = new Error((data && (data.detail || data.message)) || 'Error en la solicitud');
        err.status = res.status;
        throw err;
    }
    return data;
}