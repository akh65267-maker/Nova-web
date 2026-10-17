import axios from "axios";

type Hooks = { getToken?: () => string | null; onUnauthorized: () => void };

let hooks: Hooks | null = null;

/** The one HTTP client every API function in this package uses. */
export const apiClient = axios.create();

/**
 * For an app's own session routes (/api/session, /api/auth/*), which sit beside its API proxy, not
 * behind it. Same origin, so the browser sends the session cookies by itself. No 401 hook: a 401
 * from signing in means a wrong password, not an ended session.
 */
export const sessionClient = axios.create({ baseURL: "/api" });

/**
 * Wire the client to an app. Call it once at startup, before the first request. The package does
 * not know where the gateway is, where the token is kept or what to do when it is rejected; each
 * app says so here (the shop clears its session and cache on a 401).
 */
export function configureApi(options: { baseURL: string } & Hooks) {
  // getToken is for apps that keep a token in the page. An app whose session lives in HttpOnly
  // cookies leaves it out: its proxy adds the token on the server.
  apiClient.defaults.baseURL = options.baseURL;
  hooks = { getToken: options.getToken, onUnauthorized: options.onUnauthorized };
}

apiClient.interceptors.request.use((config) => {
  if (!hooks) throw new Error("configureApi() must be called before the first API request.");

  const token = hooks.getToken?.();
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
