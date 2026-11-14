// Optional browser tooling is supplied by the verification environment.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { build } from 'esbuild';
import { startMediaFixture } from '../test/fixtures/media/server.mts';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const root=process.cwd();
const bundle=await build({stdin:{contents:`import {createPlaybackEngine} from './src/lib/modes/playback/audioEngine';window.make=createPlaybackEngine;`,resolveDir:root},bundle:true,write:false,platform:'browser'});
const fixture=await startMediaFixture();
const server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<script>${bundle.outputFiles[0].text}</script>`);});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);
 const result=await page.evaluate(async origin=>{
  const engine=(window as any).make({mediaKind:'audio',controls:{seek:true,rate:true}},{url:origin+'/audio.wav',transport:'direct',contentType:'audio/wav'});
  engine.restore(1.5);await engine.start(new AbortController().signal,10000);engine.pause();
  const initial=engine.position();const seek=engine.seek(0.5);const rate=engine.setRate(1.5);const after=engine.position();
  await engine.start(new AbortController().signal,10000);engine.pause();const resumed=engine.position();engine.dispose();return {initial,seek,rate,after,resumed};
 },fixture.origin);
 assert.ok(result.initial.positionSeconds>=1.5);assert.equal(result.seek,true);assert.equal(result.rate,true);assert.ok(result.after.positionSeconds<1);assert.equal(result.resumed.rate,1.5);
 console.log(JSON.stringify({browser:browser.version(),kind:'real Chromium native audio, synthetic byte-range fixture, actual production engine',result}));
}finally{await browser.close();await fixture.close();server.close();}
