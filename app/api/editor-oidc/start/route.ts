import {NextResponse} from 'next/server';
import {beginEditorOidc} from '@/lib/editor-oidc';
import {setEditorOidcStateCookie} from '@/lib/editor-oidc-cookies';
import {sameOrigin} from '@/lib/auth';
import {SITE_URL} from '@/lib/content';

export const dynamic = 'force-dynamic';

async function startOidc(req: Request) {
  try {
    const {url, sealed} = await beginEditorOidc();
    const response = NextResponse.redirect(url, 302);
    setEditorOidcStateCookie(response, sealed);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  } catch {
    const accept = req.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      return NextResponse.redirect(new URL('/edit/?error=sso_config', SITE_URL), 303);
    }
    return NextResponse.json(
      {error: 'Единый вход редактора пока не настроен'},
      {status: 503, headers: {'Cache-Control': 'no-store'}},
    );
  }
}

/** Prefer POST from the login form — GET is kept for curl smoke but is prefetch-prone. */
export async function POST(req: Request) {
  if (!sameOrigin(req) && req.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({error: 'Недопустимый источник запроса'}, {status: 403});
  }
  return startOidc(req);
}

export async function GET(req: Request) {
  return startOidc(req);
}
