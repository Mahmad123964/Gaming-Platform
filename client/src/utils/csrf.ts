/**
 * Reads the client-readable anti-CSRF token from the `nexusplay_csrf` cookie.
 * This token is submitted in the `X-CSRF-Token` header for state-changing requests,
 * completing the double-submit cookie pattern against cross-site request forgery.
 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )nexusplay_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}
