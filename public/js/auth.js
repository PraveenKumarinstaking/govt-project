/**
 * HAERMS — Auth helper (login, token storage, role routing)
 */
const API = window.location.port !== '5000' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : '';

function getToken() {
    return localStorage.getItem('haerms_token');
}

function getUser() {
    const raw = localStorage.getItem('haerms_user');
    return raw ? JSON.parse(raw) : null;
}

function saveAuth(token, user) {
    localStorage.setItem('haerms_token', token);
    localStorage.setItem('haerms_user', JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem('haerms_token');
    localStorage.removeItem('haerms_user');
}

function authHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function apiRequest(url, options = {}) {
    const res = await fetch(API + url, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}) },
    });

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    } else {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        if (!res.ok) {
            if (res.status === 404) throw new Error(`API Route not found: ${url}. Ensure server is running on port 5000.`);
            throw new Error(`Server Error (${res.status}): Expected JSON but received HTML. Check your backend server.`);
        }
        return text;
    }
}

function redirectByRole(role) {
    const routes = {
        CITIZEN: '/citizen.html',
        POLICE: '/police.html',
        AMBULANCE: '/ambulance.html',
        HOSPITAL: '/hospital.html',
        ADMIN: '/admin.html',
    };
    window.location.href = routes[role] || '/';
}

function requireAuth(allowedRoles) {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
        window.location.href = '/';
        return null;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        window.location.href = '/';
        return null;
    }
    return user;
}

function logout() {
    clearAuth();
    window.location.href = '/';
}

/* Toast notification */
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/* Format date */
function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* Status badge */
function statusBadge(status) {
    const map = {
        NEW: 'badge-new',
        ASSIGNED: 'badge-assigned',
        IN_PROGRESS: 'badge-in-progress',
        PATIENT_ADMITTED: 'badge-admitted',
        CLOSED: 'badge-closed',
        AVAILABLE: 'badge-available',
        BUSY: 'badge-busy',
        OFFLINE: 'badge-offline',
    };
    return `<span class="badge ${map[status] || 'badge-new'}">${status.replace('_', ' ')}</span>`;
}
