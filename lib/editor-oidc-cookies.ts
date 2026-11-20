import 'server-only';
import type {NextResponse} from 'next/server';

/** PKCE state must be first-party on any path (IdP returns to /callback without slash). */
export const EDITOR_OIDC_STATE_COOKIE = 'editor_oidc_state';
export const EDITOR_OIDC_SESSION_COOKIE = 'editor_oidc_session';

/** Legacy Path=/api/editor-oidc from AUTH-208 — clear on every write so browsers do not keep a stale copy. */
const LEGACY_STATE_PATH = '/api/editor-oidc';

function appendSetCookie(response: NextResponse, value: string) {
  // NextResponse.cookies.set de-dupes by name; Path=/ and Path=/api/… need two headers.
  response.headers.append('Set-Cookie', value);
}

function stateCookie(value: string, path: string, maxAge: number) {
  const parts = [
    `${EDITOR_OIDC_STATE_COOKIE}=${value}`,
    `Path=${path}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ];
  if (maxAge <= 0) {
    parts.push('Max-Age=0');
    parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  } else {
    parts.push(`Max-Age=${maxAge}`);
  }
  return parts.join('; ');
}

export function setEditorOidcStateCookie(response: NextResponse, sealed: string, maxAge = 600) {
  appendSetCookie(response, stateCookie('', LEGACY_STATE_PATH, 0));
  appendSetCookie(response, stateCookie(sealed, '/', maxAge));
}

export function clearEditorOidcStateCookie(response: NextResponse) {
  appendSetCookie(response, stateCookie('', '/', 0));
  appendSetCookie(response, stateCookie('', LEGACY_STATE_PATH, 0));
}

export function setEditorOidcSessionCookie(response: NextResponse, session: string) {
  response.cookies.set(EDITOR_OIDC_SESSION_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 8 * 3600,
    path: '/',
  });
}

export function clearEditorOidcSessionCookie(response: NextResponse) {
  response.cookies.set(EDITOR_OIDC_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}
