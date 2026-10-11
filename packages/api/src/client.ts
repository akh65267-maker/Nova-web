import axios from "axios";

type Hooks = { getToken: () => string | null; onUnauthorized: () => void };

let hooks: Hooks | null = null;

/** The one HTTP client every API function in this package uses. */
export const apiClient = axios.create();

/**
 * Wire the client to an app. Call it once at startup, before the first request. The package does
 * not know where the gateway is, where the token is kept or what to do when it is rejected; each
 * app says so here (the shop clears its session and cache on a 401).
 */
export function configureApi(options: { baseURL: string } & Hooks) {
  apiClient.defaults.baseURL = options.baseURL;
  hooks = { getToken: options.getToken, onUnauthorized: options.onUnauthorized };
}

apiClient.interceptors.request.use((config) => {
  if (!hooks) throw new Error("configureApi() must be called before the first API request.");

  const token = hooks.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      hooks?.onUnauthorized();
    }
    return Promise.reject(error);
  },
);
