import {spawn} from 'node:child_process';
const args=process.argv.slice(2);let port='3000';const i=args.indexOf('--port');if(i>=0&&args[i+1])port=args[i+1];
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','0.0.0.0','--port',port],{stdio:'inherit',env:process.env});
child.on('exit',code=>process.exit(code||0));for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
