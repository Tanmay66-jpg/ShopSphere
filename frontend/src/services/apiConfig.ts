/**
 * ShopSphere API Configuration.
 * 
 * Dynamically resolves the backend base URL for both production
 * (Vercel frontend -> Render backend) and local development (Vite proxy).
 *
 * Rules:
 * 1. If VITE_API_URL or VITE_API_BASE_URL starts with http:// or https://, use that backend.
 * 2. If running in a browser on localhost / 127.0.0.1, use '/api' to leverage Vite's local dev proxy.
 * 3. In production (on Vercel or any remote domain), ALWAYS use the live Render backend URL:
 *    https://shopsphere-jt5n.onrender.com/api
 */

export function resolveApiBaseUrl(): string {
  const envUrl = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  ).trim();

  // If explicitly configured with an absolute URL (http:// or https://)
  if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
    const cleaned = envUrl.replace(/\/+$/, '');
    return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
  }

  // Detect whether we are running on localhost in browser
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  // In local development on localhost, use Vite's relative /api proxy
  if (isLocalhost) {
    return '/api';
  }

  // Production default: verified Render backend endpoint
  return 'https://shopsphere-jt5n.onrender.com/api';
}

export const API_BASE_URL = resolveApiBaseUrl();
export const ADSA_API_BASE_URL = `${API_BASE_URL}/adsa`;
