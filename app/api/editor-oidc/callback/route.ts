import {NextRequest,NextResponse} from 'next/server';
import {completeEditorOidc} from '@/lib/editor-oidc';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
  const code=req.nextUrl.searchParams.get('code')||'';
  const state=req.nextUrl.searchParams.get('state')||'';
  const sealed=req.cookies.get('editor_oidc_state')?.value||'';
  if(!code||!state||!sealed)return NextResponse.json({error:'Неверный запрос входа'},{status:401});
  try{
    const session=await completeEditorOidc(code,state,sealed);
    const response=NextResponse.redirect(new URL('/edit/',req.url),303);
    response.cookies.set('editor_oidc_session',session,{httpOnly:true,secure:true,sameSite:'lax',maxAge:8*3600,path:'/'});
    response.cookies.delete('editor_oidc_state');
    response.headers.set('Cache-Control','no-store');
    return response;
  }catch{
    const response=NextResponse.json({error:'Вход не подтверждён или нет доступа к редактору'},{status:403});
    response.cookies.delete('editor_oidc_state');
    response.headers.set('Cache-Control','no-store');
    return response;
  }
}
