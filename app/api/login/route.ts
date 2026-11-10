import {NextResponse} from 'next/server';
import {issueSession,sameOrigin} from '@/lib/auth';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Нет доступа'},{status:403});
 if(Number(req.headers.get('content-length')||0)>2000)return NextResponse.json({error:'Нет доступа'},{status:413});
 const {password}=await req.json();const token=typeof password==='string'&&password.length<=256?await issueSession(password):null;
 if(!token)return NextResponse.json({error:'Неверный пароль или вход по паролю не настроен'},{status:401});
 const response=NextResponse.json({ok:true});response.cookies.set('editor_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:8*60*60,path:'/'});return response;
}
