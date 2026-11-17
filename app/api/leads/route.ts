import {NextResponse} from 'next/server';
import {sameOrigin} from '@/lib/auth';
import {readAttributionCookie} from '@/lib/attribution-server';
import {deliverSiteLead} from '@/lib/voronka';

const SUBMISSION_ID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Нет доступа'},{status:403});
 if(Number(req.headers.get('content-length')||0)>12000)return NextResponse.json({error:'Слишком большой запрос'},{status:413});
 let body:unknown;
 try{body=await req.json();}catch{return NextResponse.json({error:'Некорректный JSON'},{status:400});}
 const record=typeof body==='object'&&body?body as Record<string,unknown>:{};
 const name=typeof record.name==='string'?record.name.trim().slice(0,200):'';
 const email=typeof record.email==='string'?record.email.trim().slice(0,250).toLowerCase():'';
 const message=typeof record.message==='string'?record.message.trim().slice(0,8000):'';
 const consent=record.consent===true;
 const adsConsent=record.ads_consent===true||record.adsConsent===true;
 const submissionId=typeof record.submission_id==='string'&&SUBMISSION_ID.test(record.submission_id)?record.submission_id:undefined;
 if(!name||!email||!message)return NextResponse.json({error:'Заполните имя, email и сообщение'},{status:422});
 if(!EMAIL.test(email))return NextResponse.json({error:'Укажите корректный email'},{status:422});
 if(!consent)return NextResponse.json({error:'Нужно согласие на обработку данных'},{status:422});
 const cookie=await readAttributionCookie();
 const landingPath=cookie?.landing_path;
 const utm=cookie?{
  ...(cookie.utm_source?{utm_source:cookie.utm_source}:{}),
  ...(cookie.utm_medium?{utm_medium:cookie.utm_medium}:{}),
  ...(cookie.utm_campaign?{utm_campaign:cookie.utm_campaign}:{}),
  ...(cookie.utm_content?{utm_content:cookie.utm_content}:{}),
  ...(cookie.utm_term?{utm_term:cookie.utm_term}:{}),
 }:null;
 const utmClean=utm&&Object.keys(utm).length?utm:null;
 const result=await deliverSiteLead({name,email,message,consent,adsConsent,utm:utmClean,landingPath,submissionId});
 if(!result.ok)return NextResponse.json({error:'Не удалось передать заявку. Попробуйте позже или напишите на почту.',lead_id:result.leadId},{status:502});
 return NextResponse.json({ok:true,lead_id:result.leadId,voronka:result.voronka});
}