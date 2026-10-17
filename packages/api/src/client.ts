import axios from "axios";

type Hooks = { onUnauthorized: () => void };

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
 * not know where the apps' API proxy is or what a 401 means; each app says so here (it forgets its
 * session and clears its cache). There is no token to configure: it lives in HttpOnly cookies and
 * the app's own server adds it on the way to the gateway.
 */
export function configureApi(options: { baseURL: string } & Hooks) {
  apiClient.defaults.baseURL = options.baseURL;
  hooks = { onUnauthorized: options.onUnauthorized };
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      hooks?.onUnauthorized();
    }
    return Promise.reject(error);
  },
);
