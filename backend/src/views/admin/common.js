const API_BASE = '/admin/api';

// Get token from localStorage (for API calls)
function getToken() {
    return localStorage.getItem('adminToken');
}

const token = getToken();

// Check if we have a token, if not redirect to login
if (!token) {
    // Check if cookie exists (set by server)
    // If no token in localStorage, redirect to login
    window.location.href = '/admin/login';
}

async function fetchWithAuth(url, options = {}) {
    const currentToken = getToken();
    const response = await fetch(url, {
        ...options,
        credentials: 'include', // Include cookies for server-side auth
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
            ...options.headers
        }
    });

    if (response.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
        return null;
    }

    return response.json();
}

async function logout() {
    // Clear localStorage
    localStorage.removeItem('adminToken');
    
    // Call logout endpoint to clear server cookie
    try {
        await fetch('/admin/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    // Redirect to login
    window.location.href = '/admin/login';
}
