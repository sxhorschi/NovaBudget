import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Auth token interceptor — attaches Bearer token to every request
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'capex-planner:auth-token';

export function setAuthToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
