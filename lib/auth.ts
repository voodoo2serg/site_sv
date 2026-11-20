import 'server-only';
import {
  editorOidcCutover,
  editorOidcEnabled,
  localEditorPasswordAllowed,
  validEditorOidcSession,
} from './editor-oidc';
import {headers,cookies} from 'next/headers';
import {runtime,SITE_URL} from './content';
const enc=new TextEncoder();
async function secret(){const env=await runtime();return env.EDITOR_PASSWORD||process.env.EDITOR_PASSWORD;}
async function sign(payload:string,key:string){const cryptoKey=await crypto.subtle.importKey('raw',enc.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Buffer.from(await crypto.subtle.sign('HMAC',cryptoKey,enc.encode(payload))).toString('base64url');}
export async function issueSession(password:string){
  if(!localEditorPasswordAllowed())return null;
  const key=await secret();if(!key||key.length<24)return null;const a=await sign(password,key),b=await sign(key,key);if(a!==b)return null;const expiry=String(Date.now()+8*60*60*1000);return expiry+'.'+await sign(expiry,key);
}
async function sitesOwnerId(){
 const h=await headers();const env=await runtime();const id=h.get('oai-authenticated-user-id');
 if(!env.BUCKET||!id)return null;
 return id;
}
export async function isEditor(claim=false){
 if(await validEditorOidcSession((await cookies()).get('editor_oidc_session')?.value))return true;
 const h=await headers();const env=await runtime();const id=h.get('oai-authenticated-user-id');
 if(process.env.NODE_ENV==='development'&&process.env.EDITOR_PREVIEW==='true'&&/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(h.get('host')||''))return true;
 if(env.BUCKET&&id){
  const owner=await env.BUCKET.get('site/owner.json');
  if(owner)return (await owner.json()).id===id;
  if(claim&&env.OWNER_PRIVATE_EDITOR==='true'){
   const saved=await env.BUCKET.put('site/owner.json',JSON.stringify({id}),{onlyIf:{etagDoesNotMatch:'*'}});
   if(saved)return true;
   const winner=await env.BUCKET.get('site/owner.json');return !!winner&&(await winner.json()).id===id;
  }
 }
 // After OIDC cutover, legacy editor_session cookies are not a silent bypass.
 if(!localEditorPasswordAllowed())return false;
 const key=await secret();if(!key||key.length<24)return false;
 const token=(await cookies()).get('editor_session')?.value;if(!token)return false;
 const [expiry,sig]=token.split('.');return Number(expiry)>Date.now()&&sig===await sign(expiry,key);
}
/**
 * Logout control for the editor chrome (Codex P2).
 * Sites auth is header-based — cookie-only logout is a no-op; use platform sign-out.
 */
export async function editorLogoutLink(): Promise<{href:string;target?:'_top'}|null>{
 if(editorOidcEnabled()||await validEditorOidcSession((await cookies()).get('editor_oidc_session')?.value)){
  return {href:'/api/editor-oidc/logout/'};
 }
 if(await sitesOwnerId()){
  return {href:'/signout',target:'_top'};
 }
 if((await cookies()).get('editor_session')?.value){
  return {href:'/api/editor-oidc/logout/'};
 }
 return null;
}
export function sameOrigin(req:Request){
 const raw=req.headers.get('origin');if(!raw)return false;
 try{const origin=new URL(raw);if(origin.origin===SITE_URL||origin.origin===new URL(req.url).origin)return true;
 if(origin.host===req.headers.get('host')&&['http:','https:'].includes(origin.protocol))return true;
 return process.env.NODE_ENV==='development'&&origin.protocol==='http:'&&['127.0.0.1','localhost'].includes(origin.hostname);
 }catch{return false;}
}
export {editorOidcCutover,localEditorPasswordAllowed};
