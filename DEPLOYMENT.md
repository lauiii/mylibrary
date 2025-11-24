# Railway Deployment Guide

## Step 1: Prepare Your Code

✅ Your code is already production-ready!

## Step 2: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Sign up with GitHub (recommended)

## Step 3: Deploy

### Option A: Deploy from GitHub (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **In Railway:**
   - Click **"New Project"**
   - Select **"Deploy from GitHub repo"**
   - Choose your repository
   - Railway will auto-detect Node.js and deploy!

### Option B: Deploy with Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize and deploy:**
   ```bash
   railway init
   railway up
   ```

## Step 4: Configure Environment Variables (Optional)

In Railway dashboard:
1. Go to your project
2. Click **"Variables"** tab
3. Add these (optional):
   - `SESSION_SECRET` = `your-random-secret-here`
   - `NODE_ENV` = `production`

## Step 5: Access Your App

Railway will give you a URL like: `https://your-app.up.railway.app`

**That's it! Your app is live! 🚀**

## Important Notes

- **Free Tier**: 500 hours/month (plenty for personal use)
- **Persistent Storage**: Your uploads and user data will persist
- **Automatic HTTPS**: Railway handles SSL certificates
- **Auto-Deploy**: Push to GitHub = automatic deployment

## Troubleshooting

**If deployment fails:**
1. Check Railway logs in the dashboard
2. Ensure `package.json` has all dependencies
3. Verify `npm start` works locally

**Need help?** Railway has excellent documentation at [docs.railway.app](https://docs.railway.app)
