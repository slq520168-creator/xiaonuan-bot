const http = require("http");
const TOKEN = process.env.BOT_TOKEN || "";
const API = "https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/role-chat-fast";
const HOME = "https://youxuanfood.com";
const JOIN = "https://youxuanfood.com/merchant.html";
function beijingNow() {
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}
const learned = new Map();
function sys(chatId) {
  const notes = learned.get(String(chatId)) || [];
  return "你是小暖，24岁，在跟熟人聊天。简体中文，短句，像真人接话，不要客服腔，不要说自己是AI。先接住对方上一句接着往下聊，成人话题要大胆一点，顺着身体、情绪、关系继续，不要转成天气、吃饭或别的话题。句子里不要空格。多带点表情，像😊🥺👉，语气软、口语。外卖只在对方聊吃的时提全球优选，不提美团、饿了么，不写网址。当前北京时间：" + beijingNow() + "。有联网摘录就用摘录里的事实，不要用几个月前的旧日期。已记住：" + (notes.slice(-6).join("；") || "无");
}
function learn(chatId, text) {
  const s = String(text || "").trim();
  if (s.length < 2) return;
  const hit = s.match(/我喜欢[^。！？\s]{1,12}|我叫[^。！？\s]{1,8}|叫我[^。！？\s]{1,8}|想要[^。！？\s]{1,12}/);
  if (!hit) return;
  const arr = learned.get(String(chatId)) || [];
  arr.push(hit[0]);
  learned.set(String(chatId), arr.slice(-12));
}
async function lookup(q) {
  const query = String(q || "").replace(/^\/chat(?:@\w+)?\s*/, "").replace(/^@qqyousubot\s*/i, "").slice(0, 80);
  if (!query || query.length < 2) return "";
  const ctrl = AbortSignal.timeout(1800);
  const bits = [];
  try {
    const url = "https://zh.wikipedia.org/w/api.php?action=query&format=json&utf8=1&generator=search&gsrlimit=1&gsrsearch=" + encodeURIComponent(query) + "&prop=extracts&exintro=1&explaintext=1";
    const j = await (await fetch(url, { signal: ctrl, headers: { "User-Agent": "xiaonuan-bot/1.0" } })).json();
    const page = Object.values(j.query?.pages || {})[0];
    if (page?.extract) bits.push(String(page.extract).replace(/\s+/g, " ").slice(0, 500));
  } catch {}
  try {
    const url = "https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=" + encodeURIComponent(query);
    const j = await (await fetch(url, { signal: ctrl, headers: { "User-Agent": "xiaonuan-bot/1.0" } })).json();
    const line = j.AbstractText || j.Answer || (j.RelatedTopics || []).find((x) => x.Text)?.Text || "";
    if (line) bits.push(String(line).replace(/\s+/g, " ").slice(0, 400));
  } catch {}
  return bits.join("\n").slice(0, 800);
}

async function weather(q) {
  const city = (String(q).match(/(北京|上海|广州|深圳|成都|杭州|重庆|武汉|西安|南京|天津|苏州|金边|曼谷|东京|新加坡)/) || [])[1] || "北京";
  const ctrl = AbortSignal.timeout(2500);
  const url = "https://wttr.in/" + encodeURIComponent(city) + "?format=%l+%c+%t+%w+%h&lang=zh";
  const text = await (await fetch(url, { signal: ctrl, headers: { "User-Agent": "curl/8.0" } })).text();
  return city + "现在" + String(text || "").replace(/\s+/g, " ").trim().slice(0, 80);
}
const mem = new Map();
const bad = ["cehpoint", "漏洞", "渗透", "SIEM", "美团", "饿了么", "youxuanfood.com", "http"];
const a = (label) => `<a href="${HOME}">${label}</a>`;
function orderReply(text) {
  const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const dish = lines.find(s => /^[\u4e00-\u9fa5]{2,8}$/.test(s)) || "这份";
  const price = (text.match(/\d+(?:\.\d+)?/) || [])[0];
  const shop = (text.match(/[\u4e00-\u9fa5]{2,10}餐厅/) || [])[0] || "这家";
  const priceText = price ? `${price}块` : "这个价";
  return `好的呢～${dish}一份，${priceText}，${shop}这家对吧？😊\n\n${a("全球优选下单")}啦，一会儿就好～等下给你送过去！`;
}
const TAKEOUT = `打开${a("全球优选")}看看附近的外卖就很多选择啦～\n\n我最近常点的那家麻辣香锅评分很高，食材新鲜，辣度能自己调，我一般选中辣，过瘾又不呛喉。\n\n酸菜鱼的话，有些店会送小份米饭和酸豆角，吃起来特别解腻。\n\n你去${a("翻翻附近")}有什么推荐的？我帮你参考参考 😊`;
const keys = ["外卖", "美团", "饿了么", "麻辣香锅", "酸菜鱼", "点餐", "附近", "优选", "下单", "餐厅", "菜单", "商家", "老醋花生"];
const foodRe = /吃|饿|饭|菜|外卖|点餐|餐厅|商家|优选|美食|火锅|奶茶|早餐|午餐|晚餐|宵夜|好吃|麻辣|香锅/;
const join = (label) => `<a href="${JOIN}">${label}</a>`;
function foodTail() { return "\n👉点击查看" + a("全球优选") + a("附近商家") + join("商家入驻"); }
function nospace(s) { return String(s || "").replace(/[ \t\u3000]+/g, ""); }

async function tg(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return r.json();
}
function leaked(s) { const t = String(s || "").toLowerCase(); return bad.some((k) => t.includes(k.toLowerCase())); }
async function ask(messages) {
  const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) });
  const j = await r.json();
  return String(j.text || "");
}
const PHOTO = "https://inquisitive-bonbon-ead300.netlify.app/xiaonuan.jpg";
async function handle(update) {
  const msg = update.message || update.edited_message;
  const text = String(msg?.text || msg?.caption || "").trim();
  const chatId = msg?.chat?.id;
  const type = msg?.chat?.type;
  const hasPhoto = Array.isArray(msg?.photo) && msg.photo.length;
  if (!chatId || msg.from?.is_bot) return;
  if (!text && !hasPhoto) return;
  if (!["private", "group", "supergroup"].includes(type)) return;
  if (hasPhoto && !text) {
    const payload = { chat_id: chatId, text: "图我看见了。想让我评这道菜，就在图下写菜名。" };
    if (type !== "private") payload.reply_to_message_id = msg.message_id;
    await tg("sendMessage", payload);
    return;
  }
  if (keys.some((k) => text.includes(k)) || /餐厅|下单|菜单/.test(text)) {
    const card = /餐厅|下单|\d+\.\d+/.test(text);
    const payload = { chat_id: chatId, text: nospace((card ? orderReply(text) : TAKEOUT) + foodTail()), parse_mode: "HTML", disable_web_page_preview: true };
    if (type !== "private") payload.reply_to_message_id = msg.message_id;
    await tg("sendMessage", payload);
    return;
  }
  const key = String(chatId);
  const hist = mem.get(key) || [];
  if (text === "/start") {
    await tg("sendMessage", { chat_id: chatId, text: "在呀。想吃就说外卖或菜名。" });
    mem.set(key, []);
    return;
  }
  const userText = text.replace(/^\/chat(?:@\w+)?\s*/, "").replace(/^@qqyousubot\s*/i, "");
  hist.push({ role: "user", content: userText || text });
  await tg("sendChatAction", { chat_id: chatId, action: "typing" });
  let reply = "";
  if (/天气/.test(userText || text)) {
    try { reply = await weather(userText || text); } catch { reply = ""; }
  }
  const needWeb = !reply && /[?？]|几点|时间|日期|今天|新闻|天文|地理|哪里|在哪|现在|谁|什么|为什么|怎么|多少/.test(userText || text);
  let fact = "";
  if (needWeb) { try { fact = await lookup(userText || text); } catch {} }
  const clock = "北京时间：" + beijingNow();
  learn(chatId, userText || text);
  if (!reply) { try { reply = await ask([{ role: "system", content: sys(chatId) + (fact ? "\n联网摘录：" + fact : "") }, ...hist.slice(-12)]); } catch {} }
  if (!reply || leaked(reply) || /[A-Za-z]{8,}/.test(reply)) reply = fact ? "我刚看到：" + fact.slice(0, 160) : "嗯，你接着说，我听着。";
  hist.push({ role: "assistant", content: reply });
  mem.set(key, hist.slice(-20));
  const aboutFood = foodRe.test(text) || foodRe.test(reply);
  const payload = { chat_id: chatId, text: nospace(aboutFood ? reply.slice(0, 3200) + foodTail() : reply.slice(0, 3500)), parse_mode: aboutFood ? "HTML" : undefined, disable_web_page_preview: true };
  if (type !== "private") payload.reply_to_message_id = msg.message_id;
  await tg("sendMessage", payload);
}
const server = http.createServer(async (req, res) => {
  if (req.method === "GET") { res.writeHead(200); res.end("xiaonuan-render"); return; }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  let update = {};
  try { update = JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch {}
  res.writeHead(200); res.end("ok");
  handle(update).catch(() => {});
});
server.listen(process.env.PORT || 10000);
