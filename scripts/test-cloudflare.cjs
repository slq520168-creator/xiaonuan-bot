const assert=require('node:assert/strict');
const {Miniflare,NoOpLog,convertV4MiniflareOptions}=require('miniflare');
const {rm}=require('node:fs/promises');
const root=require('node:path').resolve(__dirname,'..');
const base={modules:true,compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],log:new NoOpLog()};
async function use(options,fn){const dir=require('node:path').dirname(options.scriptPath);if(options.modulesRules){delete options.modulesRules;options.modules=[{type:'ESModule',path:options.scriptPath},...require('node:fs').readdirSync(dir).filter(n=>n.endsWith('.txt')).map(n=>({type:'Text',path:dir+'/'+n}))];delete options.scriptPath}const mf=new Miniflare(convertV4MiniflareOptions({...base,rootPath:dir,modulesRoot:dir,...options}));try{await fn(mf)}finally{await mf.dispose()}}
async function main(){
 const persist=root+'/.wrangler/bot-test-state';await rm(persist,{recursive:true,force:true});let calls=[];
 const options={scriptPath:root+'/.wrangler/dry-run/worker.js',durableObjects:{CHATS:{className:'BotChat',useSQLite:true}},resourcePersistencePath:persist,bindings:{BOT_TOKEN:'test-token',WEBHOOK_SECRET:'test-secret',CHAT_API_PRIMARY:'https://model.test/chat',CHAT_API_FALLBACK:'https://model.test/chat'},outboundService:async req=>{
  const body=await req.json();calls.push({url:req.url,body});
  return Response.json(req.url.includes('model.test')?{text:'测试回复'}:{ok:true,result:{message_id:1}});
 }};
 const update=(id,text)=>({update_id:id,message:{message_id:id,chat:{id:123,type:'private'},from:{id:456},text}});
 const send=(mf,value)=>mf.dispatchFetch('https://bot.test/webhook',{method:'POST',headers:{'content-type':'application/json','X-Telegram-Bot-Api-Secret-Token':'test-secret'},body:JSON.stringify(value)});
 await use(options,async mf=>{
  let r=await mf.dispatchFetch('https://bot.test/webhook',{method:'POST',body:'{}'});assert.equal(r.status,401);
  r=await send(mf,update(1,'我叫迁移测试'));assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
 });
 const count=calls.length;
 await use(options,async mf=>{
  let r=await send(mf,update(1,'我叫迁移测试'));assert.equal((await r.json()).duplicate,true);assert.equal(calls.length,count);
  r=await send(mf,update(2,'还能记得吗'));assert.equal(r.status,200);
  const model=calls.filter(x=>x.url.includes('model.test')).at(-1);assert.ok(model.body.messages.some(x=>x.content==='我叫迁移测试'));assert.match(model.body.messages[0].content,/我叫迁移测试/);
 });
 console.log('Bot Worker: signed webhook, mock delivery, deduplication and restart memory recovery passed; zero external messages sent');
}
main().catch(e=>{console.error(e);process.exitCode=1});
