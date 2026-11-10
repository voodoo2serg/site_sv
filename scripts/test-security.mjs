import {build} from 'esbuild';
import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=await mkdtemp(join(process.cwd(),'.security-test-'));
try{
 const source=`import assert from 'node:assert/strict';
import {cleanRich,validateContent,defaults,saveContent,readContent} from './lib/content';
import {isEditor,sameOrigin,issueSession} from './lib/auth';
import {applyEditorialUpdate} from './lib/editorial';
const memory=new Map();let revision=0;
globalThis.testEnv={BUCKET:{async get(key){const item=memory.get(key);return item?{etag:item.etag,json:async()=>JSON.parse(item.value)}:null},async put(key,value,options){const current=memory.get(key);const cond=options?.onlyIf;if(cond?.etagMatches&&cond.etagMatches!==current?.etag)return null;if(cond?.etagDoesNotMatch==='*'&&current)return null;const item={etag:String(++revision),value};memory.set(key,item);return item;}},OWNER_PRIVATE_EDITOR:'true'};
globalThis.testHeaders=new Headers();globalThis.testCookies=new Map();
process.env.NODE_ENV='production';
assert.equal(await isEditor(true),false,'anonymous cannot claim editor');
globalThis.testHeaders.set('oai-authenticated-user-id','owner-test');
assert.equal(await isEditor(false),false,'unclaimed identity is not editor');
assert.equal(await isEditor(true),true,'owner-private bootstrap pins owner');
globalThis.testHeaders.set('oai-authenticated-user-id','other-test');
assert.equal(await isEditor(true),false,'another signed-in visitor cannot edit or take ownership');
globalThis.testHeaders.set('oai-authenticated-user-id','owner-test');
assert.equal(await isEditor(),true);
assert.equal(sameOrigin(new Request('https://example.test/api/content',{headers:{Origin:'https://attacker.test'}})),false);
assert.equal(sameOrigin(new Request('https://example.test/api/content')),false);
assert.equal(sameOrigin(new Request('https://example.test/api/content',{headers:{Origin:'https://example.test'}})),true);
const dirty=structuredClone(defaults);dirty.pages.pr.intro='<p onclick="alert(1)">Safe <strong>bold</strong><script>alert(1)</script><a href="javascript:alert(1)">link</a><img src=x onerror=alert(1)></p>';
const cleaned=validateContent(dirty);assert.ok(cleaned.pages.pr.intro.includes('<strong>bold</strong>'));assert.ok(!/script|onclick|onerror|<img|javascript:/.test(cleaned.pages.pr.intro));
const bad=structuredClone(defaults);bad.pages.pr.links[0].url='javascript:alert(1)';assert.throws(()=>validateContent(bad));
const wrong=structuredClone(defaults);wrong.pages.pr.brands.pop();assert.throws(()=>validateContent(wrong));
const next=await saveContent(dirty,1);assert.equal(next.version,2);assert.equal((await readContent()).pages.pr.intro,cleaned.pages.pr.intro);await assert.rejects(()=>saveContent(defaults,1),/CONFLICT/);
await Promise.allSettled([saveContent(defaults,2),saveContent(defaults,2)]).then(r=>{assert.equal(r.filter(x=>x.status==='fulfilled').length,1,'R2 compare-and-swap prevents lost updates');});
globalThis.testEnv.EDITOR_PASSWORD='a-test-only-long-password-12345';
assert.equal(await issueSession('incorrect'),null);const token=await issueSession(globalThis.testEnv.EDITOR_PASSWORD);assert.ok(token);globalThis.testHeaders=new Headers();globalThis.testCookies.set('editor_session',{value:token});assert.equal(await isEditor(),true);globalThis.testCookies.set('editor_session',{value:token+'tampered'});assert.equal(await isEditor(),false);
const oldContent=structuredClone(defaults);delete oldContent.contentRevision;oldContent.pages.pr.intro='<p>Old</p>';oldContent.home.intro='<p>Keep my own edit</p>';const upgraded=applyEditorialUpdate(oldContent);assert.ok(upgraded.pages.pr.intro.includes('идеологию самостоятельного бизнеса'));assert.equal(upgraded.home.intro,'<p>Keep my own edit</p>');upgraded.pages.pr.intro='<p>Later edit</p>';assert.equal(applyEditorialUpdate(upgraded).pages.pr.intro,'<p>Later edit</p>');
const diskFs=await import('node:fs/promises');const diskPath=await diskFs.mkdtemp('/tmp/site-sv-disk-');
try{globalThis.testEnv={};process.env.CONTENT_DIRECTORY=diskPath;assert.equal((await readContent()).version,1);await saveContent(defaults,1);assert.equal((await readContent()).version,2);const results=await Promise.allSettled([saveContent(defaults,2),saveContent(defaults,2)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);await diskFs.writeFile(diskPath+'/content.json','invalid json');await assert.rejects(()=>readContent());}finally{delete process.env.CONTENT_DIRECTORY;await diskFs.rm(diskPath,{recursive:true,force:true});}
console.log('PASS: editor ownership, anonymous access, CSRF, sanitization, schema, durable storage, version conflicts, sessions.');`;
 await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'security-test.ts',loader:'ts'},bundle:true,platform:'node',format:'esm',outfile:join(dir,'test.mjs'),packages:'external',plugins:[{name:'test-boundaries',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'mock'}));b.onResolve({filter:/^next\/headers$/},()=>({path:'headers',namespace:'mock'}));b.onResolve({filter:/^@opennextjs\/cloudflare$/},()=>({path:'context',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='empty'?'':args.path==='headers'?'export async function headers(){return globalThis.testHeaders;} export async function cookies(){return {get:key=>globalThis.testCookies.get(key)}}':'export function getCloudflareContext(){return {env:globalThis.testEnv}}',loader:'js'}));}}]});
 // Locate project dependencies from the temporary bundle.
 const {spawnSync}=await import('node:child_process');
 const result=spawnSync(process.execPath,['--experimental-import-meta-resolve',join(dir,'test.mjs')],{stdio:'inherit',env:{...process.env,NODE_PATH:join(process.cwd(),'node_modules')}});if(result.status)process.exitCode=result.status;
}finally{await rm(dir,{recursive:true,force:true});}
