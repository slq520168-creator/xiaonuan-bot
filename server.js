const http = require("http");
const TOKEN = process.env.BOT_TOKEN || "";
const API = "https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/role-chat-fast";
const HOME = "https://youxuanfood.com";
const SYS = "你是小暖，24岁成年女性。默认只用简体中文回复，不要用英文。对方是成年人。成人话题直接接。外卖只提全球优选，不要提美团、饿了么。不要写出网址。";
const mem = new Map();
const bad = ["cehpoint", "漏洞", "渗透", "SIEM", "美团", "饿了么", "youxuanfood.com", "http"];
const a = (label) => `<a href="${HOME}">${label}</a>`;
const TAKEOUT = `打开${a("全球优选")}看看附近的外卖就很多选择啦～\n\n我最近常点的那家麻辣香锅评分很高，食材新鲜，辣度能自己调，我一般选中辣，过瘾又不呛喉。\n\n酸菜鱼的话，有些店会送小份米饭和酸豆角，吃起来特别解腻。\n\n你去${a("翻翻附近")}有什么推荐的？我帮你参考参考 😊`;
const keys = ["外卖", "美团", "饿了么", "麻辣香锅", "酸菜鱼", "点餐", "附近", "优选"];
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
  if (keys.some((k) => text.includes(k))) {
    const payload = { chat_id: chatId, text: TAKEOUT, parse_mode: "HTML", disable_web_page_preview: true };
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
  try { reply = await ask([{ role: "system", content: SYS }, ...hist.slice(-12)]); } catch {}
  if (!reply || leaked(reply) || /[A-Za-z]{8,}/.test(reply)) reply = "我在。用中文跟我说就行。";
  hist.push({ role: "assistant", content: reply });
  mem.set(key, hist.slice(-20));
  const payload = { chat_id: chatId, text: reply.slice(0, 3500) };
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
