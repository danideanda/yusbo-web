export function canSubmitForm(form, cooldownMs = 1000) {
    if (!form || typeof form !== 'object' || !form.dataset) return true;

    const now = Date.now();
    const lastSubmit = Number(form.dataset.lastSubmitAt || 0);

    if (Number.isFinite(lastSubmit) && now - lastSubmit < cooldownMs) {
        return false;
    }

    form.dataset.lastSubmitAt = String(now);
    return true;
}

export function guardRepeatedSubmit(form, cooldownMs = 1000) {
    if (!form || typeof form !== 'object') return true;
    if (!canSubmitForm(form, cooldownMs)) {
        return false;
    }

    form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach((button) => {
        if (!button.dataset.originalSubmitDisabled) {
            button.dataset.originalSubmitDisabled = String(button.disabled);
        }
        button.disabled = true;

        if (button.dataset.submitTimer) {
            clearTimeout(Number(button.dataset.submitTimer));
        }

        const timeoutId = setTimeout(() => {
            button.disabled = button.dataset.originalSubmitDisabled === 'true';
        }, cooldownMs);

        button.dataset.submitTimer = String(timeoutId);
    });

    return true;
}
