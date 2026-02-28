# Render Deployment Guide

This guide walks you through deploying the Web3D Bookmark application to Render.

## Prerequisites

1. **Render Account** — Sign up at [render.com](https://render.com)
2. **GitHub Account** — Your repo must be on GitHub (NikhilR53/Web3D-Bookmark)
3. **Render CLI** (optional) — For local testing: `npm install -g @render-tech/render-cli`

## Deployment Steps

### Option A: Automatic Deployment (Recommended) — `render.yaml`

This uses the included `render.yaml` to set up all services at once.

#### 1. Connect GitHub to Render

1. Go to [render.com](https://render.com) and log in
2. Click **Dashboard** → **New** → **Blueprint** (near the top)
3. Select **GitHub** and authorize Render to access your repositories
4. Find and select `NikhilR53/Web3D-Bookmark`

#### 2. Deploy the Blueprint

1. Confirm the repo and branch (default: `main`)
2. Render will detect `render.yaml` and display the services:
   - **web3-bookmark-db** (PostgreSQL)
   - **web3-bookmark-api** (Node.js Web Service)
3. Configure environment variables (Render generates `SESSION_SECRET` automatically)
4. Click **Create Blueprint** to deploy

Deployment takes **5–10 minutes**. Once complete, your app will be live at: `https://web3-bookmark-api.onrender.com`

---

### Option B: Manual Setup

If you prefer not to use `render.yaml`:

#### Step 1: Create a PostgreSQL Database

1. Go to **Dashboard** → **New** → **PostgreSQL**
2. Configure:
   - **Name**: `web3-bookmark-db`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Region**: closest to your users
   - **Plan**: Free (or Starter for production)
3. Click **Create Database**
4. Copy the **Internal Database URL** (you'll need this)

#### Step 2: Create a Web Service

1. Go to **Dashboard** → **New** → **Web Service**
2. Select **GitHub** and authorize
3. Choose the `NikhilR53/Web3D-Bookmark` repo
4. Configure:
   - **Name**: `web3-bookmark-api`
   - **Environment**: `Node`
   - **Region**: same as the database
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter for production)

#### Step 3: Set Environment Variables

1. Scroll to **Environment Variables** section
2. Add the following:
   ```
   NODE_ENV = production
   PORT = 3000
   DATABASE_URL = <paste the Internal Database URL from Step 1>
   SESSION_SECRET = <generate a secure random string, e.g., openssl rand -hex 32>
   ```
3. Click **Create**

Render will deploy automatically. Monitor **Logs** for errors.

---

## Verification

Once deployed:

1. **Check live URL**:
   ```bash
   curl https://web3-bookmark-api.onrender.com
   ```
   You should see the React app (HTML).

2. **Test API**:
   ```bash
   # health check (should fail with 401 if you're not logged in, which is expected)
   curl https://web3-bookmark-api.onrender.com/api/profile
   ```

3. **Run database migrations** (one-time):
   ```bash
   # In Render Web Service shell:
   npm run db:push
   ```

---

## Troubleshooting

### "Cannot find module 'dotenv'"
- **Cause**: `npm install` didn't run during build
- **Fix**: Render should run `npm install` automatically. Check **Build Logs** in Render Dashboard.

### "DATABASE_URL is required"
- **Cause**: Environment variables not set or not linked correctly
- **Fix**: In Render, go to **Environment** tab and verify `DATABASE_URL` is populated from the database service.

### "Address already in use"
- **Cause**: When manually running locally with Render database
- **Fix**: Render assigns `PORT` automatically; your code respects it (`process.env.PORT || 5173`).

### "ECONNREFUSED: connect ECONNREFFUSED"
- **Cause**: Database not yet initialized
- **Fix**: Database takes ~30 seconds to spin up. Wait, then trigger a redeploy by pushing a commit to `main`.

---

## Continuous Deployment

Once linked, every push to the `main` branch auto-deploys:

1. Make code changes locally
2. Commit and push:
   ```bash
   git add .
   git commit -m "your message"
   git push origin main
   ```
3. Render detects the push and automatically builds + deploys

---

## Helpful Links

- [Render Docs](https://render.com/docs)
- [Render Blueprint Spec](https://render.com/docs/blueprint-spec)
- [PostgreSQL on Render](https://render.com/docs/databases)
- [Node.js on Render](https://render.com/docs/deploy-node)

---

## Post-Deployment Checklist

- [ ] App loads at `https://web3-bookmark-api.onrender.com`
- [ ] Signup endpoint works: `POST /api/auth/signup`
- [ ] Login endpoint works: `POST /api/auth/login`
- [ ] Database migrations applied: `npm run db:push` (run once)
- [ ] Environment variables set (NODE_ENV, DATABASE_URL, SESSION_SECRET)
- [ ] Logs show no errors (check Render **Logs** tab)

---

## Cost & Limits (Free Tier)

| Service      | Free Tier Limit          | Note                        |
|--------------|--------------------------|---------------------------|
| Web Service  | 750 hrs/month spinning | Sleeps after 15 min inactivity |
| PostgreSQL   | 0.5 GB storage          | Doesn't spin down          |
| Bandwidth    | 100 GB/month            | Shared outbound            |

For production workloads, upgrade to **Starter** or **Standard** plans.

