import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
import { fetchDocument } from "./fetch";
const input = { url:"https://feeds.example/feed",origins:["https://feeds.example","https://cdn.example"],etag:null,lastModified:null,validatorUrl:null };
const release = vi.fn(async () => {}), acquire = vi.fn(async () => release);
const fetchFeed = (overrides = {}, signal = new AbortController().signal) => fetchDocument({...input,...overrides},acquire,signal);
function response(statusCode: number, body: Buffer | string, headers: Record<string,string> = {}) {
  mocks.request.mockImplementationOnce((_options, callback) => {
    const req = new EventEmitter() as EventEmitter & {end:()=>void};
    req.end = () => { const res = Object.assign(Readable.from([Buffer.from(body)]),{ statusCode, headers }); callback(res); };
    return req;
  });
}
beforeEach(() => { vi.clearAllMocks(); mocks.lookup.mockResolvedValue([{address:"1.1.1.1",family:4}]); });
describe("bounded HTTPS ingestion", () => {
  it("pins DNS while preserving certificate SNI and Host; applies validators to their exact URL", async () => {
    response(200,"<rss/>",{"content-type":"application/rss+xml",etag:'"next"'});
    const result = await fetchFeed({etag:'"prior"',validatorUrl:input.url});
    expect(result.body.toString()).toBe("<rss/>"); expect(result.etag).toBe('"next"');
    expect(mocks.request.mock.calls[0][0]).toMatchObject({hostname:"1.1.1.1",servername:"feeds.example",agent:false,port:443,headers:{Host:"feeds.example","If-None-Match":'"prior"'}});
    expect(acquire).toHaveBeenCalledWith("feeds.example",expect.any(AbortSignal)); expect(release).toHaveBeenCalledTimes(1);
  });
  it("revalidates DNS after redirects and rejects rebinding to private addresses", async () => {
    mocks.lookup.mockResolvedValueOnce([{address:"1.1.1.1",family:4}]).mockResolvedValueOnce([{address:"10.0.0.1",family:4}]);
    response(302,"",{location:"/next"});
    await expect(fetchFeed()).rejects.toMatchObject({code:"unsafe_address"}); expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it("strips validators on redirects to different resources and accepts a valid 304", async () => {
    response(302,"",{location:"https://cdn.example/feed"}); response(200,"<rss/>");
    await fetchFeed({etag:'"prior"',validatorUrl:input.url});
    expect(mocks.request.mock.calls[1][0].headers["If-None-Match"]).toBeUndefined();
    response(304,"",{etag:'"prior"'});
    expect((await fetchFeed({etag:'"prior"',validatorUrl:input.url})).status).toBe("not_modified");
  });
  it("rejects unsolicited 304, publisher errors, HTML and unexpected encoding", async () => {
    for (const [status,headers] of [[304,{}],[503,{}],[200,{"content-type":"text/html"}],[200,{"content-encoding":"unknown"}]] as const) {
      response(status,"<rss/>",headers); await expect(fetchFeed()).rejects.toBeDefined();
    }
  });
  it("bounds redirects and rejects unapproved redirect origins", async () => {
    for(let i=0;i<4;i++) response(302,"",{location:"/loop"});
    await expect(fetchFeed()).rejects.toMatchObject({code:"redirect_limit"}); expect(mocks.request).toHaveBeenCalledTimes(4);
    response(302,"",{location:"https://unapproved.example/feed"});
    await expect(fetchFeed()).rejects.toMatchObject({code:"unapproved_origin"});
  });
  it("decompresses gzip and rejects decompression bombs and excess wire bytes", async () => {
    response(200,gzipSync("<rss/>"),{"content-encoding":"gzip"});
    expect((await fetchFeed()).body.toString()).toBe("<rss/>");
    response(200,gzipSync("x".repeat(4*1024*1024+1)),{"content-encoding":"gzip"});
    await expect(fetchFeed()).rejects.toMatchObject({code:"too_large"});
    response(200,Buffer.alloc(2*1024*1024+1)); await expect(fetchFeed()).rejects.toMatchObject({code:"too_large"});
    response(200,"small",{"content-length":"999999999"}); await expect(fetchFeed()).rejects.toMatchObject({code:"too_large"});
    expect(release).toHaveBeenCalledTimes(4);
  });
  it("does not forward arbitrary headers, cookies, credentials or injected validators", async () => {
    response(200,"<rss/>"); await fetchFeed({etag:"bad\r\nAuthorization: secret",validatorUrl:input.url});
    const headers = mocks.request.mock.calls[0][0].headers;
    expect(headers.Authorization).toBeUndefined();expect(headers.Cookie).toBeUndefined();expect(headers["If-None-Match"]).toBeUndefined();
  });
  it("cancels a stalled HTTP request and releases its host slot", async () => {
    let reached!:()=>void; const ready = new Promise<void>(resolve => { reached=resolve; });
    mocks.request.mockImplementationOnce(options => {
      const req = Object.assign(new EventEmitter(),{end:()=>reached()});
      options.signal.addEventListener("abort",()=>req.emit("error",new Error("aborted")));return req;
    });
    const controller = new AbortController();const result=fetchFeed({},controller.signal);await ready;controller.abort();
    await expect(result).rejects.toMatchObject({code:"cancelled"});expect(release).toHaveBeenCalledTimes(1);
  });
});

it("times out stalled requests and returns only the bounded failure category", async () => {
  const deadline = new AbortController();
  const timeout = vi.spyOn(AbortSignal,"timeout").mockReturnValue(deadline.signal);
  let reached!:()=>void;const ready=new Promise<void>(resolve=>{reached=resolve;});
  mocks.request.mockImplementationOnce(options=>{
    const req=Object.assign(new EventEmitter(),{end:()=>reached()});
    options.signal.addEventListener('abort',()=>req.emit('error',new Error('provider URL and secret should not escape')));return req;
  });
  try {
    const result=fetchFeed();await ready;deadline.abort();
    await expect(result).rejects.toMatchObject({code:'timeout',message:'timeout'});expect(release).toHaveBeenCalledTimes(1);
  } finally {timeout.mockRestore();}
});

it("rejects truncated gzip and releases resources on body errors", async () => {
  response(200,gzipSync('<rss/>').subarray(0,12),{'content-encoding':'gzip'});
  await expect(fetchFeed()).rejects.toMatchObject({code:'network'});expect(release).toHaveBeenCalledTimes(1);
});

it("accepts bounded JSON only in explicit JSON mode", async () => {
  response(200,'{"results":[]}',{"content-type":"application/json"});
  expect((await fetchDocument(input,acquire,new AbortController().signal,"json")).body.toString()).toContain("results");
  response(200,"<rss/>",{"content-type":"text/xml"});
  await expect(fetchDocument(input,acquire,new AbortController().signal,"json")).rejects.toMatchObject({code:"http_error"});
  response(200,"{}",{"content-type":"application/json"});
  await expect(fetchFeed()).rejects.toMatchObject({code:"http_error"});
});
it('restricts the larger feed budget to the explicitly opted-in approved URL', async()=>{
  const payload='x'.repeat(4*1024*1024+1);
  response(200,gzipSync(payload),{'content-encoding':'gzip'});
  expect((await fetchFeed({url:'https://feeds.jupiterbroadcasting.com/lup',origins:['https://feeds.jupiterbroadcasting.com'],largePodcastFeed:true})).body.length).toBe(payload.length);
  response(200,gzipSync(payload),{'content-encoding':'gzip'});
  await expect(fetchFeed({largePodcastFeed:true})).rejects.toMatchObject({code:'too_large'});
  response(200,gzipSync('x'.repeat(12*1024*1024+1)),{'content-encoding':'gzip'});
  await expect(fetchFeed({url:'https://feeds.jupiterbroadcasting.com/lup',origins:['https://feeds.jupiterbroadcasting.com'],largePodcastFeed:true})).rejects.toMatchObject({code:'too_large'});
});
it('falls back only to addresses from the fully validated DNS set',async()=>{
  mocks.lookup.mockResolvedValue([{address:'1.1.1.1',family:4},{address:'8.8.8.8',family:4}]);
  mocks.request.mockImplementationOnce((_options,_callback)=>{
    const req=new EventEmitter() as EventEmitter & {end:()=>void};req.end=()=>req.emit('error',new Error('connection failed'));return req;
  });
  response(200,'<rss/>');await fetchFeed();
  expect(mocks.request.mock.calls.map(call=>call[0].hostname)).toEqual(['1.1.1.1','8.8.8.8']);
  expect(mocks.lookup).toHaveBeenCalledTimes(1);
  mocks.lookup.mockResolvedValue([{address:'1.1.1.1',family:4},{address:'127.0.0.1',family:4}]);
  await expect(fetchFeed()).rejects.toMatchObject({code:'unsafe_address'});
});
