import { validateEmail, showStatus, handleFormSubmit, initTabs } from '/js/app.js?v=2';
import { apiUrl, pageUrl } from '/js/config.js?v=3';

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
        if (password.length < 12) {
            showStatus(statusEl, 'La contraseña debe tener al menos 12 caracteres');
            return;
        }
        if (password !== confirm) {
            showStatus(statusEl, 'Las contraseñas no coinciden');
            return;
        }

        const result = await handleFormSubmit(registerForm, '/api/register');
        if (result.success) {
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