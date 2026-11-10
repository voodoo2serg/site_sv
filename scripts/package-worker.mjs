import {cp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});
await cp('.open-next','dist/server',{recursive:true,dereference:true});
await cp('.open-next/assets','dist/client',{recursive:true});
await rm('dist/server/assets',{recursive:true,force:true});
await writeFile('dist/server/index.js',"import { createRequire } from 'node:module';\nimport worker from './worker.js';\nimport process from 'node:process';\nprocess.env.NODE_ENV = 'production';\nglobalThis.require ??= createRequire('file:///index.js');\nexport default worker;\n");
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'sergey-vodopetov',main:'index.js',compatibility_date:'2026-11-01',compatibility_flags:['nodejs_compat'],assets:{directory:'../client',binding:'ASSETS'},r2_buckets:[{binding:'BUCKET',bucket_name:'vodopetov-content'}],vars:{OWNER_PRIVATE_EDITOR:'true'}},null,2));
console.log('Next.js Worker and assets packaged.');
