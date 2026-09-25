import { validateEmail, showStatus, handleFormSubmit } from '/js/app.js?v=2';

document.addEventListener('DOMContentLoaded', () => {
    const statusEl = document.getElementById('recover-status');
    const recoverForm = document.getElementById('recover-form');

    recoverForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('recover-email').value.trim();

        if (!validateEmail(email)) {
            showStatus(statusEl, 'Correo electrónico inválido');
            return;
        }

        const result = await handleFormSubmit(recoverForm, '/api/recover');
        if (result.success) {
            showStatus(statusEl, 'Si el correo existe, recibirás un enlace de recuperación.', false);
        } else {
            showStatus(statusEl, result.error);
        }
    });
});