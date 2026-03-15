# Ethos — External Configuration Checklist

## LinkedIn OAuth

- [ ] **LinkedIn Developer Portal** → Create app at linkedin.com/developers
  - Add product: "Sign In with LinkedIn using OpenID Connect"
  - Authorized redirect URI: `https://<your-supabase-ref>.supabase.co/auth/v1/callback`
  - Copy Client ID + Client Secret

- [ ] **Supabase Dashboard** → Authentication → Providers → LinkedIn (OIDC)
  - Enable the provider
  - Paste Client ID + Client Secret

## AI Detection

- [ ] **Anthropic Console** → Get an API key at console.anthropic.com
  - Create key (or use existing)

- [ ] **Vercel** → Add env var
  - `ANTHROPIC_API_KEY` = your key
  - Redeploy after adding

## Weekly Digest Emails (already wired)

- [ ] **Vercel** → Verify cron is active
  - Check Settings → Crons → confirm `/api/cron/daily-emails` shows as registered
  - Already in `vercel.json`, should be active after last deploy

## Previously Configured (verify)

- [ ] **Supabase Dashboard** → Authentication → URL Configuration
  - Site URL = `https://ethos-daily.vercel.app`
  - Redirect URLs includes `https://ethos-daily.vercel.app/auth/callback`

- [ ] **Vercel env vars** (should already be set from deployment)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`
  - `RESEND_API_KEY`
  - `SENDER_EMAIL`
  - `CRON_SECRET`
