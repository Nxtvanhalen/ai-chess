# Deployment Guide - Chester AI Chess

## Render Deployment (Recommended)

This application is configured for automatic deployment to Render as a Web Service.

### Prerequisites

1. **GitHub Repository**: Code must be pushed to GitHub (✅ Complete)
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Environment Variables**: Prepare your API keys and credentials

### Environment Variables Required

Set these in your Render dashboard:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Supabase Configuration  
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Node Environment
NODE_ENV=production
```

### Deployment Steps

1. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub account
   - Select `Nxtvanhalen/ai-chess` repository

2. **Configure Service**
   - **Name**: `ai-chess` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`

3. **Set Environment Variables**
   - In the Render dashboard, go to Environment tab
   - Add all the environment variables listed above
   - **Important**: Do not set `sync: false` variables as "secret" in UI

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy
   - First deployment takes 5-10 minutes

### Auto-Deploy Configuration

The included `render.yaml` file enables:
- ✅ Automatic deployments on every push to `main`
- ✅ Proper build and start commands
- ✅ Environment variable placeholders
- ✅ Node.js runtime configuration

### Production URLs

Once deployed, your app will be available at:
```
https://your-service-name.onrender.com
```

### Monitoring

- **Logs**: Available in Render dashboard under "Logs" tab
- **Metrics**: CPU, memory usage in "Metrics" tab
- **Health**: Service status and uptime monitoring

### Troubleshooting

**Build Failures**:
- Check Node.js version compatibility (app uses Node 18+)
- Verify all dependencies in package.json
- Review build logs for specific errors

**Runtime Errors**:
- Verify all environment variables are set correctly
- Check API key permissions (OpenAI, Supabase)
- Monitor application logs for detailed error messages

**Database Issues**:
- Ensure Supabase URL and keys are correct
- Verify database tables are created (see supabase/migrations/)
- Check Supabase dashboard for connection issues

## Alternative Deployment Options

### Vercel
```bash
npm i -g vercel
vercel
```

### Docker (Self-hosted)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Railway
- Connect GitHub repository
- Set environment variables
- Deploy automatically

---

**Production Checklist**:
- ✅ Code pushed to GitHub
- ✅ Environment variables configured
- ✅ Supabase database tables created
- ✅ OpenAI API key with GPT-4o access
- ✅ Render service configured and deployed