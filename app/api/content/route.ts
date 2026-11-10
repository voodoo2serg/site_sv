import { NextResponse } from 'next/server';
import { readContent,saveContent } from '@/lib/content';
import {isEditor,sameOrigin} from '@/lib/auth';
export const dynamic='force-dynamic';
const opts={headers:{'Cache-Control':'private, no-store'}};
export async function GET(){if(!await isEditor())return NextResponse.json({error:'Нет доступа'},{status:401,...opts});return NextResponse.json(await readContent(),opts);}
export async function PUT(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Недопустимый источник запроса'},{status:403,...opts});
 if(!await isEditor())return NextResponse.json({error:'Войдите в редактор'},{status:401,...opts});
 if(Number(req.headers.get('content-length')||0)>300000)return NextResponse.json({error:'Слишком большой документ'},{status:413,...opts});
 try{const text=await req.text();if(text.length>300000)throw Error('Слишком большой документ');const {content,version}=JSON.parse(text);if(!Number.isInteger(version)||version<1)throw Error('Неверная версия');return NextResponse.json(await saveContent(content,version),opts);}
 catch(e){const msg=e instanceof Error?e.message:'Не удалось сохранить';return NextResponse.json({error:msg==='CONFLICT'?'Страница изменилась в другой вкладке. Сохраните свою копию и перезагрузите редактор.':msg},{status:msg==='CONFLICT'?409:400,...opts});}
}
