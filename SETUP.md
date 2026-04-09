# Personal Dashboard — Setup Guide

## Prerequisites

- Node.js 18+
- A Supabase account (free tier works)
- Google Cloud Console access
- Monday.com account with API token
- Notion account with an integration token
- Slack workspace with bot token
- Anthropic API key

---

## Step 1: Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **SQL Editor** and paste the contents of `supabase/migrations/001_initial.sql`, then run it

---

## Step 2: Google OAuth (Calendar + Gmail)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Calendar API** and **Gmail API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID → `GOOGLE_CLIENT_ID`, Client Secret → `GOOGLE_CLIENT_SECRET`

### Get Long-lived Tokens (Dev Setup)

The simplest approach for a single-user personal tool is to get tokens via OAuth Playground:

1. Go to [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon → check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. Select scopes: `https://www.googleapis.com/auth/calendar.readonly` and `https://www.googleapis.com/auth/gmail.readonly`
5. Authorize and exchange for tokens
6. Copy access token → `GOOGLE_ACCESS_TOKEN`
7. Copy refresh token → `GOOGLE_REFRESH_TOKEN`

> **Note:** Access tokens expire in 1 hour. For production, implement proper NextAuth OAuth flow. For personal use, the refresh token will auto-renew.

---

## Step 3: Monday.com

1. Log in to Monday.com
2. Click your avatar → **Admin → API**
3. Copy your personal API token → `MONDAY_API_TOKEN`
4. Note your Board IDs (visible in the URL when viewing a board: `https://yourteam.monday.com/boards/123456`)
5. After setup, run this in the Supabase SQL editor to configure your boards:

```sql
UPDATE config SET value = '[123456, 789012]' WHERE key = 'monday_board_ids';
```

---

## Step 4: Notion

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create a new integration named "Personal Dashboard"
3. Copy the **Internal Integration Token** → `NOTION_TOKEN`
4. In Notion, open your Daily Tasks database
5. Click **...** menu → **Add connections** → select your integration
6. Copy the database ID from the URL:
   `https://notion.so/workspace/DATABASE_ID?v=...`
7. After setup, configure it:

```sql
UPDATE config SET value = '"your-database-id-here"' WHERE key = 'notion_database_id';
```

### Required Notion Database Properties

Your database needs these property names (case-sensitive):
- `Name` (type: Title)
- `Status` (type: Status)
- `Due Date` (type: Date) — optional but recommended

---

## Step 5: Slack

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From scratch
2. Name it "Personal Dashboard Bot"
3. Go to **OAuth & Permissions → Scopes → Bot Token Scopes**, add:
   - `channels:history`
   - `im:history`
   - `im:read`
   - `search:read`
   - `users:read`
4. Go to **Install App** → Install to Workspace
5. Copy **Bot User OAuth Token** → `SLACK_BOT_TOKEN`

---

## Step 6: Anthropic

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key → `ANTHROPIC_API_KEY`

---

## Step 7: Local Setup

```bash
cd personal-dashboard
cp .env.local.example .env.local
# Fill in all values in .env.local

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### First Sync

1. Open the dashboard
2. Click **Refresh** to trigger a full sync
3. Watch the source dots in the header turn green

---

## Step 8: Deploy to Vercel

```bash
npx vercel
```

Set all environment variables in the Vercel project settings.

For cron jobs to work:
1. Add `CRON_SECRET` to your Vercel env vars (any random string)
2. The `vercel.json` schedules a sync every 30 minutes automatically

---

## Configuration

Adjust defaults in the Supabase `config` table:

| Key | Default | Description |
|-----|---------|-------------|
| `sync_interval_minutes` | 30 | How often cron syncs |
| `confidence_threshold` | 0.65 | Min confidence to auto-add task |
| `email_lookback_hours` | 48 | Gmail lookback window |
| `slack_lookback_hours` | 24 | Slack lookback window |
| `monday_due_days_ahead` | 14 | Monday items cutoff |
| `follow_up_threshold_hours` | 24 | Hours before follow-up task created |
| `notion_database_id` | "" | Your Notion DB ID |
| `monday_board_ids` | [] | Array of board IDs to sync |
