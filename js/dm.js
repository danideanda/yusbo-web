import { api, setCsrf, mediaUrl } from '/js/config.js?v=3';

const STORAGE_PREFIX = 'yusbo_dm_';
const KEY_STORAGE = STORAGE_PREFIX + 'keys';
const CONV_STORAGE = STORAGE_PREFIX + 'conversations';

let currentUser = null;
let currentConvId = null;
let conversations = [];
let messagePollInterval = null;
let cryptoKeys = null;
let keyPair = null;

export async function initDMPage() {
    await loadCryptoKeys();
    await loadConversations();
    setupEventListeners();
    startPolling();
}

async function loadCryptoKeys() {
    try {
        const stored = localStorage.getItem(KEY_STORAGE);
        if (stored) {
            const data = JSON.parse(stored);
            keyPair = data.keyPair;
            cryptoKeys = data.cryptoKeys;
            if (keyPair && keyPair.privateKey) {
                cryptoKeys.privateKey = await importPrivateKey(keyPair.privateKey);
                cryptoKeys.publicKey = await importPublicKey(keyPair.publicKey);
            }
        }
        if (!keyPair) {
            await generateKeyPair();
        }
    } catch (e) {
        console.warn('Error loading crypto keys:', e);
        await generateKeyPair();
    }
}

async function generateKeyPair() {
    const pair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits']
    );

    const exportedPrivate = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
    const exportedPublic = await crypto.subtle.exportKey('raw', pair.publicKey);

    keyPair = {
        privateKey: arrayBufferToBase64(exportedPrivate),
        publicKey: arrayBufferToBase64(exportedPublic)
    };

    cryptoKeys = {
        privateKey: pair.privateKey,
        publicKey: pair.publicKey
    };

    localStorage.setItem(KEY_STORAGE, JSON.stringify({
        keyPair,
        cryptoKeys: { publicKey: keyPair.publicKey }
    }));
}

async function importPrivateKey(base64Key) {
    const raw = base64ToArrayBuffer(base64Key);
    return crypto.subtle.importKey('pkcs8', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
}

async function importPublicKey(base64Key) {
    const raw = base64ToArrayBuffer(base64Key);
    return crypto.subtle.importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

async function deriveChatKey(otherPublicKeyB64) {
    const otherPublicKey = await importPublicKey(otherPublicKeyB64);
    const sharedSecret = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: otherPublicKey },
        cryptoKeys.privateKey,
        256
    );
    return crypto.subtle.importKey('raw', sharedSecret, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptMessage(chatKey, plaintext) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chatKey, data);
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);
    return arrayBufferToBase64(result.buffer);
}

async function decryptMessage(chatKey, ciphertextB64) {
    const data = base64ToArrayBuffer(ciphertextB64);
    const iv = data.slice(0, 12);
    const ciphertext = data.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, chatKey, ciphertext);
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

async function loadConversations() {
    const listEl = document.getElementById('dm-conv-list');
    const loadingEl = document.getElementById('dm-loading');
    const emptyEl = document.getElementById('dm-empty');

    try {
        const data = await api('/api/dm/conversations', { method: 'GET' });
        conversations = data.conversations || [];
        renderConversations();
    } catch (err) {
        console.error('Error loading conversations:', err);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) {
            emptyEl.style.display = 'flex';
            emptyEl.querySelector('p').textContent = 'Error al cargar conversaciones';
        }
    }
}

function renderConversations() {
    const listEl = document.getElementById('dm-conv-list');
    const loadingEl = document.getElementById('dm-loading');
    const emptyEl = document.getElementById('dm-empty');

    if (loadingEl) loadingEl.style.display = 'none';

    if (!conversations.length) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    listEl.innerHTML = '';
    conversations.forEach(conv => {
        const item = createConversationElement(conv);
        listEl.appendChild(item);
    });
}

function createConversationElement(conv) {
    const item = document.createElement('div');
    item.className = 'dm-conv-item' + (conv.conversation_id === currentConvId ? ' active' : '');
    item.dataset.convId = conv.conversation_id;
    item.setAttribute('role', 'listitem');
    item.tabIndex = 0;

    const initial = conv.other_user.charAt(0).toUpperCase();
    const lastMsg = conv.last_message;
    const previewText = lastMsg ? 'Mensaje cifrado...' : 'Sin mensajes';
    const timeText = lastMsg ? formatTime(lastMsg.created_at) : '';
    const unreadCount = conv.unread_count || 0;

    item.innerHTML = `
        <div class="dm-conv-avatar">${escapeHtml(initial)}</div>
        <div class="dm-conv-content">
            <div class="dm-conv-header">
                <span class="dm-conv-name">${escapeHtml(conv.other_user)}</span>
                <span class="dm-conv-time">${escapeHtml(timeText)}</span>
            </div>
            <div class="dm-conv-preview">
                <span class="dm-conv-text">${escapeHtml(previewText)}</span>
                ${unreadCount > 0 ? `<span class="dm-conv-unread">${unreadCount}</span>` : ''}
                <span class="dm-conv-e2e">E2E</span>
            </div>
        </div>
    `;

    item.addEventListener('click', () => openConversation(conv));
    item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openConversation(conv);
        }
    });

    return item;
}

async function openConversation(conv) {
    currentConvId = conv.conversation_id;

    document.querySelectorAll('.dm-conv-item').forEach(el => {
        el.classList.toggle('active', el.dataset.convId === currentConvId);
    });

    const emptyEl = document.getElementById('dm-chat-empty');
    const activeEl = document.getElementById('dm-chat-active');
    const nameEl = document.getElementById('dm-chat-name');
    const avatarEl = document.getElementById('dm-chat-avatar');

    if (emptyEl) emptyEl.style.display = 'none';
    if (activeEl) activeEl.style.display = 'flex';

    if (nameEl) nameEl.textContent = conv.other_user;
    if (avatarEl) avatarEl.textContent = conv.other_user.charAt(0).toUpperCase();

    await loadMessages(conv.conversation_id);
    await markAsRead(conv.conversation_id);
    updateConversationUnread(conv.conversation_id, 0);

    if (window.innerWidth <= 800) {
        document.getElementById('dm-sidebar').classList.remove('open');
    }
}

async function loadMessages(convId, beforeId = null) {
    const messagesEl = document.getElementById('dm-messages');
    const loadingEl = document.getElementById('dm-messages-loading');

    if (!beforeId && loadingEl) loadingEl.style.display = 'flex';

    try {
        const data = await api('/api/dm/get', {
            method: 'POST',
            body: JSON.stringify({ conversation_id: convId, limit: 50, before_id: beforeId })
        });

        const messages = data.messages || [];

        if (!beforeId) {
            messagesEl.innerHTML = '';
            if (loadingEl) loadingEl.style.display = 'none';
        } else {
            if (loadingEl) loadingEl.remove();
        }

        const chatKey = await getChatKey(convId);
        if (!chatKey) {
            showKeyMissingWarning();
            return;
        }

        for (const msg of messages.reverse()) {
            const decrypted = await decryptMessage(chatKey, msg.payload.encrypted_content);
            appendMessage(msg, decrypted, false);
        }

        scrollToBottom();
    } catch (err) {
        console.error('Error loading messages:', err);
        if (loadingEl) loadingEl.style.display = 'none';
        showError('No se pudieron cargar los mensajes');
    }
}

function appendMessage(msg, text, isOwn) {
    const messagesEl = document.getElementById('dm-messages');
    if (!messagesEl) return;

    const div = document.createElement('div');
    div.className = 'dm-message' + (isOwn ? ' own' : ' other');
    div.dataset.msgId = msg.id;

    const time = formatTime(msg.created_at);
    const status = isOwn ? '<span class="dm-message-status">✓✓</span>' : '';

    div.innerHTML = `
        <div class="dm-message-bubble">${escapeHtml(text)}${status}</div>
        <span class="dm-message-time">${escapeHtml(time)}</span>
    `;

    messagesEl.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    const messagesEl = document.getElementById('dm-messages');
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage(text) {
    if (!currentConvId || !text.trim()) return;

    const chatKey = await getChatKey(currentConvId);
    if (!chatKey) {
        showKeyMissingWarning();
        return;
    }

    const encrypted = await encryptMessage(chatKey, text.trim());
    const payload = {
        encrypted_content: encrypted,
        sender_id: currentUser.email,
        recipient_id: getOtherUserEmail(currentConvId),
        timestamp: Date.now() / 1000
    };

    const inputEl = document.getElementById('dm-input');
    const sendBtn = document.getElementById('dm-send-btn');
    if (inputEl) inputEl.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    const tempId = 'temp_' + Date.now();
    appendMessage({ id: tempId, created_at: Date.now() / 1000 }, text.trim(), true);

    try {
        await api('/api/dm/send', {
            method: 'POST',
            body: JSON.stringify({ conversation_id: currentConvId, recipient: getOtherUserEmail(currentConvId), payload })
        });
        document.querySelector(`[data-msg-id="${tempId}"]`)?.remove();
        await loadMessages(currentConvId);
    } catch (err) {
        console.error('Error sending message:', err);
        const tempMsg = document.querySelector(`[data-msg-id="${tempId}"]`);
        if (tempMsg) {
            const bubble = tempMsg.querySelector('.dm-message-bubble');
            if (bubble) bubble.insertAdjacentHTML('beforeend', '<div class="dm-message-failed">No enviado - Reintentando...</div>');
        }
        showError('Error al enviar: ' + err.message);
    } finally {
        if (inputEl) inputEl.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
    }
}

function getOtherUserEmail(convId) {
    const conv = conversations.find(c => c.conversation_id === convId);
    return conv ? conv.other_user : '';
}

async function getChatKey(convId) {
    const otherEmail = getOtherUserEmail(convId);
    if (!otherEmail) return null;

    const stored = localStorage.getItem(CONV_STORAGE);
    const keys = stored ? JSON.parse(stored) : {};
    const keyId = [currentUser.email, otherEmail].sort().join(':');

    if (keys[keyId]) {
        return await deriveChatKey(keys[keyId]);
    }

    try {
        const data = await api('/api/dm/key/get', {
            method: 'POST',
            body: JSON.stringify({ other_user: otherEmail })
        });
        if (data.encrypted_key) {
            keys[keyId] = data.encrypted_key;
            localStorage.setItem(CONV_STORAGE, JSON.stringify(keys));
            return await deriveChatKey(data.encrypted_key);
        }
    } catch (e) {
        console.warn('No chat key found:', e);
    }
    return null;
}

async function storeChatKey(otherEmail) {
    const keyId = [currentUser.email, otherEmail].sort().join(':');
    const stored = localStorage.getItem(CONV_STORAGE);
    const keys = stored ? JSON.parse(stored) : {};

    if (keys[keyId]) return keys[keyId];

    const otherPublicKey = await getUserPublicKey(otherEmail);
    if (!otherPublicKey) return null;

    const chatKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('raw', chatKey);
    const encryptedKey = arrayBufferToBase64(exported);

    keys[keyId] = encryptedKey;
    localStorage.setItem(CONV_STORAGE, JSON.stringify(keys));

    try {
        await api('/api/dm/key', {
            method: 'POST',
            body: JSON.stringify({ other_user: otherEmail, encrypted_key: encryptedKey })
        });
    } catch (e) {
        console.warn('Failed to store chat key on server:', e);
    }

    return encryptedKey;
}

async function getUserPublicKey(email) {
    try {
        const data = await api('/api/site', { method: 'GET' });
        return null;
    } catch (e) {
        return null;
    }
}

function showKeyMissingWarning() {
    const messagesEl = document.getElementById('dm-messages');
    if (!messagesEl) return;

    const existing = messagesEl.querySelector('.dm-key-warning');
    if (existing) return;

    const div = document.createElement('div');
    div.className = 'dm-message other dm-key-warning';
    div.innerHTML = `
        <div class="dm-message-bubble" style="background: #fff3cd; border-color: #ffc107; color: #856404;">
            ⚠️ No se puede descifrar: falta la clave de chat. Inicia la conversación desde cero o espera a que el otro usuario envíe la clave.
        </div>
    `;
    messagesEl.appendChild(div);
}

async function markAsRead(convId) {
    try {
        await api('/api/dm/read', {
            method: 'POST',
            body: JSON.stringify({ conversation_id: convId, message_ids: [] })
        });
    } catch (e) {
        console.warn('Failed to mark as read:', e);
    }
}

function updateConversationUnread(convId, count) {
    const conv = conversations.find(c => c.conversation_id === convId);
    if (conv) conv.unread_count = count;

    const item = document.querySelector(`[data-conv-id="${convId}"]`);
    if (item) {
        const unreadEl = item.querySelector('.dm-conv-unread');
        if (count > 0) {
            if (unreadEl) unreadEl.textContent = count;
            else {
                const preview = item.querySelector('.dm-conv-preview');
                if (preview) preview.insertAdjacentHTML('beforeend', `<span class="dm-conv-unread">${count}</span>`);
            }
        } else if (unreadEl) {
            unreadEl.remove();
        }
    }
}

async function createConversation(otherEmail) {
    try {
        const data = await api('/api/dm/conversation', {
            method: 'POST',
            body: JSON.stringify({ other_user: otherEmail })
        });
        await loadConversations();
        const conv = conversations.find(c => c.conversation_id === data.conversation_id);
        if (conv) {
            await storeChatKey(otherEmail);
            openConversation(conv);
        }
        return data.conversation_id;
    } catch (err) {
        throw new Error(err.message || 'No se pudo crear la conversación');
    }
}

function setupEventListeners() {
    const newConvBtn = document.getElementById('dm-new-conv-btn');
    const emptyNewBtn = document.getElementById('dm-empty-new-btn');
    const modal = document.getElementById('dm-new-conv-modal');
    const modalClose = document.getElementById('dm-modal-close');
    const modalCancel = document.getElementById('dm-modal-cancel');
    const modalForm = document.getElementById('dm-modal-form');
    const inputForm = document.getElementById('dm-input-form');
    const inputEl = document.getElementById('dm-input');

    function openModal() {
        if (modal) {
            modal.style.display = 'flex';
            const input = document.getElementById('dm-modal-email');
            if (input) { input.value = ''; input.focus(); }
            const status = document.getElementById('dm-modal-status');
            if (status) { status.style.display = 'none'; status.textContent = ''; }
        }
    }

    function closeModal() {
        if (modal) modal.style.display = 'none';
    }

    if (newConvBtn) newConvBtn.addEventListener('click', openModal);
    if (emptyNewBtn) emptyNewBtn.addEventListener('click', openModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalCancel) modalCancel.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (modalForm) {
        modalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('dm-modal-email');
            const statusEl = document.getElementById('dm-modal-status');
            const submitBtn = document.getElementById('dm-modal-submit');

            const email = emailInput.value.trim().toLowerCase();
            if (!email || !validateEmail(email)) {
                showModalStatus('Email inválido', true);
                return;
            }
            if (email === currentUser.email) {
                showModalStatus('No puedes iniciar conversación contigo mismo', true);
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';

            try {
                await createConversation(email);
                closeModal();
            } catch (err) {
                showModalStatus(err.message, true);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Iniciar conversación';
            }
        });
    }

    if (inputForm) {
        inputForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = inputEl.value.trim();
            if (!text) return;
            inputEl.value = '';
            await sendMessage(text);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function showModalStatus(message, isError) {
    const statusEl = document.getElementById('dm-modal-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'dm-modal-status' + (isError ? ' error' : ' success');
    statusEl.style.display = 'block';
}

function showError(message) {
    const messagesEl = document.getElementById('dm-messages');
    if (!messagesEl) return;
    const div = document.createElement('div');
    div.className = 'dm-message other';
    div.innerHTML = `<div class="dm-message-bubble" style="background: #fef2f2; border-color: #fecaca; color: #dc2626;">${escapeHtml(message)}</div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
}

function startPolling() {
    if (messagePollInterval) clearInterval(messagePollInterval);
    messagePollInterval = setInterval(async () => {
        if (currentConvId) {
            try {
                const data = await api('/api/dm/get', {
                    method: 'POST',
                    body: JSON.stringify({ conversation_id: currentConvId, limit: 20 })
                });
                const messages = data.messages || [];
                const chatKey = await getChatKey(currentConvId);
                if (chatKey && messages.length) {
                    const existingIds = new Set();
                    document.querySelectorAll('[data-msg-id]').forEach(el => existingIds.add(el.dataset.msgId));
                    for (const msg of messages) {
                        if (!existingIds.has(msg.id)) {
                            const decrypted = await decryptMessage(chatKey, msg.payload.encrypted_content);
                            appendMessage(msg, decrypted, false);
                            if (msg.recipient === currentUser.email && !msg.read) {
                                await markAsRead(currentConvId);
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Polling error:', e);
            }
        }
        try {
            await loadConversations();
        } catch (e) {
            console.warn('Conversation poll error:', e);
        }
    }, 10000);
}

function formatTime(ts) {
    if (!ts) return '';
    try {
        const date = new Date(ts * 1000);
        const now = new Date();
        const diff = now - date;
        if (diff < 60000) return 'ahora';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
        return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
    } catch {
        return '';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

window.addEventListener('beforeunload', () => {
    if (messagePollInterval) clearInterval(messagePollInterval);
});

export { initDMPage };