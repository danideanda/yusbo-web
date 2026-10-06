import { validateEmail, showStatus, handleFormSubmit, initTabs } from '/js/app.js?v=2';
import { apiUrl, pageUrl, api } from '/js/config.js?v=3';

// Correo de la sesion pendiente (registro sin verificar) o cadena vacia.
async function pendingVerificationEmail() {
    try {
        const session = await api('/api/session', { method: 'GET' });
        if (session && session.pending && session.email) {
            return String(session.email).toLowerCase();
        }
    } catch { /* sin sesion */ }
    return '';
}

document.addEventListener('DOMContentLoaded', () => {
    initTabs('.auth-tab', '.auth-form', '#auth-status');
    const statusEl = document.getElementById('auth-status');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!validateEmail(email)) {
            showStatus(statusEl, 'Correo electrónico inválido');
            return;
        }
        if (!password) {
            showStatus(statusEl, 'Ingresa tu contraseña');
            return;
        }

        const result = await handleFormSubmit(loginForm, '/api/login');
        if (result.success) {
            showStatus(statusEl, 'Inicio de sesión exitoso. Redirigiendo...', false);
            setTimeout(() => window.location.href = pageUrl(result.data.redirect || '/user'), 1000);
        } else {
            showStatus(statusEl, result.error);
            // La cuenta de un registro pendiente todavia no existe: el backend
            // responde "Credenciales inválidas" aunque la contraseña sea la
            // correcta. Se avisa y se enlaza a /verify para no dejar al usuario
            // reintentando (5 fallos = bloqueo de 15 min).
            if (result.error === 'Credenciales inválidas' &&
                (await pendingVerificationEmail()) === email.toLowerCase()) {
                statusEl.className = 'auth-status error';
                statusEl.textContent = 'Tu cuenta está pendiente de verificación. ';
                const link = document.createElement('a');
                link.href = pageUrl('/verify');
                link.textContent = 'Verificar ahora';
                statusEl.appendChild(link);
            }
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (!name) {
            showStatus(statusEl, 'Ingresa tu nombre');
            return;
        }
        if (!validateEmail(email)) {
            showStatus(statusEl, 'Correo electrónico inválido');
            return;
        }
        // Mismas reglas que login.validate_password en el backend; antes solo
        // se comprobaba la longitud y el resto se descubria como error 400.
        if (password.length < 12) {
            showStatus(statusEl, 'La contraseña debe tener al menos 12 caracteres');
            return;
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            showStatus(statusEl, 'La contraseña debe incluir mayúscula, minúscula, número y un carácter especial');
            return;
        }
        if (password !== confirm) {
            showStatus(statusEl, 'Las contraseñas no coinciden');
            return;
        }

        const result = await handleFormSubmit(registerForm, '/api/register');
        if (result.success) {
            // La sesion pendiente no expone el correo en /api/session, asi que se
            // lleva a /verify para poder mostrarlo en el aviso.
            try { sessionStorage.setItem('yusbo_pending_email', email); } catch { /* sin almacenamiento */ }
            showStatus(statusEl, 'Cuenta creada exitosamente. Redirigiendo...', false);
            setTimeout(() => window.location.href = pageUrl(result.data.redirect || '/user'), 1000);
        } else {
            showStatus(statusEl, result.error);
        }
    });

    document.querySelectorAll('.btn-social').forEach(btn => {
        btn.addEventListener('click', () => {
            const provider = btn.dataset.provider;
            window.location.href = apiUrl(`/auth/${provider}`);
        });
    });
});