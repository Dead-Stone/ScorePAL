# ScorePAL Database Configuration

## What You Actually Need

| Database | Purpose | Required? | Notes |
|----------|---------|-----------|-------|
| **PostgreSQL** | Primary data storage | ✅ YES | Use for production (Render) |
| **SQLite** | Development fallback | ✅ Built-in | Default for local development |
| **MongoDB** | Document storage | ❌ Optional | Auto-fallback to SQLite if not configured |
| **Neo4j** | Knowledge Graph | ❌ Optional | Nice-to-have for concept mapping |

## Quick Answer
- **For Render Deployment:** PostgreSQL ONLY ✅
- **For Local Dev:** SQLite (built-in, no setup needed) ✅
- **MongoDB:** Not required - skip it ✅
- **Neo4j:** Already configured, keep it or disable ✅

---

## Why This Architecture?

**Why not just use one database?**
- SQLAlchemy (PostgreSQL/SQLite) handles: User auth, AI configs, system data
- MongoDB was planned for flexible document storage but has SQLite fallback
- MongoDB is completely optional - remove it to simplify

**For Render (production):**
- ✅ PostgreSQL (required)
- ✅ Neo4j (optional, already configured)
- ❌ MongoDB (not needed)
- ❌ SQLite (don't use in production)

---

## Simple Configuration

### For Render Deployment (Production)
```bash
# Required: PostgreSQL
DATABASE_TYPE=postgresql
POSTGRES_URL=postgresql://scorepal_user:password@render-host:5432/scorepal

# Optional: Neo4j (already configured)
USE_NEO4J=true
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# SKIP: MongoDB - not needed, falls back to SQLite
```

### For Local Development
```bash
# Default: SQLite (already built-in, nothing to install)
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite:///./data/database.db

# Optional: Add PostgreSQL locally
DATABASE_TYPE=postgresql
POSTGRES_URL=postgresql://scorepal_user:password@localhost:5432/scorepal
```

---

## 1️⃣ SQLite Setup (Local Development Only)

### Windows

**No installation needed!** SQLite is included with Python.

```bash
# .env configuration
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite:///./data/database.db
```

**Limitations:**
- ❌ Not suitable for production
- ❌ Data lost on container restart
- ✅ Great for quick local testing

---

## 2️⃣ PostgreSQL Setup

### Windows Installation

#### **Option A: Download Installer (Easiest)**

1. Go to https://www.postgresql.org/download/windows/
2. Download latest version (currently 16.x)
3. Run installer and follow wizard
4. **Remember the password you set for `postgres` user**
5. Default port: **5432**

#### **Option B: Use Scoop (If you have it)**

```bash
scoop install postgresql
```

#### **Option C: Use Docker (Recommended if Docker installed)**

```bash
docker run -d ^
  --name postgres-scorepal ^
  -e POSTGRES_PASSWORD=yourpassword ^
  -e POSTGRES_USER=scorepal_user ^
  -e POSTGRES_DB=scorepal ^
  -p 5432:5432 ^
  postgres:16-alpine
```

### Configure for ScorePAL

1. **Open PostgreSQL prompt:**
   - Windows: Use "SQL Shell (psql)" from Start menu
   - Or run in terminal: `psql -U postgres`

2. **Create database and user:**

```sql
-- Create user
CREATE USER scorepal_user WITH PASSWORD 'your_secure_password';

-- Create database
CREATE DATABASE scorepal OWNER scorepal_user;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE scorepal TO scorepal_user;
\c scorepal
GRANT ALL PRIVILEGES ON SCHEMA public TO scorepal_user;

-- Exit
\q
```

3. **Add to `.env`:**

```bash
DATABASE_TYPE=postgresql
POSTGRES_URL=postgresql://scorepal_user:your_secure_password@localhost:5432/scorepal
```

4. **Test connection:**

```bash
python -c "from sqlalchemy import create_engine; engine = create_engine('postgresql://scorepal_user:your_secure_password@localhost:5432/scorepal'); print(engine.connect())"
```

### For Render Deployment

When deploying to Render:
1. Create PostgreSQL database on Render (Step 3 in deployment guide)
2. Copy the **Internal Database URL**
3. Set in Render dashboard:

```
DATABASE_TYPE=postgresql
POSTGRES_URL=postgresql://...  # From Render
```

---

## 3️⃣ MongoDB Setup

### Windows Installation

#### **Option A: Download Installer (Easiest)**

1. Go to https://www.mongodb.com/try/download/community
2. Download MSI installer for Windows
3. Run installer → choose "Install MongoDB as a Service"
4. Default port: **27017**

#### **Option B: Use Scoop**

```bash
scoop install mongodb
```

#### **Option C: Use Docker**

```bash
docker run -d ^
  --name mongodb-scorepal ^
  -e MONGO_INITDB_ROOT_USERNAME=scorepal_user ^
  -e MONGO_INITDB_ROOT_PASSWORD=your_password ^
  -p 27017:27017 ^
  mongo:7
```

### Configure for ScorePAL

1. **Verify MongoDB is running:**

```bash
# Windows: Check Services (services.msc) for "MongoDB"
# Or test connection:
mongosh --version
```

2. **Create database and user (optional, MongoDB creates on first write):**

```bash
# Connect to MongoDB
mongosh

# Create database and user
use scorepal
db.createUser({
  user: "scorepal_user",
  pwd: "your_password",
  roles: ["dbOwner"]
})

# Exit
exit
```

3. **Add to `.env`:**

```bash
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb://scorepal_user:your_password@localhost:27017
MONGODB_DATABASE=scorepal
```

4. **Test connection:**

```bash
python -c "from pymongo import MongoClient; client = MongoClient('mongodb://localhost:27017'); print(client.server_info())"
```

### For MongoDB Atlas (Cloud)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string (looks like: `mongodb+srv://...`)
4. Add to `.env`:

```bash
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net
MONGODB_DATABASE=scorepal
```

---

## 🔄 Switching Databases

To switch databases, just change `DATABASE_TYPE` in `.env`:

```bash
# Development: Use SQLite
DATABASE_TYPE=sqlite

# Testing: Use PostgreSQL
DATABASE_TYPE=postgresql
POSTGRES_URL=postgresql://...

# Production: Use MongoDB Atlas
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb+srv://...
```

**Restart the backend after changing:**

```bash
# Kill existing process
python -m start.py

# Or restart container
docker-compose down
docker-compose up
```

---

## ✅ Verify Setup

Run this to verify your database is working:

```bash
cd backend
python -c "
from config import get_settings
settings = get_settings()
print(f'Database Type: {settings.database_type}')
print(f'Database URL: {settings.database_url}')
print(f'Connection: OK')
"
```

---

## 🐳 Docker Compose with Database

To run with Docker including database:

### PostgreSQL Docker Setup

Create `docker-compose.postgres.yml`:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: scorepal_user
      POSTGRES_PASSWORD: yourpassword
      POSTGRES_DB: scorepal
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  scorepal-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_TYPE: postgresql
      POSTGRES_URL: postgresql://scorepal_user:yourpassword@postgres:5432/scorepal
    depends_on:
      - postgres

  scorepal-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose -f docker-compose.postgres.yml up
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| `psycopg2.OperationalError: could not connect` | Verify PostgreSQL is running, check `POSTGRES_URL` |
| `pymongo.errors.ServerSelectionTimeoutError` | Verify MongoDB is running on port 27017 |
| `SQLite database is locked` | Only one process should access SQLite at a time |
| `Authentication failed` | Check username/password in connection string |
| `Port already in use` | Change port (e.g., PostgreSQL: 5433 instead of 5432) |

---

---

## 4️⃣ Neo4j Knowledge Graph (Optional)

Neo4j is used for:
- Knowledge graph of concepts and relationships
- Student learning paths and prerequisites
- Advanced analytics on concept mastery
- NOT required for basic grading functionality

### Cloud Deployment (Recommended)

1. Go to https://console.neo4j.io
2. Create free Neo4j Aura instance
3. Get connection details:
   - **Connection URI** (NEO4J_URI)
   - **Username** (NEO4J_USERNAME)
   - **Password** (NEO4J_PASSWORD)

### Local Deployment with Docker

```bash
docker run -d ^
  --name neo4j ^
  -e NEO4J_AUTH=neo4j/yourpassword ^
  -p 7687:7687 ^
  -p 7474:7474 ^
  neo4j:latest
```

### Configure for ScorePAL

Add to `.env`:

```bash
USE_NEO4J=true
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j
```

### Test Connection

```bash
python -c "
from neo4j import GraphDatabase
driver = GraphDatabase.driver(
    'neo4j+s://your-instance.databases.neo4j.io',
    auth=('neo4j', 'your_password')
)
with driver.session() as session:
    result = session.run('RETURN 1')
    print('✅ Neo4j Connected')
"
```

### Disable Neo4j (if not needed)

```bash
USE_NEO4J=false
```

---

## 📋 For Render Deployment

### Essential Setup

1. **PostgreSQL** (required for production)
   - Create free PostgreSQL on Render
   - Copy "Internal Database URL"

2. **In Render backend settings, set:**
   ```
   DATABASE_TYPE=postgresql
   POSTGRES_URL=postgresql://...
   ```

### Optional: Neo4j Knowledge Graph

3. **Neo4j** (optional, for knowledge graph features)
   - Create free Neo4j Aura instance (https://console.neo4j.io)
   - Get connection details

4. **Add to Render backend env vars:**
   ```
   USE_NEO4J=true
   NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=...
   ```

5. **Redeploy**

See main deployment guide for full steps.
