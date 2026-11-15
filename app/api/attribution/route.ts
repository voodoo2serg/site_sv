import {NextResponse} from 'next/server';
import {mergeAttribution,parseUtmFromSearch,parseUtmRecord,UTM_COOKIE} from '@/lib/utm';
import {cookieOptions,readAttributionCookie} from '@/lib/attribution-server';

function utmFromRecord(record:Record<string,unknown>){
 const params=new URLSearchParams();
 for(const [key,value] of Object.entries(record)){
  if(key.startsWith('utm_')&&typeof value==='string')params.set(key,value);
 }
 return {...parseUtmFromSearch(params),...parseUtmRecord(record.utm)||{},...parseUtmRecord(record)||{}};
}

export async function GET(req:Request){
 const url=new URL(req.url);
 const incoming=parseUtmFromSearch(url.searchParams);
 if(!Object.keys(incoming).length){
  const stored=await readAttributionCookie();
  return NextResponse.json({ok:true,utm:stored});
 }
 const stored=await readAttributionCookie();
 const merged=mergeAttribution(stored,incoming)||incoming;
 const response=NextResponse.json({ok:true,utm:merged});
 response.cookies.set(UTM_COOKIE,encodeURIComponent(JSON.stringify({
  ...merged,
  captured_at:new Date().toISOString(),
  landing_path:(url.searchParams.get('path')||'/').slice(0,300),
 })),cookieOptions());
 return response;
}

export async function POST(req:Request){
 if(Number(req.headers.get('content-length')||0)>4000)return NextResponse.json({error:'Слишком большой запрос'},{status:413});
 let body:unknown;
 try{body=await req.json();}catch{return NextResponse.json({error:'Некорректный JSON'},{status:400});}
 const record=typeof body==='object'&&body?body as Record<string,unknown>:{};
 const incoming=utmFromRecord(record);
 if(!Object.keys(incoming).length)return NextResponse.json({ok:true,skipped:true});
 const stored=await readAttributionCookie();
 const merged=mergeAttribution(stored,incoming)||incoming;
 const landing=typeof record.path==='string'?record.path.slice(0,300):'/';
 const response=NextResponse.json({ok:true,utm:merged});
 response.cookies.set(UTM_COOKIE,encodeURIComponent(JSON.stringify({
  ...merged,
  captured_at:new Date().toISOString(),
  landing_path:landing,
 })),cookieOptions());
 return response;
}