import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});


client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-reload on 401 — let AuthContext handle re-authentication
    return Promise.reject(error);
  }
);

export default client;
