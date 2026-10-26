/**
 * Which app and build is talking to the API. Sent as X-Platform / X-App-Version on every request
 * so the backend error log shows where a failure came from. CI can set VITE_APP_VERSION (e.g. a git sha).
 */
export const APP_PLATFORM = 'vendor-web';
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION || __APP_VERSION__;
