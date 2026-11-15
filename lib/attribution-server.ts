import 'server-only';
import {cookies} from 'next/headers';
import {UTM_COOKIE,parseAttributionCookie,type AttributionCookie} from './utm';

const MAX_AGE=90*24*60*60;

export function cookieOptions(){
 return {
  httpOnly:true,
  secure:process.env.NODE_ENV==='production',
  sameSite:'lax' as const,
  maxAge:MAX_AGE,
  path:'/',
 };
}

export async function readAttributionCookie():Promise<AttributionCookie|null>{
 const raw=(await cookies()).get(UTM_COOKIE)?.value;
 if(!raw)return null;
 try{return parseAttributionCookie(JSON.parse(decodeURIComponent(raw)));}catch{return null;}
}
