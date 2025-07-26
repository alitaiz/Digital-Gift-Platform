// --- CONFIGURATION ---
// IMPORTANT: This is the production URL for your Cloudflare Worker.
// You get this URL after running `wrangler deploy` in the `worker/` directory.
const PROD_API_URL = 'https://digital-gifts-api.beetle142.workers.dev';

// In development (`npm run dev`), we use a relative path so that the Vite
// dev server can proxy requests. In production, we use the absolute URL.
export const API_BASE_URL = import.meta.env.DEV ? '' : PROD_API_URL;
