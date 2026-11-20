import {NextResponse} from 'next/server';
import {auditEditor, editorOidcEndSessionUrl, editorOidcEnabled} from '@/lib/editor-oidc';
import {
  clearEditorOidcSessionCookie,
  clearEditorOidcStateCookie,
} from '@/lib/editor-oidc-cookies';
import {SITE_URL} from '@/lib/content';

export const dynamic = 'force-dynamic';

function clear(response: NextResponse) {
  clearEditorOidcSessionCookie(response);
  clearEditorOidcStateCookie(response);
  response.cookies.set('editor_session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}

/** Confirmed logout: drop local editor cookies, then Keycloak end-session when SSO is on. */
export async function GET() {
  if (!editorOidcEnabled()) {
    const response = NextResponse.redirect(new URL('/edit/', SITE_URL), 303);
    clear(response);
    return response;
  }
  const postLogout = new URL('/edit/', SITE_URL).toString();
  const end = editorOidcEndSessionUrl(postLogout);
  auditEditor('editor.oidc.logout', {idp: Boolean(end)});
  const response = NextResponse.redirect(end || postLogout, 303);
  clear(response);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
