import { fork } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { beforeAll, expect, it, vi } from "vitest";
import { isolatedOptions, runIsolatedFetch } from "./isolation";
import type { IngestionSource } from "./store";
beforeAll(async () => { await build({entryPoints:['src/lib/ingestion/child.ts'],bundle:true,platform:'node',target:'node26',format:'cjs',outfile:'dist/ingestion-child.cjs'}); });
it("does not inherit secrets, node options or proxies and denies filesystem/process access", async () => {
  const path = resolve('dist/ingestion-isolation-check.cjs');
  const options = isolatedOptions(path);
  expect(options.env).toEqual({NODE_ENV:'production'});
  const script = `const fs=require('node:fs'),cp=require('node:child_process');
    for(const run of [()=>fs.readFileSync('.env.local'),()=>fs.readFileSync('/proc/self/environ'),()=>fs.writeFileSync('/tmp/p05-forbidden','x'),()=>cp.execFileSync('true')]){
      try { run(); process.exit(2); } catch(e) { if(e.code!=='ERR_ACCESS_DENIED') process.exit(3); }
    }
    if(process.env.DATABASE_URL || process.env.NODE_OPTIONS || process.env.HTTP_PROXY)process.exit(4);
    process.send({isolated:true});process.disconnect();`;
  await writeFile(path,script);
  const result = await new Promise((resolveResult,reject) => {
    const child=fork(path,[],{...options,stdio:['ignore','ignore','ignore','ipc']});
    child.on('message',resolveResult);child.on('error',reject);child.on('exit',code=>{if(code!==0)reject(new Error(`Isolation check exited ${code}`));});
  });
  expect(result).toEqual({isolated:true});
});
it("rejects private fetches inside the real bundled child without acquiring a host slot", async () => {
  const store={acquireHost:vi.fn(async()=>null),releaseHost:vi.fn(async()=>{})};
  const source = {kind:'feed',url:'https://127.0.0.1/feed',origins:['https://127.0.0.1'],etag:null,last_modified:null,validator_url:null} as IngestionSource;
  await expect(runIsolatedFetch(source,store,new AbortController().signal)).rejects.toMatchObject({code:'unsafe_address'});
  expect(store.acquireHost).not.toHaveBeenCalled();
});
it("kills an active child on cancellation", async () => {
  const store={acquireHost:vi.fn(async()=>null),releaseHost:vi.fn(async()=>{})};
  const controller=new AbortController();
  const source={kind:'feed',url:'https://unreachable.invalid/feed',origins:['https://unreachable.invalid'],etag:null,last_modified:null,validator_url:null} as IngestionSource;
  const work=runIsolatedFetch(source,store,controller.signal);controller.abort();
  await expect(work).rejects.toMatchObject({code:'cancelled'});
});

it("drops network and filesystem privileges before successfully parsing and sanitizing a document", async () => {
  const path=resolve('dist/ingestion-parser-check.cjs');
  await build({stdin:{contents:`import {parseXml,sanitizeDisplayHtml} from './src/lib/ingestion/xml';
    process.permission.drop('net');process.permission.drop('fs.read');
    if(process.permission.has('net') || process.permission.has('fs.read'))process.exit(2);
    const document=parseXml(Buffer.from('<rss><description><![CDATA[<p onclick="x()">ok<script>bad</script></p>]]></description></rss>'));
    process.send({name:document.name,html:sanitizeDisplayHtml(document.children[0].text)});process.disconnect();`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path});
  const result=await new Promise((resolveResult,reject)=>{
    const child=fork(path,[],{...isolatedOptions(path),stdio:['ignore','ignore','ignore','ipc']});
    child.on('message',resolveResult);child.on('error',reject);child.on('exit',code=>{if(code!==0)reject(new Error(`Parser check exited ${code}`));});
  });
  expect(result).toEqual({name:'rss',html:'<p>ok</p>'});
});

it('delivers a large bounded document before disconnecting the isolated child', async()=>{
  const path=resolve('dist/ingestion-large-check.cjs');
  await build({entryPoints:['src/lib/ingestion/child.ts'],bundle:true,platform:'node',format:'cjs',outfile:path,
    plugins:[{name:'controlled-feed',setup(builder){
      builder.onResolve({filter:/^\.\/fetch$/},()=>({path:'fixture-fetch',namespace:'fixture'}));
      builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'js',contents:`
        export async function fetchDocument(){return {status:'modified',finalUrl:'https://feeds.jupiterbroadcasting.com/lup',etag:null,lastModified:null,
          body:Buffer.from('<rss>'+Array.from({length:200},()=>'<item><description>'+('x'.repeat(48000))+'</description></item>').join('')+'</rss>')};}
      `}));
    }}]});
  const result=await new Promise<{document:{children:unknown[]};bytes:number}>((resolveResult,reject)=>{
    let received=false;
    const child=fork(path,[],{...isolatedOptions(path,true),stdio:['ignore','ignore','ignore','ipc']});
    child.on('message',(message:{type:string;result:any;code?:string})=>{
      if(message.type==='result'){received=true;resolveResult(message.result);}else reject(new Error(message.code));
    });child.on('error',reject);child.on('exit',()=>{if(!received)reject(new Error('Child exited without complete document'));});
    child.send({type:'start',kind:'feed',input:{url:'https://feeds.jupiterbroadcasting.com/lup',origins:['https://feeds.jupiterbroadcasting.com'],largePodcastFeed:true}});
  });
  expect(result.bytes).toBeGreaterThan(9_000_000);expect(result.document.children).toHaveLength(200);
},10000);
