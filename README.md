
# MemoryOS Tenant Dashboard

This app is the authenticated tenant dashboard. It should stay focused on
workspace operations: API keys, memories, users, domain settings, Memory
Passport setup, and billing success flows.

Public pricing now lives in `../marketing` so anonymous visitors can view plans
without loading Clerk workspace state.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set `NEXT_PUBLIC_MARKETING_BASE_URL` to the deployed marketing app URL in
production. The tenant `/pricing` route redirects there to keep one public
pricing surface.
