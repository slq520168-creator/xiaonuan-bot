const http=require("http");
const {createBot}=require("./bot.cjs");
const {handle}=createBot(process.env);
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
