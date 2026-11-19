import {NextResponse} from 'next/server';
import {sameOrigin} from '@/lib/auth';
import {auditEditor,editorOidcEndSessionUrl} from '@/lib/editor-oidc';
import {SITE_URL} from '@/lib/content';

function clearEditorCookies(response:NextResponse){
 response.cookies.set('editor_session','',{httpOnly:true,secure:true,sameSite:'strict',maxAge:0,path:'/'});
 response.cookies.set('editor_oidc_session','',{httpOnly:true,secure:true,sameSite:'lax',maxAge:0,path:'/'});
 response.cookies.set('editor_oidc_state','',{httpOnly:true,secure:true,sameSite:'lax',maxAge:0,path:'/api/editor-oidc'});
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
