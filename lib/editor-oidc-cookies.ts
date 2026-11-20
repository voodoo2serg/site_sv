import 'server-only';
import type {NextResponse} from 'next/server';

/** PKCE state must be first-party on any path (IdP returns to /callback without slash). */
export const EDITOR_OIDC_STATE_COOKIE = 'editor_oidc_state';
export const EDITOR_OIDC_SESSION_COOKIE = 'editor_oidc_session';

const STATE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};

/** Legacy Path=/api/editor-oidc from AUTH-208 — clear on every write so browsers do not keep a stale copy. */
const LEGACY_STATE_PATH = '/api/editor-oidc';

export function setEditorOidcStateCookie(response: NextResponse, sealed: string, maxAge = 600) {
  response.cookies.set(EDITOR_OIDC_STATE_COOKIE, '', {
    ...STATE_OPTS,
    path: LEGACY_STATE_PATH,
    maxAge: 0,
  });
  response.cookies.set(EDITOR_OIDC_STATE_COOKIE, sealed, {
    ...STATE_OPTS,
    maxAge,
  });
}

export function clearEditorOidcStateCookie(response: NextResponse) {
  response.cookies.set(EDITOR_OIDC_STATE_COOKIE, '', {...STATE_OPTS, maxAge: 0});
  response.cookies.set(EDITOR_OIDC_STATE_COOKIE, '', {
    ...STATE_OPTS,
    path: LEGACY_STATE_PATH,
    maxAge: 0,
  });
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
