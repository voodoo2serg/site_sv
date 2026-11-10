import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {randomBytes} from 'node:crypto';
const directory=await mkdtemp(join(tmpdir(),'site-sv-vps-'));
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));
const port=probe.address().port;await new Promise(r=>probe.close(r));
const origin=`http://127.0.0.1:${port}`;const password=randomBytes(32).toString('hex');
let child;let output='';
const env={...process.env,NODE_ENV:'production',CONTENT_DIRECTORY:directory,EDITOR_PASSWORD:password,NEXT_PUBLIC_SITE_URL:origin};
async function start(){
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',v=>{output+=v;});child.stderr.on('data',v=>{output+=v;});
 for(let n=0;n<100;n++){
  if(child.exitCode!==null)throw Error('Production server exited: '+output);
  try{if((await fetch(origin+'/')).ok)return;}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 throw Error('Production server did not start: '+output);
}
async function stop(){if(child&&child.exitCode===null){const c=child;await new Promise(r=>{c.once('exit',r);c.kill('SIGTERM');});}child=null;}
try{
 await start();
 assert.equal((await fetch(origin+'/api/content/')).status,401);
 const login=await fetch(origin+'/api/login/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password})});
 assert.equal(login.status,200);const session=login.headers.get('set-cookie');assert.match(session,/HttpOnly/i);assert.match(session,/Secure/i);const cookie=session.split(';')[0];
 const headers={Origin:origin,Cookie:cookie,'Content-Type':'application/json'};
 let content=await (await fetch(origin+'/api/content/',{headers})).json();
 content.pages.pr.call='Сохранение на VPS проверено';
 const saved=await fetch(origin+'/api/content/',{method:'PUT',headers,body:JSON.stringify({content,version:content.version})});assert.equal(saved.status,200);
 assert.ok((await (await fetch(origin+'/pr/')).text()).includes(content.pages.pr.call));
 const denied=await fetch(origin+'/api/content/',{method:'PUT',headers:{...headers,Origin:'https://unrelated.example'},body:JSON.stringify({content,version:content.version})});assert.equal(denied.status,403);
 const stale=await fetch(origin+'/api/content/',{method:'PUT',headers,body:JSON.stringify({content,version:content.version})});assert.equal(stale.status,409);
 await stop();await start();
 assert.ok((await (await fetch(origin+'/pr/')).text()).includes(content.pages.pr.call));
 const persisted=JSON.parse(await readFile(join(directory,'content.json'),'utf8'));assert.equal(persisted.pages.pr.call,content.pages.pr.call);
 console.log('PASS: Node production server, password login, protected editing, disk persistence, restart, CSRF and conflicts.');
}finally{await stop();await rm(directory,{recursive:true,force:true});}
