import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AUTH_ENDPOINTS } from '../constants/api';
import { tokenStorage } from '../utils/tokenStorage';

// ───────────────────────────────────────────
// Base axios instance
// ───────────────────────────────────────────
export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20 seconds
});

// Yeh endpoints token ke saath nahi jaane chahiye —
// login/register/refresh se pehle koi valid token hota hi nahi,
// aur agar storage mein purana/blacklisted token pada ho to
// yeh in requests ko galat tarah reject kara sakta hai.
const NO_AUTH_HEADER_ENDPOINTS = [
  AUTH_ENDPOINTS.login,
  AUTH_ENDPOINTS.register,
  AUTH_ENDPOINTS.refreshToken,
];

// ───────────────────────────────────────────
// Request Interceptor — har request mein token attach karo
// (auth endpoints ko skip karke)
// ───────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const isAuthEndpoint = NO_AUTH_HEADER_ENDPOINTS.some((endpoint) =>
      config.url?.includes(endpoint)
    );

    if (!isAuthEndpoint) {
      const accessToken = await tokenStorage.getAccessToken();
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ───────────────────────────────────────────
// Response Interceptor — agar 401 aaye to token refresh karo
// ───────────────────────────────────────────

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token as string);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthEndpoint = NO_AUTH_HEADER_ENDPOINTS.some((endpoint) =>
      originalRequest.url?.includes(endpoint)
    );

    // Auth endpoints (login/register/refresh) ke 401 ko refresh-flow
    // trigger nahi karna chahiye — unka asal error seedha aage jaane do,
    // taake login.tsx mein EMAIL_NOT_VERIFIED jaisa detail check ho sake.
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(AUTH_ENDPOINTS.refreshToken, {
          refresh: refreshToken,
        });

        const newAccessToken = data.access;
        await tokenStorage.setAccessToken(newAccessToken);

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await tokenStorage.clearTokens();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;