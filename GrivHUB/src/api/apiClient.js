import axios from 'axios';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

// Base Axios instance configured for GrievanceHUB REST Backend
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
});

// Request interceptor: attach CSRF token and session context
apiClient.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken && !config.headers['X-CSRFToken']) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Preserve response data for granular error inspection (e.g. requires_verification)
    const data = error.response?.data;
    let message = 'Backend communication error';
    if (typeof data === 'string') {
      message = data;
    } else if (data?.error) {
      message = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    } else if (data?.message) {
      message = data.message;
    } else if (data && typeof data === 'object') {
      // Pick first validation error message if dictionary
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const val = data[firstKey];
        message = Array.isArray(val) ? `${firstKey}: ${val.join(', ')}` : `${firstKey}: ${val}`;
      }
    } else if (error.message) {
      message = error.message;
    }

    const customErr = new Error(message);
    customErr.status = error.response?.status;
    customErr.response = error.response;
    customErr.data = data;
    return Promise.reject(customErr);
  }
);

export default apiClient;
