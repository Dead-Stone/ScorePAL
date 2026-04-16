# ScorePAL Split Deployment Architecture

## Overview

ScorePAL is deployed across two platforms for optimal performance and cost:

- **Frontend:** Vercel (Next.js)
- **Backend:** Render (Docker)
- **Database:** PostgreSQL on Render (free tier)
- **Knowledge Graph:** Neo4j Aura (optional, free tier)

---

## Architecture Diagram

```
User Browser
    ↓
    ├── Vercel (Frontend)
    │   ├── https://scorepal-frontend.vercel.app
    │   ├── Next.js 14
    │   └── Static + SSR pages
    │
    └── API Calls
        ↓
        Render (Backend)
        ├── https://scorepal-backend.onrender.com
        ├── FastAPI + Uvicorn
        ├── PostgreSQL (Internal)
        └── Neo4j Aura (Optional)
```

---

## Deployment Steps

### **Frontend: Vercel**

1. **Connect GitHub:**
   - Go to https://vercel.com
   - Import `Dead-Stone/ScorePAL` project
   - Select `frontend` as root directory
   - Vercel auto-detects Next.js

2. **Configure Environment:**
   - Project Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL=https://scorepal-backend.onrender.com`
   - Deploy

3. **Get URL:**
   - Vercel provides: `https://scorepal-frontend.vercel.app`

---

### **Backend: Render with Docker**

1. **Create Backend Service:**
   - Go to https://dashboard.render.com
   - New → Web Service
   - Connect GitHub repo
   - **Root Directory:** `backend`
   - **Environment:** Docker
   - **Plan:** Free

2. **Create PostgreSQL:**
   - New → PostgreSQL
   - Database: `scorepal`
   - User: `scorepal_user`
   - **Plan:** Free
   - Copy "Internal Database URL"

3. **Configure Backend Environment Variables:**
   ```
   DATABASE_TYPE=postgresql
   POSTGRES_URL=postgresql://scorepal_user:password@host/scorepal
   USE_NEO4J=true
   NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your_password
   GEMINI_API_KEY=your_key
   OPENAI_API_KEY=your_key
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your_app_password
   PORT=8000
   PYTHONUNBUFFERED=1
   ```

4. **Get URL:**
   - Render provides: `https://scorepal-backend.onrender.com`

5. **Update Frontend:**
   - In Vercel, update `NEXT_PUBLIC_API_URL=https://scorepal-backend.onrender.com`
   - Redeploy

---

## File Structure

```
ScorePAL/
├── backend/
│   ├── Dockerfile                    (For Render Docker)
│   ├── requirements.txt
│   ├── api.py                        (FastAPI app)
│   └── ...
├── frontend/
│   ├── vercel.json                   (Vercel config)
│   ├── next.config.js
│   ├── package.json
│   └── ...
├── render.yaml                       (Optional: Render infrastructure)
├── .env.production                   (Production env vars reference)
├── docker-compose.yml                (For local dev only)
└── SPLIT_DEPLOYMENT.md              (This file)
```

---

## Environment Variables

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://scorepal-backend.onrender.com
NODE_ENV=production
```

### Backend (Render)
```bash
# Database
DATABASE_TYPE=postgresql
POSTGRES_URL=postgresql://...

# AI Providers
GEMINI_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# Knowledge Graph (Optional)
USE_NEO4J=true
NEO4J_URI=neo4j+s://...
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=...

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...

# System
PORT=8000
PYTHONUNBUFFERED=1
```

---

## Costs

| Service | Plan | Cost |
|---------|------|------|
| Vercel Frontend | Free | $0 |
| Render Backend | Free | $0 |
| Render PostgreSQL | Free | $0 |
| Neo4j Aura | Free | $0 |
| **Total** | - | **$0/month** |

---

## Local Development

For local development, use `docker-compose.yml`:

```bash
docker-compose up
```

This runs:
- Backend on `http://localhost:8010`
- Frontend on `http://localhost:3000`
- PostgreSQL on `localhost:5432` (optional)

---

## Production URLs

Once deployed:

| Service | URL |
|---------|-----|
| Frontend | `https://scorepal-frontend.vercel.app` |
| Backend API | `https://scorepal-backend.onrender.com` |
| Backend Docs | `https://scorepal-backend.onrender.com/docs` |
| Backend Health | `https://scorepal-backend.onrender.com/health` |

---

## CI/CD Pipeline

### Frontend (Vercel)
- Auto-deploys on `main` branch push
- Builds: `npm run build`
- Runs: `npm start`

### Backend (Render)
- Auto-deploys on `main` branch push
- Builds: `docker build -f backend/Dockerfile .`
- Runs: `uvicorn backend.api:app --host 0.0.0.0 --port 8000`

---

## Monitoring

### Vercel
- Dashboard: https://vercel.com/dashboard
- Analytics, deployment logs, performance metrics

### Render
- Dashboard: https://dashboard.render.com
- Service logs, database status, metrics

---

## Troubleshooting

### Frontend can't connect to backend
- Check `NEXT_PUBLIC_API_URL` in Vercel environment
- Verify backend service is running on Render
- Check CORS configuration in `backend/api.py`

### Backend build fails on Render
- Check Docker build logs in Render dashboard
- Ensure `backend/Dockerfile` exists
- Verify all dependencies in `requirements.txt`

### Database connection errors
- Check `POSTGRES_URL` format
- Verify database is created on Render
- Ensure user has correct permissions

---

## Rollback

### Vercel
- Dashboard → Deployments → Select previous version → Redeploy

### Render
- Dashboard → Service → Deployments → Select previous build

---

## Security

✅ **Enabled:**
- JWT authentication
- HTTPS/TLS encryption
- Environment variable protection
- Password hashing (bcrypt)
- CORS configuration

**TODO:**
- Add rate limiting
- API key rotation
- Database backup strategy
- WAF configuration

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Vercel
3. ✅ Configure environment variables
4. ✅ Test API connectivity
5. ⬜ Set up CI/CD monitoring
6. ⬜ Configure auto-scaling policies
7. ⬜ Set up error tracking (Sentry)
8. ⬜ Configure logging (LogRocket)

---

## Support

- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- FastAPI Docs: https://fastapi.tiangolo.com
- Next.js Docs: https://nextjs.org/docs
