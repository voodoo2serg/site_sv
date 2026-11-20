import {NextResponse} from 'next/server';
import {sameOrigin} from '@/lib/auth';
import {auditEditor,editorOidcEndSessionUrl} from '@/lib/editor-oidc';
import {
  clearEditorOidcSessionCookie,
  clearEditorOidcStateCookie,
} from '@/lib/editor-oidc-cookies';
import {SITE_URL} from '@/lib/content';

function clearEditorCookies(response:NextResponse){
 response.cookies.set('editor_session','',{httpOnly:true,secure:true,sameSite:'strict',maxAge:0,path:'/'});
 clearEditorOidcSessionCookie(response);
 clearEditorOidcStateCookie(response);
}

export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Нет доступа'},{status:403});
 const wantIdp = new URL(req.url).searchParams.get('idp') === '1';
 auditEditor('editor.logout', {idp: wantIdp});
 if(wantIdp){
  const end = editorOidcEndSessionUrl(new URL('/edit/', SITE_URL).toString());
  if(end){
   const response = NextResponse.json({ok:true, logoutUrl:end});
   clearEditorCookies(response);
   return response;
  }
 }
 const r=NextResponse.json({ok:true});
 clearEditorCookies(r);
 return r;
}
