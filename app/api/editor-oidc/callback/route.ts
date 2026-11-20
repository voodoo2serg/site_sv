import {NextRequest, NextResponse} from 'next/server';
import {auditEditor, completeEditorOidc} from '@/lib/editor-oidc';
import {
  clearEditorOidcStateCookie,
  setEditorOidcSessionCookie,
} from '@/lib/editor-oidc-cookies';
import {SITE_URL} from '@/lib/content';

export const dynamic = 'force-dynamic';

function failRedirect(reason: string) {
  const url = new URL('/edit/', SITE_URL);
  url.searchParams.set('error', reason);
  const response = NextResponse.redirect(url, 303);
  clearEditorOidcStateCookie(response);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') || '';
  const state = req.nextUrl.searchParams.get('state') || '';
  const sealed = req.cookies.get('editor_oidc_state')?.value || '';
  const idpError = req.nextUrl.searchParams.get('error') || '';

  if (idpError) {
    auditEditor('editor.oidc.callback_invalid', {reason: 'idp-error'});
    return failRedirect('sso_denied');
  }

  if (!code || !state || !sealed) {
    auditEditor('editor.oidc.callback_invalid', {
      reason: !code ? 'missing-code' : !state ? 'missing-state' : 'missing-state-cookie',
    });
    return failRedirect('sso_state');
  }

  try {
    const session = await completeEditorOidc(code, state, sealed);
    const response = NextResponse.redirect(new URL('/edit/', SITE_URL), 303);
    setEditorOidcSessionCookie(response, session);
    clearEditorOidcStateCookie(response);
    // Drop any legacy password cookie so cutover cannot leave a dual session.
    response.cookies.set('editor_session', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    auditEditor('editor.oidc.callback_denied', {});
    return failRedirect('sso_denied');
  }
}
