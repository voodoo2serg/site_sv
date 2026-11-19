import {NextResponse} from 'next/server';
import {issueSession,sameOrigin} from '@/lib/auth';
import {
  auditEditor,
  editorOidcBreakGlass,
  editorOidcCutover,
  localEditorPasswordAllowed,
} from '@/lib/editor-oidc';

export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Нет доступа'},{status:403});
 if(Number(req.headers.get('content-length')||0)>2000)return NextResponse.json({error:'Нет доступа'},{status:413});
 if(!localEditorPasswordAllowed()){
  auditEditor('editor.password.denied_cutover', {cutover:true});
  return NextResponse.json(
    {error:'После перехода на единый вход используйте SIGNAL / Keycloak. Локальный пароль отключён.'},
    {status:403},
  );
 }
 const {password}=await req.json();
 const token=typeof password==='string'&&password.length<=256?await issueSession(password):null;
 if(!token){
  auditEditor('editor.password.failed', {cutover:editorOidcCutover()});
  return NextResponse.json({error:'Неверный пароль или вход по паролю не настроен'},{status:401});
 }
 if(editorOidcBreakGlass()){
  auditEditor('editor.password.break_glass', {cutover:true});
 }
 const response=NextResponse.json({
  ok:true,
  mode:editorOidcBreakGlass()?'break-glass-audited':editorOidcCutover()?'unexpected':'local',
 });
 response.cookies.set('editor_session',token,{
  httpOnly:true,
  secure:process.env.NODE_ENV==='production',
  sameSite:'strict',
  maxAge:8*60*60,
  path:'/',
 });
 return response;
}
