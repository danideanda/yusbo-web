import { api, setCsrf } from '/js/config.js?v=3';

export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readableDetail(detail) {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        const msgs = detail.map((item) => (item && item.msg) ? item.msg : String(item));
        return msgs.length ? msgs.join('\n') : 'Error en la solicitud';
    }
    try {
        return JSON.stringify(detail);
    } catch {
        return 'Error en la solicitud';
    }
}

export function showStatus(element, message, isError = true) {
    element.textContent = typeof message === 'string' ? message : readableDetail(message);
    element.className = 'auth-status' + (isError ? ' error' : ' success');
}

function toFormBody(formData) {
    const out = {};
    for (const [key, value] of formData.entries()) {
        if (key in out) {
            if (Array.isArray(out[key])) out[key].push(value);
            else out[key] = [out[key], value];
        } else {
            out[key] = value;
        }
    }
    if ('interests' in out && !Array.isArray(out.interests)) {
        out.interests = [out.interests];
    }
    return out;
}

export async function handleFormSubmit(form, url, successRedirect) {
    const formData = new FormData(form);
    const data = toFormBody(formData);

    try {
        const result = await api(url, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (result && result.csrf_token) setCsrf(result.csrf_token);
        return { success: true, data: result };
    } catch (err) {
        return { success: false, error: err.message || 'Error en la solicitud' };
    }
}

export function initTabs(tabsSelector, formsSelector, statusSelector) {
    const tabs = document.querySelectorAll(tabsSelector);
    const forms = document.querySelectorAll(formsSelector);
    const statusEl = document.querySelector(statusSelector);

    function showTab(tabName) {
        tabs.forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
            t.setAttribute('aria-selected', t.dataset.tab === tabName);
        });
        forms.forEach(f => {
            const isActive = f.id === `${tabName}-form`;
            f.classList.toggle('active', isActive);
        });
        if (statusEl) {
            statusEl.textContent = '';
            statusEl.className = 'auth-status';
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => showTab(tab.dataset.tab));
    });

    return { showTab };
}

export function initSocialButtons(statusSelector) {
    const statusEl = document.querySelector(statusSelector);
    document.querySelectorAll('.btn-social').forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = btn.dataset.provider;
            if (statusEl) {
                showStatus(statusEl, `${provider.charAt(0).toUpperCase() + provider.slice(1)} login no configurado aún. Configura OAUTH_CLIENT_ID en login.py`);
            }
        });
    });
}