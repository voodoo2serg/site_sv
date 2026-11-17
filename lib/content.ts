import 'server-only';
import defaults from '@/data/content.json';
import {applyEditorialUpdate} from './editorial';
import sanitizeHtml from 'sanitize-html';
export type Content = typeof defaults;
export type Section = Content['pages']['pr'];
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vodopetov.ru';
export const slugs = ['pr','digital','science','interests'] as const;
export type Slug = typeof slugs[number];
export async function runtime() {
 try { const { getCloudflareContext } = await import('@opennextjs/cloudflare'); return getCloudflareContext().env as unknown as {BUCKET?:Bucket;OWNER_PRIVATE_EDITOR?:string;EDITOR_PASSWORD?:string}; } catch {return {};}
}
function diskDirectory(){return process.env.CONTENT_DIRECTORY || (process.env.NODE_ENV!=='production'?'.local-data':null);}
let diskWriteQueue:Promise<unknown>=Promise.resolve();
type Bucket = {get:(key:string)=>Promise<{json:()=>Promise<any>;etag:string}|null>;put:(key:string,value:string,options?:any)=>Promise<any>};
export async function readContent():Promise<Content> {
 const {BUCKET}=await runtime();
 if(BUCKET){const item=await BUCKET.get('site/content.json'); return item ? applyEditorialUpdate(await item.json()) : structuredClone(defaults);}
 const directory=diskDirectory();
 if(directory){
  const fs=await import('node:fs/promises');const path=await import('node:path');
  try{return applyEditorialUpdate(JSON.parse(await fs.readFile(path.join(directory,'content.json'),'utf8')));}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 }
 // Read-only default content remains available if storage is temporarily unavailable.
 return structuredClone(defaults);
}
export function cleanRich(value:string){return sanitizeHtml(value,{allowedTags:['p','br','strong','b','em','i','u','s','h2','h3','ul','ol','li','blockquote','a','sup'],allowedAttributes:{a:['href','target','rel']},allowedSchemes:['http','https','mailto'],allowProtocolRelative:false,transformTags:{a:(_,a)=>({tagName:'a',attribs:{href:a.href||'',...(a.target==='_blank'?{target:'_blank',rel:'noopener noreferrer'}:{})}})}});}
export function validateContent(input:unknown):Content {
 if(!input||typeof input!=='object')throw Error('Некорректный формат');
 const obj=input as any; const output=structuredClone(defaults) as any;
 function walk(template:any,value:any,path:string):any{
  if(typeof template==='string'){
   if(typeof value!=='string'||value.length>60000)throw Error('Проверьте поле '+path);
   if(['intro','body','theme'].includes(path.split('.').at(-1)!))return cleanRich(value);
   if(/(url|email)$/.test(path)){if(path==='email'){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Проверьте почту');} else if(value&&!/^https:\/\//.test(value))throw Error('Ссылки должны начинаться с https://');return value;}
   return value.replace(/<[^>]*>/g,'').slice(0,path.endsWith('description')?500:4000);
  }
  if(Array.isArray(template)){if(!Array.isArray(value)||value.length!==template.length)throw Error('Структура сайта должна сохраняться');return template.map((v,i)=>walk(v,value[i],path+'.'+i));}
  if(template&&typeof template==='object'){const o:any={};for(const k of Object.keys(template))o[k]=walk(template[k],value?.[k],path?path+'.'+k:k);return o;}
  return template;
 }
 const result=walk(output,obj,'') as Content;
 // Asset IDs, page structure and source IDs are controlled by the application.
 slugs.forEach(s=>result.pages[s].brands.forEach((b,i)=>{b.id=defaults.pages[s].brands[i].id;b.label=defaults.pages[s].brands[i].label;}));
 return result;
}
export async function saveContent(input:unknown,version:number){
 const content=validateContent(input); const {BUCKET}=await runtime();
 content.version=version+1;content.updatedAt=new Date().toISOString();
 if(BUCKET){
  const current=await BUCKET.get('site/content.json');const previous=current?await current.json():defaults;
  if(previous.version!==version)throw Error('CONFLICT');
  const saved=await BUCKET.put('site/content.json',JSON.stringify(content),{httpMetadata:{contentType:'application/json'},onlyIf:current?{etagMatches:current.etag}:{etagDoesNotMatch:'*'}});
  if(!saved)throw Error('CONFLICT');
  await BUCKET.put('site/previous.json',JSON.stringify(previous));
 }else if(diskDirectory()){
  const directory=diskDirectory()!;
  const operation=diskWriteQueue.then(async()=>{
   const current=await readContent();if(current.version!==version)throw Error('CONFLICT');
   const fs=await import('node:fs/promises');const path=await import('node:path');
   await fs.mkdir(directory,{recursive:true,mode:0o700});
   const temporary=path.join(directory,'content.'+crypto.randomUUID()+'.tmp');
   await fs.writeFile(path.join(directory,'previous.json'),JSON.stringify(current),{mode:0o600});
   try{await fs.writeFile(temporary,JSON.stringify(content),{mode:0o600});await fs.rename(temporary,path.join(directory,'content.json'));}
   finally{await fs.rm(temporary,{force:true});}
  });
  diskWriteQueue=operation.catch(()=>{});await operation;
 }else throw Error('Хранилище недоступно. Изменения не сохранены.');
 return content;
}
export { defaults };
