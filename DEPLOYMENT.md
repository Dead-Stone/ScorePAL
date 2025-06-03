# Deployment Guide

## Overview
This project consists of:
- **Frontend**: Next.js app (React + TypeScript)
- **Backend**: FastAPI (Python)

## Option 1: Split Deployment (Recommended)

### Prerequisites
1. GitHub account
2. Vercel account (free) for frontend
3. Railway account (free) for backend

### Steps:

#### **Frontend Deployment (Vercel):**

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

2. **Deploy Frontend on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set build settings:
     - Build Command: `cd frontend && npm run build`
     - Output Directory: `frontend/.next`
     - Install Command: `cd frontend && npm install`

#### **Backend Deployment (Railway):**

1. **Deploy Backend on Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Choose "Deploy from the root directory"
   - Railway will auto-detect Python and use the `railway.toml` config

2. **Configure Environment Variables**:
   In Railway dashboard → Variables, add:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `NEO4J_URI`: Your Neo4j database URI (if using)
   - `NEO4J_USERNAME`: Neo4j username
   - `NEO4J_PASSWORD`: Neo4j password

3. **Get Backend URL**:
   - After deployment, Railway will provide a public URL like:
   - `https://your-app-name.railway.app`

#### **Connect Frontend to Backend:**

1. **Update Frontend Environment Variables** in Vercel:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend-url.railway.app`
   - `BACKEND_URL`: `https://your-backend-url.railway.app`

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