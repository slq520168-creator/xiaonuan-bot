# Cloudflare migration

Only `main` is used. Render is retained as backup. No custom domain or DNS route is required. Worker observability is disabled.

Deploy with `npm run cf:deploy`. Validate the returned `workers.dev` root URL first. The root route returns service status instead of 404, and `/health` is also available.

The Node and Worker entrypoints share `bot.cjs`. Reply logic, food links and current model defaults are retained. The Worker accepts Telegram updates only on `/webhook`. A SQLite-backed Durable Object per chat serializes updates, stores memory and suppresses already completed update IDs.

Required Secret: `BOT_TOKEN` only. `WEBHOOK_SECRET` is optional; if omitted, the Worker derives a SHA-256 webhook secret internally from `BOT_TOKEN` and never exposes it. `CHAT_API_PRIMARY` is fixed in `wrangler.jsonc` to `https://youxuansi.online/role-chat`. `CHAT_API_FALLBACK` remains optional.

After `BOT_TOKEN` is stored as a Worker Secret, open `/setup` once. The Worker calls Telegram `setWebhook` itself and points Telegram to its own `/webhook` endpoint using the derived/explicit webhook secret. No manual Telegram webhook API call is needed.

`npm run cf:test` uses mock Telegram/model services and sends no real messages.

Do not delete the Render service until the Cloudflare root URL reports `configured: true`, `/setup` returns `telegram: configured`, and one real authorized bot exchange succeeds.
