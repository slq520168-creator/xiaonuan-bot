# Cloudflare migration

Only main is used. Render is retained as backup. No custom domain or DNS route is included in these configurations. Worker observability is disabled.

Install using `npm ci`, inspect the bundle using `npm run cf:check`, then deploy using `npm run cf:deploy`. Validate the returned workers.dev URL before adding any domain. Build output and local state are ignored by Git.

The Node and Worker entrypoints share bot.cjs. Reply logic, food links and current model defaults are retained. The Worker accepts only /webhook with Telegram secret-token validation. A SQLite-backed object per chat serializes updates, stores memory and suppresses already completed update IDs.

Required Secrets: BOT_TOKEN and WEBHOOK_SECRET. Optional settings: CHAT_API_PRIMARY, CHAT_API_FALLBACK. Do not rotate or publish the existing bot token. Add Secrets only through the Worker secret store.

`npm run cf:test` uses mock Telegram/model services and tests memory restoration across runtime restarts. It sends no real messages.

Verify workers.dev health and Secrets before updating Telegram setWebhook to https://<verified-worker-host>/webhook with the same secret_token. Do not delete the Render service. Migration is incomplete until getWebhookInfo points to the verified Worker and an authorized real bot exchange succeeds.
