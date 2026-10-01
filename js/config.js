const DEFAULT_API = '';

export const API_BASE = (window.YUSBO_API_BASE || DEFAULT_API).replace(/\/+$/, '');

let csrfToken = '';

// FastAPI devuelve `detail` como arreglo de objetos en los 422. Sin esto el
// mensaje llega al usuario como "[object Object]".
function readableDetail(detail) {
    if (detail == null || detail === '') return 'Error en la solicitud';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        const msgs = detail.map((item) => (item && item.msg) ? item.msg : String(item));
        return msgs.length ? msgs.join('\n') : 'Error en la solicitud';
    }
    if (typeof detail === 'object') {
        if (detail.msg) return String(detail.msg);
        try {
            return JSON.stringify(detail);
        } catch {
            return 'Error en la solicitud';
        }
    }
    return String(detail);
}

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
        const err = new Error(readableDetail(data && (data.detail || data.message)));
        err.status = res.status;
        err.detail = data && data.detail;
        throw err;
    }
    return data;
}