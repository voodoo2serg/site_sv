import {NextResponse} from 'next/server';
import {sameOrigin} from '@/lib/auth';
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Нет доступа'},{status:403});const r=NextResponse.json({ok:true});r.cookies.delete('editor_session');return r;}
