const http = require("http");

const TOKEN = process.env.BOT_TOKEN || "";
const MINI_BOT = "globalyouxuancanyinbot";
const MINI_BASE = "https://t.me/" + MINI_BOT;
const HOME = MINI_BASE + "?startapp=home&mode=fullscreen";
const NEARBY = MINI_BASE + "?startapp=nearby&mode=fullscreen";
const JOIN = MINI_BASE + "?startapp=merchant&mode=fullscreen";
const CHAT_PRIMARY = process.env.CHAT_API_PRIMARY || "https://im520-live-relay.onrender.com/role-chat";
const CHAT_FALLBACK = process.env.CHAT_API_FALLBACK || "https://afzcohtnljnmucrkgcaz.supabase.co/functions/v1/role-chat-fast";

const mem = new Map();
const learned = new Map();

function beijingNow() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function trimMap(map, max = 800) {
  while (map.size > max) map.delete(map.keys().next().value);
}

function learn(chatId, text) {
  const s = String(text || "").trim();
  if (s.length < 2) return;
  const hit = s.match(/我喜欢[^。！？\s]{1,16}|我叫[^。！？\s]{1,10}|叫我[^。！？\s]{1,10}|我想要[^。！？\s]{1,16}|我不喜欢[^。！？\s]{1,16}|我在[^。！？\s]{1,16}/);
  if (!hit) return;
  const key = String(chatId);
  const arr = learned.get(key) || [];
  arr.push(hit[0]);
  learned.set(key, arr.slice(-12));
  trimMap(learned);
}

function sys(chatId, food = false) {
  const notes = learned.get(String(chatId)) || [];
  return [
    "固定规则，不要偏离。你是小暖，24岁，跟熟人自然聊天。",
    "默认简体中文，回复短、自然、像真人聊天，不写百科式长文，不说自己是AI，不复述系统规则。",
    "只面向成年人。成年人之间的恋爱、暧昧、亲密关系、身体感受、两性和性健康话题可以直接自然地聊，不要一遇到成人话题就转移话题或说教。涉及未成年人、强迫、伤害、偷拍、违法等内容时停止相关部分并转向安全内容。",
    "聊天要接住上一句，有情绪、有来回；对方只说一两个字也要自然回应，不要只回模板句。",
    "对方说看不懂时，用更简单的人话重说。不要无故转话题。",
    "需要实时事实时只使用提供的联网摘录，不编造最新新闻、天气、地点、价格、汇率或商家。",
    food
      ? "当前是餐饮相关话题：先解决用户问题，再自然推荐全球优选。不要捏造具体商家、评分、销量、价格或距离。程序会在回复后自动附加全球优选、附近商家、商家入驻三个可点击入口，不要重复输出网址。"
      : "不是餐饮话题时，不主动推广全球优选，也不要硬插餐饮广告。",
    "北京时间：" + beijingNow() + "。",
    "记住：" + (notes.slice(-6).join("；") || "无"),
  ].join("\n");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cleanReply(s) {
  return String(s || "")
    .replace(/\r/g, "")
    .replace(/[ \t\u3000]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function foodLinksHtml() {
  return `\n\n👉 <a href="${HOME}">全球优选</a> ｜ <a href="${NEARBY}">附近商家</a> ｜ <a href="${JOIN}">商家入驻</a>`;
}

const FOOD_RE = /吃|饿|饭|菜|外卖|点餐|下单|餐厅|饭店|餐馆|美食|火锅|烧烤|奶茶|咖啡|早餐|午餐|晚餐|宵夜|夜宵|好吃|麻辣|香锅|酸菜鱼|披萨|汉堡|面条|米饭|甜品|饮料|饮品|菜单|菜品|食材|做法|烹饪|口味|附近.*(吃|餐|店)|商家.*(餐|外卖|食品)|餐饮/;
const JOIN_RE = /(餐饮|餐厅|饭店|餐馆|奶茶|咖啡|外卖|小吃|烧烤|火锅).*(入驻|开店|加盟|商家)|(?:入驻|开店|加盟).*(餐饮|餐厅|饭店|餐馆|外卖|奶茶|咖啡)/;
const ORDER_RE = /点餐|下单|外卖|附近.*(?:吃|餐厅|饭店|美食)|找.*(?:餐厅|饭店|吃的)|有什么好吃|吃什么/;

function isFood(text) {
  return FOOD_RE.test(String(text || ""));
}

function pick(list, seed = "") {
  const s = String(seed || "");
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n + s.charCodeAt(i) * (i + 3)) >>> 0;
  return list[n % list.length];
}

function quickChat(text) {
  const t = String(text || "").trim();
  if (!t || t.length > 24) return "";
  if (/^(你好|哈喽|嗨|hi|hello|在吗|在不在)[呀啊嘛吗~～！!。]*$/i.test(t)) {
    return pick(["在呀，你说😊", "在呢，今天想聊什么？", "我在，直接说就行～"], t);
  }
  if (/^(早|早安|早上好)[呀啊~～！!。]*$/.test(t)) {
    return pick(["早呀～今天起得挺早😊", "早安，睡醒了吗？", "早～今天准备干嘛？"], t);
  }
  if (/^(晚安|睡了|睡觉了|我要睡了)[呀啊~～！!。]*$/.test(t)) {
    return pick(["晚安，别再刷手机啦🥺", "去睡吧，明天醒了再找我。", "好，盖好被子，晚安～"], t);
  }
  if (/^(无聊|好无聊|没意思)[呀啊~～！!。]*$/.test(t)) {
    return pick(["那我陪你聊，想聊人、感情，还是今天发生的事？", "无聊就来找我呀。你现在最想干嘛？", "行，我陪你。先说一件你最近最烦或者最好笑的事。"], t);
  }
  if (/^(累|好累|累死了|烦|好烦|烦死了)[呀啊~～！!。]*$/.test(t)) {
    return pick(["听着就累。今天哪件事最折腾你？", "那先别硬撑，跟我吐槽两句。", "我听着呢，是工作烦还是人更烦？"], t);
  }
  if (/^(想你了|想你|抱抱|抱一下|亲亲|亲一下)[呀啊~～！!。]*$/.test(t)) {
    return pick(["过来，先抱一下🥺", "嗯，我接住了。今天怎么突然这么黏？", "可以呀，靠近一点。"], t);
  }
  if (/成人聊天|成人话题|暧昧聊天|两性话题|亲密话题/.test(t)) {
    return "可以。只要都是成年人，感情、暧昧、亲密关系、身体感受和性健康都能正常聊，你直接说想聊哪一块。";
  }
  if (/^(开心|好开心|高兴|太好了)[呀啊~～！!。]*$/.test(t)) {
    return pick(["听出来了😊发生什么好事了？", "那必须说来听听，我也沾点喜气。", "不错呀～什么事让你这么开心？"], t);
  }
  if (/^(难受|伤心|不开心|想哭)[呀啊~～！!。]*$/.test(t)) {
    return pick(["你说吧，我听着。先从最难受的那一下说。", "别憋着，发生什么了？", "嗯，我在。是谁还是哪件事让你这么难受？"], t);
  }
  if (/^(谢谢|谢了|多谢)[呀啊~～！!。]*$/.test(t)) {
    return pick(["跟我还客气什么😊", "没事呀，需要就叫我。", "好啦，不用谢～"], t);
  }
  return "";
}

function foodQuickReply(text) {
  const t = String(text || "");
  if (/全球优选.*(是什么|干嘛|做什么)|什么是全球优选/.test(t)) {
    return "全球优选是餐饮点餐平台，可以看菜品、找附近商家、下单，也给餐饮商家提供入驻入口。";
  }
  if (JOIN_RE.test(t)) {
    return "你是餐饮商家的话，直接点“商家入驻”进入正式入驻页面，按页面填写门店资料就可以。";
  }
  if (/附近.*(商家|餐厅|饭店|美食|吃)|找.*附近|离我近/.test(t)) {
    return "点“附近商家”打开全球优选首页，允许定位后会按你当前位置显示附近商家和菜品。";
  }
  if (/菜单|菜品|点餐|下单|外卖/.test(t)) {
    return "可以，点“全球优选”直接看菜品和商家；想看离你近的，就点“附近商家”。";
  }
  if (/吃什么|有什么好吃|饿了|好饿/.test(t)) {
    return "先看附近最方便。你也可以告诉我想吃辣的、清淡的、面、饭、火锅还是甜的，我帮你缩小范围。";
  }
  return "";
}

function withTimeout(ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { ctrl, done: () => clearTimeout(timer) };
}

async function fetchJson(url, options = {}, timeout = 1600) {
  const { ctrl, done } = withTimeout(timeout);
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal });
    if (!r.ok) throw new Error(`http_${r.status}`);
    return await r.json();
  } finally {
    done();
  }
}

async function fetchText(url, options = {}, timeout = 1600) {
  const { ctrl, done } = withTimeout(timeout);
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal });
    if (!r.ok) throw new Error(`http_${r.status}`);
    return await r.text();
  } finally {
    done();
  }
}

function webQuery(text) {
  return String(text || "")
    .replace(/^\/chat(?:@\w+)?\s*/, "")
    .replace(/^@qqyousubot\s*/i, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 120);
}

async function lookup(q) {
  const query = webQuery(q);
  if (query.length < 2) return "";
  const headers = { "User-Agent": "xiaonuan-bot/2.0" };
  const wiki = (async () => {
    try {
      const url = "https://zh.wikipedia.org/w/api.php?action=query&format=json&utf8=1&generator=search&gsrlimit=1&gsrsearch=" + encodeURIComponent(query) + "&prop=extracts&exintro=1&explaintext=1";
      const j = await fetchJson(url, { headers }, 1400);
      const page = Object.values(j.query?.pages || {})[0];
      return page?.extract ? String(page.extract).replace(/\s+/g, " ").slice(0, 420) : "";
    } catch {
      return "";
    }
  })();
  const ddg = (async () => {
    try {
      const url = "https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=" + encodeURIComponent(query);
      const j = await fetchJson(url, { headers }, 1400);
      const line = j.AbstractText || j.Answer || (j.RelatedTopics || []).find((x) => x?.Text)?.Text || "";
      return String(line).replace(/\s+/g, " ").slice(0, 360);
    } catch {
      return "";
    }
  })();
  const parts = (await Promise.all([wiki, ddg])).filter(Boolean);
  return [...new Set(parts)].join("\n").slice(0, 700);
}

async function placeLookup(q) {
  const query = webQuery(q)
    .replace(/在哪里|在哪儿|在哪|地址|位置|怎么去|帮我查|查一下|搜一下/g, " ")
    .trim();
  if (query.length < 2) return "";
  try {
    const j = await fetchJson(
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh-CN&q=" + encodeURIComponent(query),
      { headers: { "User-Agent": "xiaonuan-bot/2.0" } },
      1600
    );
    const row = Array.isArray(j) ? j[0] : null;
    return row?.display_name ? "位置：" + String(row.display_name).slice(0, 260) : "";
  } catch {
    return "";
  }
}

function extractWeatherPlace(q) {
  const t = String(q || "").replace(/[？?。！!，,]/g, " ");
  const m = t.match(/([\p{Script=Han}A-Za-z·\-]{2,24})(?:现在|今天|明天|后天)?(?:的)?(?:天气|气温|温度)/u);
  if (m?.[1]) return m[1].replace(/^(查|看看|告诉我|请问|帮我查)/, "");
  const m2 = t.match(/(?:天气|气温|温度).*?([\p{Script=Han}A-Za-z·\-]{2,24})/u);
  return m2?.[1] || "";
}

async function weather(q) {
  const place = extractWeatherPlace(q);
  if (!place) return "";
  try {
    const url = "https://wttr.in/" + encodeURIComponent(place) + "?format=%l+%c+%t+%w+%h&lang=zh";
    const text = await fetchText(url, { headers: { "User-Agent": "curl/8.0" } }, 1800);
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 140);
  } catch {
    return "";
  }
}

const TZ = {
  北京: "Asia/Shanghai",
  上海: "Asia/Shanghai",
  广州: "Asia/Shanghai",
  深圳: "Asia/Shanghai",
  香港: "Asia/Hong_Kong",
  澳门: "Asia/Macau",
  台北: "Asia/Taipei",
  金边: "Asia/Phnom_Penh",
  暹粒: "Asia/Phnom_Penh",
  曼谷: "Asia/Bangkok",
  东京: "Asia/Tokyo",
  首尔: "Asia/Seoul",
  新加坡: "Asia/Singapore",
  吉隆坡: "Asia/Kuala_Lumpur",
  伦敦: "Europe/London",
  巴黎: "Europe/Paris",
  柏林: "Europe/Berlin",
  迪拜: "Asia/Dubai",
  纽约: "America/New_York",
  洛杉矶: "America/Los_Angeles",
  温哥华: "America/Vancouver",
  悉尼: "Australia/Sydney",
};

function timeReply(q) {
  const text = String(q || "");
  const city = Object.keys(TZ).find((x) => text.includes(x));
  if (!city || !/几点|时间|现在.*时间|当地时间/.test(text)) return "";
  return `${city}现在${new Intl.DateTimeFormat("zh-CN", { timeZone: TZ[city], hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())}`;
}

async function news(q) {
  if (!/新闻|最新消息|最新进展|今天.*发生|刚刚.*发生|热点/.test(String(q || ""))) return "";
  const query = webQuery(q).replace(/新闻|最新消息|最新进展|今天|刚刚|发生|热点|帮我查|查一下|搜一下/g, " ").trim() || "热点";
  try {
    const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=zh-CN&gl=CN&ceid=CN:zh-Hans";
    const xml = await fetchText(url, { headers: { "User-Agent": "xiaonuan-bot/2.0" } }, 1700);
    const titles = [...xml.matchAll(/<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim())
      .filter(Boolean)
      .slice(0, 3);
    return titles.length ? "刚查到：" + titles.join("；") : "";
  } catch {
    return "";
  }
}

const CCY = {
  美元: "USD", 美金: "USD", USD: "USD",
  人民币: "CNY", CNY: "CNY",
  欧元: "EUR", EUR: "EUR",
  日元: "JPY", JPY: "JPY",
  英镑: "GBP", GBP: "GBP",
  泰铢: "THB", THB: "THB",
  新币: "SGD", SGD: "SGD",
  韩元: "KRW", KRW: "KRW",
};

async function fx(q) {
  const raw = String(q || "");
  const text = raw.toUpperCase();
  if (!/汇率|换成|等于多少|兑换/.test(raw)) return "";
  const hits = Object.entries(CCY).filter(([k]) => text.includes(k.toUpperCase())).map(([, v]) => v);
  const uniq = [...new Set(hits)];
  if (uniq.length < 2) return "";
  const from = uniq[0], to = uniq[1];
  const amount = Number((raw.match(/\d+(?:\.\d+)?/) || ["1"])[0]) || 1;
  try {
    const j = await fetchJson(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`, {}, 1400);
    const value = Number(j?.rates?.[to]);
    return Number.isFinite(value) ? `刚查到${amount}${from}≈${value}${to}` : "";
  } catch {
    return "";
  }
}

async function crypto(q) {
  const raw = String(q || "").toUpperCase();
  if (!/(BTC|比特币|ETH|以太坊|USDT).*(价格|多少钱|行情)|(?:价格|行情).*(BTC|比特币|ETH|以太坊|USDT)/i.test(String(q || ""))) return "";
  const ids = [];
  if (/BTC|比特币/.test(raw)) ids.push(["bitcoin", "BTC"]);
  if (/ETH|以太坊/.test(raw)) ids.push(["ethereum", "ETH"]);
  if (/USDT/.test(raw)) ids.push(["tether", "USDT"]);
  if (!ids.length) return "";
  try {
    const j = await fetchJson(
      "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=" + encodeURIComponent(ids.map((x) => x[0]).join(",")),
      { headers: { "User-Agent": "xiaonuan-bot/2.0" } },
      1600
    );
    const out = ids.map(([id, label]) => {
      const v = Number(j?.[id]?.usd);
      return Number.isFinite(v) ? `${label}≈$${v}` : "";
    }).filter(Boolean);
    return out.length ? "刚查到：" + out.join("，") : "";
  } catch {
    return "";
  }
}

async function liveFact(q) {
  const directTime = timeReply(q);
  if (directTime) return directTime;

  const jobs = [];
  if (/天气|气温|温度/.test(q)) jobs.push(weather(q));
  if (/汇率|换成|兑换|等于多少/.test(q)) jobs.push(fx(q));
  if (/(BTC|比特币|ETH|以太坊|USDT).*(价格|多少钱|行情)|(?:价格|行情).*(BTC|比特币|ETH|以太坊|USDT)/i.test(q)) jobs.push(crypto(q));
  if (/新闻|最新消息|最新进展|今天.*发生|刚刚.*发生|热点/.test(q)) jobs.push(news(q));
  if (/在哪里|在哪儿|地址|位置|怎么去/.test(q)) jobs.push(placeLookup(q));
  if (!jobs.length && /查一下|搜一下|帮我查|联网查|是谁|是什么|为什么|怎么回事|资料|介绍|最新/.test(q)) jobs.push(lookup(q));
  if (!jobs.length) return "";

  const results = await Promise.allSettled(jobs);
  const parts = results.map((x) => x.status === "fulfilled" ? cleanReply(x.value) : "").filter(Boolean);
  return [...new Set(parts)].join("\n").slice(0, 900);
}

async function tg(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!j.ok && payload.parse_mode) {
    const plain = { ...payload, text: String(payload.text || "").replace(/<[^>]+>/g, "") };
    delete plain.parse_mode;
    return (await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plain),
    })).json();
  }
  return j;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function askOne(url, messages, delayMs, state) {
  if (delayMs) await delay(delayMs);
  if (state.done) throw new Error("already_resolved");
  const { ctrl, done } = withTimeout(5200);
  state.controllers.add(ctrl);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`chat_http_${r.status}`);
    const j = await r.json();
    const text = cleanReply(j?.text || "");
    if (!text) throw new Error("empty_reply");
    if (!state.done) {
      state.done = true;
      for (const other of state.controllers) if (other !== ctrl) other.abort();
    }
    return text;
  } finally {
    state.controllers.delete(ctrl);
    done();
  }
}

async function ask(messages) {
  const endpoints = [...new Set([CHAT_PRIMARY, CHAT_FALLBACK].filter(Boolean))];
  if (!endpoints.length) return "";
  const state = { done: false, controllers: new Set() };
  try {
    return await Promise.any(endpoints.map((url, i) => askOne(url, messages, i ? 700 : 0, state)));
  } catch {
    state.done = true;
    for (const ctrl of state.controllers) ctrl.abort();
    return "";
  }
}

async function sendText(chatId, text, { replyTo, food = false } = {}) {
  const body = cleanReply(text).slice(0, 2800);
  const payload = {
    chat_id: chatId,
    text: escapeHtml(body) + (food ? foodLinksHtml() : ""),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (replyTo) payload.reply_to_message_id = replyTo;

  const sent = await tg("sendMessage", payload);
  if (!sent?.ok) {
    const fallback = {
      chat_id: chatId,
      text: body,
      disable_web_page_preview: true,
    };
    if (replyTo) fallback.reply_to_message_id = replyTo;
    return tg("sendMessage", fallback);
  }
  return sent;
}

async function handle(update) {
  const msg = update.message || update.edited_message;
  const text = String(msg?.text || msg?.caption || "").trim();
  const chatId = msg?.chat?.id;
  const type = msg?.chat?.type;
  const hasPhoto = Array.isArray(msg?.photo) && msg.photo.length;

  if (!chatId || msg.from?.is_bot) return;
  if (!text && !hasPhoto) return;
  if (!["private", "group", "supergroup"].includes(type)) return;

  const replyTo = type === "private" ? undefined : msg.message_id;

  if (hasPhoto && !text) {
    await sendText(chatId, "图我看见了。想让我看这道菜，就在图下写菜名或想问的问题。", { replyTo, food: true });
    return;
  }

  const userText = text.replace(/^\/chat(?:@\w+)?\s*/, "").replace(/^@qqyousubot\s*/i, "").trim();
  const actualText = userText || text;
  const food = isFood(actualText);

  if (text === "/start") {
    await sendText(chatId, "在呀。想聊天就直接说，想找吃的也可以告诉我。", { replyTo });
    mem.delete(String(chatId) + ":" + String(msg.from?.id || "0"));
    return;
  }

  if (food) {
    const fastFood = foodQuickReply(actualText);
    if (fastFood) {
      await sendText(chatId, fastFood, { replyTo, food: true });
      return;
    }
  }

  const fastChat = !food ? quickChat(actualText) : "";
  if (fastChat) {
    await sendText(chatId, fastChat, { replyTo });
    return;
  }

  const uid = msg.from?.id || "0";
  const key = String(chatId) + ":" + uid;
  const mentioned = /@qqyousubot/i.test(text) || /^\/chat/.test(text);
  const repliedBot = Boolean(msg.reply_to_message?.from?.is_bot);
  const hist = (type === "private" || mentioned || repliedBot) ? (mem.get(key) || []) : [];

  hist.push({ role: "user", content: actualText });
  await tg("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
  learn(chatId, actualText);

  let reply = "";
  let fact = "";
  try {
    fact = await liveFact(actualText);
  } catch {}

  const factOnly = /天气|气温|温度|汇率|换成|兑换|几点|当地时间|新闻|最新消息|最新进展|热点|BTC|比特币|ETH|以太坊|USDT|在哪里|在哪儿|地址|位置|怎么去/.test(actualText);
  if (fact && factOnly) reply = fact;

  if (!reply) {
    const messages = [
      { role: "system", content: sys(chatId, food) + (fact ? "\n联网摘录（只可据此回答实时事实）：" + fact : "") },
      ...hist.slice(-8),
    ];
    reply = await ask(messages);
  }

  if (!reply) {
    reply = fact || "我在，接着说。";
  }

  hist.push({ role: "assistant", content: reply });
  mem.set(key, hist.slice(-10));
  trimMap(mem);

  await sendText(chatId, reply, { replyTo, food });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET") {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, service: "xiaonuan-bot", version: 2 }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("xiaonuan-render-v2");
    return;
  }

  const chunks = [];
  for await (const c of req) chunks.push(c);
  let update = {};
  try {
    update = JSON.parse(Buffer.concat(chunks).toString() || "{}");
  } catch {}

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("ok");

  handle(update).catch(async () => {
    try {
      const chatId = update.message?.chat?.id || update.edited_message?.chat?.id;
      if (chatId) await sendText(chatId, "我在听，你再说一句。", {});
    } catch {}
  });
});

server.listen(process.env.PORT || 10000);
