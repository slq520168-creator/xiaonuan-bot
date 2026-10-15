import { DurableObject } from 'cloudflare:workers';
import {createBot} from '../bot.cjs';
function json(body,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store'}})}
async function webhookSecret(env){
 if(env.WEBHOOK_SECRET)return String(env.WEBHOOK_SECRET);
 if(!env.BOT_TOKEN)return '';
 const bytes=new TextEncoder().encode('xiaonuan-webhook:'+String(env.BOT_TOKEN));
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
}
async function setupTelegram(request,env){
 if(!env.BOT_TOKEN)return json({ok:false,error:'BOT_TOKEN not configured'},503);
 const secret=await webhookSecret(env),webhook=new URL('/webhook',request.url).href;
 try{
  const response=await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`,{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({url:webhook,secret_token:secret,drop_pending_updates:false,allowed_updates:['message','edited_message']})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data?.ok)return json({ok:false,service:'xiaonuan-bot',webhook,error:'Telegram webhook setup failed'},502);
  return json({ok:true,service:'xiaonuan-bot',webhook,telegram:'configured'});
 }catch{return json({ok:false,service:'xiaonuan-bot',webhook,error:'Telegram webhook setup failed'},502)}
}
export class BotChat extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  this.ready=ctx.blockConcurrencyWhile(async()=>{
   const stored=await ctx.storage.list({prefix:'state:'}),mem=new Map(),learned=new Map();
   for(const [key,value]of stored){if(key.startsWith('state:mem:'))mem.set(key.slice(10),value);else if(key.startsWith('state:learned:'))learned.set(key.slice(14),value)}
   this.bot=createBot(env,{mem,learned});
  });
 }
 async fetch(request){
  return this.ctx.blockConcurrencyWhile(async()=>{
   await this.ready;const update=await request.json(),id=String(update.update_id??'');
   if(id&&await this.ctx.storage.get('done:'+id))return json({ok:true,duplicate:true});
   await this.bot.handle(update);
   const before=await this.ctx.storage.list({prefix:'state:'}),next=new Map();
   for(const [key,value]of this.bot.mem)next.set('state:mem:'+key,value);
   for(const [key,value]of this.bot.learned)next.set('state:learned:'+key,value);
   for(const [key,value]of next)if(JSON.stringify(before.get(key))!==JSON.stringify(value))await this.ctx.storage.put(key,value);
   for(const key of before.keys())if(!next.has(key))await this.ctx.storage.delete(key);
   if(id){await this.ctx.storage.put('done:'+id,Date.now());const done=await this.ctx.storage.list({prefix:'done:'});for(const [key,time]of done)if(Date.now()-time>86400000)await this.ctx.storage.delete(key)}
   return json({ok:true});
  });
 }
}
export default {
 async fetch(request,env,ctx){
  const path=new URL(request.url).pathname;
  if(path==='/'&&['GET','HEAD'].includes(request.method)){
   if(request.method==='HEAD')return new Response(null,{status:200,headers:{'Cache-Control':'no-store'}});
   return json({ok:true,service:'xiaonuan-bot',runtime:'cloudflare-worker',configured:Boolean(env.BOT_TOKEN),setup:env.BOT_TOKEN?'/setup':null});
  }
  if(path==='/health'&&['GET','HEAD'].includes(request.method))return request.method==='HEAD'?new Response(null):json({ok:true,service:'xiaonuan-bot',configured:Boolean(env.BOT_TOKEN)});
  if(path==='/setup'&&request.method==='GET')return setupTelegram(request,env);
  if(path!=='/webhook')return json({error:'Not found'},404);
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(!env.BOT_TOKEN)return json({error:'Service not configured'},503);
  const secret=await webhookSecret(env);
  if(request.headers.get('X-Telegram-Bot-Api-Secret-Token')!==secret)return json({error:'Unauthorized'},401);
  let bytes=0,chunks=[];for await(const chunk of(request.body||[])){bytes+=chunk.length;if(bytes>65536)return json({error:'Request too large'},413);chunks.push(chunk)}
  let update;try{const data=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength}update=JSON.parse(new TextDecoder().decode(data))}catch{return json({error:'Invalid JSON'},400)}
  const chatId=update?.message?.chat?.id??update?.edited_message?.chat?.id;
  if(!chatId)return json({ok:true,ignored:true});
  const internal=new Request('https://bot.internal/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(update)});
  return env.CHATS.get(env.CHATS.idFromName(String(chatId))).fetch(internal);
 }
};
