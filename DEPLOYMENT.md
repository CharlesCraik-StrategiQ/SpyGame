# Deployment Guide

This guide covers deploying SpyGame to various platforms.

## Quick Deploy Options

### Option 1: Railway (Recommended)

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize project:**
   ```bash
   railway init
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Get your URL:**
   Railway will provide a URL like `https://your-app.railway.app`

6. **Set environment variable (if needed):**
   ```bash
   railway variables set VITE_SOCKET_URL=https://your-app.railway.app
   ```
   Note: If deploying as a single service, you can leave this empty as it will auto-detect.

7. **Redeploy:**
   ```bash
   railway up
   ```

**Railway will automatically:**
- Install dependencies
- Build the client
- Start the server
- Serve static files from the built client

---

### Option 2: Render

1. **Go to [render.com](https://render.com)** and sign up/login

2. **Create a new Web Service:**
   - Connect your GitHub repository
   - Select "Web Service"
   - Use these settings:
     - **Build Command:** `npm run install-all && npm run build`
     - **Start Command:** `npm start`
     - **Environment:** `Node`

3. **Add Environment Variables:**
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (or leave Render to auto-assign)

4. **Deploy!**
   - Render will automatically deploy on every push to your main branch

---

### Option 3: Fly.io

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Create app:**
   ```bash
   fly launch
   ```

4. **Create `fly.toml`** (if not auto-generated):
   ```toml
   app = "your-app-name"
   primary_region = "iad"

   [build]
     builder = "paketobuildpacks/builder:base"

   [http_service]
     internal_port = 3001
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0
     processes = ["app"]

   [[services]]
     protocol = "tcp"
     internal_port = 3001
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

---

## Manual Deployment Steps

If you prefer to deploy manually:

1. **Build the client:**
   ```bash
   npm run build
   ```

2. **Set environment variables:**
   - `NODE_ENV=production`
   - `PORT` (usually set by hosting platform)

3. **Start the server:**
   ```bash
   npm start
   ```

---

## Environment Variables

- `NODE_ENV`: Set to `production` for production builds
- `PORT`: Server port (usually auto-set by hosting platform)
- `VITE_SOCKET_URL`: (Optional) Socket.IO server URL. If not set, will auto-detect from current origin in production, or use `http://localhost:3001` in development

---

## Important Notes

1. **Scores Storage:** The app currently uses file-based storage (`server/scores.json`). This will reset on redeploy unless you use persistent volumes or migrate to a database.

2. **WebSocket Support:** All recommended platforms (Railway, Render, Fly.io) support WebSockets/Socket.IO.

3. **Single Service:** The app is configured to run as a single service - the Express server serves both the API and the static React files.

---

## Troubleshooting

### Socket.IO Connection Issues
- Make sure `VITE_SOCKET_URL` is set correctly, or leave it empty to auto-detect
- Check that your hosting platform supports WebSockets

### Build Failures
- Ensure all dependencies are listed in `package.json`
- Check that `client/package.json` has all required dependencies

### Static Files Not Loading
- Verify the build completed successfully (`client/dist` folder exists)
- Check that `NODE_ENV=production` is set

---

## Testing Locally Before Deploy

1. **Build and test production build:**
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

2. **Visit:** `http://localhost:3001`

3. **Test on multiple devices/browsers** to ensure everything works

