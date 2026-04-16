# ScorePAL Deployment - Quick Start Guide

## Current Setup
- ✅ **Frontend:** Vercel (Next.js)
- ✅ **Backend:** Render (Docker + FastAPI)
- ✅ **Database:** PostgreSQL on Render (free)
- ⏳ **Knowledge Graph:** Neo4j Aura (optional)

---

## 5-Minute Deployment

### **1. Deploy Backend to Render**

```bash
# 1. Push code to GitHub
git push origin main

# 2. Go to Render Dashboard
# https://dashboard.render.com

# 3. Click: New → Web Service
# - Name: scorepal-backend
# - Root Dir: backend
# - Environment: Docker
# - Plan: Free
# Click "Create"

# ⏳ Wait 10-15 minutes for Docker build
```

**Check backend logs:**
- Dashboard → scorepal-backend → Logs tab
- Should see: "Uvicorn running on 0.0.0.0:8000"

✅ **Backend URL:** `https://scorepal-backend-xxxx.onrender.com`

---

### **2. Create PostgreSQL Database on Render**

```bash
# 1. Click: New → PostgreSQL
# - Name: scorepal-postgres
# - Database: scorepal
# - User: scorepal_user
# - Plan: Free
# Click "Create"

# ⏳ Wait 2-3 minutes

# 2. Copy "Internal Database URL"
# Example: postgresql://scorepal_user:password@render-db:5432/scorepal
```

---

### **3. Configure Backend Environment Variables**

```bash
# 1. Go to scorepal-backend service
# 2. Click "Environment" on left sidebar
# 3. Add these variables (replace values):

DATABASE_TYPE=postgresql
POSTGRES_URL=postgresql://scorepal_user:password@render-db:5432/scorepal

USE_NEO4J=true
NEO4J_URI=neo4j+s://your-neo4j-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-neo4j-password

GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# 4. Click "Manual Deploy" (top right)
# ⏳ Wait 5 minutes for redeploy
```

---

### **4. Deploy Frontend to Vercel**

```bash
# 1. Go to Vercel
# https://vercel.com/dashboard

# 2. Click "Add New..." → "Project"
# 3. Import GitHub repo: Dead-Stone/ScorePAL
# 4. Configure:
#    - Framework: Next.js
#    - Root Directory: frontend
# 5. Click "Deploy"

# ⏳ Wait 5 minutes for build
```

---

### **5. Configure Frontend Environment Variable**

```bash
# 1. In Vercel project settings
# 2. Go to "Environment Variables"
# 3. Add:
#    NEXT_PUBLIC_API_URL=https://scorepal-backend-xxxx.onrender.com
# 4. Click "Save"
# 5. Click "Redeploy" (or trigger new deployment)

# ⏳ Wait 3 minutes
```

---

## ✅ Verify Deployment

### **Backend is Working:**
```bash
# Check API docs
curl https://scorepal-backend-xxxx.onrender.com/docs

# Should return: OpenAPI docs (HTML)
```

### **Frontend is Working:**
```bash
# Open in browser
https://scorepal-frontend.vercel.app

# Should show: ScorePAL login page
```

### **Frontend → Backend Communication:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Open Network tab
4. Try logging in or making an API call
5. Should see no CORS errors

---

## 🆘 Troubleshooting

### Backend won't build (Docker error)
- Check build logs in Render dashboard
- Common: `apt-get` fails due to missing packages
- **Solution:** Already fixed in new Dockerfile

### Frontend shows blank page
- Open DevTools → Console
- Check for error messages
- Likely: `NEXT_PUBLIC_API_URL` is wrong
- **Fix:** Update in Vercel environment variables

### 502 Bad Gateway
- Backend service not responding
- Check Render service is "Live" (green dot)
- Check service logs for crashes

### Database connection error
- Verify `POSTGRES_URL` in Render environment
- Check PostgreSQL service is "Available"
- Test: `psql postgresql://...`

---

## 📊 Expected Times

| Step | Time | Notes |
|------|------|-------|
| Push to GitHub | 1 min | `git push origin main` |
| Backend Docker build | 10-15 min | First build is slower |
| Backend redeploy | 5 min | After env var changes |
| PostgreSQL creation | 2-3 min | Quick setup |
| Frontend deploy | 5 min | Next.js build |
| Frontend redeploy | 3 min | After env var changes |
| **Total (first time)** | ~40 min | Mostly waiting for builds |

---

## 📱 Access Your App

Once deployed:

| Component | URL |
|-----------|-----|
| **Frontend** | https://scorepal-frontend.vercel.app |
| **Backend API** | https://scorepal-backend-xxxx.onrender.com |
| **API Docs** | https://scorepal-backend-xxxx.onrender.com/docs |
| **Health Check** | https://scorepal-backend-xxxx.onrender.com/health |

---

## 🔐 Security Checklist

- [ ] Change JWT_SECRET in backend env vars
- [ ] Update database password from default
- [ ] Enable GitHub branch protection
- [ ] Configure Vercel environment locks
- [ ] Set up Render service firewall (if needed)
- [ ] Enable email verification for user signups

---

## 📚 Full Documentation

For detailed information, see:
- `SPLIT_DEPLOYMENT.md` - Complete architecture
- `DATABASE_CONFIG.md` - Database setup details
- `backend/Dockerfile` - Backend Docker config
- `frontend/Dockerfile` - Frontend Docker config (local testing only)
- `render.yaml` - Render infrastructure as code

---

## ✨ What's Working

✅ Split deployment (Vercel + Render)
✅ Docker containerization
✅ PostgreSQL integration
✅ Neo4j knowledge graph (optional)
✅ Environment variable management
✅ CI/CD auto-deployment
✅ Health checks
✅ Automatic rebuilds on git push

---

## 🎯 Next Steps

1. Follow deployment steps above
2. Test API connectivity
3. Create test user accounts
4. Upload test assignments
5. Test grading workflow
6. Monitor logs and performance
7. Set up alerting (optional)

---

**Ready to deploy?** Start with Step 1 above! 🚀
