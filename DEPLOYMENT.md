# Deployment Guide

## Overview
This project consists of:
- **Frontend**: Next.js app (React + TypeScript)
- **Backend**: FastAPI (Python)

## Option 1: Deploy to Vercel (Recommended)

### Prerequisites
1. GitHub account
2. Vercel account (free)
3. Push your code to GitHub

### Steps:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js and deploy

3. **Configure Environment Variables**:
   In Vercel dashboard → Settings → Environment Variables, add:
   - `NEXT_PUBLIC_API_URL`: Your backend URL
   - `BACKEND_URL`: Your backend URL
   - Add any API keys needed

### Environment Variables Needed:
```env
NEXT_PUBLIC_API_URL=https://your-project.vercel.app/api
BACKEND_URL=https://your-project.vercel.app/api
NODE_ENV=production
```

## Option 2: Separate Deployment

### Frontend on Vercel:
1. Deploy frontend folder to Vercel
2. Set `NEXT_PUBLIC_API_URL` to your backend URL

### Backend on Railway:
1. Go to [railway.app](https://railway.app)
2. Deploy from GitHub
3. Select backend folder
4. Set environment variables

## Option 3: Frontend on Netlify

### Steps:
1. Build command: `cd frontend && npm run build`
2. Publish directory: `frontend/.next`
3. Set environment variables in Netlify

## Database Setup (Neo4j)

For production, consider:
- **Neo4j Aura** (cloud database)
- **Railway** PostgreSQL addon
- **Vercel** KV storage

## Post-Deployment

1. Test all API endpoints
2. Verify file uploads work
3. Check database connections
4. Monitor performance

## Troubleshooting

### Common Issues:
- **CORS errors**: Update CORS settings in backend
- **Environment variables**: Double-check all variables are set
- **Build errors**: Check dependencies and versions
- **API timeouts**: Increase timeout limits for file processing

### Logs:
- Vercel: Functions tab in dashboard
- Railway: Logs tab in dashboard
- Netlify: Functions logs in dashboard 