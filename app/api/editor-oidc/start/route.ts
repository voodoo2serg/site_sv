import {NextResponse} from 'next/server';
import {beginEditorOidc} from '@/lib/editor-oidc';
export const dynamic='force-dynamic';
export async function GET(req:Request){
  try{
    const {url,sealed}=await beginEditorOidc();
    const response=NextResponse.redirect(url,302);
    response.cookies.set('editor_oidc_state',sealed,{httpOnly:true,secure:true,sameSite:'lax',maxAge:600,path:'/api/editor-oidc'});
    response.headers.set('Cache-Control','no-store');
    return response;
  }catch{
    return NextResponse.json({error:'Единый вход редактора пока не настроен'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
