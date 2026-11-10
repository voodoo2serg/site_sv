import patch from '@/data/editorial-update.json';
import latest from '@/data/editorial-update-3.json';
// A one-time content migration also covers documents already saved in the browser editor.
// Once saved with this revision, subsequent user edits are left untouched.
export function applyEditorialUpdate<T>(input:T):T {
 const original=input as any;
 if((original.contentRevision||1)>=latest.revision)return input;
 const content=structuredClone(input) as any;
 if((original.contentRevision||1)<patch.revision){
 for(const [path,value] of Object.entries(patch.fields)){
  const keys=path.split('.');let node=content;
  for(const key of keys.slice(0,-1))node=node[key];
  node[keys.at(-1)!]=value;
 }
 let body=content.about.body;
 for(const [from,to] of Object.entries(patch.aboutReplacements)){if(!body.includes(to))body=body.replace(from,to);}
 body=body.replace(/<h2>Как я работаю<\/h2>[\s\S]*?(?=<h2>|$)/,()=>patch.interests);
 body=body.replace(/<h2>Жизненные интересы<\/h2>[\s\S]*?(?=<h2>|$)/,()=>patch.water);
 content.about.body=body;content.contentRevision=patch.revision;
 }
 for(const [path,value] of Object.entries(latest.fields)){const keys=path.split('.');let node=content;for(const key of keys.slice(0,-1))node=node[key];node[keys.at(-1)!]=value;}
 content.contentRevision=latest.revision;
 content.updatedAt='2026-11-10T18:30:00.000Z';
 return content;
}
